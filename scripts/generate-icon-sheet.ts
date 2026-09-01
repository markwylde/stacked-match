/**
 * Writes a standalone contact sheet of every icon in every theme, rendered at
 * the real brick size against the real theme colours, including the washed
 * state. Open it on a phone to make the shape-only legibility check that
 * cannot be made programmatically.
 *
 * Run with: npm run sheet
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { colourForIcon, THEMES } from '../src/themes/themes.js';

const icon = (shapes: readonly { d: string; role: 'fill' | 'line' }[]): string =>
  shapes
    .map((shape) =>
      shape.role === 'fill'
        ? `<path d="${shape.d}" class="f"/>`
        : `<path d="${shape.d}" class="l"/>`,
    )
    .join('');

const sections = THEMES.map((theme) => {
  const tiles = theme.icons
    .map((definition, index) => {
      const washed = index === 0 ? ' washed' : '';
      return `<figure class="tile${washed}" style="--icon-colour:${colourForIcon(theme, definition.id)}">
      <div class="brick"><svg viewBox="2 2 20 20">${icon(definition.shapes)}</svg></div>
      <figcaption>${definition.label}</figcaption>
    </figure>`;
    })
    .join('\n    ');

  return `<section style="--bg:${theme.background};--brick:${theme.brick};--brick-washed:${theme.brickWashed};--accent:${theme.accent};--ink:${theme.ink}">
    <h2>${theme.name} <small>${theme.icons.length} icons &middot; first tile shown washed</small></h2>
    <div class="grid">
    ${tiles}
    </div>
  </section>`;
}).join('\n  ');

const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Stacked Match - icon sheet</title>
<style>
  body { margin:0; font:500 14px/1.4 ui-rounded,system-ui,sans-serif; background:#0d0b16; color:#f4f1ea; }
  section { background:var(--bg); padding:20px 16px 26px; }
  h2 { margin:0 0 14px; font-size:18px; }
  h2 small { font-weight:500; opacity:.55; font-size:12px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(76px,1fr)); gap:12px; }
  figure { margin:0; text-align:center; }
  .brick { width:56px; height:56px; margin:0 auto; border-radius:14px; background:var(--brick);
    display:grid; place-items:center; box-shadow:0 2px 0 rgba(0,0,0,.22),0 6px 14px rgba(0,0,0,.3); }
  .washed .brick { background:var(--brick-washed); box-shadow:0 0 0 2.5px var(--accent),0 2px 0 rgba(0,0,0,.22); }
  svg { width:76%; height:76%; overflow:visible; }
  .f { fill:var(--icon-colour); }
  .washed .f { fill:var(--accent); }
  .l { fill:none; stroke:var(--ink); stroke-width:1.5; stroke-linecap:round; stroke-linejoin:round; }
  figcaption { margin-top:6px; font-size:11px; opacity:.6; }
  .note { padding:16px; opacity:.65; font-size:12px; }
  .mono { filter:grayscale(1); }
  .toggle { position:fixed; right:12px; bottom:12px; padding:10px 16px; border-radius:999px;
    border:none; background:#ff5fa2; color:#14101c; font:700 13px/1 inherit; cursor:pointer; }
</style></head><body>
  <p class="note">Every icon at real brick size. Tap the button to strip colour: each icon must stay
  identifiable from its outline alone.</p>
  ${sections}
  <button class="toggle" onclick="document.body.classList.toggle('mono')">Toggle colour</button>
</body></html>
`;

mkdirSync(join(process.cwd(), 'docs'), { recursive: true });
writeFileSync(join(process.cwd(), 'docs', 'icon-sheet.html'), html);
console.log(`wrote docs/icon-sheet.html (${THEMES.reduce((n, t) => n + t.icons.length, 0)} icons)`);
