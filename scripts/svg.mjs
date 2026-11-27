// Utilitários de SVG para os logos de bancos: parser XML mínimo, serializador,
// saneamento (remove scripts, raster, handlers, estilos CSS → atributos),
// prefixo de ids e arredondamento de números.
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

export const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// ---------------------------------------------------------------- parser

/** Nó: { name, attrs: {}, children: [] } ou { text }. */
export function parseXml(src) {
  const root = { name: '#root', attrs: {}, children: [] };
  const stack = [root];
  let i = 0;
  const top = () => stack[stack.length - 1];
  while (i < src.length) {
    if (src.startsWith('<!--', i)) { i = src.indexOf('-->', i) + 3; continue; }
    if (src.startsWith('<![CDATA[', i)) {
      const end = src.indexOf(']]>', i);
      top().children.push({ text: src.slice(i + 9, end), cdata: true });
      i = end + 3;
      continue;
    }
    if (src.startsWith('<?', i)) { i = src.indexOf('?>', i) + 2; continue; }
    if (src.startsWith('<!', i)) {
      // DOCTYPE (com ou sem subset interno)
      let depth = 0;
      for (; i < src.length; i++) {
        if (src[i] === '[') depth++;
        else if (src[i] === ']') depth--;
        else if (src[i] === '>' && depth <= 0) { i++; break; }
      }
      continue;
    }
    if (src.startsWith('</', i)) {
      const end = src.indexOf('>', i);
      const name = src.slice(i + 2, end).trim();
      while (stack.length > 1 && top().name !== name) stack.pop();
      if (stack.length > 1) stack.pop();
      i = end + 1;
      continue;
    }
    if (src[i] === '<') {
      const m = /^<([\w:.-]+)/.exec(src.slice(i, i + 200));
      if (!m) { top().children.push({ text: '<' }); i++; continue; }
      let j = i + m[0].length;
      const attrs = {};
      const re = /\s*([\w:.-]+)\s*(?:=\s*("([^"]*)"|'([^']*)'|([^\s>"']+)))?/y;
      for (;;) {
        while (/\s/.test(src[j])) j++;
        if (src[j] === '>' || src.startsWith('/>', j)) break;
        re.lastIndex = j;
        const a = re.exec(src);
        if (!a || a.index !== j) { j++; continue; }
        attrs[a[1]] = a[3] ?? a[4] ?? a[5] ?? '';
        j = re.lastIndex;
      }
      const selfClose = src.startsWith('/>', j);
      const node = { name: m[1], attrs, children: [] };
      top().children.push(node);
      if (!selfClose) stack.push(node);
      i = j + (selfClose ? 2 : 1);
      continue;
    }
    const next = src.indexOf('<', i);
    const end = next === -1 ? src.length : next;
    top().children.push({ text: src.slice(i, end) });
    i = end;
  }
  const svg = findAll(root, (n) => n.name === 'svg')[0];
  if (!svg) throw new Error('sem <svg>');
  return svg;
}

export function findAll(node, pred, out = []) {
  for (const c of node.children ?? []) {
    if (c.name && pred(c)) out.push(c);
    if (c.name) findAll(c, pred, out);
  }
  return out;
}

export function walk(node, fn, parent = null) {
  fn(node, parent);
  for (const c of [...(node.children ?? [])]) if (c.name) walk(c, fn, node);
}

const escAttr = (v) => String(v).replace(/&(?!(?:[a-z]+|#\d+|#x[\da-f]+);)/gi, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export function serialize(node) {
  if (node.text !== undefined) {
    if (node.cdata) return `<![CDATA[${node.text}]]>`;
    return node.text;
  }
  const attrs = Object.entries(node.attrs)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => ` ${k}="${escAttr(v)}"`)
    .join('');
  const kids = (node.children ?? []).map(serialize).join('');
  return kids ? `<${node.name}${attrs}>${kids}</${node.name}>` : `<${node.name}${attrs}/>`;
}

// ---------------------------------------------------------------- saneamento

const PRESENTATION = new Set([
  'fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin',
  'stroke-miterlimit', 'stroke-dasharray', 'stroke-dashoffset', 'opacity', 'clip-rule', 'clip-path', 'mask', 'stop-color',
  'stop-opacity', 'display', 'visibility', 'color', 'mask-type', 'transform', 'font-family', 'font-size', 'font-weight',
  'text-anchor', 'letter-spacing',
]);

const DROP_ELEMENTS = new Set(['script', 'foreignObject', 'metadata', 'title', 'desc', 'style', 'switch', 'sodipodi:namedview']);

/** Regras CSS simples por classe: `.a,.b{fill:#000;}` → { a: {fill:'#000'} } */
function parseCss(css) {
  const rules = {};
  for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const decls = parseStyle(m[2]);
    for (const sel of m[1].split(',').map((s) => s.trim())) {
      const c = /^\.([\w-]+)$/.exec(sel);
      if (c) rules[c[1]] = { ...rules[c[1]], ...decls };
    }
  }
  return rules;
}

function parseStyle(s) {
  const out = {};
  for (const d of s.split(';')) {
    const k = d.slice(0, d.indexOf(':')).trim().toLowerCase();
    const v = d.slice(d.indexOf(':') + 1).trim();
    if (d.includes(':') && k && v) out[k] = v.replace(/\s*!important$/, '');
  }
  return out;
}

/**
 * Saneia a árvore no lugar. Retorna avisos (raster, recursos externos…).
 * - remove script/foreignObject/metadata/elementos com namespace, handlers on*, hrefs externos;
 * - <image> é removido e avisado (precisa de fonte vetorial);
 * - CSS (<style> por classe e style="") vira atributo de apresentação;
 * - xlink:href → href.
 */
export function sanitize(svg) {
  const warnings = [];
  const css = {};
  for (const st of findAll(svg, (n) => n.name === 'style')) {
    Object.assign(css, parseCss(st.children.map((c) => c.text ?? '').join('')));
  }
  const clean = (node) => {
    node.children = (node.children ?? []).filter((c) => {
      if (c.text !== undefined) return false; // sem nós de texto (não há <text> nas fontes)
      if (DROP_ELEMENTS.has(c.name) || c.name.includes(':')) return false;
      if (c.name === 'image') { warnings.push('raster <image> removido'); return false; }
      if (c.name === 'text' || c.name === 'tspan') { warnings.push('<text> mantido'); }
      return true;
    });
    const a = node.attrs;
    const fromClass = (a.class ?? '').split(/\s+/).filter(Boolean).reduce((acc, c) => ({ ...acc, ...css[c] }), {});
    const fromStyle = a.style ? parseStyle(a.style) : {};
    const next = {};
    for (const [k, v] of Object.entries(a)) {
      if (/^on/i.test(k) || k.startsWith('xmlns') || k.includes(':') && k !== 'xlink:href' || ['class', 'style', 'version', 'enable-background', 'data-name', 'xml:space'].includes(k)) continue;
      next[k] = v;
    }
    for (const [k, v] of Object.entries({ ...fromClass, ...fromStyle })) {
      if (PRESENTATION.has(k)) next[k] = v;
    }
    if (next['xlink:href'] !== undefined) { next.href = next['xlink:href']; delete next['xlink:href']; }
    if (next.href !== undefined && !next.href.startsWith('#')) { warnings.push(`href externo removido: ${next.href.slice(0, 40)}`); delete next.href; }
    for (const [k, v] of Object.entries(next)) {
      if (/url\(\s*['"]?(?!#)/.test(v)) { warnings.push(`url externa removida em ${k}`); delete next[k]; }
    }
    node.attrs = next;
    for (const c of node.children) clean(c);
  };
  clean(svg);
  return [...new Set(warnings)];
}

// ---------------------------------------------------------------- ids

/** Prefixa todo id (e suas referências) e remove ids não referenciados. */
export function prefixIds(svg, prefix) {
  const used = new Set();
  walk(svg, (n) => {
    for (const v of Object.values(n.attrs)) {
      for (const m of String(v).matchAll(/url\(\s*['"]?#([^'")\s]+)/g)) used.add(m[1]);
      if (/^#/.test(v) && !/^#[0-9a-f]{3,8}$/i.test(v)) used.add(v.slice(1));
    }
    if (n.attrs.href?.startsWith('#')) used.add(n.attrs.href.slice(1));
  });
  const map = new Map();
  let k = 0;
  walk(svg, (n) => {
    if (n.attrs.id === undefined) return;
    if (!used.has(n.attrs.id)) { delete n.attrs.id; return; }
    const nid = `${prefix}${k++}`;
    map.set(n.attrs.id, nid);
    n.attrs.id = nid;
  });
  walk(svg, (n) => {
    for (const [key, v] of Object.entries(n.attrs)) {
      let nv = String(v).replace(/url\(\s*['"]?#([^'")\s]+)['"]?\s*\)/g, (s, id) => (map.has(id) ? `url(#${map.get(id)})` : 'none'));
      if (key === 'href' && nv.startsWith('#')) nv = map.has(nv.slice(1)) ? `#${map.get(nv.slice(1))}` : undefined;
      if (nv === 'none' && (key === 'clip-path' || key === 'mask' || key === 'filter')) nv = undefined;
      if (nv === undefined) delete n.attrs[key];
      else n.attrs[key] = nv;
    }
  });
}

// ---------------------------------------------------------------- números

const NUMERIC_ATTRS = new Set(['d', 'points', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'fx', 'fy', 'width', 'height', 'stroke-width', 'transform', 'gradientTransform', 'patternTransform', 'viewBox', 'offset', 'stroke-dasharray', 'stroke-dashoffset']);

export function roundNumbers(str, digits = 2) {
  const f = 10 ** digits;
  let out = '';
  let last = 0;
  for (const m of str.matchAll(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi)) {
    out += str.slice(last, m.index);
    let v = Math.round(parseFloat(m[0]) * f) / f;
    if (Object.is(v, -0)) v = 0;
    let s = String(v);
    if (s.includes('e')) s = v.toFixed(digits).replace(/\.?0+$/, '');
    s = s.replace(/^(-?)0\./, '$1.');
    // Números colados ("1.5.5", ".06.06") não podem se fundir depois de arredondados.
    if (/[\d.]$/.test(out) && (/^\d/.test(s) || (s[0] === '.' && !/\.\d*$/.test(out)))) out += ' ';
    out += s;
    last = m.index + m[0].length;
  }
  return out + str.slice(last);
}

const fmt = (v, digits) => {
  const f = 10 ** digits;
  let r = Math.round(v * f) / f;
  if (Object.is(r, -0)) r = 0;
  let s = String(r);
  if (s.includes('e')) s = r.toFixed(digits).replace(/\.?0+$/, '');
  return s.replace(/^(-?)0\./, '$1.');
};

/** Reescreve o `d` de um path com números arredondados (entende flags de arco compactas). */
export function roundPath(d, digits = 2) {
  const ARGS = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };
  let i = 0;
  const out = [];
  let cmd = null;
  const ws = () => { while (i < d.length && /[\s,]/.test(d[i])) i++; };
  const num = () => {
    ws();
    const m = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/i.exec(d.slice(i, i + 40));
    if (!m) throw new Error(`path inválido perto de "${d.slice(i, i + 20)}"`);
    i += m[0].length;
    return parseFloat(m[0]);
  };
  const flag = () => { ws(); const c = d[i++]; if (c !== '0' && c !== '1') throw new Error('flag de arco inválida'); return Number(c); };
  for (;;) {
    ws();
    if (i >= d.length) break;
    if (/[a-z]/i.test(d[i])) { cmd = d[i++]; out.push({ cmd, args: [] }); if (cmd.toLowerCase() === 'z') continue; }
    else if (!cmd) throw new Error('path sem comando inicial');
    else out.push({ cmd: cmd === 'm' ? 'l' : cmd === 'M' ? 'L' : cmd, args: [], implicit: true });
    const seg = out.at(-1);
    const lc = seg.cmd.toLowerCase();
    if (lc === 'z') continue;
    for (let k = 0; k < ARGS[lc]; k++) seg.args.push(lc === 'a' && (k === 3 || k === 4) ? flag() : num());
    if (cmd === 'm') cmd = 'l'; else if (cmd === 'M') cmd = 'L';
  }
  let s = '';
  for (const seg of out) {
    if (!seg.implicit) s += seg.cmd;
    const lc = seg.cmd.toLowerCase();
    seg.args.forEach((v, k) => {
      const t = lc === 'a' && (k === 3 || k === 4) ? String(v) : fmt(v, digits);
      const prev = s.at(-1);
      // Separador só quando o número colaria no anterior.
      if (/[\d.]/.test(prev ?? '') && (/^\d/.test(t) || (t[0] === '.' && !/\.\d*$/.test(s)))) s += ' ';
      s += t;
    });
  }
  return s;
}

export function roundTree(svg, digits = 2, { paths = true } = {}) {
  walk(svg, (n) => {
    for (const k of Object.keys(n.attrs)) {
      if (k === 'd') { if (paths) n.attrs.d = roundPath(n.attrs.d, digits); }
      // Transformações multiplicam tudo: precisam de mais casas.
      else if (/transform$/i.test(k)) n.attrs[k] = roundNumbers(n.attrs[k], digits + 3).replace(/\s+/g, ' ').trim();
      else if (NUMERIC_ATTRS.has(k)) n.attrs[k] = roundNumbers(n.attrs[k], digits).replace(/\s+/g, ' ').trim();
    }
  });
}

// ---------------------------------------------------------------- Chrome

/** Roda um HTML no Chrome headless e devolve o DOM final (--dump-dom). */
export function chromeDump(html, name = 'page') {
  const dir = join(tmpdir(), 'dz-banks');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${name}.html`);
  writeFileSync(file, html);
  return execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--virtual-time-budget=20000', '--dump-dom', `file://${file}`], {
    maxBuffer: 1 << 28,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
}

/** Screenshot de um HTML. */
export function chromeShot(html, out, w, h, scale = 1) {
  const file = out.replace(/\.png$/, '.html');
  writeFileSync(file, html);
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--force-device-scale-factor=${scale}`, '--virtual-time-budget=5000', `--window-size=${w},${h}`, `--screenshot=${out}`, `file://${file}`], { stdio: 'ignore' });
}

/** Quebra um path em subpaths absolutos, cada um com a caixa (pontos e controles). */
export function splitSubpaths(d) {
  const ARGS = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };
  const toks = d.match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) ?? [];
  // Flags de arco compactas ("011") não aparecem nos paths que separamos; se
  // aparecerem, o resultado fica errado e a folha de revisão denuncia.
  const subs = [];
  let cur = null, x = 0, y = 0, sx = 0, sy = 0, cmd = null, k = 0;
  const push = (s, pts) => { cur.d += s; for (const [px, py] of pts) { cur.box[0] = Math.min(cur.box[0], px); cur.box[1] = Math.min(cur.box[1], py); cur.box[2] = Math.max(cur.box[2], px); cur.box[3] = Math.max(cur.box[3], py); } };
  const n = () => parseFloat(toks[k++]);
  while (k < toks.length) {
    if (/[a-z]/i.test(toks[k])) cmd = toks[k++];
    const lc = cmd.toLowerCase(), rel = cmd !== cmd.toUpperCase();
    if (lc === 'z') { if (cur) cur.d += 'Z'; x = sx; y = sy; if (!/[a-z]/i.test(toks[k] ?? 'z')) cmd = rel ? 'l' : 'L'; continue; }
    const ox = rel ? x : 0, oy = rel ? y : 0;
    if (lc === 'm') {
      x = ox + n(); y = oy + n(); sx = x; sy = y;
      cur = { d: '', box: [Infinity, Infinity, -Infinity, -Infinity] };
      subs.push(cur);
      push(`M${x} ${y}`, [[x, y]]);
      cmd = rel ? 'l' : 'L';
    } else if (lc === 'l' || lc === 't') { x = ox + n(); y = oy + n(); push(`${lc === 'l' ? 'L' : 'T'}${x} ${y}`, [[x, y]]); }
    else if (lc === 'h') { x = ox + n(); push(`L${x} ${y}`, [[x, y]]); }
    else if (lc === 'v') { y = (rel ? y : 0) + n(); push(`L${x} ${y}`, [[x, y]]); }
    else if (lc === 'c') { const a = [ox + n(), oy + n(), ox + n(), oy + n(), ox + n(), oy + n()]; x = a[4]; y = a[5]; push(`C${a.join(' ')}`, [[a[0], a[1]], [a[2], a[3]], [x, y]]); }
    else if (lc === 's' || lc === 'q') { const a = [ox + n(), oy + n(), ox + n(), oy + n()]; x = a[2]; y = a[3]; push(`${lc.toUpperCase()}${a.join(' ')}`, [[a[0], a[1]], [x, y]]); }
    else if (lc === 'a') { const rx = n(), ry = n(), rot = n(), la = n(), sw = n(); const px = x, py = y; x = ox + n(); y = oy + n(); push(`A${rx} ${ry} ${rot} ${la} ${sw} ${x} ${y}`, [[x, y], [Math.min(px, x) - 0, Math.min(py, y)]]); }
    else throw new Error(`comando ${cmd}`);
    void ARGS;
  }
  return subs.map((s) => ({ d: s.d, box: { x: s.box[0], y: s.box[1], w: s.box[2] - s.box[0], h: s.box[3] - s.box[1] } }));
}

// ---------------------------------------------------------------- otimização

/** Escala (média geométrica, √|det|) de uma lista de transformações SVG. */
export function transformScale(str) {
  let det = 1;
  for (const m of String(str ?? '').matchAll(/(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g)) {
    const a = m[2].split(/[\s,]+/).filter(Boolean).map(Number);
    if (m[1] === 'matrix') det *= Math.abs(a[0] * a[3] - a[1] * a[2]);
    else if (m[1] === 'scale') det *= Math.abs(a[0] * (a.length > 1 ? a[1] : a[0]));
  }
  return Math.sqrt(det) || 1;
}

/** Path → segmentos absolutos { c, a } (c em maiúscula: M L C S Q T A Z; H/V viram L). */
export function parsePath(d) {
  const ARGS = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };
  let i = 0, cmd = null, x = 0, y = 0, sx = 0, sy = 0;
  const segs = [];
  const ws = () => { while (i < d.length && /[\s,]/.test(d[i])) i++; };
  const num = () => {
    ws();
    const m = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/i.exec(d.slice(i, i + 40));
    if (!m) throw new Error(`path inválido perto de "${d.slice(i, i + 20)}"`);
    i += m[0].length;
    return parseFloat(m[0]);
  };
  const flag = () => { ws(); const c = d[i++]; if (c !== '0' && c !== '1') throw new Error('flag de arco inválida'); return Number(c); };
  for (;;) {
    ws();
    if (i >= d.length) break;
    if (/[a-z]/i.test(d[i])) cmd = d[i++];
    else if (!cmd) throw new Error('path sem comando inicial');
    const lc = cmd.toLowerCase(), rel = cmd !== cmd.toUpperCase();
    if (lc === 'z') { segs.push({ c: 'Z', a: [] }); x = sx; y = sy; continue; }
    const v = [];
    for (let k = 0; k < ARGS[lc]; k++) v.push(lc === 'a' && (k === 3 || k === 4) ? flag() : num());
    const ox = rel ? x : 0, oy = rel ? y : 0;
    if (lc === 'm') { x = ox + v[0]; y = oy + v[1]; sx = x; sy = y; segs.push({ c: 'M', a: [x, y] }); cmd = rel ? 'l' : 'L'; }
    else if (lc === 'l' || lc === 't') { x = ox + v[0]; y = oy + v[1]; segs.push({ c: lc.toUpperCase(), a: [x, y] }); }
    else if (lc === 'h') { x = ox + v[0]; segs.push({ c: 'L', a: [x, y] }); }
    else if (lc === 'v') { y = oy + v[0]; segs.push({ c: 'L', a: [x, y] }); }
    else if (lc === 'c') { const a = [ox + v[0], oy + v[1], ox + v[2], oy + v[3], ox + v[4], oy + v[5]]; x = a[4]; y = a[5]; segs.push({ c: 'C', a }); }
    else if (lc === 's' || lc === 'q') { const a = [ox + v[0], oy + v[1], ox + v[2], oy + v[3]]; x = a[2]; y = a[3]; segs.push({ c: lc.toUpperCase(), a }); }
    else if (lc === 'a') { x = ox + v[5]; y = oy + v[6]; segs.push({ c: 'A', a: [v[0], v[1], v[2], v[3], v[4], x, y] }); }
  }
  return segs;
}

/**
 * Reescreve um path menor sem mudar o desenho: funde retas colineares
 * (distância do vértice ≤ tol), tira a reta que só volta ao início antes do
 * Z, arredonda a `digits` casas e escolhe por segmento a forma absoluta ou
 * relativa mais curta (H/V quando cabe).
 */
export function optimizePath(d, digits = 2, tol = 0, { fillOnly = false, buttStroke = false } = {}) {
  let segs = parsePath(d);
  // Só preenchimento: subpath sem área (todos os pontos colineares) não pinta
  // nada. Com traço de ponta reta (butt), um subpath reto que fica todo sobre
  // uma reta já traçada antes no mesmo path também não acrescenta nada.
  if ((fillOnly || buttStroke) && tol > 0) {
    const groups = [];
    for (const sg of segs) {
      if (sg.c === 'M' || !groups.length) groups.push([]);
      groups.at(-1).push(sg);
    }
    const flat = (g) => {
      const pts = [];
      for (const sg of g) {
        if (sg.c === 'A') return false; // arco: tem área mesmo com pontos alinhados
        for (let k = 0; k + 1 < sg.a.length; k += 2) pts.push([sg.a[k], sg.a[k + 1]]);
      }
      if (pts.length < 2) return true;
      const [x0, y0] = pts[0];
      let far = pts[0], fd = 0;
      for (const p of pts) { const q = Math.hypot(p[0] - x0, p[1] - y0); if (q > fd) { fd = q; far = p; } }
      if (!fd) return true;
      const dx = far[0] - x0, dy = far[1] - y0;
      return pts.every(([x, y]) => Math.abs((x - x0) * dy - (y - y0) * dx) / fd <= tol);
    };
    const lines = [];
    const onLine = (pts) => lines.some(([ax, ay, bx, by]) => {
      const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
      return L > 0 && pts.every(([x, y]) => Math.abs((x - ax) * dy - (y - ay) * dx) / L <= tol && ((x - ax) * dx + (y - ay) * dy) / L >= -tol && ((x - ax) * dx + (y - ay) * dy) / L <= L + tol);
    });
    const kept = [];
    for (const g of groups) {
      const isFlat = flat(g);
      if (isFlat && fillOnly) continue;
      const pts = g.filter((sg) => sg.c !== 'Z').map((sg) => sg.a.slice(-2));
      if (isFlat && buttStroke && g.every((sg) => sg.c === 'M' || sg.c === 'L') && onLine(pts)) continue;
      // Retas soltas encadeadas na mesma direção (M a L b, M b L c) viram uma (M a L c).
      const prev = kept.at(-1);
      if (buttStroke && g.length === 2 && g[1].c === 'L' && prev?.length === 2 && prev[1].c === 'L') {
        const [ax, ay] = prev[0].a, [bx, by] = prev[1].a, [px, py] = g[0].a, [cx, cy] = g[1].a;
        const dx = cx - ax, dy = cy - ay, L = Math.hypot(dx, dy);
        if (Math.hypot(px - bx, py - by) <= tol && L > 0 && Math.abs((bx - ax) * dy - (by - ay) * dx) / L <= tol && (bx - ax) * (cx - bx) + (by - ay) * (cy - by) > 0) {
          prev[1] = { c: 'L', a: [cx, cy] };
          lines.push([ax, ay, cx, cy]);
          continue;
        }
      }
      kept.push(g);
      let p = null, st = null;
      for (const sg of g) {
        if (sg.c === 'M') { p = st = sg.a; continue; }
        const e = sg.c === 'Z' ? st : sg.a.slice(-2);
        if ((sg.c === 'L' || sg.c === 'Z') && p) lines.push([p[0], p[1], e[0], e[1]]);
        p = e;
      }
    }
    segs = kept.length ? kept.flat() : segs.slice(0, 2);
  }
  // Fusão de retas colineares, na geometria original.
  const out = [];
  let start = [0, 0];
  const endOf = (s) => (s.c === 'Z' ? null : s.a.slice(-2));
  let cur = [0, 0];
  for (let k = 0; k < segs.length; k++) {
    let s = segs[k];
    if (s.c === 'M') start = s.a;
    if (s.c === 'C' && tol > 0) {
      const [x0, y0] = cur, [x3, y3] = [s.a[4], s.a[5]];
      const dx = x3 - x0, dy = y3 - y0, L = Math.hypot(dx, dy);
      const pts = [[s.a[0], s.a[1]], [s.a[2], s.a[3]]];
      // Curva de comprimento zero: não pinta nem muda o ponto (só preenchimento).
      if (fillOnly && !L && pts.every(([x, y]) => Math.hypot(x - x0, y - y0) <= tol) && segs[k + 1]?.c !== 'S') continue;
      // Curva reta (controles sobre a corda): vira reta.
      if (L && segs[k + 1]?.c !== 'S' && pts.every(([x, y]) => {
        const t = ((x - x0) * dx + (y - y0) * dy) / L;
        return Math.abs((x - x0) * dy - (y - y0) * dx) / L <= tol && t >= -tol && t <= L + tol;
      })) s = { c: 'L', a: [x3, y3] };
    }
    if (s.c === 'L' && tol > 0) {
      const prev = out.at(-1);
      if (prev?.c === 'L' && prev.from) {
        const [x0, y0] = prev.from, [x1, y1] = prev.a, [x2, y2] = s.a;
        const dx = x2 - x0, dy = y2 - y0, len = Math.hypot(dx, dy);
        const dist = len ? Math.abs((x1 - x0) * dy - (y1 - y0) * dx) / len : Math.hypot(x1 - x0, y1 - y0);
        const dot = (x1 - x0) * (x2 - x1) + (y1 - y0) * (y2 - y1);
        if (dist <= tol && dot >= 0) { prev.a = [x2, y2]; cur = [x2, y2]; continue; }
      }
      // Reta até o início do subpath seguida de Z: o Z já fecha.
      if (segs[k + 1]?.c === 'Z' && Math.hypot(s.a[0] - start[0], s.a[1] - start[1]) <= tol && !(prev?.c === 'M')) { cur = s.a; continue; }
      out.push({ ...s, from: cur });
      cur = s.a;
      continue;
    }
    out.push(s);
    cur = s.c === 'Z' ? start : endOf(s);
  }
  // Emissão.
  const f = 10 ** digits;
  const r = (v) => { const q = Math.round(v * f) / f; return Object.is(q, -0) ? 0 : q; };
  const n = (v) => fmt(v, digits);
  let s = '', last = null, px = 0, py = 0, sx = 0, sy = 0;
  const emit = (letter, toks) => {
    let piece = letter === last && letter.toLowerCase() !== 'm' ? '' : letter;
    let str = s + piece;
    for (const t of toks) {
      if (/[\d.]$/.test(str) && (/^\d/.test(t) || (t[0] === '.' && !/\.\d*$/.test(str)))) str += ' ';
      str += t;
    }
    return str;
  };
  for (const seg of out) {
    if (seg.c === 'Z') { s += last === 'z' || last === 'Z' ? '' : 'z'; last = 'z'; px = sx; py = sy; continue; }
    const a = seg.a.map((v, k) => (seg.c === 'A' && (k === 3 || k === 4) ? v : r(v)));
    const isPt = (k) => !(seg.c === 'A' && k < 5);
    const relv = a.map((v, k) => (isPt(k) ? r(v - ((seg.c === 'A' ? k - 5 : k) % 2 ? py : px)) : v));
    const tok = (v, k) => (seg.c === 'A' && (k === 3 || k === 4) ? String(v) : n(v));
    let cands;
    if (seg.c === 'L') {
      const [x, y] = a, [dx, dy] = relv;
      cands = dy === 0 && y === py ? [['H', [n(x)]], ['h', [n(dx)]]] : dx === 0 && x === px ? [['V', [n(y)]], ['v', [n(dy)]]] : [['L', [n(x), n(y)]], ['l', [n(dx), n(dy)]]];
    } else {
      cands = [[seg.c, a.map(tok)], [seg.c.toLowerCase(), relv.map(tok)]];
    }
    // Primeiro M do path é sempre absoluto.
    if (seg.c === 'M' && !s) cands = [cands[0]];
    let best = null;
    for (const [L, toks] of cands) {
      const str = emit(L, toks);
      if (!best || str.length < best[0].length) best = [str, L];
    }
    s = best[0];
    last = best[1];
    [px, py] = a.slice(-2);
    if (seg.c === 'M') { sx = px; sy = py; }
  }
  return s;
}

const parseStopColor = (c) => {
  if (!c) return { r: 0, g: 0, b: 0 };
  let m = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(c.trim());
  if (m) {
    const h = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1];
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }
  m = /^rgb\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)\s*\)$/i.exec(c.trim());
  if (m) return { r: +m[1], g: +m[2], b: +m[3] };
  if (/^white$/i.test(c)) return { r: 255, g: 255, b: 255 };
  if (/^black$/i.test(c)) return { r: 0, g: 0, b: 0 };
  return null;
};

/** Tira paradas de gradiente que a interpolação das vizinhas já reproduz (±2/255). */
export function simplifyStops(grad) {
  const stops = grad.children.filter((c) => c.name === 'stop');
  if (stops.length < 3 || stops.length !== grad.children.filter((c) => c.name).length) return;
  let prev = 0;
  const pts = [];
  for (const st of stops) {
    const o = st.attrs.offset ?? '0';
    let v = /%$/.test(o) ? parseFloat(o) / 100 : parseFloat(o);
    if (Number.isNaN(v)) return;
    v = Math.max(prev, Math.min(1, Math.max(0, v)));
    prev = v;
    const c = parseStopColor(st.attrs['stop-color']);
    if (!c) return;
    pts.push({ o: v, c: [c.r, c.g, c.b, st.attrs['stop-opacity'] === undefined ? 1 : parseFloat(st.attrs['stop-opacity'])], node: st });
  }
  const fits = (i, j) => {
    const A = pts[i], B = pts[j];
    for (let k = i + 1; k < j; k++) {
      const P = pts[k];
      if (B.o === A.o) { if (P.c.some((v, q) => Math.abs(v - (q < 3 ? A.c[q] : A.c[q])) > (q < 3 ? 2 : 0.01)) && P.c.some((v, q) => Math.abs(v - B.c[q]) > (q < 3 ? 2 : 0.01))) return false; continue; }
      const t = (P.o - A.o) / (B.o - A.o);
      for (let q = 0; q < 4; q++) if (Math.abs(P.c[q] - (A.c[q] + (B.c[q] - A.c[q]) * t)) > (q < 3 ? 2 : 0.01)) return false;
    }
    return true;
  };
  const keep = new Set([0, pts.length - 1]);
  let i = 0;
  while (i < pts.length - 1) {
    let j = i + 1;
    while (j + 1 < pts.length && fits(i, j + 1)) j++;
    keep.add(j);
    i = j;
  }
  const kept = new Set([...keep].map((k) => pts[k].node));
  for (const p of pts) if (kept.has(p.node)) p.node.attrs.offset = String(Math.round(p.o * 1e4) / 1e4);
  grad.children = grad.children.filter((c) => c.name !== 'stop' || kept.has(c));
}

/**
 * roundTree + paths otimizados com precisão proporcional à escala acumulada
 * (erro ≤ ~0.02 unidade do azulejo de 64) e paradas de gradiente redundantes
 * fora. Conteúdo em objectBoundingBox mantém precisão alta.
 */
export function optimizeTree(svg) {
  roundTree(svg, 2, { paths: false });
  const visit = (node, scale, bbox, stroke, inDefs, cap) => {
    if (node.name === 'linearGradient' || node.name === 'radialGradient') simplifyStops(node);
    if (node.attrs.stroke !== undefined) stroke = node.attrs.stroke;
    if (node.attrs['stroke-linecap'] !== undefined) cap = node.attrs['stroke-linecap'];
    if (node.attrs['stroke-dasharray'] !== undefined && node.attrs['stroke-dasharray'] !== 'none') cap = 'dash';
    if (node.name === 'defs' || node.name === 'symbol' || node.name === 'pattern') inDefs = true;
    const clip = node.name === 'clipPath' || inDefs === 'clip';
    if (node.name === 'clipPath') inDefs = 'clip';
    const sc = scale * (node.attrs.transform ? transformScale(node.attrs.transform) : 1);
    const ob = bbox || node.attrs.clipPathUnits === 'objectBoundingBox' || node.attrs.maskContentUnits === 'objectBoundingBox' || node.attrs.patternContentUnits === 'objectBoundingBox';
    if (node.attrs.d) {
      const digits = ob ? 4 : Math.max(0, Math.min(3, Math.ceil(Math.log10(sc / 0.04))));
      const fillOnly = clip || (!inDefs && (stroke === undefined || stroke === 'none'));
      node.attrs.d = optimizePath(node.attrs.d, digits, ob ? 0 : 0.005 / sc, { fillOnly, buttStroke: !fillOnly && !inDefs && (cap === undefined || cap === 'butt') });
    }
    for (const c of node.children ?? []) if (c.name) visit(c, sc, ob, stroke, inDefs, cap);
  };
  visit(svg, 1, false, undefined, false, undefined);
}
