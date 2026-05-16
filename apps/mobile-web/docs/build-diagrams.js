// Renders every entry in `diagrams/sources.js` to a matching SVG and PNG.
// Uses Puppeteer + Mermaid (loaded from a pinned CDN URL) so we don't take
// a runtime dep on `@mermaid-js/mermaid-cli` (which would pull in another
// Chromium copy).
//
// Outputs (per source):
//   docs/diagrams/<name>.svg     ← vector, injected directly into the HTML
//   docs/diagrams/<name>.png     ← 2x retina raster, used in the PDF flow
//
// Usage from `apps/mobile-web`:
//   node docs/build-diagrams.js

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const sources = require('./diagrams/sources');

const outDir = path.join(__dirname, 'diagrams');

// Load mermaid from local node_modules (pinned via root package install).
// Falls back to a search across plausible monorepo locations.
function findMermaidBundle() {
  const candidates = [
    path.join(__dirname, '..', 'node_modules', 'mermaid', 'dist', 'mermaid.min.js'),
    path.join(__dirname, '..', '..', '..', 'node_modules', 'mermaid', 'dist', 'mermaid.min.js'),
    path.join(__dirname, '..', '..', 'node_modules', 'mermaid', 'dist', 'mermaid.min.js'),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  throw new Error(
    'mermaid not found in node_modules. Run `npm install --no-save --legacy-peer-deps mermaid` first.',
  );
}
const MERMAID_JS = fs.readFileSync(findMermaidBundle(), 'utf8');

const wrapHtml = (mmd) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body { margin: 0; padding: 24px; background: #ffffff;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; }
      .mermaid { display: inline-block; }
      .mermaid svg { display: block; }
    </style>
    <script>${MERMAID_JS}</script>
  </head>
  <body>
    <pre class="mermaid">${mmd}</pre>
    <script>
      window.__rendered = false;
      window.__error = null;
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          themeVariables: {
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
            fontSize: '14px',
            primaryColor: '#ecfdf3',
            primaryTextColor: '#0c831f',
            primaryBorderColor: '#11ab3a',
            lineColor: '#5a6478',
            tertiaryColor: '#fafbfc',
          },
          flowchart: { htmlLabels: true, curve: 'basis', padding: 12, useMaxWidth: false },
        });
        mermaid.run({ querySelector: '.mermaid' })
          .then(() => { window.__rendered = true; })
          .catch((e) => { window.__error = String(e); window.__rendered = true; });
      } catch (e) {
        window.__error = String(e);
        window.__rendered = true;
      }
    </script>
  </body>
</html>`;

(async () => {
  const start = Date.now();
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 2 });

    for (const { name, code } of sources) {
      console.log(`  rendering ${name}…`);
      await page.setContent(wrapHtml(code), { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__rendered === true, {
        timeout: 20000,
      });

      const err = await page.evaluate(() => window.__error);
      if (err) throw new Error(`Mermaid error in ${name}: ${err}`);

      // Inline foreignObject labels into <text> so SVG is portable.
      // (Mermaid uses HTML labels for text wrapping; we replicate as native SVG
      // text with tspans so the SVG looks identical when opened standalone.)
      const svg = await page.evaluate(() => {
        const SVGNS = 'http://www.w3.org/2000/svg';
        const el = document.querySelector('.mermaid svg');
        if (!el) return null;
        el.querySelectorAll('foreignObject').forEach((fo) => {
          const w = parseFloat(fo.getAttribute('width') || '0');
          const h = parseFloat(fo.getAttribute('height') || '0');
          const x = parseFloat(fo.getAttribute('x') || '0');
          const y = parseFloat(fo.getAttribute('y') || '0');
          // Each <p> / <span> becomes one line; this preserves <br/> splits too.
          const inner = fo.querySelector('div, span') || fo;
          const raw = inner.innerHTML.replace(/<br\s*\/?>/gi, '\n');
          const tmp = document.createElement('div');
          tmp.innerHTML = raw;
          const lines = (tmp.textContent || '')
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean);
          const totalLines = lines.length || 1;
          const text = document.createElementNS(SVGNS, 'text');
          text.setAttribute('x', String(x + w / 2));
          text.setAttribute('y', String(y + h / 2));
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('dominant-baseline', 'central');
          text.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif');
          text.setAttribute('font-size', '13');
          text.setAttribute('fill', '#0c831f');
          (lines.length ? lines : ['']).forEach((line, i) => {
            const tspan = document.createElementNS(SVGNS, 'tspan');
            tspan.setAttribute('x', String(x + w / 2));
            tspan.setAttribute(
              'dy',
              i === 0 ? `${-((totalLines - 1) * 0.6)}em` : '1.2em',
            );
            tspan.textContent = line;
            text.appendChild(tspan);
          });
          fo.parentNode.replaceChild(text, fo);
        });
        el.removeAttribute('style');
        el.setAttribute('xmlns', SVGNS);
        return new XMLSerializer().serializeToString(el);
      });
      if (!svg) throw new Error(`Mermaid render failed for ${name}`);
      fs.writeFileSync(path.join(outDir, `${name}.svg`), svg, 'utf8');

      // For the PNG, screenshot the *div* — its bounding box includes all
      // foreignObject HTML labels that the live DOM rendered. The SVG-only
      // shot used to clip these. Trim whitespace afterwards.
      const handle = await page.$('.mermaid');
      const png = await handle.screenshot({ omitBackground: false });
      fs.writeFileSync(path.join(outDir, `${name}.png`), png);
    }
  } finally {
    await browser.close();
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `\n✓ Wrote ${sources.length * 2} files to ${outDir} in ${elapsed}s`,
  );
})().catch((err) => {
  console.error('Diagram build failed:', err?.message ?? err);
  process.exit(1);
});
