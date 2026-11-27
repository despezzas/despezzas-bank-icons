// Confere que todo azulejo gerado é SVG puro e achatado (svg/, dist/svg/ e as
// strings embutidas nos pacotes React e Flutter): sem transform, clip-path, <g>,
// <image>, <pattern>, <text>, <use>, data: nem <svg> aninhado, e XML bem formado.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseXml, walk } from './svg.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(readFileSync(join(ROOT, 'catalog.json'), 'utf8'));
const FORBIDDEN = [/transform=/i, /clip-path/i, /<g[\s>/]/, /<image\b/i, /<pattern\b/i, /data:/i, /<mask\b/i, /<text\b/i, /<use\b/i, /<foreignObject\b/i, /<script\b/i];
const errors = [];

function check(where, svg) {
  for (const re of FORBIDDEN) if (re.test(svg)) errors.push(`${where}: contém ${re.source}`);
  if ((svg.match(/<svg\b/g) ?? []).length !== 1) errors.push(`${where}: <svg> aninhado`);
  if (!svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">')) errors.push(`${where}: cabeçalho fora do padrão`);
  // Bem formado: toda tag aberta fecha na ordem.
  const stack = [];
  for (const m of svg.matchAll(/<(\/?)([\w:-]+)[^>]*?(\/?)>/g)) {
    if (m[1]) { if (stack.pop() !== m[2]) { errors.push(`${where}: XML mal formado perto de </${m[2]}>`); break; } }
    else if (!m[3]) stack.push(m[2]);
  }
  if (stack.length) errors.push(`${where}: tags sem fechar (${stack.join(', ')})`);
  try { walk(parseXml(svg), () => {}); } catch (e) { errors.push(`${where}: ${e.message}`); }
}

for (const dir of ['svg', 'dist/svg']) {
  const files = readdirSync(join(ROOT, dir)).filter((f) => f.endsWith('.svg'));
  if (files.length !== catalog.length) errors.push(`${dir}: ${files.length} arquivos, catálogo tem ${catalog.length}`);
  for (const f of files) check(`${dir}/${f}`, readFileSync(join(ROOT, dir, f), 'utf8').trim());
}
const react = readFileSync(join(ROOT, 'packages/react/dist/index.js'), 'utf8');
for (const m of react.matchAll(/createLogo\('(\w+)', ("(?:[^"\\]|\\.)*")\)/g)) check(`react ${m[1]}`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${JSON.parse(m[2])}</svg>`);
const dart = readFileSync(join(ROOT, 'packages/flutter/lib/src/bank_logos.g.dart'), 'utf8');
for (const m of dart.matchAll(/DzBankLogoData\('([\w-]+)',.*?, '(<svg[^']*)'\)/g)) check(`flutter ${m[1]}`, m[2].replace(/\\(.)/g, '$1'));

if (errors.length) { console.error(errors.map((e) => '✗ ' + e).join('\n')); process.exit(1); }
console.log(`✓ svg puro: ${catalog.length} azulejos em svg/, dist/svg, React e Flutter`);
