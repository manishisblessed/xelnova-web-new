// Markdown → HTML → Chromium → PDF pipeline for client-facing artifacts.
//
// Renders each entry of `DOCS` to a styled PDF (and optionally a PNG preview).
// `<img src="diagrams/...">` references in the markdown are inlined as base64
// data URLs so the headless browser can resolve them without a file:// origin.
//
// Pipeline:
//   markdown ─► marked ─► HTML ─► inline images ─► <style> ─► chromium PDF
//
// Usage from `apps/mobile-web`:
//   node docs/build-pdf.js              # builds every doc
//   node docs/build-pdf.js summary      # builds only the executive summary
//   node docs/build-pdf.js roadmap      # builds only the detailed roadmap
//   SCREENSHOT=1 node docs/build-pdf.js # also writes a PNG preview
//
// Outputs (per doc):
//   docs/<slug>.pdf

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const puppeteer = require('puppeteer');

const docsDir = __dirname;

const DOCS = {
  summary: {
    md: path.join(docsDir, 'executive-summary.md'),
    css: path.join(docsDir, 'executive-summary.css'),
    pdf: path.join(docsDir, 'executive-summary.pdf'),
    title: 'Xelnova Customer Mobile App — Executive Summary',
  },
  roadmap: {
    md: path.join(docsDir, 'roadmap.md'),
    css: path.join(docsDir, 'roadmap.css'),
    pdf: path.join(docsDir, 'roadmap.pdf'),
    title: 'Xelnova Customer Mobile App — Detailed Delivery Roadmap',
  },
};

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
};

/** Replace `<img src="relative/path">` with a base64 data URL so the
 *  headless browser doesn't need to resolve files from disk. */
function inlineImages(html, baseDir) {
  return html.replace(/<img\s+([^>]*?)src="([^"]+)"([^>]*)>/g, (full, pre, src, post) => {
    if (/^(https?:|data:)/i.test(src)) return full;
    const abs = path.resolve(baseDir, src);
    if (!fs.existsSync(abs)) return full;
    const ext = path.extname(abs).toLowerCase();
    const mime = MIME[ext] ?? 'application/octet-stream';
    const buf = fs.readFileSync(abs);
    const data = buf.toString('base64');
    return `<img ${pre}src="data:${mime};base64,${data}"${post}>`;
  });
}

async function renderDoc(browser, doc) {
  const start = Date.now();
  const slug = path.basename(doc.pdf, '.pdf');
  console.log(`Rendering ${slug}…`);

  let mdRaw = fs.readFileSync(doc.md, 'utf8');
  mdRaw = mdRaw.replace(/^---[\s\S]*?---\s*/m, '');

  marked.setOptions({
    breaks: false,
    gfm: true,
    mangle: false,
    headerIds: false,
  });
  let bodyHtml = marked.parse(mdRaw);
  bodyHtml = inlineImages(bodyHtml, docsDir);

  const css = fs.readFileSync(doc.css, 'utf8');
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${doc.title}</title>
    <style>${css}</style>
  </head>
  <body>${bodyHtml}</body>
</html>`;

  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.emulateMediaType('print');

    await page.pdf({
      path: doc.pdf,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    });

    if (process.env.SCREENSHOT === '1') {
      const pngPath = doc.pdf.replace(/\.pdf$/, '.preview.png');
      await page.screenshot({ path: pngPath, fullPage: true });
      console.log(`  ✓ ${path.basename(pngPath)}`);
    }
  } finally {
    await page.close();
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const sizeKB = (fs.statSync(doc.pdf).size / 1024).toFixed(1);
  console.log(`  ✓ ${path.basename(doc.pdf)}  (${sizeKB} KB · ${elapsed}s)`);
}

(async () => {
  const arg = process.argv[2];
  const targets = arg && DOCS[arg] ? [DOCS[arg]] : Object.values(DOCS);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    for (const doc of targets) {
      await renderDoc(browser, doc);
    }
  } finally {
    await browser.close();
  }
})().catch((err) => {
  console.error('PDF generation failed:', err?.message ?? err);
  process.exit(1);
});
