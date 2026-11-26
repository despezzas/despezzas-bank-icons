// source/<slug>.svg (logo redondo) → svg/<slug>.svg (azulejo quadrado 64×64).
//   node scripts/square.mjs [slug...]
//
// 1. Saneia o SVG e prefixa os ids com `dzb-<slug>-`.
// 2. Mede cada forma no Chrome headless (scripts/measure.js): caixa, cor e se
//    cobre o círculo inscrito inteiro (= fundo).
// 3. Tira o fundo (círculo, quadrado ou path do tamanho do viewBox) e os
//    clip-paths/máscaras que só recortavam no círculo.
// 4. Monta o azulejo: <rect 64×64 rx=14> na cor do fundo original (gradiente
//    mantido; sem fundo ou fundo branco → branco com contorno fino) + a marca
//    original, sem mudar forma nem cor, centralizada e escalada.
//
// Ajustes por banco em overrides.json; SVGs feitos à mão em manual/<slug>.svg
// vencem o gerador. Bancos sem SVG de origem ganham um azulejo provisório
// (monograma), listado no relatório.
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseXml, sanitize, prefixIds, roundTree, serialize, walk, chromeDump, splitSubpaths } from './svg.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(readFileSync(join(ROOT, 'catalog.json'), 'utf8'));
const overrides = existsSync(join(ROOT, 'overrides.json')) ? JSON.parse(readFileSync(join(ROOT, 'overrides.json'), 'utf8')) : {};
delete overrides.$comment;
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const OUT = join(ROOT, 'svg');
mkdirSync(OUT, { recursive: true });

const T = 64; // lado do azulejo
const RX = 14;
const PAD = 6; // folga mínima até a borda
const SCALE = 1.08; // marca de logo com fundo: tamanho original × isto
const MAX_GEO = 44; // teto do tamanho óptico (média geométrica de largura × altura)
const BARE_SIDE = 48, BARE_GEO = 40; // marca sem fundo: alvo de lado maior / tamanho óptico
const WHITE_TILE = `<rect x="0.5" y="0.5" width="63" height="63" rx="13.5" fill="#FFFFFF" stroke="#000" stroke-opacity="0.08"/>`;

for (const k of Object.keys(overrides)) if (!catalog.some((b) => b.slug === k)) throw new Error(`overrides.json: slug desconhecido "${k}"`);

// ---------------------------------------------------------------- cores

function parseColor(c) {
  if (!c) return null;
  let m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)$/.exec(c);
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  m = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(c);
  if (m) {
    const h = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1];
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 };
  }
  return null;
}
const hex = ({ r, g, b }) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
const isWhitish = (c) => c && Math.min(c.r, c.g, c.b) >= 240;

// ---------------------------------------------------------------- preparação

const failures = [];
const report = { auto: [], override: [], manual: [], placeholder: [], problems: [] };
const prepared = [];

for (const bank of catalog) {
  if (only.length && !only.includes(bank.slug)) continue;
  const manual = join(ROOT, 'manual', `${bank.slug}.svg`);
  if (existsSync(manual)) {
    const svg = parseXml(readFileSync(manual, 'utf8'));
    const warnings = sanitize(svg);
    if (svg.attrs.viewBox !== `0 0 ${T} ${T}`) throw new Error(`manual/${bank.slug}.svg: viewBox precisa ser 0 0 ${T} ${T}`);
    prefixIds(svg, `dzb-${bank.slug}-`);
    roundTree(svg);
    delete svg.attrs.width; delete svg.attrs.height;
    svg.attrs = { xmlns: 'http://www.w3.org/2000/svg', ...svg.attrs };
    writeFileSync(join(OUT, `${bank.slug}.svg`), serialize(svg) + '\n');
    report.manual.push(bank.slug);
    if (warnings.length) report.problems.push(`${bank.slug} (manual): ${warnings.join('; ')}`);
    continue;
  }
  // "source": "<outro-slug>" reaproveita o logo da mesma marca em outro país.
  const srcSlug = overrides[bank.slug]?.source ?? bank.slug;
  const src = join(ROOT, 'source', `${srcSlug}.svg`);
  if (!existsSync(src)) {
    writeFileSync(join(OUT, `${bank.slug}.svg`), placeholder(bank) + '\n');
    const raster = readdirSync(join(ROOT, 'source')).find((f) => f.startsWith(`${bank.slug}.`));
    report.placeholder.push(bank.slug);
    report.problems.push(`${bank.slug}: sem SVG de origem (${raster ? `só raster: source/${raster}` : 'URL do CDN dá 404'}); azulejo provisório com monograma`);
    continue;
  }
  const svg = parseXml(readFileSync(src, 'utf8'));
  const warnings = sanitize(svg);
  prefixIds(svg, `dzb-${bank.slug}-`);
  let vb = svg.attrs.viewBox?.split(/[\s,]+/).map(Number);
  if (!vb || vb.length !== 4 || vb.some(Number.isNaN)) vb = [0, 0, parseFloat(svg.attrs.width), parseFloat(svg.attrs.height)];
  svg.attrs.viewBox = vb.join(' ');
  delete svg.attrs.x; delete svg.attrs.y;
  svg.attrs.width = String(vb[2]);
  svg.attrs.height = String(vb[3]);
  let k = 0;
  walk(svg, (n) => { n.attrs['data-dzi'] = String(k++); });
  prepared.push({ bank, svg, vb, warnings });
}

// ---------------------------------------------------------------- medição

let measures = {};
if (prepared.length) {
  const html = `<!doctype html><html><body>${prepared
    .map((p) => `<div data-slug="${p.bank.slug}" style="position:absolute;left:0;top:0">${serialize(p.svg)}</div>`)
    .join('')}<script src="${pathToFileURL(join(ROOT, 'scripts/measure.js')).href}"></script></body></html>`;
  const dom = chromeDump(html, 'measure');
  const m = /<pre id="dz-out">([\s\S]*?)<\/pre>/.exec(dom);
  if (!m) throw new Error('medição no Chrome falhou');
  measures = JSON.parse(m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
}

// ---------------------------------------------------------------- conversão

const inter = (a, b) => {
  const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
  return { x, y, w: Math.max(0, Math.min(a.x + a.w, b.x + b.w) - x), h: Math.max(0, Math.min(a.y + a.h, b.y + b.h) - y) };
};
const union = (bs) => {
  const x = Math.min(...bs.map((b) => b.x)), y = Math.min(...bs.map((b) => b.y));
  return { x, y, w: Math.max(...bs.map((b) => b.x + b.w)) - x, h: Math.max(...bs.map((b) => b.y + b.h)) - y };
};

const stats = [];
for (const { bank, svg, vb, warnings } of prepared) {
  const ov = overrides[bank.slug] ?? {};
  const me = measures[bank.slug];
  if (process.env.DZ_DEBUG) console.log(bank.slug, JSON.stringify(me.els.slice(0, 4).map(({ i, tag, box, covers, rim, frac, fill }) => ({ i, tag, box: box && [box.x, box.y, box.w, box.h].map((v) => +v.toFixed(1)), covers, rim, frac: +frac.toFixed(2), fill }))));
  const [vx, vy, vw, vh] = vb;
  const V = Math.min(vw, vh);
  const problems = [...warnings];

  // Recursos que só recortam no círculo/quadro inteiro → somem.
  const dropRes = new Set();
  for (const [id, r] of Object.entries(me.resources)) {
    if (!r.boxes.length) continue;
    const u = r.region ? inter(union(r.boxes), r.region) : union(r.boxes);
    if (u.w >= 0.9 * vw && u.h >= 0.9 * vh && r.boxes.length === 1) dropRes.add(id);
  }
  // ...mas só se nada da marca passa do círculo: aí o recorte faz parte do
  // desenho (ex.: arco cortado pela borda) e fica.
  const insideCircle = (b, u) => {
    const ccx = u.x + u.w / 2, ccy = u.y + u.h / 2, R = Math.min(u.w, u.h) / 2 * 1.01;
    return [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]].every(([px, py]) => Math.hypot(px - ccx, py - ccy) <= R);
  };

  const visible = (e) => !e.hidden && e.opacity > 0.01 && e.box && e.box.w * e.box.h > 0 && (e.fill !== 'none' || (e.stroke !== 'none' && e.strokeWidth > 0));
  const els = me.els.filter(visible);

  // Fundo: formas iniciais que cobrem o círculo inscrito inteiro.
  const bgEls = [];
  if (ov.background !== 'none') {
    for (const e of els) {
      if (!e.covers || e.fill === 'none' || e.opacity * e.fillOpacity < 0.9) break;
      bgEls.push(e);
    }
  }
  // Fundo vazado: círculo/quadrado cheio na borda com a marca recortada dentro
  // (letras transparentes). Vira fundo + os furos pintados de branco.
  const knockouts = [];
  if (ov.background !== 'none' && ov.knockout !== false) {
    // O fundo vazado pode vir depois de pedacinhos que aparecem pelos furos.
    const at = els.findIndex((x, n) => n >= bgEls.length && n < bgEls.length + 3 && x.rim);
    const e = at >= 0 ? els[at] : null;
    if (e && e.tag === 'path' && e.rim && e.frac >= 0.5 && e.fill !== 'none' && !/^url/.test(e.fill) && e.opacity * e.fillOpacity >= 0.9) {
      const node = byIndex(svg, e.i);
      const subs = splitSubpaths(node.attrs.d);
      const all = subs.reduce((a, b) => ({ x: Math.min(a.x, b.box.x), y: Math.min(a.y, b.box.y), r: Math.max(a.r, b.box.x + b.box.w), b: Math.max(a.b, b.box.y + b.box.h) }), { x: Infinity, y: Infinity, r: -Infinity, b: -Infinity });
      const W = all.r - all.x, H = all.b - all.y;
      const outer = subs.filter((p) => p.box.w >= 0.95 * W && p.box.h >= 0.95 * H);
      const holes = subs.filter((p) => !outer.includes(p));
      if (outer.length === 1 && holes.length) {
        bgEls.push(e);
        knockouts.push({ i: e.i, d: holes.map((p) => p.d).join(''), color: ov.knockoutColor ?? '#FFFFFF', before: els.slice(bgEls.length, at).map((x) => x.i) });
      }
    }
  }
  const drop = new Set(bgEls.map((e) => e.i));
  for (const ko of knockouts) drop.delete(ko.i);
  const marks = els.filter((e) => (!drop.has(e.i) || knockouts.some((k) => k.i === e.i)) && !(ov.drop ?? []).includes(e.i));
  if (ov.drop) for (const i of ov.drop) drop.add(i);
  for (const id of [...dropRes]) {
    const r = me.resources[id];
    const u = r.region ? inter(union(r.boxes), r.region) : union(r.boxes);
    const users = marks.filter((e) => e.refs.some((x) => x.id === id) && !knockouts.some((k) => k.i === e.i));
    if (ov.keepClip || users.some((e) => !insideCircle(e.box, u))) dropRes.delete(id);
  }
  if (!marks.length) { failures.push(`${bank.slug}: nenhuma forma sobrou depois de tirar o fundo`); continue; }

  // Caixa da marca (com traço), recortada pelos clips/máscaras que ficam.
  const boxes = marks.map((e) => {
    const sw = e.stroke !== 'none' ? e.strokeWidth / 2 : 0;
    let b = { x: e.box.x - sw, y: e.box.y - sw, w: e.box.w + 2 * sw, h: e.box.h + 2 * sw };
    for (const r of e.refs) {
      const res = me.resources[r.id];
      if (!res || dropRes.has(r.id) || !res.boxes.length || res.transform) continue;
      b = inter(b, res.region ? inter(union(res.boxes), res.region) : union(res.boxes));
    }
    return b;
  }).filter((b) => b.w > 0 && b.h > 0);
  const vbBox = { x: vx, y: vy, w: vw, h: vh };
  const B = ov.box ? { x: ov.box[0], y: ov.box[1], w: ov.box[2], h: ov.box[3] } : inter(union(boxes), vbBox);

  // Cor do fundo.
  const last = bgEls.at(-1);
  let bgKind, bgColor = null, bgGradient = null;
  if (ov.background && ov.background !== 'none') {
    bgKind = isWhitish(parseColor(ov.background)) ? 'white' : 'solid';
    bgColor = ov.background;
  } else if (!last) bgKind = 'white';
  else if (/^url\(/.test(last.fill)) { bgKind = 'gradient'; bgGradient = /#([^"')]+)/.exec(last.fill)[1]; }
  else {
    const c = parseColor(last.fill);
    if (!c) { problems.push(`cor de fundo não reconhecida: ${last.fill}`); bgKind = 'white'; }
    else if (isWhitish(c)) bgKind = 'white';
    else { bgKind = 'solid'; bgColor = hex(c); }
  }

  // Escala: com fundo, mantém o tamanho que o designer deu à marca no círculo
  // (×1.08); sem fundo, normaliza pela área. Nunca passa da folga mínima.
  const hadBg = bgEls.length > 0;
  const geo = Math.sqrt(B.w * B.h);
  let s = hadBg ? (T / V) * SCALE : Math.min(BARE_SIDE / Math.max(B.w, B.h), BARE_GEO / geo);
  s = Math.min(s, MAX_GEO / geo);
  if (ov.scale) s *= ov.scale;
  const maxSide = T - 2 * (ov.pad ?? PAD);
  s = Math.min(s, maxSide / Math.max(B.w, B.h));
  const [ox, oy] = ov.offset ?? [0, 0];
  const tx = T / 2 - (B.x + B.w / 2) * s + ox;
  const ty = T / 2 - (B.y + B.h / 2) * s + oy;
  stats.push({ slug: bank.slug, knockout: knockouts.length > 0, hadBg, bgKind, vb: vb.join(' '), size: `${(B.w * s).toFixed(1)}×${(B.h * s).toFixed(1)}`, geo: +(geo * s).toFixed(1), ratio: +(geo / V).toFixed(2) });

  // Monta a árvore da marca.
  const inherit = {};
  for (const k of ['fill', 'stroke', 'fill-rule', 'clip-rule', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'fill-opacity', 'color']) {
    if (svg.attrs[k] !== undefined) inherit[k] = svg.attrs[k];
  }
  const prune = (node) => {
    node.children = node.children.filter((c) => {
      if (drop.has(Number(c.attrs['data-dzi']))) return false;
      if ((c.name === 'clipPath' || c.name === 'mask') && dropRes.has(c.attrs.id)) return false;
      prune(c);
      return !(c.name === 'g' && !c.children.length);
    });
    for (const k of ['clip-path', 'mask']) {
      const id = /url\(#([^)]+)\)/.exec(node.attrs[k] ?? '')?.[1];
      if (id && dropRes.has(id)) delete node.attrs[k];
    }
    delete node.attrs['data-dzi'];
  };
  for (const ko of knockouts) {
    const node = byIndex(svg, ko.i);
    node.attrs.d = ko.d;
    node.attrs.fill = ko.color;
    delete node.attrs['fill-opacity'];
    // Furos brancos vão para baixo do que aparecia através deles.
    if (ko.before.length) {
      walk(svg, (n) => {
        const idx = n.children?.indexOf(node) ?? -1;
        if (idx <= 0) return;
        const first = n.children.findIndex((c) => ko.before.includes(Number(c.attrs?.['data-dzi'])));
        if (first >= 0 && first < idx) { n.children.splice(idx, 1); n.children.splice(first, 0, node); }
      });
    }
  }
  prune(svg);
  // Defs de gradiente usados no fundo continuam disponíveis dentro da marca.
  const transform = `matrix(${s} 0 0 ${s} ${tx} ${ty})`;
  const mark = { name: 'g', attrs: { ...inherit, transform }, children: svg.children };

  let bg;
  if (bgKind === 'white') bg = WHITE_TILE;
  else if (bgKind === 'solid') bg = `<rect width="${T}" height="${T}" rx="${RX}" fill="${bgColor}"/>`;
  else {
    const g = T / V;
    bg = `<rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" rx="${RX / g}" fill="url(#${bgGradient})" transform="matrix(${g * V / vw} 0 0 ${g * V / vh} ${-vx * g} ${-vy * g})"/>`;
  }
  const out = parseXml(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${T} ${T}">${bg}</svg>`);
  out.children.push(mark);
  removeUnused(out);
  roundTree(out);
  // Gradiente do fundo fica antes do <rect> que o usa? Não precisa: referências
  // url(#) valem para qualquer posição no documento.
  writeFileSync(join(OUT, `${bank.slug}.svg`), serialize(out) + '\n');
  (Object.keys(ov).length ? report.override : report.auto).push(bank.slug);
  if (problems.length) report.problems.push(`${bank.slug}: ${problems.join('; ')}`);
}

function byIndex(svg, i) {
  let found = null;
  walk(svg, (n) => { if (n.attrs['data-dzi'] === String(i)) found = n; });
  return found;
}

/** Tira gradientes/clips/máscaras/patterns sem referência. */
function removeUnused(svg) {
  for (let pass = 0; pass < 3; pass++) {
    const used = new Set();
    walk(svg, (n) => {
      for (const [k, v] of Object.entries(n.attrs)) {
        if (k === 'id') continue;
        for (const m of String(v).matchAll(/url\(#([^)]+)\)/g)) used.add(m[1]);
        if (k === 'href' && v.startsWith('#')) used.add(v.slice(1));
      }
    });
    const strip = (node) => {
      node.children = node.children.filter((c) => {
        if (!c.name) return true;
        if (['linearGradient', 'radialGradient', 'clipPath', 'mask', 'pattern', 'symbol'].includes(c.name) && !used.has(c.attrs.id)) return false;
        strip(c);
        return !((c.name === 'g' || c.name === 'defs') && !c.children.length);
      });
    };
    strip(svg);
  }
}

/** Monograma provisório para banco sem logo vetorial. */
function placeholder(bank) {
  const ov = overrides[bank.slug] ?? {};
  const name = bank.names[0];
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((w) => w && !/^(de|do|da|del|of|the|y|e|banco|bank)$/i.test(w));
  const initials = (ov.initials ?? words.slice(0, 2).map((w) => w[0]).join('') ?? name[0]).toUpperCase();
  const bgc = ov.background ?? '#4B5563';
  const fg = ov.color ?? (isWhitish(parseColor(bgc)) ? '#1F2937' : '#FFFFFF');
  const bgEl = isWhitish(parseColor(bgc)) ? WHITE_TILE : `<rect width="${T}" height="${T}" rx="${RX}" fill="${bgc}"/>`;
  const fs = initials.length > 2 ? 18 : initials.length > 1 ? 24 : 30;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${T} ${T}">${bgEl}<text x="32" y="${32 + fs * 0.36}" text-anchor="middle" font-family="Inter, Roboto, Helvetica, Arial, sans-serif" font-size="${fs}" font-weight="700" fill="${fg}">${initials.replace(/&/g, '&amp;')}</text></svg>`;
}

if (!only.length) {
  for (const f of readdirSync(OUT)) if (!catalog.some((b) => `${b.slug}.svg` === f)) rmSync(join(OUT, f));
}
mkdirSync(join(ROOT, 'build'), { recursive: true });
writeFileSync(join(ROOT, 'build/square-report.json'), JSON.stringify({ ...report, stats }, null, 1));
console.log(`square: ${report.auto.length} automáticos, ${report.override.length} com override, ${report.manual.length} manuais, ${report.placeholder.length} provisórios`);
if (report.problems.length) console.log('problemas:\n  ' + report.problems.join('\n  '));
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
