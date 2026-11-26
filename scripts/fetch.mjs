// Baixa o logo original (redondo) de cada banco do catálogo para source/.
//   node scripts/fetch.mjs [--force] [slug...]
// Sem --force, pula o que já foi baixado. Falhas são listadas no fim (exit 1).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(readFileSync(join(ROOT, 'catalog.json'), 'utf8'));
const args = process.argv.slice(2);
const force = args.includes('--force');
const only = args.filter((a) => !a.startsWith('--'));
const out = join(ROOT, 'source');
mkdirSync(out, { recursive: true });

const todo = catalog.filter((b) => (!only.length || only.includes(b.slug)) && (force || !existsSync(join(out, `${b.slug}.svg`))));
const failures = [];
let done = 0;

async function get(bank) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(bank.source, { headers: { 'User-Agent': 'despezzas-bank-icons-fetch' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const type = res.headers.get('content-type') ?? '';
      if (/image\/(png|jpe?g|webp)/.test(type)) {
        // Só raster: guardado para referência; precisa de uma fonte vetorial.
        writeFileSync(join(out, `${bank.slug}.${type.split('/')[1].replace('jpeg', 'jpg')}`), Buffer.from(await res.arrayBuffer()));
        throw new Error('só existe em raster (guardado em source/), precisa de SVG');
      }
      const text = await res.text();
      if (!/<svg\b/i.test(text)) throw new Error('resposta não é SVG');
      writeFileSync(join(out, `${bank.slug}.svg`), text);
      done++;
      return;
    } catch (e) {
      if (attempt === 3) failures.push(`${bank.slug}: ${e.message} (${bank.source})`);
      else await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
}

const queue = [...todo];
await Promise.all(Array.from({ length: 8 }, async () => { while (queue.length) await get(queue.shift()); }));
console.log(`fetch: ${done} baixados, ${catalog.length - todo.length} já existiam, ${failures.length} falhas`);
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
