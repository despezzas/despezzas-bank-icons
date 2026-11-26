// Lê catalog.json + svg/*.svg e gera:
//   packages/react/dist/       @despezzas/bank-icons (ESM + .d.ts; entrada "./all")
//   packages/flutter/lib/src/  bank_logos.g.dart
//   dist/svg/                  SVGs estáticos (para o CDN)
//   preview/index.html         galeria para revisar os logos
//   packages/*/README.md       a partir de docs/README.*.md
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GENERATED = 'GERADO por scripts/build.mjs a partir de catalog.json e svg/ — não edite à mão.';

// ---------------------------------------------------------------- leitura

const COUNTRY = { BR: 'Brasil', AR: 'Argentina', MX: 'México', UY: 'Uruguai', US: 'Estados Unidos', IN: 'Índia' };
const COUNTRY_ORDER = ['BR', 'AR', 'MX', 'UY', 'US', 'IN'];

const raw = JSON.parse(readFileSync(join(ROOT, 'catalog.json'), 'utf8'));
const pascal = (s) => {
  const p = s.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());
  return /^\d/.test(p) ? `Bank${p}` : p;
};
const camel = (s) => pascal(s).replace(/^./, (c) => c.toLowerCase());
const DART_RESERVED = new Set('abstract as assert async await break case catch class const continue covariant default deferred do dynamic else enum export extends extension external factory false final finally for function get hide if implements import in interface is late library mixin new null of on operator part required rethrow return set show static super switch sync this throw true try type typedef var void when while with yield all find bySlug'.split(' '));

const banks = raw.map((b) => {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(b.slug)) throw new Error(`slug inválido: ${b.slug}`);
  const file = join(ROOT, 'svg', `${b.slug}.svg`);
  if (!existsSync(file)) throw new Error(`falta svg/${b.slug}.svg — rode npm run square`);
  const svg = readFileSync(file, 'utf8').trim();
  if (!svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"')) throw new Error(`${b.slug}: SVG fora do padrão`);
  if (/<(script|foreignObject|image)\b|\son\w+=|href="(?!#)/i.test(svg)) throw new Error(`${b.slug}: SVG com conteúdo proibido`);
  const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  for (const id of ids) if (!id.startsWith(`dzb-${b.slug}-`)) throw new Error(`${b.slug}: id sem prefixo "${id}"`);
  const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  const component = `${pascal(b.slug)}Logo`;
  const dart = camel(b.slug);
  if (DART_RESERVED.has(dart)) throw new Error(`${b.slug}: nome Dart reservado`);
  return { ...b, svg, inner, component, dart };
});
const bySlug = new Map(banks.map((b) => [b.slug, b]));
if (bySlug.size !== banks.length) throw new Error('slugs repetidos no catálogo');

// ---------------------------------------------------------------- React

function buildReact() {
  const out = join(ROOT, 'packages/react/dist');
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });

  const index = `// ${GENERATED}
import { createElement as h, forwardRef } from 'react';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function createLogo(displayName, inner) {
  const Logo = forwardRef(function DzBankLogo({ size = 32, title, ...rest }, ref) {
    return h('svg', {
      ref,
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: '0 0 64 64',
      width: size,
      height: size,
      role: title ? 'img' : undefined,
      'aria-hidden': title ? undefined : true,
      ...rest,
      dangerouslySetInnerHTML: { __html: title ? '<title>' + esc(title) + '</title>' + inner : inner },
    });
  });
  Logo.displayName = displayName;
  return Logo;
}

${banks.map((b) => `export const ${b.component} = /*#__PURE__*/ createLogo('${b.component}', ${JSON.stringify(b.inner)});`).join('\n')}
`;

  const indexDts = `// ${GENERATED}
import type { ForwardRefExoticComponent, RefAttributes, SVGProps } from 'react';

export interface BankLogoProps extends Omit<SVGProps<SVGSVGElement>, 'ref' | 'children' | 'dangerouslySetInnerHTML'> {
  /** Lado em px (ou qualquer unidade CSS). Padrão 32. */
  size?: number | string;
  /** Rótulo acessível. Sem ele o logo é decorativo (aria-hidden). */
  title?: string;
}

export type BankLogo = ForwardRefExoticComponent<BankLogoProps & RefAttributes<SVGSVGElement>>;

${banks.map((b) => `/** ${b.names.join(', ')} (${b.countries.join(', ')}) */\nexport declare const ${b.component}: BankLogo;`).join('\n')}
`;

  // Índice para busca: nome normalizado → slugs; URL antiga e nome do arquivo → slug.
  const catalog = banks.map((b) => ({ slug: b.slug, names: b.names, countries: b.countries }));
  const urls = Object.fromEntries(banks.map((b) => [b.source, b.slug]));
  const all = `// ${GENERATED}
import * as L from './index.js';

export const bankCatalog = /*#__PURE__*/ Object.freeze(${JSON.stringify(catalog)});

export const bankLogos = /*#__PURE__*/ Object.freeze({
${banks.map((b) => `  ${JSON.stringify(b.slug)}: L.${b.component},`).join('\n')}
});

const sources = ${JSON.stringify(urls)};

/** Minúsculas, sem acento e só letras/números: "Itaú Unibanco" → "itauunibanco". */
export function normalizeBankName(s) {
  return String(s ?? '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

let index;
function nameIndex() {
  if (index) return index;
  index = new Map();
  for (const b of bankCatalog) {
    for (const key of [b.slug, ...b.names].map(normalizeBankName)) {
      if (!index.has(key)) index.set(key, []);
      if (!index.get(key).includes(b)) index.get(key).push(b);
    }
  }
  return index;
}

/**
 * Slug do banco a partir do nome (ou apelido), do slug, da URL antiga do logo
 * ou só do nome do arquivo. Com \`country\`, prefere o banco daquele país.
 */
export function findBankSlug(nameOrUrl, options) {
  const q = String(nameOrUrl ?? '').trim();
  if (!q) return undefined;
  if (sources[q]) return sources[q];
  if (Object.prototype.hasOwnProperty.call(bankLogos, q)) return q;
  const file = /([^/?#]+?)(?:\\.(?:svg|png|jpe?g|webp))?(?:[?#].*)?$/i.exec(q);
  if (/[/.]/.test(q) && file) {
    const name = decodeURIComponent(file[1]);
    for (const [url, slug] of Object.entries(sources)) {
      if (url.endsWith('/' + name + '.svg') || url.endsWith('/' + name + '.png') || url.endsWith('/' + name + '.jpg')) return slug;
    }
    if (bankLogos[name]) return name;
  }
  const hits = nameIndex().get(normalizeBankName(q));
  if (!hits) return undefined;
  const country = options?.country?.toUpperCase();
  return (country && hits.find((b) => b.countries.includes(country)) || hits[0]).slug;
}

/** Componente do logo, ou undefined. Ex.: findBankLogo('Banco do Brasil'). */
export function findBankLogo(nameOrUrl, options) {
  const slug = findBankSlug(nameOrUrl, options);
  return slug ? bankLogos[slug] : undefined;
}
`;
  const allDts = `// ${GENERATED}
import type { BankLogo } from './index.js';

export type BankSlug =
${banks.map((b) => `  | '${b.slug}'`).join('\n')};

export type BankCountry = ${[...new Set(banks.flatMap((b) => b.countries))].map((c) => `'${c}'`).join(' | ')};

export interface BankCatalogEntry {
  slug: BankSlug;
  /** Nome de exibição primeiro, depois apelidos. */
  names: readonly string[];
  countries: readonly BankCountry[];
}

export declare const bankCatalog: readonly BankCatalogEntry[];
export declare const bankLogos: Readonly<Record<BankSlug, BankLogo>>;

export interface FindBankOptions {
  /** Desempata nomes repetidos entre países (ex.: 'HSBC'). */
  country?: BankCountry | (string & {});
}

export declare function normalizeBankName(name: string): string;
export declare function findBankSlug(nameOrUrl: string | null | undefined, options?: FindBankOptions): BankSlug | undefined;
export declare function findBankLogo(nameOrUrl: string | null | undefined, options?: FindBankOptions): BankLogo | undefined;
export type { BankLogo, BankLogoProps } from './index.js';
`;
  writeFileSync(join(out, 'index.js'), index);
  writeFileSync(join(out, 'index.d.ts'), indexDts);
  writeFileSync(join(out, 'all.js'), all);
  writeFileSync(join(out, 'all.d.ts'), allDts);
}

// ---------------------------------------------------------------- Flutter

function buildFlutter() {
  const out = join(ROOT, 'packages/flutter/lib/src');
  mkdirSync(out, { recursive: true });
  const str = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\$/g, '\\$')}'`;
  const list = (xs) => `[${xs.map(str).join(', ')}]`;
  const dart = `// ${GENERATED}
// ignore_for_file: lines_longer_than_80_chars
import 'bank_logo_data.dart';

/// Os ${banks.length} logos de bancos e cartões do Despezzas.
abstract final class DzBankLogos {
${banks.map((b) => `  /// ${b.names.join(', ')} (${b.countries.join(', ')})\n  static const ${b.dart} = DzBankLogoData(${str(b.slug)}, ${list(b.names)}, ${list(b.countries)}, ${str(b.svg)});`).join('\n')}

  /// Todos, na ordem do catálogo.
  static const all = <DzBankLogoData>[${banks.map((b) => b.dart).join(', ')}];

  /// Logo pelo slug exato, ou \`null\`.
  static DzBankLogoData? bySlug(String slug) => bankLogoBySlug(slug);

  /// Logo pelo nome, apelido, slug, URL antiga ou nome do arquivo, ou \`null\`.
  static DzBankLogoData? find(String? nameOrUrl, {String? country}) => findBankLogo(nameOrUrl, country: country);

  /// URL antiga do logo (CDN) → slug.
  static const sources = <String, String>{
${banks.map((b) => `    ${str(b.source)}: ${str(b.slug)},`).join('\n')}
  };
}
`;
  writeFileSync(join(out, 'bank_logos.g.dart'), dart);
}

// ---------------------------------------------------------------- SVGs estáticos

function buildSvgs() {
  const out = join(ROOT, 'dist/svg');
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  for (const b of banks) copyFileSync(join(ROOT, 'svg', `${b.slug}.svg`), join(out, `${b.slug}.svg`));
}

// ---------------------------------------------------------------- preview

function groups() {
  return COUNTRY_ORDER.map((c) => [c, banks.filter((b) => b.countries.includes(c))]).filter(([, bs]) => bs.length);
}

function buildPreview() {
  mkdirSync(join(ROOT, 'preview'), { recursive: true });
  const sections = groups()
    .map(([c, bs]) => `<h2>${COUNTRY[c]} <small>${bs.length}</small></h2>
<div class="grid">${bs
      .map((b) => `<button class="card" data-q="${(b.slug + ' ' + b.names.join(' ')).toLowerCase()}" data-c="${b.component}" title="${b.names.join(' · ')}"><svg viewBox="0 0 64 64">${b.inner}</svg><span>${b.names[0]}</span><code>${b.slug}</code></button>`)
      .join('\n')}</div>`)
    .join('\n');
  const html = `<!doctype html>
<html lang="pt-BR" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Despezzas Bank Icons</title>
<!-- ${GENERATED} -->
<style>
:root{--bg:#f4f5f7;--panel:#fff;--text:#1b1d22;--muted:#6b7080;--line:#e2e4ea}
:root[data-theme=dark]{--bg:#0b0d10;--panel:#14171c;--text:#eef0f3;--muted:#8a909c;--line:#22262d}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:14px/1.4 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
header{position:sticky;top:0;z-index:1;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;padding:16px 24px;background:var(--bg);border-bottom:1px solid var(--line)}
h1{font-size:18px;margin:0}h1 small,h2 small{color:var(--muted);font-weight:400;margin-left:6px}
h2{font-size:15px;margin:28px 24px 10px}
.controls{display:flex;gap:8px;flex-wrap:wrap}
.controls>*{height:34px;border-radius:8px;border:1px solid var(--line);background:var(--panel);color:var(--text);padding:0 10px;font:inherit}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(128px,1fr));gap:8px;margin:0 24px;padding:12px;background:var(--panel);border-radius:18px}
.card{display:flex;flex-direction:column;align-items:center;gap:4px;padding:14px 6px 10px;border-radius:12px;border:1px solid transparent;background:none;color:inherit;cursor:pointer;font:inherit;min-width:0}
.card:hover{border-color:var(--line)}
.card svg{width:var(--size,48px);height:var(--size,48px);margin-bottom:6px}
.card span{font-size:12px;text-align:center;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.card code{font-size:10.5px;color:var(--muted)}
.card.copied code{color:#12b862}
</style>
</head>
<body>
<header>
  <h1>Despezzas Bank Icons <small>${banks.length} logos · clique para copiar o componente React</small></h1>
  <div class="controls">
    <input type="search" id="q" placeholder="Buscar banco">
    <select id="size" aria-label="Tamanho"><option>24px</option><option>32px</option><option selected>48px</option><option>64px</option></select>
    <button id="theme" type="button">Tema</button>
  </div>
</header>
${sections}
<div style="height:40px"></div>
<script>
const $ = (s) => document.querySelector(s);
$('#size').onchange = (e) => document.body.style.setProperty('--size', e.target.value);
$('#theme').onclick = () => { const r = document.documentElement; r.dataset.theme = r.dataset.theme === 'dark' ? 'light' : 'dark'; };
$('#q').oninput = (e) => {
  const q = e.target.value.trim().toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
  document.querySelectorAll('.card').forEach((c) => (c.hidden = q && !c.dataset.q.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').includes(q)));
};
document.querySelectorAll('.card').forEach((c) => (c.onclick = () => {
  try { navigator.clipboard.writeText(c.dataset.c); } catch {}
  c.classList.add('copied'); setTimeout(() => c.classList.remove('copied'), 900);
}));
</script>
</body>
</html>
`;
  writeFileSync(join(ROOT, 'preview/index.html'), html);
}

// ---------------------------------------------------------------- READMEs

function buildReadmes() {
  const version = JSON.parse(readFileSync(join(ROOT, 'packages/react/package.json'), 'utf8')).version;
  const fill = (tpl, vars) => tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (!(k in vars)) throw new Error(`placeholder desconhecido {{${k}}}`);
    return vars[k];
  });
  // Os READMEs ficam em packages/<x>/: imagens do repo por caminho relativo.
  const common = { ASSETS: '../../assets', COUNT: String(banks.length), VERSION: version, COUNTRIES: String(groups().length) };
  const catalog = (cell) =>
    groups()
      .map(([c, bs]) => {
        const rows = [];
        for (let k = 0; k < bs.length; k += 4) rows.push(`<tr>\n${bs.slice(k, k + 4).map(cell).join('\n')}\n</tr>`);
        return `### ${COUNTRY[c]} (${bs.length})\n\n<table>\n${rows.join('\n')}\n</table>`;
      })
      .join('\n\n');
  const img = (b) => `<img src="../../dist/svg/${b.slug}.svg" width="40" height="40" alt="${b.names[0]}">`;
  const aka = (b) => (b.names.length > 1 ? `<br><sub>${b.names.slice(1).join(', ')}</sub>` : '');

  writeFileSync(
    join(ROOT, 'packages/react/README.md'),
    `<!-- ${GENERATED} Edite docs/README.react.md. -->\n` +
      fill(readFileSync(join(ROOT, 'docs/README.react.md'), 'utf8'), {
        ...common,
        CATALOG: catalog((b) => `<td align="center" valign="top" width="25%">${img(b)}<br><b>${b.names[0]}</b>${aka(b)}<br><sub><code>${b.component}</code></sub></td>`),
      }),
  );
  writeFileSync(
    join(ROOT, 'packages/flutter/README.md'),
    `<!-- ${GENERATED} Edite docs/README.flutter.md. -->\n` +
      fill(readFileSync(join(ROOT, 'docs/README.flutter.md'), 'utf8'), {
        ...common,
        CATALOG: catalog((b) => `<td align="center" valign="top" width="25%">${img(b)}<br><b>${b.names[0]}</b>${aka(b)}<br><sub><code>DzBankLogos.${b.dart}</code></sub></td>`),
      }),
  );
}

buildReact();
buildFlutter();
buildSvgs();
buildPreview();
buildReadmes();
console.log(`build: ${banks.length} logos → react, flutter, dist/svg, preview`);
