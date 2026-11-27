// Folhas de contato para revisar os logos à mão (Chrome headless):
//   node scripts/sheet.mjs [pasta-saída]       (padrão: build/sheets)
// Gera, em páginas:
//   light-N.png    azulejos a 64px sobre branco, com nome
//   dark-N.png     os mesmos sobre #0B0D10
//   compare-N.png  antes (redondo, source/) | depois sobre branco | depois sobre escuro
//   small-N.png    cada azulejo a 32px e 16px, sobre branco e sobre #0B0D10
import { readFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromeShot } from './svg.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(process.argv[2] ?? join(ROOT, 'build/sheets'));
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const catalog = JSON.parse(readFileSync(join(ROOT, 'catalog.json'), 'utf8'));
const url = (p) => pathToFileURL(p).href;
const font = 'font:11px/1.2 -apple-system,system-ui,sans-serif';
const label = (b) => b.slug.length > 22 ? b.slug.slice(0, 21) + '…' : b.slug;

const before = (b) => {
  const f = readdirSync(join(ROOT, 'source')).find((x) => x.startsWith(`${b.slug}.`));
  return f ? `<img src="${url(join(ROOT, 'source', f))}" width="64" height="64" style="object-fit:contain">` : `<div style="width:64px;height:64px;display:grid;place-items:center;color:#c00">sem fonte</div>`;
};
const after = (b) => existsSync(join(ROOT, 'svg', `${b.slug}.svg`))
  ? `<img src="${url(join(ROOT, 'svg', `${b.slug}.svg`))}" width="64" height="64">`
  : `<div style="width:64px;height:64px;color:#c00">FALTA</div>`;

// Grade simples (claro e escuro): 10 colunas × 7 linhas por página.
const PER = 70, COLS = 10;
for (const [theme, bg, fg] of [['light', '#FFFFFF', '#4B5563'], ['dark', '#0B0D10', '#8A909C']]) {
  for (let p = 0; p * PER < catalog.length; p++) {
    const page = catalog.slice(p * PER, (p + 1) * PER);
    const html = `<html><body style="margin:0;background:${bg};color:${fg};${font}"><div style="display:grid;grid-template-columns:repeat(${COLS},120px);gap:10px 4px;padding:14px">${page
      .map((b) => `<div style="display:flex;flex-direction:column;align-items:center;gap:5px">${after(b)}<span>${label(b)}</span></div>`)
      .join('')}</div></body></html>`;
    chromeShot(html, join(out, `${theme}-${p + 1}.png`), COLS * 124 + 28, Math.ceil(page.length / COLS) * 94 + 28);
  }
}

// Antes/depois: 4 grupos por linha, 9 linhas por página.
const PER2 = 36, C2 = 4;
for (let p = 0; p * PER2 < catalog.length; p++) {
  const page = catalog.slice(p * PER2, (p + 1) * PER2);
  const cell = (b) => `<div style="display:flex;flex-direction:column;gap:4px;padding:6px;border:1px solid #eee;border-radius:10px">
<div style="display:flex;gap:6px;align-items:center"><div style="background:#fff;padding:4px">${before(b)}</div><span style="color:#999">→</span><div style="background:#fff;padding:4px">${after(b)}</div><div style="background:#0B0D10;padding:4px;border-radius:6px">${after(b)}</div></div>
<span style="color:#333">${label(b)}</span></div>`;
  const html = `<html><body style="margin:0;background:#F4F5F7;${font}"><div style="display:grid;grid-template-columns:repeat(${C2},300px);gap:8px;padding:12px">${page.map(cell).join('')}</div></body></html>`;
  chromeShot(html, join(out, `compare-${p + 1}.png`), C2 * 308 + 24, Math.ceil(page.length / C2) * 112 + 24);
}
// Tamanhos pequenos (32 e 16 px, claro e escuro): é onde marca miúda, traço
// fino e contorno somem. 8 colunas × 12 linhas por página.
const PER3 = 96, C3 = 8;
const tiny = (b, n) => existsSync(join(ROOT, 'svg', `${b.slug}.svg`)) ? `<img src="${url(join(ROOT, 'svg', `${b.slug}.svg`))}" width="${n}" height="${n}">` : `<span style="color:#c00">FALTA</span>`;
for (let p = 0; p * PER3 < catalog.length; p++) {
  const page = catalog.slice(p * PER3, (p + 1) * PER3);
  const cell = (b) => `<div style="display:flex;flex-direction:column;gap:3px">
<div style="display:flex;gap:6px;align-items:center"><div style="background:#fff;padding:5px;display:flex;gap:6px;align-items:center">${tiny(b, 32)}${tiny(b, 16)}</div><div style="background:#0B0D10;padding:5px;display:flex;gap:6px;align-items:center">${tiny(b, 32)}${tiny(b, 16)}</div></div>
<span style="color:#333">${label(b)}</span></div>`;
  const html = `<html><body style="margin:0;background:#F4F5F7;${font}"><div style="display:grid;grid-template-columns:repeat(${C3},150px);gap:8px 6px;padding:12px">${page.map(cell).join('')}</div></body></html>`;
  chromeShot(html, join(out, `small-${p + 1}.png`), C3 * 156 + 24, Math.ceil(page.length / C3) * 70 + 24);
}
console.log(`sheet: ${catalog.length} logos → ${out}`);
