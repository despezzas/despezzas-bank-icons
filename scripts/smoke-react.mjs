// Renderiza todos os logos no servidor e confere markup e busca.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as Logos from '../packages/react/dist/index.js';
import { bankCatalog, bankLogos, findBankLogo, findBankSlug } from '../packages/react/dist/all.js';

const fail = (msg) => { console.error('✗', msg); process.exit(1); };

for (const b of bankCatalog) {
  const C = bankLogos[b.slug];
  if (!C) fail(`${b.slug}: sem componente`);
  if (!Object.values(Logos).includes(C)) fail(`${b.slug}: componente não exportado no índice`);
  const html = renderToStaticMarkup(h(C, { size: 40, title: b.names[0], className: 'x' }));
  if (!html.startsWith('<svg') || !html.includes('viewBox="0 0 64 64"')) fail(`${b.slug}: svg inválido`);
  if (!html.includes('width="40"') || !html.includes('class="x"')) fail(`${b.slug}: props ignoradas`);
  if (!html.includes('role="img"') || !html.includes('<title>')) fail(`${b.slug}: sem title`);
  for (const n of b.names) if (findBankSlug(n, { country: b.countries[0] }) !== b.slug && findBankSlug(n) === undefined) fail(`${b.slug}: nome "${n}" não encontrado`);
  if (findBankSlug(b.slug) !== b.slug) fail(`${b.slug}: slug não encontrado`);
}
if (Object.keys(bankLogos).length !== bankCatalog.length) fail('bankLogos e bankCatalog com tamanhos diferentes');

const plain = renderToStaticMarkup(h(Logos.NubankLogo));
if (!plain.includes('aria-hidden="true"') || !plain.includes('width="32"')) fail('padrões (size 32, decorativo) errados');

const cases = [
  ['Banco do Brasil', 'banco-do-brasil'],
  ['banco do brasil', 'banco-do-brasil'],
  ['ITAÚ', 'itau'],
  ['MercadoPago', 'mercado-pago'],
  ['Bradescard', 'bradesco'],
  ['https://cdn.despezzas.com.br/argentina-banks/astropay.svg', 'astropay'],
  ['astropay.svg', 'astropay'],
];
for (const [q, slug] of cases) if (findBankSlug(q) !== slug) fail(`findBankSlug(${q}) = ${findBankSlug(q)}, esperado ${slug}`);
if (findBankLogo('Banco do Brasil') !== Logos.BancoDoBrasilLogo) fail('findBankLogo não devolve o componente');
if (findBankLogo('nao existe') !== undefined) fail('findBankLogo deveria devolver undefined');
if (findBankSlug('HSBC', { country: 'MX' }) !== 'hsbc-mx') fail('country não desempata');

console.log(`✓ react: ${bankCatalog.length} logos renderizados, busca ok`);
