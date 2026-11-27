// Roda DENTRO do Chrome, depois de paper-core.js (carregado por
// scripts/square.mjs). Achata cada azulejo montado (fundo + marca dentro de
// grupos com transform, clip-path e máscara) em formas soltas no espaço
// 64×64: cada forma visível vira um path com a matriz acumulada aplicada aos
// pontos, recortes e máscaras viram interseção/diferença de geometria (Paper.js)
// e gradientes ganham as coordenadas finais. Escreve o JSON em <pre id="dz-out">.
//
// Saída por slug: { items: [...], warnings: [...] }; item =
//   { keep: '<rect…/>' }                       (fundo sólido/contorno, intactos)
//   { d, paint, grad?, clip? }                 (path no espaço 64)
(() => {
  paper.setup(new paper.Size(64, 64));
  const NS = 'http://www.w3.org/2000/svg';
  const SHAPES = new Set(['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'line']);
  const NONRENDER = 'defs,clipPath,mask,symbol,pattern,marker,linearGradient,radialGradient';
  const out = {};

  const D = (m) => new DOMMatrix([m.a, m.b, m.c, m.d, m.e, m.f]);
  const toRoot = (root, el) => D(root.getScreenCTM()).inverse().multiply(D(el.getScreenCTM()));
  const own = (el) => { const t = el.transform?.baseVal?.consolidate(); return t ? D(t.matrix) : new DOMMatrix(); };
  const pm = (m) => new paper.Matrix(m.a, m.b, m.c, m.d, m.e, m.f);
  const det = (m) => Math.abs(m.a * m.d - m.b * m.c);
  // Semelhança (rotação/reflexão + escala uniforme): colunas ortogonais e do mesmo tamanho.
  const simil = (m, tol) => {
    const l1 = Math.hypot(m.a, m.b), l2 = Math.hypot(m.c, m.d);
    return Math.abs(m.a * m.c + m.b * m.d) <= tol * l1 * l2 && Math.abs(l1 - l2) <= tol * Math.max(l1, l2);
  };
  const similar = (m) => simil(m, 1e-4);
  const area = (it) => (it ? Math.abs(it.area) : 0);

  /**
   * Path → só M/L/C/Z absolutos (arcos e quadráticas viram cúbicas): o Paper.js
   * tropeça em arcos degenerados (raio zero, início = fim).
   */
  function normalize(d) {
    const ARGS = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };
    let i = 0, cmd = null, x = 0, y = 0, sx = 0, sy = 0, pc = null, pq = null;
    let out = '';
    const ws = () => { while (i < d.length && /[\s,]/.test(d[i])) i++; };
    const num = () => {
      ws();
      const m = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/i.exec(d.slice(i, i + 40));
      if (!m) throw new Error(`path inválido perto de "${d.slice(i, i + 20)}"`);
      i += m[0].length;
      return parseFloat(m[0]);
    };
    const flag = () => { ws(); const c = d[i++]; if (c !== '0' && c !== '1') throw new Error('flag de arco inválida'); return c === '1'; };
    const C = (x1, y1, x2, y2, ex, ey) => { out += `C${x1} ${y1} ${x2} ${y2} ${ex} ${ey}`; };
    const arc = (x0, y0, rx, ry, phi, large, sweep, x1, y1) => {
      if (x0 === x1 && y0 === y1) return;
      rx = Math.abs(rx); ry = Math.abs(ry);
      if (!rx || !ry) { out += `L${x1} ${y1}`; return; }
      const cp = Math.cos(phi * Math.PI / 180), sp = Math.sin(phi * Math.PI / 180);
      const dx = (x0 - x1) / 2, dy = (y0 - y1) / 2;
      const x1p = cp * dx + sp * dy, y1p = -sp * dx + cp * dy;
      const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
      if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
      const sign = large === sweep ? -1 : 1;
      const num2 = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
      const co = sign * Math.sqrt(Math.max(0, num2 / (rx * rx * y1p * y1p + ry * ry * x1p * x1p)));
      const cxp = co * (rx * y1p) / ry, cyp = co * -(ry * x1p) / rx;
      const cx = cp * cxp - sp * cyp + (x0 + x1) / 2, cy = sp * cxp + cp * cyp + (y0 + y1) / 2;
      const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
      let t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
      let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
      if (!sweep && dt > 0) dt -= 2 * Math.PI;
      if (sweep && dt < 0) dt += 2 * Math.PI;
      const n = Math.max(1, Math.ceil(Math.abs(dt) / (Math.PI / 2) - 1e-9));
      const h = dt / n, k = (4 / 3) * Math.tan(h / 4);
      const P = (t) => [cx + rx * Math.cos(t) * cp - ry * Math.sin(t) * sp, cy + rx * Math.cos(t) * sp + ry * Math.sin(t) * cp];
      const Dv = (t) => [-rx * Math.sin(t) * cp - ry * Math.cos(t) * sp, -rx * Math.sin(t) * sp + ry * Math.cos(t) * cp];
      for (let j = 0; j < n; j++) {
        const a = t1 + j * h, b = a + h;
        const [ax, ay] = P(a), [bx, by] = j === n - 1 ? [x1, y1] : P(b), [dax, day] = Dv(a), [dbx, dby] = Dv(b);
        C(ax + k * dax, ay + k * day, bx - k * dbx, by - k * dby, bx, by);
      }
    };
    for (;;) {
      ws();
      if (i >= d.length) break;
      if (/[a-z]/i.test(d[i])) cmd = d[i++];
      else if (!cmd) throw new Error('path sem comando inicial');
      const lc = cmd.toLowerCase(), rel = cmd !== cmd.toUpperCase();
      if (lc === 'z') { out += 'Z'; x = sx; y = sy; pc = pq = null; continue; }
      const v = [];
      for (let k = 0; k < ARGS[lc]; k++) v.push(lc === 'a' && (k === 3 || k === 4) ? flag() : num());
      const ox = rel ? x : 0, oy = rel ? y : 0;
      let nc = null, nq = null;
      if (lc === 'm') { x = ox + v[0]; y = oy + v[1]; sx = x; sy = y; out += `M${x} ${y}`; cmd = rel ? 'l' : 'L'; }
      else if (lc === 'l') { x = ox + v[0]; y = oy + v[1]; out += `L${x} ${y}`; }
      else if (lc === 'h') { x = ox + v[0]; out += `L${x} ${y}`; }
      else if (lc === 'v') { y = oy + v[0]; out += `L${x} ${y}`; }
      else if (lc === 'c') { const a = [ox + v[0], oy + v[1], ox + v[2], oy + v[3], ox + v[4], oy + v[5]]; C(...a); nc = [a[2], a[3]]; x = a[4]; y = a[5]; }
      else if (lc === 's') { const r = pc ? [2 * x - pc[0], 2 * y - pc[1]] : [x, y]; const a = [ox + v[0], oy + v[1], ox + v[2], oy + v[3]]; C(r[0], r[1], a[0], a[1], a[2], a[3]); nc = [a[0], a[1]]; x = a[2]; y = a[3]; }
      else if (lc === 'q' || lc === 't') {
        const q = lc === 'q' ? [ox + v[0], oy + v[1]] : pq ? [2 * x - pq[0], 2 * y - pq[1]] : [x, y];
        const e = lc === 'q' ? [ox + v[2], oy + v[3]] : [ox + v[0], oy + v[1]];
        C(x + (2 / 3) * (q[0] - x), y + (2 / 3) * (q[1] - y), e[0] + (2 / 3) * (q[0] - e[0]), e[1] + (2 / 3) * (q[1] - e[1]), e[0], e[1]);
        nq = q; x = e[0]; y = e[1];
      } else if (lc === 'a') { const ex = ox + v[5], ey = oy + v[6]; arc(x, y, v[0], v[1], v[2], v[3], v[4], ex, ey); x = ex; y = ey; }
      pc = nc; pq = nq;
    }
    return out;
  }

  /** Geometria de uma forma (sem o transform dela), já levada por `m`. */
  function shapeData(el) {
    const n = (k) => { const v = el.getAttribute(k); return v === null ? 0 : parseFloat(v) || 0; };
    switch (el.localName) {
      case 'path': return el.getAttribute('d') ?? '';
      case 'rect': {
        const x = n('x'), y = n('y'), w = n('width'), h = n('height');
        if (w <= 0 || h <= 0) return '';
        let rx = el.hasAttribute('rx') ? n('rx') : null, ry = el.hasAttribute('ry') ? n('ry') : null;
        if (rx === null) rx = ry ?? 0; if (ry === null) ry = rx;
        rx = Math.min(Math.max(rx, 0), w / 2); ry = Math.min(Math.max(ry, 0), h / 2);
        if (!rx || !ry) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
        return `M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}V${y + h - ry}A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z`;
      }
      case 'circle': case 'ellipse': {
        const cx = n('cx'), cy = n('cy');
        const rx = el.localName === 'circle' ? n('r') : n('rx'), ry = el.localName === 'circle' ? n('r') : n('ry');
        if (rx <= 0 || ry <= 0) return '';
        return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;
      }
      case 'line': return `M${n('x1')} ${n('y1')}L${n('x2')} ${n('y2')}`;
      case 'polygon': case 'polyline': {
        const v = (el.getAttribute('points') ?? '').trim().split(/[\s,]+/).filter(Boolean);
        if (v.length < 4) return '';
        return 'M' + v.join(' ') + (el.localName === 'polygon' ? 'Z' : '');
      }
    }
    return '';
  }

  function geom(el, m) {
    const d = normalize(shapeData(el));
    if (!d.trim()) return null;
    let it = paper.PathItem.create(d);
    it.remove();
    it.transform(pm(m));
    it.fillRule = getComputedStyle(el).fillRule === 'evenodd' ? 'evenodd' : 'nonzero';
    return it;
  }

  const rectPath = (x, y, w, h) => new paper.Path.Rectangle({ point: [x, y], size: [w, h], insert: false });
  const unite = (a, b) => (a ? a.unite(b, { insert: false }) : b);

  /** Região (no espaço 64) de um <clipPath> aplicado em `ref`. */
  function clipRegion(root, clip, ref, warnings) {
    let m = toRoot(root, ref);
    if (clip.getAttribute('clipPathUnits') === 'objectBoundingBox') {
      const b = ref.getBBox();
      m = m.multiply(new DOMMatrix([b.width, 0, 0, b.height, b.x, b.y]));
    }
    m = m.multiply(own(clip));
    let region = null;
    for (const k of clip.children) {
      if (!SHAPES.has(k.localName)) { if (k.localName === 'use' || k.localName === 'text') warnings.push(`clip com <${k.localName}>`); continue; }
      const g = geom(k, m.multiply(own(k)));
      if (!g) continue;
      g.fillRule = getComputedStyle(k).clipRule === 'evenodd' ? 'evenodd' : 'nonzero';
      region = unite(region, g);
    }
    return region ?? rectPath(0, 0, 0, 0);
  }

  /** Região de uma <mask> feita de formas brancas (somam) e pretas (tiram). */
  function maskRegion(root, mask, ref, warnings) {
    const b = ref.getBBox();
    let m = toRoot(root, ref);
    // Retângulo da máscara.
    const units = mask.getAttribute('maskUnits') ?? 'objectBoundingBox';
    const num = (k, d) => { const v = mask.getAttribute(k); if (v === null) return d; return /%$/.test(v) ? parseFloat(v) / 100 : parseFloat(v); };
    let rx = num('x', -0.1), ry = num('y', -0.1), rw = num('width', 1.2), rh = num('height', 1.2);
    if (units === 'objectBoundingBox') { rx = b.x + rx * b.width; ry = b.y + ry * b.height; rw *= b.width; rh *= b.height; }
    const box = rectPath(rx, ry, rw, rh);
    box.transform(pm(m));
    if (mask.getAttribute('maskContentUnits') === 'objectBoundingBox') m = m.multiply(new DOMMatrix([b.width, 0, 0, b.height, b.x, b.y]));
    let region = null;
    let ok = true;
    const visit = (node, mm, op) => {
      for (const k of node.children) {
        const cs = getComputedStyle(k);
        if (cs.display === 'none') continue;
        const km = mm.multiply(own(k));
        if (k.localName === 'g') { if (+cs.opacity < 1) ok = false; visit(k, km, op); continue; }
        if (!SHAPES.has(k.localName)) continue;
        if (cs.stroke !== 'none') ok = false;
        if (cs.fill === 'none') continue;
        const col = /^rgba?\(([^)]+)\)/.exec(cs.fill);
        const a = +cs.opacity * +cs.fillOpacity * (col && col[1].split(',')[3] !== undefined ? +col[1].split(',')[3] : 1);
        if (!col) { ok = false; continue; }
        const [r, g, bl] = col[1].split(',').map(Number);
        const lum = mask.getAttribute('mask-type') === 'alpha' || cs.maskType === 'alpha' ? 1 : (0.2125 * r + 0.7154 * g + 0.0721 * bl) / 255;
        const v = lum * a;
        const gm = geom(k, km);
        if (!gm) continue;
        if (v > 0.99) region = unite(region, gm);
        else if (v < 0.01) { if (region) region = region.subtract(gm, { insert: false }); }
        else ok = false;
      }
    };
    visit(mask, m, 1);
    if (!ok) warnings.push('máscara com tons intermediários: tratada como recorte');
    return (region ?? rectPath(0, 0, 0, 0)).intersect(box, { insert: false });
  }

  /** Gradiente com coordenadas finais. Devolve markup do <…Gradient>. */
  function gradient(root, el, id, newId, warnings) {
    const g = root.querySelector(`[id="${id}"]`);
    if (!g) return null;
    // Atributos e paradas seguindo href.
    const chain = [];
    for (let n = g, k = 0; n && k < 5; k++) {
      chain.push(n);
      const h = n.getAttribute('href') ?? n.getAttribute('xlink:href');
      n = h ? root.querySelector(`[id="${h.slice(1)}"]`) : null;
    }
    const attr = (k) => { for (const n of chain) if (n.hasAttribute(k)) return n.getAttribute(k); return null; };
    const stopsHost = chain.find((n) => n.querySelector('stop'));
    const stops = stopsHost ? [...stopsHost.querySelectorAll('stop')].map((s) => {
      const cs = getComputedStyle(s);
      return { offset: s.getAttribute('offset') ?? '0', color: cs.stopColor, opacity: cs.stopOpacity };
    }) : [];
    const radial = g.localName === 'radialGradient';
    const bbox = (attr('gradientUnits') ?? 'objectBoundingBox') === 'objectBoundingBox';
    let m = toRoot(root, el);
    if (bbox) { const b = el.getBBox(); m = m.multiply(new DOMMatrix([b.width, 0, 0, b.height, b.x, b.y])); }
    const gt = attr('gradientTransform');
    if (gt) { const t = document.createElementNS(NS, 'g'); t.setAttribute('transform', gt); m = m.multiply(own(t)); }
    const n = (k, d) => { const v = attr(k); if (v === null) return d; return /%$/.test(v) ? parseFloat(v) / 100 : parseFloat(v); };
    const P = (x, y) => new DOMPoint(x, y).matrixTransform(m);
    const f = (v) => +v.toFixed(3);
    let geo;
    let extra = '';
    const near = !similar(m) && radial && simil(m, 0.1);
    if (near) warnings.push('gradiente radial levemente elíptico aproximado por círculo');
    if (similar(m) || near) {
      if (radial) {
        const cx = n('cx', 0.5), cy = n('cy', 0.5), r = n('r', 0.5);
        const c = P(cx, cy), fp = P(n('fx', cx), n('fy', cy));
        geo = `cx="${f(c.x)}" cy="${f(c.y)}" r="${f(r * Math.sqrt(det(m)))}"` + (attr('fx') !== null || attr('fy') !== null ? ` fx="${f(fp.x)}" fy="${f(fp.y)}"` : '');
      } else {
        const a = P(n('x1', 0), n('y1', 0)), b = P(n('x2', 1), n('y2', 0));
        geo = `x1="${f(a.x)}" y1="${f(a.y)}" x2="${f(b.x)}" y2="${f(b.y)}"`;
      }
    } else {
      // Escala não uniforme (gradiente radial esticado pela caixa): a matriz fica no gradiente.
      warnings.push('gradiente com escala não uniforme: matriz mantida em gradientTransform');
      geo = radial ? `cx="${n('cx', 0.5)}" cy="${n('cy', 0.5)}" r="${n('r', 0.5)}"` + (attr('fx') !== null ? ` fx="${n('fx', 0.5)}" fy="${n('fy', 0.5)}"` : '')
        : `x1="${n('x1', 0)}" y1="${n('y1', 0)}" x2="${n('x2', 1)}" y2="${n('y2', 0)}"`;
      extra = ` gradientTransform="matrix(${[m.a, m.b, m.c, m.d, m.e, m.f].map((v) => +v.toFixed(5)).join(' ')})"`;
    }
    const spread = attr('spreadMethod');
    const tag = radial ? 'radialGradient' : 'linearGradient';
    return `<${tag} id="${newId}" ${geo} gradientUnits="userSpaceOnUse"${extra}${spread && spread !== 'pad' ? ` spreadMethod="${spread}"` : ''}>${stops
      .map((s) => `<stop offset="${s.offset}" stop-color="${s.color}"${+s.opacity < 1 ? ` stop-opacity="${s.opacity}"` : ''}/>`).join('')}</${tag}>`;
  }

  for (const holder of document.querySelectorAll('[data-slug]')) {
    const slug = holder.dataset.slug;
    const root = holder.querySelector('svg');
    const warnings = [];
    const items = [];
    let gid = 0;
    const regionCache = new Map();
    try {
      for (const el of root.querySelectorAll('*')) {
        if (el.hasAttribute('data-dz-keep')) { const c = el.cloneNode(true); c.removeAttribute('data-dz-keep'); items.push({ keep: c.outerHTML.replace(/ xmlns="[^"]*"/, '') }); continue; }
        if (el.closest(NONRENDER)) continue;
        if (el.localName === 'text' || el.localName === 'use' || el.localName === 'image') { warnings.push(`<${el.localName}> ignorado`); continue; }
        if (!SHAPES.has(el.localName)) continue;
        // Visível?
        let hidden = false, opacity = 1;
        const refs = [];
        for (let n = el; n && n !== root; n = n.parentElement) {
          const cs = getComputedStyle(n);
          if (cs.display === 'none') hidden = true;
          opacity *= +cs.opacity;
          for (const k of ['clip-path', 'mask']) {
            const mm = /url\(["']?#([^"')]+)/.exec(n.getAttribute(k) ?? '');
            if (mm) refs.push({ kind: k, id: mm[1], on: n });
          }
        }
        const cs = getComputedStyle(el);
        if (hidden || cs.visibility === 'hidden' || opacity < 0.004) continue;
        const hasFill = cs.fill !== 'none' && +cs.fillOpacity > 0;
        const sw = parseFloat(cs.strokeWidth) || 0;
        const hasStroke = cs.stroke !== 'none' && +cs.strokeOpacity > 0 && sw > 0;
        if (!hasFill && !hasStroke) continue;
        const m = toRoot(root, el);
        let g = geom(el, m);
        if (!g || (!g.length && !hasStroke)) continue;
        const scale = Math.sqrt(det(m));
        // Recortes e máscaras dos ancestrais (e do próprio elemento).
        let region = null;
        for (const r of refs) {
          const key = `${r.kind}:${r.id}:${r.on.dataset?.dzi ?? ''}:${r.on === el ? 'self' : ''}`;
          let reg = regionCache.get(key);
          if (!reg) {
            const node = root.querySelector(`[id="${r.id}"]`);
            if (!node) continue;
            reg = r.kind === 'clip-path' ? clipRegion(root, node, r.on, warnings) : maskRegion(root, node, r.on, warnings);
            if (r.on !== el) regionCache.set(key, reg);
          }
          region = region ? region.intersect(reg, { insert: false }) : reg;
        }
        let clip = null;
        if (region) {
          // A região já contém a forma (com traço)? Então o recorte não muda nada.
          const pad = hasStroke ? (sw * scale) / 2 + (cs.strokeLinejoin === 'miter' ? sw * scale * 2 : 0) : 0;
          const b = g.bounds;
          const rp = rectPath(b.x - pad, b.y - pad, b.width + 2 * pad, b.height + 2 * pad);
          const outside = area(rp.subtract(region, { insert: false }));
          if (outside > 1e-4) {
            if (hasStroke) {
              // Recorte que só apara a metade externa de um traço fino (moldura
              // do Figma do tamanho da forma): diferença abaixo de 1/3 px a 64.
              const inner = area(rectPath(b.x, b.y, b.width, b.height).subtract(region, { insert: false }));
              if (inner < 1e-4 && sw * scale <= 0.6) warnings.push('recorte que só aparava traço fino descartado');
              else clip = region.getPathData(null, 3);
            }
            else {
              const cut = g.intersect(region, { insert: false });
              if (area(cut) < 1e-4) continue;
              const before = area(g);
              // Interseção que não tirou nada (> 99.99%) fica com a forma original.
              if (Math.abs(before - area(cut)) > 1e-4 * Math.max(1, before)) g = cut;
            }
          }
        }
        const paint = { opacity: +opacity.toFixed(4) };
        if (hasFill) {
          paint.fill = cs.fill;
          paint.fillOpacity = +cs.fillOpacity;
          paint.fillRule = cs.fillRule;
        } else paint.fill = 'none';
        if (hasStroke) {
          paint.stroke = cs.stroke;
          paint.strokeOpacity = +cs.strokeOpacity;
          paint.strokeWidth = +(sw * scale).toFixed(3);
          paint.linecap = cs.strokeLinecap;
          paint.linejoin = cs.strokeLinejoin;
          paint.miterlimit = +cs.strokeMiterlimit;
          if (cs.strokeDasharray !== 'none') paint.dash = cs.strokeDasharray.split(/[\s,]+/).map((v) => +(parseFloat(v) * scale).toFixed(3)).join(' ');
          if (!similar(m)) warnings.push('traço sob escala não uniforme (largura média)');
        }
        const grads = [];
        for (const k of ['fill', 'stroke']) {
          const u = /url\(["']?#([^"')]+)/.exec(paint[k] ?? '');
          if (!u) continue;
          const nid = `g${gid++}`;
          const mk = gradient(root, el, u[1], nid, warnings);
          if (mk) { grads.push(mk); paint[k] = `url(#${nid})`; } else paint[k] = 'none';
        }
        const isBg = items.length === 0 && el === root.firstElementChild && el.localName === 'rect';
        items.push({ d: g.getPathData(null, 4), paint, grads, clip, bounds: [g.bounds.x, g.bounds.y, g.bounds.width, g.bounds.height], isBg });
      }
    } catch (e) {
      warnings.push(`falhou: ${e.message}`);
      items.length = 0;
      items.push({ error: String(e.stack) });
    }
    out[slug] = { items, warnings: [...new Set(warnings)] };
    paper.project.clear();
  }
  const pre = document.createElement('pre');
  pre.id = 'dz-out';
  pre.textContent = JSON.stringify(out);
  document.body.innerHTML = '';
  document.body.appendChild(pre);
})();
