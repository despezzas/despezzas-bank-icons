// Gera as imagens dos READMEs (PNG 2x, Chrome headless): assets/banner.png e
// assets/catalog.png. Roda à mão quando os logos mudam: `npm run png`.
import { readFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { chromeShot } from './svg.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets');
mkdirSync(OUT, { recursive: true });
const tmp = join(tmpdir(), 'dz-banks-png');
mkdirSync(tmp, { recursive: true });

const catalog = JSON.parse(readFileSync(join(ROOT, 'catalog.json'), 'utf8'));
const inline = (slug, size) => readFileSync(join(ROOT, 'dist/svg', `${slug}.svg`), 'utf8').trim().replace('<svg ', `<svg width="${size}" height="${size}" `);
const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,sans-serif`;
const countries = new Set(catalog.flatMap((b) => b.countries)).size;
const shoot = (name, body, w, h) => {
  const png = join(tmp, `${name}.png`);
  chromeShot(`<!doctype html><html><body style="margin:0;background:transparent;font-family:${FONT}">${body}</body></html>`, png, w, h, 2);
  return png;
};

// Banner: título + uma amostra de logos conhecidos.
const featured = [
  'nubank', 'itau', 'banco-do-brasil', 'bradesco', 'caixa', 'santander', 'inter', 'c6', 'btg-pactual', 'mercado-pago', 'picpay', 'pagseguro',
  'xp', 'sicredi', 'sicoob', 'banrisul', 'neon', 'next', 'original', 'safra', 'visa', 'mastercard', 'elo', 'amex',
  'uala-ar', 'naranja-x', 'banco-galicia', 'brubank', 'banco-macro', 'bbva-uy', 'citi', 'hsbc', 'chase', 'wells-fargo', 'paypal', 'pnc',
  'bank-of-america', 'capital-one', 'ally', 'discover', 'sofi', 'zelle', 'hdfc-bank', 'icici-bank', 'state-bank-of-india', 'axis-bank', 'kotak-mahindra-bank', 'paytm-payments-bank',
].filter((s) => catalog.some((b) => b.slug === s));
const cols = 16, cell = 60, size = 48, pad = 40;
const W = pad * 2 + cols * cell - (cell - size);
const rows = Math.ceil(featured.length / cols);
const H = 150 + rows * cell + 22;
const banner = `<div style="width:${W}px;height:${H}px;box-sizing:border-box;border-radius:28px;background:#fff;border:1px solid #E5E7EB;padding:0 ${pad}px;position:relative">
<div style="position:absolute;left:${pad}px;top:38px;font-size:34px;font-weight:700;color:#111827">Despezzas Bank Icons</div>
<div style="position:absolute;left:${pad}px;top:86px;font-size:17px;color:#6B7280">${catalog.length} logos de bancos e cartões · ${countries} países · React + Flutter</div>
<div style="position:absolute;left:${pad}px;top:150px;display:grid;grid-template-columns:repeat(${cols},${size}px);gap:${cell - size}px">${featured.map((s) => inline(s, size)).join('')}</div>
</div>`;
copyFileSync(shoot('banner', banner, W, H), join(OUT, 'banner.png'));

// Catálogo: todos, com o nome.
const cc = 12, cw = 96, ch = 92, cp = 24;
const CW = cp * 2 + cc * cw, CH = cp * 2 + Math.ceil(catalog.length / cc) * ch;
const label = (s) => (s.length > 15 ? s.slice(0, 14) + '…' : s);
const grid = `<div style="width:${CW}px;height:${CH}px;box-sizing:border-box;border-radius:24px;background:#fff;border:1px solid #E5E7EB;padding:${cp}px;display:grid;grid-template-columns:repeat(${cc},${cw}px);grid-auto-rows:${ch}px">${catalog
  .map((b) => `<div style="display:flex;flex-direction:column;align-items:center;gap:7px">${inline(b.slug, 44)}<span style="font-size:10.5px;color:#4B5563;white-space:nowrap">${label(b.names[0])}</span></div>`)
  .join('')}</div>`;
copyFileSync(shoot('catalog', grid, CW, CH), join(OUT, 'catalog.png'));
console.log('png: banner e catálogo → assets/');
