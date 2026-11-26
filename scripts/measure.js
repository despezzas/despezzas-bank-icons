// Roda DENTRO do Chrome (carregado por scripts/square.mjs). Mede cada SVG de
// origem: caixa de cada forma no espaço do viewBox, cor computada e se a forma
// cobre o círculo/quadrado inteiro (candidata a fundo). Escreve o JSON em <pre>.
(() => {
  const RESOURCE = 'defs,clipPath,mask,pattern,linearGradient,radialGradient,symbol,marker';
  const PAINTED = new Set(['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'line', 'use', 'text']);
  const out = {};

  const applyBox = (m, b) => {
    const pts = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]].map(([x, y]) => new DOMPoint(x, y).matrixTransform(m));
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  };
  const toRoot = (root, el) => root.getScreenCTM().inverse().multiply(el.getScreenCTM());
  const opacityChain = (el, root) => {
    let o = 1;
    for (let n = el; n && n !== root.parentNode; n = n.parentNode) o *= Number(getComputedStyle(n).opacity);
    return o;
  };
  const refs = (el, root) => {
    const r = [];
    for (let n = el; n && n !== root.parentNode; n = n.parentNode) {
      for (const k of ['clip-path', 'mask']) {
        const v = n.getAttribute?.(k);
        const m = v && /url\(#([^)]+)\)/.exec(v);
        if (m) r.push({ kind: k, id: m[1], on: n.dataset.dzi });
      }
    }
    return r;
  };

  for (const holder of document.querySelectorAll('[data-slug]')) {
    const slug = holder.dataset.slug;
    const root = holder.querySelector('svg');
    const [vx, vy, vw, vh] = root.getAttribute('viewBox').split(/[\s,]+/).map(Number);
    const V = Math.min(vw, vh);
    const cx = vx + vw / 2, cy = vy + vh / 2;
    const els = [];
    const resources = {};
    // Mede filhos de recursos (clipPath/mask) clonando para um grupo visível.
    const probe = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    probe.setAttribute('opacity', '0');
    root.appendChild(probe);
    for (const res of root.querySelectorAll('clipPath,mask')) {
      const boxes = [];
      for (const child of res.querySelectorAll('*')) {
        if (!PAINTED.has(child.localName)) continue;
        const c = child.cloneNode(true);
        c.removeAttribute('clip-path');
        c.removeAttribute('mask');
        probe.appendChild(c);
        try { boxes.push({ ...applyBox(toRoot(root, c), c.getBBox()), tag: child.localName, fill: getComputedStyle(c).fill }); } catch {}
        c.remove();
      }
      const region = res.localName === 'mask' && res.getAttribute('maskUnits') === 'userSpaceOnUse' && res.hasAttribute('width')
        ? { x: +res.getAttribute('x') || 0, y: +res.getAttribute('y') || 0, w: +res.getAttribute('width'), h: +res.getAttribute('height') }
        : null;
      resources[res.id] = { kind: res.localName, boxes, region, transform: res.getAttribute('transform') };
    }
    probe.remove();

    // Pontos de teste: grade dentro do círculo inscrito (r = 0.44 V) e cantos.
    const ring = [];
    for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) {
      const x = (i / 4) * 0.44 * V, y = (j / 4) * 0.44 * V;
      if (x * x + y * y <= (0.44 * V) ** 2) ring.push([cx + x, cy + y]);
    }
    const corners = [[vx + 0.06 * vw, vy + 0.06 * vh], [vx + 0.94 * vw, vy + 0.06 * vh], [vx + 0.06 * vw, vy + 0.94 * vh], [vx + 0.94 * vw, vy + 0.94 * vh]];

    for (const el of root.querySelectorAll('[data-dzi]')) {
      if (!PAINTED.has(el.localName)) continue;
      const inRes = !!el.parentElement.closest(RESOURCE) || el.closest(RESOURCE) === el;
      if (inRes) continue;
      const cs = getComputedStyle(el);
      let box = null, covers = false, square = false, rim = false, frac = 0;
      try {
        const m = toRoot(root, el);
        box = applyBox(m, el.getBBox());
        const inv = m.inverse();
        const inside = ([x, y]) => { const p = new DOMPoint(x, y).matrixTransform(inv); return el.isPointInFill(p); };
        if (box.w >= 0.85 * vw && box.h >= 0.85 * vh && el.isPointInFill) {
          frac = ring.filter(inside).length / ring.length;
          covers = frac === 1;
          square = covers && corners.every(inside);
          // Borda inteira preenchida (círculo ou quadrado com letras vazadas).
          rim = Array.from({ length: 32 }, (_, a) => [cx + Math.cos(a * Math.PI / 16) * 0.45 * V, cy + Math.sin(a * Math.PI / 16) * 0.45 * V]).every(inside);
        }
      } catch {}
      els.push({
        i: Number(el.dataset.dzi),
        tag: el.localName,
        box,
        covers,
        square,
        rim,
        frac,
        fill: cs.fill,
        fillOpacity: Number(cs.fillOpacity),
        stroke: cs.stroke,
        strokeWidth: parseFloat(cs.strokeWidth) || 0,
        opacity: opacityChain(el, root),
        hidden: cs.display === 'none' || cs.visibility === 'hidden',
        refs: refs(el, root),
      });
    }
    out[slug] = { viewBox: [vx, vy, vw, vh], els, resources };
  }
  const pre = document.createElement('pre');
  pre.id = 'dz-out';
  pre.textContent = JSON.stringify(out);
  document.body.innerHTML = '';
  document.body.appendChild(pre);
})();
