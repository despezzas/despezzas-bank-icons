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

export function roundTree(svg, digits = 2) {
  walk(svg, (n) => {
    for (const k of Object.keys(n.attrs)) {
      if (k === 'd') n.attrs.d = roundPath(n.attrs.d, digits);
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
