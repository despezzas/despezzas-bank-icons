<p align="center">
  <img src="{{ASSETS}}/banner.png" alt="Despezzas Bank Icons: {{COUNT}} logos de bancos e cartões" width="100%">
</p>

# @despezzas/bank-icons

Os logos de bancos e cartões do [Despezzas](https://despezzas.com) para React: **{{COUNT}} instituições de {{COUNTRIES}} países**, todas no mesmo formato de azulejo quadrado com cantos arredondados, prontas para listas de contas, seletores e extratos.

- **Um formato só**: 64×64, cantos de raio 14, a marca original centralizada e no mesmo tamanho óptico. Lado a lado, nenhum logo parece maior ou menor que o outro.
- **A marca de cada banco, sem redesenho**: forma e cores originais, sobre a cor de fundo da própria marca.
- **Visíveis em qualquer tema**: logos de fundo branco ganham um contorno fino, então não somem em telas claras.
- **SVG inline, zero dependências** e *tree-shakeable*: o bundle leva só os logos que você importa.
- **Busca pelo nome**: `findBankLogo('Itaú')` resolve nomes com ou sem acento, apelidos e o endereço antigo do logo.
- **Funcionam em Server Components** (Next.js App Router): não usam hooks.

## Sumário

- [Instalação](#instalação)
- [Uso rápido](#uso-rápido)
- [Logo pelo nome do banco](#logo-pelo-nome-do-banco)
- [Receitas](#receitas)
- [Acessibilidade](#acessibilidade)
- [API](#api)
- [Catálogo](#catálogo)

## Instalação

O pacote vive no repositório `despezzas-bank-icons`, com o `dist/` já gerado, e é instalado direto do git.

Yarn (2 ou mais novo):

```jsonc
// package.json
{
  "dependencies": {
    "@despezzas/bank-icons": "git@github.com:despezzas/despezzas-bank-icons.git#workspace=@despezzas/bank-icons"
  }
}
```

pnpm:

```jsonc
{
  "dependencies": {
    "@despezzas/bank-icons": "github:despezzas/despezzas-bank-icons#path:/packages/react"
  }
}
```

Num monorepo, aponte o workspace para `packages/react`. Requer React 18 ou 19.

## Uso rápido

```tsx
import { NubankLogo, ItauLogo, BancoDoBrasilLogo } from '@despezzas/bank-icons';

export function Example() {
  return (
    <>
      <NubankLogo />                                 {/* 32px, decorativo */}
      <ItauLogo size={48} title="Itaú" />
      <BancoDoBrasilLogo size="2rem" className="shadow-sm" />
    </>
  );
}
```

Cada logo é um `<svg>` comum: aceita `className`, `style`, `onClick` e qualquer outro atributo de SVG, e encaminha a `ref`. O nome do componente é o slug em PascalCase mais `Logo` (`banco-do-brasil` → `BancoDoBrasilLogo`); slugs que começam com número ganham o prefixo `Bank` (`99-pay` → `Bank99PayLogo`).

O azulejo já tem os cantos arredondados. Para outro formato, recorte por fora:

```tsx
<span className="inline-flex overflow-hidden rounded-full">
  <NubankLogo size={40} />
</span>
```

## Logo pelo nome do banco

Quando o banco vem da API como texto, use a entrada `@despezzas/bank-icons/all`. Ela importa todos os logos, então use-a só onde o banco é dinâmico.

```tsx
import { findBankLogo } from '@despezzas/bank-icons/all';

function AccountLogo({ bank }: { bank: string }) {
  const Logo = findBankLogo(bank);
  return Logo ? <Logo size={36} title={bank} /> : <GenericBankIcon />;
}
```

`findBankLogo` aceita:

| Entrada | Exemplo |
|---|---|
| Nome de exibição | `'Banco do Brasil'` |
| Apelido, com ou sem acento, espaços ou caixa | `'itau'`, `'MercadoPago'`, `'Bradescard'` |
| Slug | `'banco-do-brasil'` |
| Endereço antigo do logo, ou só o nome do arquivo | `'https://cdn.despezzas.com.br/…/nubank.svg'`, `'nubank.svg'` |

Alguns nomes existem em mais de um país (HSBC, BBVA, Citi…). Passe o país para desempatar:

```ts
findBankLogo('HSBC', { country: 'MX' });
```

Também exportados: `findBankSlug` (devolve o slug), `bankLogos` (slug → componente), `bankCatalog` (slug, nomes e países de cada banco) e `normalizeBankName`.

## Receitas

### Seletor de conta

```tsx
import { bankCatalog, bankLogos } from '@despezzas/bank-icons/all';

<select>
  {bankCatalog
    .filter((b) => b.countries.includes('BR'))
    .map((b) => (
      <option key={b.slug} value={b.slug}>{b.names[0]}</option>
    ))}
</select>;
```

### Item de lista

```tsx
<li className="flex items-center gap-3">
  <NubankLogo size={36} />
  <div>
    <p className="font-medium">Nubank</p>
    <p className="text-sm text-zinc-500">Conta corrente</p>
  </div>
</li>
```

### Imagem estática

Cada logo também existe como arquivo em `dist/svg/<slug>.svg` na raiz do repositório, para `<img>`, e-mail ou Figma.

## Acessibilidade

- Sem `title`, o logo é decorativo (`aria-hidden`): use quando o nome do banco já aparece ao lado.
- Com `title`, ele vira `role="img"` com o nome anunciado.

## API

`<XxxLogo {...props} />`

| Prop | Tipo | Padrão | |
|---|---|---|---|
| `size` | `number \| string` | `32` | Largura e altura. |
| `title` | `string` | — | Rótulo acessível. |
| `className`, `style`, … | atributos de SVG | — | Repassados ao `<svg>`. |
| `ref` | `Ref<SVGSVGElement>` | — | |

Tipos exportados: `BankLogo`, `BankLogoProps` e, em `/all`, `BankSlug`, `BankCountry`, `BankCatalogEntry`, `FindBankOptions`.

## Catálogo

<img src="{{ASSETS}}/catalog.png" alt="Os {{COUNT}} logos" width="100%">

{{CATALOG}}

## Marcas

Os logos são marcas registradas das respectivas instituições e aparecem aqui só para identificá-las.

## Licença

© Despezzas. Todos os direitos reservados.
