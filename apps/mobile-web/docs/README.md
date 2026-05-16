# Customer App — Documentation Artifacts

Source files for client-facing deliverables. Edit the markdown / CSS, then
re-run the build scripts to regenerate the PDFs and image artifacts.

## Files

| File | Purpose |
|---|---|
| `executive-summary.md` | Source content for the **one-page** client summary |
| `executive-summary.css` | Print-ready theme for the summary (A4 portrait, brand mint) |
| `executive-summary.pdf` | **Generated** — the one-page summary to share |
| `roadmap.md` | Source content for the **multi-page** detailed roadmap |
| `roadmap.css` | Print-ready theme for the roadmap with **SHAH WORKS** diagonal watermark on every page |
| `roadmap.pdf` | **Generated** — the detailed roadmap to share |
| `build-pdf.js` | Markdown → HTML → Chromium → PDF pipeline (runs both docs) |
| `build-diagrams.js` | Mermaid → SVG + PNG renderer for the screen-flow diagrams |
| `verify-watermark.js` | Debug helper — snaps top/mid/bottom of `roadmap.html` to confirm watermark tiling |
| `diagrams/sources.js` | Mermaid source for every screen-flow diagram |
| `diagrams/<name>.svg` | **Generated** — vector diagram, embeddable anywhere |
| `diagrams/<name>.png` | **Generated** — 2× retina raster diagram (used by the roadmap PDF) |

## Build commands

The build scripts depend on `puppeteer` (Chromium-headless), `marked`
(markdown parser), and `mermaid` (diagram renderer). Install them lightly
(no save) since they are only used by these scripts.

```sh
# from apps/mobile-web
npm install --no-save --legacy-peer-deps puppeteer marked mermaid

# 1. Render screen-flow diagrams to SVG + PNG (only needed when sources.js changes)
node docs/build-diagrams.js

# 2. Build all PDFs
node docs/build-pdf.js

# Or build a specific document
node docs/build-pdf.js summary       # only the executive summary
node docs/build-pdf.js roadmap       # only the detailed roadmap
```

To also dump a PNG preview alongside each PDF:

```sh
SCREENSHOT=1 node docs/build-pdf.js               # macOS / Linux
$env:SCREENSHOT='1'; node docs/build-pdf.js       # PowerShell
```

## Watermark

The roadmap PDF carries a tiled **SHAH WORKS** diagonal watermark on every
page. The watermark is a low-opacity (`rgba(17,171,58,0.09)`) inline SVG set
as the `<body>` `background-image`. Chromium's PDF renderer tiles this across
every printed page when `printBackground: true` is enabled — no per-page
header/footer template is required.

To change the watermark text, edit the `<text>` element inside the
`background-image` URL in `roadmap.css` (search for `SHAH WORKS`).

## Editing tips

- The CSS is **print-only** — uses `@page` rules and millimetre units. The
  preview in a normal browser tab will not match the printed PDF exactly.
- The executive summary's layout is tuned to fit on a **single** A4 page;
  meaningful additions will require trimming an existing block.
- The roadmap is **multi-page**; insert `<div class="page-break"></div>` to
  force a page break before a new section.
- To embed a new diagram in the roadmap, add it to `diagrams/sources.js`,
  re-run `build-diagrams.js`, then reference `diagrams/<name>.png` from the
  markdown inside a `<div class="diagram">…</div>` wrapper.
- Brand colors: `#11ab3a` (primary), `#0c831f` (deep), `#ecfdf3` (mint tint).
  Stick to these to keep documents on-brand.

## Tested with

- Node 22.x · Puppeteer (latest) · marked v15 · mermaid v10.9
- Outputs:
  - `executive-summary.pdf` — 1 × A4 portrait, ~125 KB
  - `roadmap.pdf` — 17 × A4 portrait pages, ~2.9 MB
  - 6 × `diagrams/*.svg` (vector, ~25 – 120 KB each)
  - 6 × `diagrams/*.png` (2× retina raster, ~12 – 35 KB each)
