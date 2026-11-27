// source/<slug>.svg (logo redondo) → svg/<slug>.svg (azulejo quadrado 64×64).
//   node scripts/square.mjs [slug...]
//
// 1. Saneia o SVG e prefixa os ids com `dzb-<slug>-`.
// 2. Mede cada forma no Chrome headless (scripts/measure.js): caixa, cor e se
//    cobre o círculo inscrito inteiro (= fundo).
// 3. Tira o fundo (círculo, quadrado ou path do tamanho do viewBox) e os
//    clip-paths/máscaras que só recortavam no círculo.
// 4. Monta o azulejo: quadrado 64×64 SEM cantos arredondados (<rect 64×64>) na
//    cor do fundo original (gradiente mantido; sem fundo ou fundo branco →
//    branco com contorno fino preto; fundo quase preto → contorno fino branco,
//    para não sumir em tela escura) + a marca original, sem mudar forma nem
//    cor, centralizada e escalada.
// 5. Achata (scripts/flatten.js, Paper.js no Chrome): só <rect> de fundo (+
//    contorno) e <path>s no espaço 64, transformações aplicadas aos pontos,
//    recortes/máscaras viram interseção de geometria; sem <g>, transform,
//    clip-path, mask nem pattern.
// 6. Otimiza sem perda visível: precisão dos paths conforme a escala, segmentos
//    colineares fundidos, paradas de gradiente redundantes removidas.
//
// Ajustes por banco em overrides.json; SVGs feitos à mão em manual/<slug>.svg
// vencem o gerador. Bancos sem SVG de origem ganham um azulejo provisório
// (monograma), listado no relatório.
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseXml, sanitize, prefixIds, roundTree, optimizeTree, serialize, walk, chromeDump, splitSubpaths } from './svg.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(readFileSync(join(ROOT, 'catalog.json'), 'utf8'));
const overrides = existsSync(join(ROOT, 'overrides.json')) ? JSON.parse(readFileSync(join(ROOT, 'overrides.json'), 'utf8')) : {};
delete overrides.$comment;
const sources = existsSync(join(ROOT, 'sources.json')) ? JSON.parse(readFileSync(join(ROOT, 'sources.json'), 'utf8')) : {};
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const OUT = join(ROOT, 'svg');
mkdirSync(OUT, { recursive: true });

const T = 64; // lado do azulejo
const PAD = 6; // folga mínima até a borda
const SCALE = 1.08; // marca de logo com fundo: tamanho original × isto
const MAX_GEO = 44; // teto do tamanho óptico (média geométrica de largura × altura)
const BARE_SIDE = 48, BARE_GEO = 40; // marca sem fundo: alvo de lado maior / tamanho óptico
// Contorno fino por dentro da borda: preto em azulejo branco (some em tela
// clara sem ele), branco em azulejo quase preto (some em tela escura).
const HAIRLINE_DARK = `<rect x="0.5" y="0.5" width="63" height="63" fill="none" stroke="#000" stroke-opacity="0.08"/>`;
const HAIRLINE_LIGHT = `<rect x="0.5" y="0.5" width="63" height="63" fill="none" stroke="#FFF" stroke-opacity="0.12"/>`;
const WHITE_TILE = `<rect width="${T}" height="${T}" fill="#FFFFFF"/>`;

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
// Quase preto: luminância relativa baixa o bastante para sumir sobre #0B0D10.
const luminance = ({ r, g, b }) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((a, v, k) => a + v * [0.2126, 0.7152, 0.0722][k], 0);
const isBlackish = (c) => c && luminance(c) < 0.015;

// ---------------------------------------------------------------- preparação

const failures = [];
const report = { auto: [], override: [], manual: [], placeholder: [], problems: [] };
const prepared = [];
const toFlatten = []; // azulejos montados, achatados no fim (scripts/flatten.js)

for (const bank of catalog) {
  if (only.length && !only.includes(bank.slug)) continue;
  const manual = join(ROOT, 'manual', `${bank.slug}.svg`);
  if (existsSync(manual)) {
    const svg = parseXml(readFileSync(manual, 'utf8'));
    const warnings = sanitize(svg);
    if (svg.attrs.viewBox !== `0 0 ${T} ${T}`) throw new Error(`manual/${bank.slug}.svg: viewBox precisa ser 0 0 ${T} ${T}`);
    prefixIds(svg, `dzb-${bank.slug}-`);
    walk(svg, (n) => {
      if (n.name === 'rect' && (n.attrs.rx || n.attrs.ry) && Number(n.attrs.width) >= T - 1 && Number(n.attrs.height) >= T - 1) warnings.push('fundo com cantos arredondados (o azulejo é quadrado, sem rx)');
    });
    svg.attrs = { xmlns: 'http://www.w3.org/2000/svg', viewBox: svg.attrs.viewBox, width: String(T), height: String(T) };
    toFlatten.push({ slug: bank.slug, svg: serialize(svg), problems: warnings.map((w) => `(manual) ${w}`) });
    report.manual.push(bank.slug);
    continue;
  }
  // "source": "<outro-slug>" reaproveita o logo da mesma marca em outro país.
  const srcSlug = overrides[bank.slug]?.source ?? bank.slug;
  const src = join(ROOT, 'source', `${srcSlug}.svg`);
  if (!existsSync(src)) {
    writeFileSync(join(OUT, `${bank.slug}.svg`), placeholder(bank) + '\n');
    const prov = sources[bank.slug];
    const raster = prov?.kind === 'raster' ? `${bank.slug}.${prov.type}` : null;
    report.placeholder.push(bank.slug);
    report.problems.push(`${bank.slug}: sem SVG de origem (${raster ? `só raster (${raster}), origem em sources.json` : 'URL do CDN dá 404'}); azulejo provisório com monograma`);
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
  if (process.env.DZ_DEBUG) console.log(bank.slug, JSON.stringify(me.els.slice(0, +(process.env.DZ_DEBUG_N ?? 4)).map(({ i, tag, box, covers, rim, frac, fill }) => ({ i, tag, box: box && [box.x, box.y, box.w, box.h].map((v) => +v.toFixed(1)), covers, rim, frac: +frac.toFixed(2), fill }))));
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

  let bg, hairline = null;
  if (bgKind === 'white') { bg = WHITE_TILE; hairline = HAIRLINE_DARK; }
  else if (bgKind === 'solid') {
    bg = `<rect width="${T}" height="${T}" fill="${bgColor}"/>`;
    if (isBlackish(parseColor(bgColor))) hairline = HAIRLINE_LIGHT;
  } else {
    // Gradiente em userSpaceOnUse: o retângulo cobre o viewBox de origem e é
    // levado ao quadrado 64×64.
    bg = `<rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="url(#${bgGradient})" transform="matrix(${T / vw} 0 0 ${T / vh} ${(-vx * T) / vw} ${(-vy * T) / vh})"/>`;
    if (gradientStops(svg, bgGradient).every((c) => isBlackish(c))) hairline = HAIRLINE_LIGHT;
  }
  const out = parseXml(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${T} ${T}">${bg}</svg>`);
  out.children.push(mark);
  // O contorno vai por cima de tudo: emoldura o azulejo mesmo se a marca
  // encostar na borda.
  if (hairline) out.children.push(parseXml(`<svg>${hairline}</svg>`).children[0]);
  // Fundo sólido e contorno passam intactos pelo achatamento.
  for (const c of out.children) if (c.name === 'rect' && !c.attrs.transform) c.attrs['data-dz-keep'] = '1';
  removeUnused(out);
  out.attrs.width = out.attrs.height = String(T);
  toFlatten.push({ slug: bank.slug, svg: serialize(out), problems });
  (Object.keys(ov).length ? report.override : report.auto).push(bank.slug);
}

// ---------------------------------------------------------------- achatamento

// Cada azulejo vira SVG puro: <rect> de fundo (+ contorno) e <path>s no espaço
// 64×64, sem <g>, transform, clip-path nem máscara (scripts/flatten.js).
const flatSlugs = new Set();
if (process.env.DZ_NOFLAT) {
  // DZ_NOFLAT=1: grava o azulejo montado sem achatar (referência para comparar pixels).
  for (const t of toFlatten) {
    const svg = parseXml(t.svg.replace(/ data-dz-keep="1"/g, ''));
    delete svg.attrs.width; delete svg.attrs.height;
    roundTree(svg, 4);
    writeFileSync(join(OUT, `${t.slug}.svg`), serialize(svg) + '\n');
  }
} else if (toFlatten.length) {
  const paperJs = pathToFileURL(join(ROOT, 'node_modules/paper/dist/paper-core.js')).href;
  const html = `<!doctype html><html><head><meta charset="utf-8"></head><body>${toFlatten
    .map((t) => `<div data-slug="${t.slug}" style="position:absolute;left:0;top:0">${t.svg}</div>`)
    .join('')}<script src="${paperJs}"></script><script src="${pathToFileURL(join(ROOT, 'scripts/flatten.js')).href}"></script></body></html>`;
  const dom = chromeDump(html, 'flatten');
  const m = /<pre id="dz-out">([\s\S]*?)<\/pre>/.exec(dom);
  if (!m) throw new Error('achatamento no Chrome falhou');
  const flat = JSON.parse(m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
  for (const t of toFlatten) {
    const r = flat[t.slug];
    const problems = [...t.problems, ...(r?.warnings ?? [])];
    if (!r || r.items.some((it) => it.error)) { failures.push(`${t.slug}: achatamento falhou ${r?.items.find((it) => it.error)?.error ?? ''}`); continue; }
    const svg = parseXml(assemble(t.slug, r.items));
    if (process.env.DZ_NOOPT) roundTree(svg, +process.env.DZ_NOOPT); else optimizeTree(svg); // DZ_NOOPT=<casas>: sem otimização (para comparar)
    writeFileSync(join(OUT, `${t.slug}.svg`), serialize(svg) + '\n');
    flatSlugs.add(t.slug);
    if (problems.length) report.problems.push(`${t.slug}: ${problems.join('; ')}`);
  }
}

/** rgb()/rgba()/nome → { hex, a }. */
function paintColor(v) {
  const c = parseColor(v);
  if (!c) return { hex: v, a: 1 };
  return { hex: hex(c), a: c.a };
}

/** Itens achatados → markup do azulejo. Junta paths vizinhos de mesma tinta que não se tocam. */
function assemble(slug, items) {
  const defs = [];
  const els = [];
  let clipN = 0;
  const f = (v) => +(+v).toFixed(4);
  const rename = (s, map) => s.replace(/(id="|url\(#)(g\d+)/g, (_, p, id) => p + (map[id] ??= `dzb-${slug}-${id}`));
  for (const it of items) {
    if (it.keep) { els.push({ markup: it.keep }); continue; }
    const p = it.paint;
    const map = {};
    for (const g of it.grads) defs.push(rename(g, map));
    const attrs = {};
    let fo = 1, so = 1;
    if (p.fill === 'none') attrs.fill = 'none';
    else if (/^url/.test(p.fill)) attrs.fill = rename(p.fill, map);
    else { const c = paintColor(p.fill); fo = c.a * p.fillOpacity; if (c.hex !== '#000000') attrs.fill = c.hex; }
    if (p.fill !== 'none' && p.fillRule === 'evenodd') attrs['fill-rule'] = 'evenodd';
    if (p.stroke) {
      if (/^url/.test(p.stroke)) attrs.stroke = rename(p.stroke, map);
      else { const c = paintColor(p.stroke); so = c.a * p.strokeOpacity; attrs.stroke = c.hex; }
      if (p.strokeWidth !== 1) attrs['stroke-width'] = f(p.strokeWidth);
      if (p.linecap !== 'butt') attrs['stroke-linecap'] = p.linecap;
      if (p.linejoin !== 'miter') attrs['stroke-linejoin'] = p.linejoin;
      else if (p.miterlimit !== 4) attrs['stroke-miterlimit'] = f(p.miterlimit);
      if (p.dash) attrs['stroke-dasharray'] = p.dash;
    }
    // Opacidade do grupo vai para a tinta quando só há uma (preenchimento ou traço).
    if (p.stroke && p.fill !== 'none') { if (p.opacity < 1) attrs.opacity = f(p.opacity); }
    else if (p.stroke) so *= p.opacity;
    else fo *= p.opacity;
    if (p.fill !== 'none' && fo < 0.9999) attrs['fill-opacity'] = f(fo);
    if (p.stroke && so < 0.9999) attrs['stroke-opacity'] = f(so);
    if (it.clip) {
      const id = `dzb-${slug}-c${clipN++}`;
      defs.push(`<clipPath id="${id}"><path d="${it.clip}"/></clipPath>`);
      attrs['clip-path'] = `url(#${id})`;
    }
    const full = it.isBg && Math.abs(it.bounds[0]) < 0.01 && Math.abs(it.bounds[1]) < 0.01 && Math.abs(it.bounds[2] - T) < 0.01 && Math.abs(it.bounds[3] - T) < 0.01;
    els.push({ d: it.d, attrs, rect: full, bounds: it.bounds, mergeable: !p.stroke && !it.clip && !/^url/.test(p.fill) });
  }
  // Fusão: mesma tinta, vizinhos na pilha e caixas que não se cruzam (senão a
  // regra de preenchimento poderia abrir furos na sobreposição).
  const merged = [];
  const overlap = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
  for (const e of els) {
    const last = merged.at(-1);
    if (last && e.mergeable && last.mergeable && !e.rect && !last.rect && JSON.stringify(e.attrs) === JSON.stringify(last.attrs) && !last.parts.some((b) => overlap(b, e.bounds))) {
      last.d += ' ' + e.d;
      last.parts.push(e.bounds);
      continue;
    }
    merged.push({ ...e, parts: e.bounds ? [e.bounds] : [] });
  }
  const at = (a) => Object.entries(a).map(([k, v]) => ` ${k}="${v}"`).join('');
  const body = merged.map((e) => (e.markup ? e.markup : e.rect ? `<rect width="${T}" height="${T}"${at(e.attrs)}/>` : `<path d="${e.d}"${at(e.attrs)}/>`)).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${T} ${T}">${defs.length ? `<defs>${defs.join('')}</defs>` : ''}${body}</svg>`;
}

/** Cores das paradas de um gradiente (segue href para o gradiente base). */
function gradientStops(svg, id, depth = 0) {
  let g = null;
  walk(svg, (n) => { if (n.attrs.id === id) g = n; });
  if (!g) return [null];
  const stops = g.children.filter((c) => c.name === 'stop').map((c) => parseColor(c.attrs['stop-color'] ?? '#000000'));
  if (!stops.length && g.attrs.href && depth < 3) return gradientStops(svg, g.attrs.href.slice(1), depth + 1);
  return stops.length ? stops : [null];
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
  const c = parseColor(bgc);
  const bgEl = isWhitish(c) ? WHITE_TILE : `<rect width="${T}" height="${T}" fill="${bgc}"/>`;
  const line = isWhitish(c) ? HAIRLINE_DARK : isBlackish(c) ? HAIRLINE_LIGHT : '';
  const fs = initials.length > 2 ? 18 : initials.length > 1 ? 24 : 30;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${T} ${T}">${bgEl}${line}<text x="32" y="${32 + fs * 0.36}" text-anchor="middle" font-family="Inter, Roboto, Helvetica, Arial, sans-serif" font-size="${fs}" font-weight="700" fill="${fg}">${initials.replace(/&/g, '&amp;')}</text></svg>`;
}

if (!only.length) {
  for (const f of readdirSync(OUT)) if (!catalog.some((b) => `${b.slug}.svg` === f)) rmSync(join(OUT, f));
}
mkdirSync(join(ROOT, 'build'), { recursive: true });
writeFileSync(join(ROOT, 'build/square-report.json'), JSON.stringify({ ...report, stats }, null, 1));
console.log(`square: ${report.auto.length} automáticos, ${report.override.length} com override, ${report.manual.length} manuais, ${report.placeholder.length} provisórios`);
if (report.problems.length) console.log('problemas:\n  ' + report.problems.join('\n  '));
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
