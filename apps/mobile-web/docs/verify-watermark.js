// Renders the same HTML used by build-pdf.js and snaps a vertical strip
// at any Y offset so we can confirm the watermark tiles vertically across
// the whole document. Useful for debugging the watermark CSS.
//
//   node docs/verify-watermark.js                 # snaps top, mid, bottom
//
// Outputs docs/roadmap.snap-{top|mid|bottom}.png — these are not the actual
// PDF pages; they are viewport-style clips of the full HTML render.

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const puppeteer = require('puppeteer');

const docsDir = __dirname;

function inlineImages(html, baseDir) {
  const MIME = { '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
  return html.replace(/<img\s+([^>]*?)src="([^"]+)"([^>]*)>/g, (full, pre, src, post) => {
    if (/^(https?:|data:)/i.test(src)) return full;
    const abs = path.resolve(baseDir, src);
    if (!fs.existsSync(abs)) return full;
    const ext = path.extname(abs).toLowerCase();
    const mime = MIME[ext] ?? 'application/octet-stream';
    return `<img ${pre}src="data:${mime};base64,${fs.readFileSync(abs).toString('base64')}"${post}>`;
  });
}

(async () => {
  let mdRaw = fs.readFileSync(path.join(docsDir, 'roadmap.md'), 'utf8');
  mdRaw = mdRaw.replace(/^---[\s\S]*?---\s*/m, '');
  marked.setOptions({ gfm: true, mangle: false, headerIds: false });
  let body = marked.parse(mdRaw);
  body = inlineImages(body, docsDir);
  const css = fs.readFileSync(path.join(docsDir, 'roadmap.css'), 'utf8');

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
  await page.setContent(`<!doctype html><html><head><style>${css}</style></head><body>${body}</body></html>`, {
    waitUntil: 'networkidle0',
  });

  const docHeight = await page.evaluate(() => Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight,
  ));
  console.log(`Document is ${docHeight}px tall.`);

  const snaps = {
    'snap-top': 0,
    'snap-mid': Math.floor(docHeight * 0.45),
    'snap-bottom': Math.max(0, docHeight - 1123),
  };
  for (const [name, y] of Object.entries(snaps)) {
    await page.screenshot({
      path: path.join(docsDir, `roadmap.${name}.png`),
      clip: { x: 0, y, width: 794, height: 1123 },
    });
  }
  await browser.close();
  console.log('✓ wrote roadmap.snap-top.png, .snap-mid.png, .snap-bottom.png');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
