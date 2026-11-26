<!-- GERADO por scripts/build.mjs a partir de catalog.json e svg/ — não edite à mão. Edite docs/README.react.md. -->
<p align="center">
  <img src="../../assets/banner.png" alt="Despezzas Bank Icons: 343 logos de bancos e cartões" width="100%">
</p>

# @despezzas/bank-icons

Os logos de bancos e cartões do [Despezzas](https://despezzas.com) para React: **343 instituições de 6 países**, todas no mesmo formato de azulejo quadrado com cantos arredondados, prontas para listas de contas, seletores e extratos.

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

<img src="../../assets/catalog.png" alt="Os 343 logos" width="100%">

### Brasil (83)

<table>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/99-pay.svg" width="40" height="40" alt="99 Pay"><br><b>99 Pay</b><br><sub><code>Bank99PayLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/acesso-bank.svg" width="40" height="40" alt="Acesso Bank"><br><b>Acesso Bank</b><br><sub><code>AcessoBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/agora.svg" width="40" height="40" alt="Agora"><br><b>Agora</b><br><sub>Ágora</sub><br><sub><code>AgoraLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/alelo.svg" width="40" height="40" alt="Alelo"><br><b>Alelo</b><br><sub><code>AleloLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/ame.svg" width="40" height="40" alt="Ame"><br><b>Ame</b><br><sub><code>AmeLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/amex.svg" width="40" height="40" alt="Amex"><br><b>Amex</b><br><sub><code>AmexLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/amex-br.svg" width="40" height="40" alt="Amex"><br><b>Amex</b><br><sub><code>AmexBrLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/avenue.svg" width="40" height="40" alt="Avenue"><br><b>Avenue</b><br><sub><code>AvenueLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/banco-do-brasil.svg" width="40" height="40" alt="Banco do Brasil"><br><b>Banco do Brasil</b><br><sub><code>BancoDoBrasilLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/bankme.svg" width="40" height="40" alt="Bankme"><br><b>Bankme</b><br><sub><code>BankmeLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/banrisul.svg" width="40" height="40" alt="Banrisul"><br><b>Banrisul</b><br><sub><code>BanrisulLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/binance.svg" width="40" height="40" alt="Binance"><br><b>Binance</b><br><sub><code>BinanceLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/bitybank.svg" width="40" height="40" alt="Bity Bank"><br><b>Bity Bank</b><br><sub><code>BitybankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/bmg.svg" width="40" height="40" alt="Bmg"><br><b>Bmg</b><br><sub><code>BmgLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/bradesco.svg" width="40" height="40" alt="Bradesco"><br><b>Bradesco</b><br><sub>Bradescard</sub><br><sub><code>BradescoLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/brb.svg" width="40" height="40" alt="BRB"><br><b>BRB</b><br><sub><code>BrbLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/bs2.svg" width="40" height="40" alt="Banco BS2"><br><b>Banco BS2</b><br><sub><code>Bs2Logo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/btg-pactual.svg" width="40" height="40" alt="BTG"><br><b>BTG</b><br><sub><code>BtgPactualLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/bv.svg" width="40" height="40" alt="BV"><br><b>BV</b><br><sub><code>BvLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/c6.svg" width="40" height="40" alt="C6 Bank"><br><b>C6 Bank</b><br><sub><code>C6Logo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/caixa.svg" width="40" height="40" alt="Caixa"><br><b>Caixa</b><br><sub><code>CaixaLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/caju.svg" width="40" height="40" alt="Cajú"><br><b>Cajú</b><br><sub><code>CajuLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/carrefour.svg" width="40" height="40" alt="Carrefour"><br><b>Carrefour</b><br><sub><code>CarrefourLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/carteira.svg" width="40" height="40" alt="Carteira"><br><b>Carteira</b><br><sub><code>CarteiraLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/citi.svg" width="40" height="40" alt="Citi Empresas"><br><b>Citi Empresas</b><br><sub><code>CitiLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/conta-simples.svg" width="40" height="40" alt="Conta Simples"><br><b>Conta Simples</b><br><sub><code>ContaSimplesLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/cora.svg" width="40" height="40" alt="Cora"><br><b>Cora</b><br><sub><code>CoraLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/credicard.svg" width="40" height="40" alt="Credicard"><br><b>Credicard</b><br><sub><code>CredicardLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/credicitrus.svg" width="40" height="40" alt="Sicoob Credicitrus"><br><b>Sicoob Credicitrus</b><br><sub><code>CredicitrusLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/credit-suisse.svg" width="40" height="40" alt="Credit Suisse"><br><b>Credit Suisse</b><br><sub><code>CreditSuisseLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/cresol.svg" width="40" height="40" alt="Cresol"><br><b>Cresol</b><br><sub><code>CresolLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/daycoval.svg" width="40" height="40" alt="Daycoval"><br><b>Daycoval</b><br><sub><code>DaycovalLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/digio.svg" width="40" height="40" alt="Digio"><br><b>Digio</b><br><sub><code>DigioLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/dock.svg" width="40" height="40" alt="Dock"><br><b>Dock</b><br><sub><code>DockLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/elo.svg" width="40" height="40" alt="Elo"><br><b>Elo</b><br><sub><code>EloLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/flash.svg" width="40" height="40" alt="Flash"><br><b>Flash</b><br><sub><code>FlashLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/hipercard.svg" width="40" height="40" alt="Hipercard"><br><b>Hipercard</b><br><sub><code>HipercardLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/infinitepay.svg" width="40" height="40" alt="Infinity Pay"><br><b>Infinity Pay</b><br><sub><code>InfinitepayLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/inter.svg" width="40" height="40" alt="Inter"><br><b>Inter</b><br><sub><code>InterLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/investimentos-bb.svg" width="40" height="40" alt="Investimentos BB"><br><b>Investimentos BB</b><br><sub><code>InvestimentosBbLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/ion.svg" width="40" height="40" alt="Íon"><br><b>Íon</b><br><sub><code>IonLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/itau.svg" width="40" height="40" alt="Itaú"><br><b>Itaú</b><br><sub><code>ItauLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/iti.svg" width="40" height="40" alt="Iti"><br><b>Iti</b><br><sub><code>ItiLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/mastercard.svg" width="40" height="40" alt="Mastercard"><br><b>Mastercard</b><br><sub><code>MastercardLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/meliuz.svg" width="40" height="40" alt="Méliuz"><br><b>Méliuz</b><br><sub><code>MeliuzLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/mercado-pago.svg" width="40" height="40" alt="Mercado Pago"><br><b>Mercado Pago</b><br><sub>MercadoPago</sub><br><sub><code>MercadoPagoLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/mercantil.svg" width="40" height="40" alt="Mercantil"><br><b>Mercantil</b><br><sub><code>MercantilLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/n26.svg" width="40" height="40" alt="N26"><br><b>N26</b><br><sub><code>N26Logo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/neon.svg" width="40" height="40" alt="Neon"><br><b>Neon</b><br><sub><code>NeonLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/next.svg" width="40" height="40" alt="Next"><br><b>Next</b><br><sub><code>NextLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/nordeste.svg" width="40" height="40" alt="Banco do Nordeste"><br><b>Banco do Nordeste</b><br><sub><code>NordesteLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/nu-invest.svg" width="40" height="40" alt="NuInvest"><br><b>NuInvest</b><br><sub><code>NuInvestLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/nubank.svg" width="40" height="40" alt="Nubank"><br><b>Nubank</b><br><sub><code>NubankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/openbank.svg" width="40" height="40" alt="Openbank"><br><b>Openbank</b><br><sub><code>OpenbankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/original.svg" width="40" height="40" alt="Banco Original"><br><b>Banco Original</b><br><sub><code>OriginalLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/pagseguro.svg" width="40" height="40" alt="PagBank"><br><b>PagBank</b><br><sub>PagSeguro</sub><br><sub><code>PagseguroLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/palmeiras.svg" width="40" height="40" alt="Palmeiras"><br><b>Palmeiras</b><br><sub><code>PalmeirasLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/pan.svg" width="40" height="40" alt="Pan"><br><b>Pan</b><br><sub><code>PanLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/paulista.svg" width="40" height="40" alt="Banco Paulista"><br><b>Banco Paulista</b><br><sub><code>PaulistaLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/paypal.svg" width="40" height="40" alt="Paypal"><br><b>Paypal</b><br><sub><code>PaypalLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/pernambucanas.svg" width="40" height="40" alt="Pernambucanas"><br><b>Pernambucanas</b><br><sub><code>PernambucanasLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/picpay.svg" width="40" height="40" alt="PicPay"><br><b>PicPay</b><br><sub><code>PicpayLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/players-bank.svg" width="40" height="40" alt="Players Bank"><br><b>Players Bank</b><br><sub><code>PlayersBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/porto-bank.svg" width="40" height="40" alt="Porto Bank"><br><b>Porto Bank</b><br><sub><code>PortoBankLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/rappi-bank.svg" width="40" height="40" alt="Rappi Bank"><br><b>Rappi Bank</b><br><sub><code>RappiBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/rchlo.svg" width="40" height="40" alt="Riachuelo"><br><b>Riachuelo</b><br><sub><code>RchloLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/recarga-pay.svg" width="40" height="40" alt="RercargaPay"><br><b>RercargaPay</b><br><sub><code>RecargaPayLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/renner.svg" width="40" height="40" alt="Renner"><br><b>Renner</b><br><sub><code>RennerLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/rico.svg" width="40" height="40" alt="Rico"><br><b>Rico</b><br><sub><code>RicoLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/safra.svg" width="40" height="40" alt="Safra"><br><b>Safra</b><br><sub><code>SafraLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/santander.svg" width="40" height="40" alt="Santander"><br><b>Santander</b><br><sub><code>SantanderLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/sicoob.svg" width="40" height="40" alt="Sicoob"><br><b>Sicoob</b><br><sub><code>SicoobLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/sicredi.svg" width="40" height="40" alt="Sicredi"><br><b>Sicredi</b><br><sub><code>SicrediLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/sofisa.svg" width="40" height="40" alt="Sofisa"><br><b>Sofisa</b><br><sub><code>SofisaLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/superdigital.svg" width="40" height="40" alt="Superdigital"><br><b>Superdigital</b><br><sub><code>SuperdigitalLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/swile.svg" width="40" height="40" alt="Swile"><br><b>Swile</b><br><sub><code>SwileLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/unicred.svg" width="40" height="40" alt="Unicred"><br><b>Unicred</b><br><sub><code>UnicredLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/uniprime.svg" width="40" height="40" alt="Uniprime"><br><b>Uniprime</b><br><sub><code>UniprimeLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/visa.svg" width="40" height="40" alt="Visa"><br><b>Visa</b><br><sub><code>VisaLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/will-bank.svg" width="40" height="40" alt="Will Bank"><br><b>Will Bank</b><br><sub><code>WillBankLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/woop.svg" width="40" height="40" alt="Woop"><br><b>Woop</b><br><sub><code>WoopLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/xp.svg" width="40" height="40" alt="XP Banking"><br><b>XP Banking</b><br><sub>XP Investimentos</sub><br><sub><code>XpLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/z1.svg" width="40" height="40" alt="Z1"><br><b>Z1</b><br><sub><code>Z1Logo</code></sub></td>
</tr>
</table>

### Argentina (48)

<table>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/astropay.svg" width="40" height="40" alt="AstroPay"><br><b>AstroPay</b><br><sub><code>AstropayLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/banco-bbva.svg" width="40" height="40" alt="BBVA"><br><b>BBVA</b><br><sub><code>BancoBbvaLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/banco-bica.svg" width="40" height="40" alt="Banco Bica"><br><b>Banco Bica</b><br><sub><code>BancoBicaLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/banco-ciudad.svg" width="40" height="40" alt="Banco Ciudad"><br><b>Banco Ciudad</b><br><sub><code>BancoCiudadLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/banco-coinag.svg" width="40" height="40" alt="Banco Coinag"><br><b>Banco Coinag</b><br><sub><code>BancoCoinagLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/banco-columbia.svg" width="40" height="40" alt="Banco Columbia"><br><b>Banco Columbia</b><br><sub><code>BancoColumbiaLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/banco-comafi.svg" width="40" height="40" alt="Banco Comafi"><br><b>Banco Comafi</b><br><sub><code>BancoComafiLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/banco-corrientes.svg" width="40" height="40" alt="Banco de Corrientes"><br><b>Banco de Corrientes</b><br><sub><code>BancoCorrientesLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/banco-credicoop.svg" width="40" height="40" alt="Banco Credicoop"><br><b>Banco Credicoop</b><br><sub><code>BancoCredicoopLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/banco-del-sol.svg" width="40" height="40" alt="Banco del Sol"><br><b>Banco del Sol</b><br><sub><code>BancoDelSolLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/banco-entre-rios.svg" width="40" height="40" alt="Banco Entre Rios"><br><b>Banco Entre Rios</b><br><sub><code>BancoEntreRiosLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/banco-galicia.svg" width="40" height="40" alt="Banco Galicia"><br><b>Banco Galicia</b><br><sub><code>BancoGaliciaLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/banco-hipotecario.svg" width="40" height="40" alt="Banco Hipotecario"><br><b>Banco Hipotecario</b><br><sub><code>BancoHipotecarioLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/banco-hsbc-ar.svg" width="40" height="40" alt="HSBC"><br><b>HSBC</b><br><sub><code>BancoHsbcArLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/banco-icbc.svg" width="40" height="40" alt="ICBC"><br><b>ICBC</b><br><sub><code>BancoIcbcLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/banco-macro.svg" width="40" height="40" alt="Banco Macro"><br><b>Banco Macro</b><br><sub><code>BancoMacroLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/banco-municipal.svg" width="40" height="40" alt="Banco Municipal"><br><b>Banco Municipal</b><br><sub><code>BancoMunicipalLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/banco-nacion-ar.svg" width="40" height="40" alt="Banco de la Nación"><br><b>Banco de la Nación</b><br><sub><code>BancoNacionArLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/banco-patagonia.svg" width="40" height="40" alt="Banco Patagonia"><br><b>Banco Patagonia</b><br><sub><code>BancoPatagoniaLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/banco-piano.svg" width="40" height="40" alt="Banco Piano"><br><b>Banco Piano</b><br><sub><code>BancoPianoLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/banco-provincia.svg" width="40" height="40" alt="Banco Provincia"><br><b>Banco Provincia</b><br><sub><code>BancoProvinciaLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/banco-san-juan.svg" width="40" height="40" alt="Banco San Juan"><br><b>Banco San Juan</b><br><sub><code>BancoSanJuanLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/banco-santa-cruz.svg" width="40" height="40" alt="Banco Santa Cruz"><br><b>Banco Santa Cruz</b><br><sub><code>BancoSantaCruzLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/banco-santa-fe.svg" width="40" height="40" alt="Banco Santa Fe"><br><b>Banco Santa Fe</b><br><sub><code>BancoSantaFeLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/banco-supervielle.svg" width="40" height="40" alt="Banco Supervielle"><br><b>Banco Supervielle</b><br><sub><code>BancoSupervielleLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/bancor.svg" width="40" height="40" alt="Bancor"><br><b>Bancor</b><br><sub><code>BancorLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/belo.svg" width="40" height="40" alt="Belo"><br><b>Belo</b><br><sub><code>BeloLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/bpn.svg" width="40" height="40" alt="BPN"><br><b>BPN</b><br><sub><code>BpnLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/brubank.svg" width="40" height="40" alt="Brubank"><br><b>Brubank</b><br><sub><code>BrubankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/buenbit.svg" width="40" height="40" alt="Buenbit"><br><b>Buenbit</b><br><sub><code>BuenbitLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/cabal.svg" width="40" height="40" alt="Cabal"><br><b>Cabal</b><br><sub><code>CabalLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/cencopay.svg" width="40" height="40" alt="Cencopay"><br><b>Cencopay</b><br><sub><code>CencopayLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/claro-pay.svg" width="40" height="40" alt="Claro Pay"><br><b>Claro Pay</b><br><sub><code>ClaroPayLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/cocos-crypto.svg" width="40" height="40" alt="Cocos Crypto"><br><b>Cocos Crypto</b><br><sub><code>CocosCryptoLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/cuenta-dni.svg" width="40" height="40" alt="Cuenta DNI"><br><b>Cuenta DNI</b><br><sub><code>CuentaDniLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/fiwind.svg" width="40" height="40" alt="Fiwind"><br><b>Fiwind</b><br><sub><code>FiwindLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/naranja-x.svg" width="40" height="40" alt="Naranja X"><br><b>Naranja X</b><br><sub><code>NaranjaXLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/openbank-ar.svg" width="40" height="40" alt="Openbank"><br><b>Openbank</b><br><sub><code>OpenbankArLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/personal-pay.svg" width="40" height="40" alt="Personal Pay"><br><b>Personal Pay</b><br><sub><code>PersonalPayLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/prex.svg" width="40" height="40" alt="Prex"><br><b>Prex</b><br><sub><code>PrexLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/ripio.svg" width="40" height="40" alt="Ripio"><br><b>Ripio</b><br><sub><code>RipioLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/takenos.svg" width="40" height="40" alt="Takenos"><br><b>Takenos</b><br><sub><code>TakenosLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/uala-ar.svg" width="40" height="40" alt="Ualá"><br><b>Ualá</b><br><sub><code>UalaArLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/wallbit.svg" width="40" height="40" alt="Wallbit"><br><b>Wallbit</b><br><sub><code>WallbitLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/yoy.svg" width="40" height="40" alt="Yoy"><br><b>Yoy</b><br><sub><code>YoyLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/itau.svg" width="40" height="40" alt="Itaú"><br><b>Itaú</b><br><sub><code>ItauLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/mercado-pago.svg" width="40" height="40" alt="Mercado Pago"><br><b>Mercado Pago</b><br><sub>MercadoPago</sub><br><sub><code>MercadoPagoLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/santander.svg" width="40" height="40" alt="Santander"><br><b>Santander</b><br><sub><code>SantanderLogo</code></sub></td>
</tr>
</table>

### México (22)

<table>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/nubank.svg" width="40" height="40" alt="Nubank"><br><b>Nubank</b><br><sub><code>NubankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/santander.svg" width="40" height="40" alt="Santander"><br><b>Santander</b><br><sub><code>SantanderLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/actinver.svg" width="40" height="40" alt="Actinver"><br><b>Actinver</b><br><sub><code>ActinverLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/albo.svg" width="40" height="40" alt="Albo"><br><b>Albo</b><br><sub><code>AlboLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/banbajio.svg" width="40" height="40" alt="BanBajío"><br><b>BanBajío</b><br><sub><code>BanbajioLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/banco-azteca.svg" width="40" height="40" alt="Banco Azteca"><br><b>Banco Azteca</b><br><sub><code>BancoAztecaLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/bancoppel.svg" width="40" height="40" alt="BanCoppel"><br><b>BanCoppel</b><br><sub><code>BancoppelLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/bankaool.svg" width="40" height="40" alt="Bankaool"><br><b>Bankaool</b><br><sub><code>BankaoolLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/banorte.svg" width="40" height="40" alt="Banorte"><br><b>Banorte</b><br><sub><code>BanorteLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/banregio.svg" width="40" height="40" alt="BanRegio"><br><b>BanRegio</b><br><sub><code>BanregioLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/bbva.svg" width="40" height="40" alt="BBVA"><br><b>BBVA</b><br><sub><code>BbvaLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/cibanco.svg" width="40" height="40" alt="CIBanco"><br><b>CIBanco</b><br><sub><code>CibancoLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/citibanamex.svg" width="40" height="40" alt="CitiBanamex"><br><b>CitiBanamex</b><br><sub><code>CitibanamexLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/hsbc-mx.svg" width="40" height="40" alt="HSBC"><br><b>HSBC</b><br><sub><code>HsbcMxLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/inbursa.svg" width="40" height="40" alt="Inbursa"><br><b>Inbursa</b><br><sub><code>InbursaLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/intercam.svg" width="40" height="40" alt="Intercam"><br><b>Intercam</b><br><sub><code>IntercamLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/klar.svg" width="40" height="40" alt="Klar"><br><b>Klar</b><br><sub><code>KlarLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/multiva.svg" width="40" height="40" alt="Multiva"><br><b>Multiva</b><br><sub><code>MultivaLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/sabadell.svg" width="40" height="40" alt="Sabadell"><br><b>Sabadell</b><br><sub><code>SabadellLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/scotiabank.svg" width="40" height="40" alt="Scotiabank"><br><b>Scotiabank</b><br><sub><code>ScotiabankLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/stori.svg" width="40" height="40" alt="Stori"><br><b>Stori</b><br><sub><code>StoriLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/uala.svg" width="40" height="40" alt="Ualá"><br><b>Ualá</b><br><sub><code>UalaLogo</code></sub></td>
</tr>
</table>

### Uruguai (11)

<table>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/itau.svg" width="40" height="40" alt="Itaú"><br><b>Itaú</b><br><sub><code>ItauLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/santander.svg" width="40" height="40" alt="Santander"><br><b>Santander</b><br><sub><code>SantanderLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/banco-hsbc.svg" width="40" height="40" alt="HSBC"><br><b>HSBC</b><br><sub><code>BancoHsbcLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/banco-nacion.svg" width="40" height="40" alt="Banco de la Nación"><br><b>Banco de la Nación</b><br><sub><code>BancoNacionLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/banco-republica.svg" width="40" height="40" alt="Banco República"><br><b>Banco República</b><br><sub><code>BancoRepublicaLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/bandes.svg" width="40" height="40" alt="Bandes"><br><b>Bandes</b><br><sub><code>BandesLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/bbva-uy.svg" width="40" height="40" alt="BBVA"><br><b>BBVA</b><br><sub><code>BbvaUyLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/bhu.svg" width="40" height="40" alt="BHU"><br><b>BHU</b><br><sub><code>BhuLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/citi-uy.svg" width="40" height="40" alt="Citi"><br><b>Citi</b><br><sub><code>CitiUyLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/heritage.svg" width="40" height="40" alt="Banque Heritage"><br><b>Banque Heritage</b><br><sub><code>HeritageLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/scotiabank-uy.svg" width="40" height="40" alt="Scotiabank"><br><b>Scotiabank</b><br><sub><code>ScotiabankUyLogo</code></sub></td>
</tr>
</table>

### Estados Unidos (117)

<table>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/1-first-bank.svg" width="40" height="40" alt="1First sBank"><br><b>1First sBank</b><br><sub><code>Bank1FirstBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/1st-source.svg" width="40" height="40" alt="1st Source"><br><b>1st Source</b><br><sub><code>Bank1stSourceLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/ally.svg" width="40" height="40" alt="Ally"><br><b>Ally</b><br><sub><code>AllyLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/alpine.svg" width="40" height="40" alt="Alpine Bank"><br><b>Alpine Bank</b><br><sub><code>AlpineLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/amalgamated-bank.svg" width="40" height="40" alt="Amalgamated Bank"><br><b>Amalgamated Bank</b><br><sub><code>AmalgamatedBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/amerant-bank.svg" width="40" height="40" alt="Amerant Bank"><br><b>Amerant Bank</b><br><sub><code>AmerantBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/american-express-us.svg" width="40" height="40" alt="American Express"><br><b>American Express</b><br><sub><code>AmericanExpressUsLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/ameriprise-financial.svg" width="40" height="40" alt="Ameriprise Financial"><br><b>Ameriprise Financial</b><br><sub><code>AmeripriseFinancialLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/ameris-bank.svg" width="40" height="40" alt="Ameris Bank"><br><b>Ameris Bank</b><br><sub><code>AmerisBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/arvest.svg" width="40" height="40" alt="Arvest"><br><b>Arvest</b><br><sub><code>ArvestLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/associated-bank.svg" width="40" height="40" alt="Associated Bank"><br><b>Associated Bank</b><br><sub><code>AssociatedBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/atlantic-union.svg" width="40" height="40" alt="Atlantic Union Bank"><br><b>Atlantic Union Bank</b><br><sub><code>AtlanticUnionLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/axos-bank.svg" width="40" height="40" alt="Axos Bank"><br><b>Axos Bank</b><br><sub><code>AxosBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/banco-popular.svg" width="40" height="40" alt="Banco Popular"><br><b>Banco Popular</b><br><sub><code>BancoPopularLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/bank-of-america-us.svg" width="40" height="40" alt="Bank of America"><br><b>Bank of America</b><br><sub><code>BankOfAmericaUsLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/bank-of-hawaii.svg" width="40" height="40" alt="Bank of Hawaii"><br><b>Bank of Hawaii</b><br><sub><code>BankOfHawaiiLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/bank-of-hope.svg" width="40" height="40" alt="Bank of Hope"><br><b>Bank of Hope</b><br><sub><code>BankOfHopeLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/bank-of-oklahoma.svg" width="40" height="40" alt="Bank of Oklahoma"><br><b>Bank of Oklahoma</b><br><sub><code>BankOfOklahomaLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/bank-united.svg" width="40" height="40" alt="Bank United"><br><b>Bank United</b><br><sub><code>BankUnitedLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/banner-bank.svg" width="40" height="40" alt="Banner Bank"><br><b>Banner Bank</b><br><sub><code>BannerBankLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/barclays.svg" width="40" height="40" alt="Barclays"><br><b>Barclays</b><br><sub><code>BarclaysLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/bmo.svg" width="40" height="40" alt="BMO"><br><b>BMO</b><br><sub><code>BmoLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/bnp-paribas-us.svg" width="40" height="40" alt="BNP Paribas"><br><b>BNP Paribas</b><br><sub><code>BnpParibasUsLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/bny-mellow.svg" width="40" height="40" alt="BNY Mellon"><br><b>BNY Mellon</b><br><sub><code>BnyMellowLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/brookline-bank.svg" width="40" height="40" alt="Brookline Bank"><br><b>Brookline Bank</b><br><sub><code>BrooklineBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/byline-bank.svg" width="40" height="40" alt="Byline Bank"><br><b>Byline Bank</b><br><sub><code>BylineBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/capital-one.svg" width="40" height="40" alt="Capital One"><br><b>Capital One</b><br><sub><code>CapitalOneLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/cathay-bank.svg" width="40" height="40" alt="Cathay Bank"><br><b>Cathay Bank</b><br><sub><code>CathayBankLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/charles-schwab.svg" width="40" height="40" alt="Charles Schwab"><br><b>Charles Schwab</b><br><sub><code>CharlesSchwabLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/chase.svg" width="40" height="40" alt="JPMorgan Chase"><br><b>JPMorgan Chase</b><br><sub><code>ChaseLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/cibc.svg" width="40" height="40" alt="CIBC"><br><b>CIBC</b><br><sub><code>CibcLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/citi-us.svg" width="40" height="40" alt="Citi"><br><b>Citi</b><br><sub><code>CitiUsLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/citizens.svg" width="40" height="40" alt="Citizens"><br><b>Citizens</b><br><sub><code>CitizensLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/city-national-bank.svg" width="40" height="40" alt="City National Bank"><br><b>City National Bank</b><br><sub><code>CityNationalBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/comerica.svg" width="40" height="40" alt="Comerica"><br><b>Comerica</b><br><sub><code>ComericaLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/commerce-bank.svg" width="40" height="40" alt="Commerce Bank"><br><b>Commerce Bank</b><br><sub><code>CommerceBankLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/connectone-bank.svg" width="40" height="40" alt="ConnectOne Bank"><br><b>ConnectOne Bank</b><br><sub><code>ConnectoneBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/customers-bank.svg" width="40" height="40" alt="Customers Bank"><br><b>Customers Bank</b><br><sub><code>CustomersBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/deutsche-bank-us.svg" width="40" height="40" alt="Deutsche Bank"><br><b>Deutsche Bank</b><br><sub><code>DeutscheBankUsLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/dime-community-bank.svg" width="40" height="40" alt="Dime Community Bank"><br><b>Dime Community Bank</b><br><sub><code>DimeCommunityBankLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/discover.svg" width="40" height="40" alt="Discover"><br><b>Discover</b><br><sub><code>DiscoverLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/east-west.svg" width="40" height="40" alt="East West Bank"><br><b>East West Bank</b><br><sub><code>EastWestLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/eastern-bank.svg" width="40" height="40" alt="Eastern Bank"><br><b>Eastern Bank</b><br><sub><code>EasternBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/everbank.svg" width="40" height="40" alt="EverBank"><br><b>EverBank</b><br><sub><code>EverbankLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/fifththird.svg" width="40" height="40" alt="Fifth Third"><br><b>Fifth Third</b><br><sub><code>FifththirdLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/first-citizens.svg" width="40" height="40" alt="First Citizens Bank"><br><b>First Citizens Bank</b><br><sub><code>FirstCitizensLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/first-hawaiian-bank.svg" width="40" height="40" alt="First Hawaiian Bank"><br><b>First Hawaiian Bank</b><br><sub><code>FirstHawaiianBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/first-horizon.svg" width="40" height="40" alt="First Horizon Bank"><br><b>First Horizon Bank</b><br><sub><code>FirstHorizonLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/first-interstate-bank.svg" width="40" height="40" alt="First Interstate Bank"><br><b>First Interstate Bank</b><br><sub><code>FirstInterstateBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/first-national-bank.svg" width="40" height="40" alt="First National Bank"><br><b>First National Bank</b><br><sub><code>FirstNationalBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/first-republic-bank.svg" width="40" height="40" alt="First Republic Bank"><br><b>First Republic Bank</b><br><sub><code>FirstRepublicBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/flagstar-bank.svg" width="40" height="40" alt="Flagstar Bank"><br><b>Flagstar Bank</b><br><sub><code>FlagstarBankLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/frost-bank.svg" width="40" height="40" alt="Frost Bank"><br><b>Frost Bank</b><br><sub><code>FrostBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/fulton-bank.svg" width="40" height="40" alt="Fulton Bank"><br><b>Fulton Bank</b><br><sub><code>FultonBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/glacier-bank.svg" width="40" height="40" alt="Glacier Bank"><br><b>Glacier Bank</b><br><sub><code>GlacierBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/goldman-sachs.svg" width="40" height="40" alt="Goldman Sachs"><br><b>Goldman Sachs</b><br><sub><code>GoldmanSachsLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/hancock-whitney.svg" width="40" height="40" alt="Hancock Whitney"><br><b>Hancock Whitney</b><br><sub><code>HancockWhitneyLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/hanmi-bank.svg" width="40" height="40" alt="Hanmi Bank"><br><b>Hanmi Bank</b><br><sub><code>HanmiBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/homestreet-bank.svg" width="40" height="40" alt="HomeStreet Bank"><br><b>HomeStreet Bank</b><br><sub><code>HomestreetBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/hsbc.svg" width="40" height="40" alt="HSBC"><br><b>HSBC</b><br><sub><code>HsbcLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/huntington.svg" width="40" height="40" alt="Huntington Bank"><br><b>Huntington Bank</b><br><sub><code>HuntingtonLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/ing.svg" width="40" height="40" alt="ING"><br><b>ING</b><br><sub><code>IngLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/key-bank.svg" width="40" height="40" alt="KeyBank"><br><b>KeyBank</b><br><sub><code>KeyBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/mechanics-bank.svg" width="40" height="40" alt="Mechanics Bank"><br><b>Mechanics Bank</b><br><sub><code>MechanicsBankLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/merchants-bank.svg" width="40" height="40" alt="Merchants Bank"><br><b>Merchants Bank</b><br><sub><code>MerchantsBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/merrill.svg" width="40" height="40" alt="Merrill Lynch"><br><b>Merrill Lynch</b><br><sub><code>MerrillLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/midland.svg" width="40" height="40" alt="Midland States Bank"><br><b>Midland States Bank</b><br><sub><code>MidlandLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/morgan-stanley.svg" width="40" height="40" alt="Morgan Stanley"><br><b>Morgan Stanley</b><br><sub><code>MorganStanleyLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/mt.svg" width="40" height="40" alt="M&T Bank"><br><b>M&T Bank</b><br><sub><code>MtLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/nicolet-national-bank.svg" width="40" height="40" alt="Nicolet National Bank"><br><b>Nicolet National Bank</b><br><sub><code>NicoletNationalBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/northern-trust.svg" width="40" height="40" alt="Northern Trust"><br><b>Northern Trust</b><br><sub><code>NorthernTrustLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/nubank-us.svg" width="40" height="40" alt="Nubank"><br><b>Nubank</b><br><sub><code>NubankUsLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/oceanfirst-bank.svg" width="40" height="40" alt="OceanFirst Bank"><br><b>OceanFirst Bank</b><br><sub><code>OceanfirstBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/old-national-bank.svg" width="40" height="40" alt="Old National Bank"><br><b>Old National Bank</b><br><sub><code>OldNationalBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/ozk.svg" width="40" height="40" alt="Bank OZK"><br><b>Bank OZK</b><br><sub><code>OzkLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/pacific-premier-bank.svg" width="40" height="40" alt="Pacific Premier Bank"><br><b>Pacific Premier Bank</b><br><sub><code>PacificPremierBankLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/pinnacle-bank.svg" width="40" height="40" alt="Pinnacle Bank"><br><b>Pinnacle Bank</b><br><sub><code>PinnacleBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/pinnacle-financial.svg" width="40" height="40" alt="Pinnacle Financial Partners"><br><b>Pinnacle Financial Partners</b><br><sub><code>PinnacleFinancialLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/pnc.svg" width="40" height="40" alt="PNC Bank"><br><b>PNC Bank</b><br><sub><code>PncLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/prosperity-bank.svg" width="40" height="40" alt="Prosperity Bank"><br><b>Prosperity Bank</b><br><sub><code>ProsperityBankLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/raymond-james.svg" width="40" height="40" alt="Raymond James"><br><b>Raymond James</b><br><sub><code>RaymondJamesLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/rbc-bank.svg" width="40" height="40" alt="Royal Bank of Canada"><br><b>Royal Bank of Canada</b><br><sub><code>RbcBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/regions.svg" width="40" height="40" alt="Regions"><br><b>Regions</b><br><sub><code>RegionsLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/renasant-bank.svg" width="40" height="40" alt="Renasant Bank"><br><b>Renasant Bank</b><br><sub><code>RenasantBankLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/sandy-spring-bank.svg" width="40" height="40" alt="Sandy Spring Bank"><br><b>Sandy Spring Bank</b><br><sub><code>SandySpringBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/santander-us.svg" width="40" height="40" alt="Santander"><br><b>Santander</b><br><sub><code>SantanderUsLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/seacoast-bank.svg" width="40" height="40" alt="Seacoast Bank"><br><b>Seacoast Bank</b><br><sub><code>SeacoastBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/simmons-bank.svg" width="40" height="40" alt="Simmons Bank"><br><b>Simmons Bank</b><br><sub><code>SimmonsBankLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/sofi.svg" width="40" height="40" alt="Sofi"><br><b>Sofi</b><br><sub><code>SofiLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/southside-bank.svg" width="40" height="40" alt="Southside Bank"><br><b>Southside Bank</b><br><sub><code>SouthsideBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/southstate.svg" width="40" height="40" alt="SouthState Bank"><br><b>SouthState Bank</b><br><sub><code>SouthstateLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/state-street.svg" width="40" height="40" alt="State Street"><br><b>State Street</b><br><sub><code>StateStreetLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/stifel.svg" width="40" height="40" alt="Stifel"><br><b>Stifel</b><br><sub><code>StifelLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/stock-yards-bank.svg" width="40" height="40" alt="Stock Yards Bank & Trust"><br><b>Stock Yards Bank & Trust</b><br><sub><code>StockYardsBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/synchrony.svg" width="40" height="40" alt="Synchrony"><br><b>Synchrony</b><br><sub><code>SynchronyLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/synovus.svg" width="40" height="40" alt="Synovus"><br><b>Synovus</b><br><sub><code>SynovusLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/td-bank.svg" width="40" height="40" alt="TD Bank"><br><b>TD Bank</b><br><sub><code>TdBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/tompkins-banks.svg" width="40" height="40" alt="Tompkins Bank"><br><b>Tompkins Bank</b><br><sub><code>TompkinsBanksLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/townebank.svg" width="40" height="40" alt="TowneBank"><br><b>TowneBank</b><br><sub><code>TownebankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/truist.svg" width="40" height="40" alt="Truist"><br><b>Truist</b><br><sub><code>TruistLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/trustmark.svg" width="40" height="40" alt="Trustmark"><br><b>Trustmark</b><br><sub><code>TrustmarkLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/ubs.svg" width="40" height="40" alt="UBS"><br><b>UBS</b><br><sub><code>UbsLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/umb.svg" width="40" height="40" alt="UMB Bank"><br><b>UMB Bank</b><br><sub><code>UmbLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/united-bank.svg" width="40" height="40" alt="United Bank"><br><b>United Bank</b><br><sub><code>UnitedBankLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/univest.svg" width="40" height="40" alt="Univest Financial"><br><b>Univest Financial</b><br><sub><code>UnivestLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/us-bank.svg" width="40" height="40" alt="US Bank"><br><b>US Bank</b><br><sub><code>UsBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/usaa.svg" width="40" height="40" alt="USAA"><br><b>USAA</b><br><sub><code>UsaaLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/valley.svg" width="40" height="40" alt="Valley"><br><b>Valley</b><br><sub><code>ValleyLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/veritex-community-bank.svg" width="40" height="40" alt="Veritex Community Bank"><br><b>Veritex Community Bank</b><br><sub><code>VeritexCommunityBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/wafd-bank.svg" width="40" height="40" alt="WaFd Bank"><br><b>WaFd Bank</b><br><sub><code>WafdBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/webster-bank.svg" width="40" height="40" alt="Webster Bank"><br><b>Webster Bank</b><br><sub><code>WebsterBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/wells-fargo.svg" width="40" height="40" alt="Wells Fargo"><br><b>Wells Fargo</b><br><sub><code>WellsFargoLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/wesbanco.svg" width="40" height="40" alt="Wesbanco"><br><b>Wesbanco</b><br><sub><code>WesbancoLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/western-alliance.svg" width="40" height="40" alt="Western Alliance Bank"><br><b>Western Alliance Bank</b><br><sub><code>WesternAllianceLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/wintrust.svg" width="40" height="40" alt="Wintrust"><br><b>Wintrust</b><br><sub><code>WintrustLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/zelle.svg" width="40" height="40" alt="Zelle"><br><b>Zelle</b><br><sub><code>ZelleLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/zions-bank.svg" width="40" height="40" alt="Zions Bank"><br><b>Zions Bank</b><br><sub><code>ZionsBankLogo</code></sub></td>
</tr>
</table>

### Índia (69)

<table>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/abn-amro.svg" width="40" height="40" alt="ABN AMRO Bank"><br><b>ABN AMRO Bank</b><br><sub><code>AbnAmroLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/abu-dhabi-commercial-bank.svg" width="40" height="40" alt="Abu Dhabi Commercial Bank"><br><b>Abu Dhabi Commercial Bank</b><br><sub><code>AbuDhabiCommercialBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/airtel-payments-bank.svg" width="40" height="40" alt="Airtel Payments Bank"><br><b>Airtel Payments Bank</b><br><sub><code>AirtelPaymentsBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/american-express.svg" width="40" height="40" alt="American Express Banking Corporation"><br><b>American Express Banking Corporation</b><br><sub><code>AmericanExpressLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/au-small-finance-bank.svg" width="40" height="40" alt="AU Small Finance Bank"><br><b>AU Small Finance Bank</b><br><sub><code>AuSmallFinanceBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/australia-and-new-zealand-banking-group.svg" width="40" height="40" alt="Australia and New Zealand Banking Group Ltd."><br><b>Australia and New Zealand Banking Group Ltd.</b><br><sub><code>AustraliaAndNewZealandBankingGroupLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/axis-bank.svg" width="40" height="40" alt="Axis Bank"><br><b>Axis Bank</b><br><sub><code>AxisBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/bandhan-bank.svg" width="40" height="40" alt="Bandhan Bank"><br><b>Bandhan Bank</b><br><sub><code>BandhanBankLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/bank-maybank-indonesia.svg" width="40" height="40" alt="Bank Maybank Indonesia"><br><b>Bank Maybank Indonesia</b><br><sub><code>BankMaybankIndonesiaLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/bank-of-america.svg" width="40" height="40" alt="Bank of America"><br><b>Bank of America</b><br><sub><code>BankOfAmericaLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/bank-of-bahrain-and-kuwait.svg" width="40" height="40" alt="Bank of Bahrain & Kuwait"><br><b>Bank of Bahrain & Kuwait</b><br><sub><code>BankOfBahrainAndKuwaitLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/bank-of-baroda.svg" width="40" height="40" alt="Bank of Baroda"><br><b>Bank of Baroda</b><br><sub><code>BankOfBarodaLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/bank-of-ceylon.svg" width="40" height="40" alt="Bank of Ceylon"><br><b>Bank of Ceylon</b><br><sub><code>BankOfCeylonLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/bank-of-china.svg" width="40" height="40" alt="Bank of China"><br><b>Bank of China</b><br><sub><code>BankOfChinaLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/bank-of-india.svg" width="40" height="40" alt="Bank of India"><br><b>Bank of India</b><br><sub><code>BankOfIndiaLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/bank-of-maharastra.svg" width="40" height="40" alt="Bank of Maharashtra"><br><b>Bank of Maharashtra</b><br><sub><code>BankOfMaharastraLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/barclays-bank.svg" width="40" height="40" alt="Barclays Bank"><br><b>Barclays Bank</b><br><sub><code>BarclaysBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/bnp-paribas.svg" width="40" height="40" alt="BNP Paribas"><br><b>BNP Paribas</b><br><sub><code>BnpParibasLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/canara-bank.svg" width="40" height="40" alt="Canara Bank"><br><b>Canara Bank</b><br><sub><code>CanaraBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/citi-bank.svg" width="40" height="40" alt="Citi Bank"><br><b>Citi Bank</b><br><sub><code>CitiBankLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/city-union-bank.svg" width="40" height="40" alt="City Union Bank"><br><b>City Union Bank</b><br><sub><code>CityUnionBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/credit-agricole-corporate-and-investment-bank.svg" width="40" height="40" alt="Credit Agricole Corporate & Investment Bank"><br><b>Credit Agricole Corporate & Investment Bank</b><br><sub><code>CreditAgricoleCorporateAndInvestmentBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/credit-suisse-in.svg" width="40" height="40" alt="Credit Suisse AG"><br><b>Credit Suisse AG</b><br><sub><code>CreditSuisseInLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/csb-bank.svg" width="40" height="40" alt="CSB Bank"><br><b>CSB Bank</b><br><sub><code>CsbBankLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/dbs-bank.svg" width="40" height="40" alt="DBS Bank"><br><b>DBS Bank</b><br><sub><code>DbsBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/dcb-bank.svg" width="40" height="40" alt="DCB Bank"><br><b>DCB Bank</b><br><sub><code>DcbBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/deutsche-bank.svg" width="40" height="40" alt="Deutsche Bank A.G."><br><b>Deutsche Bank A.G.</b><br><sub><code>DeutscheBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/dhanlaxmi-bank.svg" width="40" height="40" alt="Dhanlaxmi Bank"><br><b>Dhanlaxmi Bank</b><br><sub><code>DhanlaxmiBankLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/doha-bank.svg" width="40" height="40" alt="Doha Bank"><br><b>Doha Bank</b><br><sub><code>DohaBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/emirates-nbd.svg" width="40" height="40" alt="Emirates NBD Bank"><br><b>Emirates NBD Bank</b><br><sub><code>EmiratesNbdLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/esaf-small-finance-bank-ltd.svg" width="40" height="40" alt="ESAF Small Finance Bank"><br><b>ESAF Small Finance Bank</b><br><sub><code>EsafSmallFinanceBankLtdLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/federal-bank.svg" width="40" height="40" alt="Federal Bank"><br><b>Federal Bank</b><br><sub><code>FederalBankLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/fino-payments-bank.svg" width="40" height="40" alt="FINO Payments Bank"><br><b>FINO Payments Bank</b><br><sub><code>FinoPaymentsBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/first-abu-dhabi-bank.svg" width="40" height="40" alt="First Abu Dhabi Bank"><br><b>First Abu Dhabi Bank</b><br><sub><code>FirstAbuDhabiBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/firstrand-bank.svg" width="40" height="40" alt="FirstRand Bank"><br><b>FirstRand Bank</b><br><sub><code>FirstrandBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/hdfc-bank.svg" width="40" height="40" alt="HDFC Bank"><br><b>HDFC Bank</b><br><sub><code>HdfcBankLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/hsbc-bank.svg" width="40" height="40" alt="HSBC Bank"><br><b>HSBC Bank</b><br><sub><code>HsbcBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/icici-bank.svg" width="40" height="40" alt="ICICI Bank"><br><b>ICICI Bank</b><br><sub><code>IciciBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/idbi-bank.svg" width="40" height="40" alt="IDBI Bank"><br><b>IDBI Bank</b><br><sub><code>IdbiBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/idfc-bank.svg" width="40" height="40" alt="IDFC FIRST Bank"><br><b>IDFC FIRST Bank</b><br><sub><code>IdfcBankLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/india-post-payments-bank.svg" width="40" height="40" alt="India Post Payments Bank"><br><b>India Post Payments Bank</b><br><sub><code>IndiaPostPaymentsBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/indian-bank.svg" width="40" height="40" alt="Indian Bank"><br><b>Indian Bank</b><br><sub><code>IndianBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/indian-overseas-bank.svg" width="40" height="40" alt="Indian Overseas Bank"><br><b>Indian Overseas Bank</b><br><sub><code>IndianOverseasBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/induslnd-bank.svg" width="40" height="40" alt="IndusInd Bank"><br><b>IndusInd Bank</b><br><sub><code>InduslndBankLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/industrial-and-commercial-bank-of-china.svg" width="40" height="40" alt="Industrial & Commercial Bank of China"><br><b>Industrial & Commercial Bank of China</b><br><sub><code>IndustrialAndCommercialBankOfChinaLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/jammu-and-kashmir-bank.svg" width="40" height="40" alt="Jammu & Kashmir Bank"><br><b>Jammu & Kashmir Bank</b><br><sub><code>JammuAndKashmirBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/jio-payments-bank.svg" width="40" height="40" alt="Jio Payments Bank"><br><b>Jio Payments Bank</b><br><sub><code>JioPaymentsBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/jpmorgan-chase.svg" width="40" height="40" alt="JPMorgan Chase Bank"><br><b>JPMorgan Chase Bank</b><br><sub><code>JpmorganChaseLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/karnataka-bank.svg" width="40" height="40" alt="Karnataka Bank"><br><b>Karnataka Bank</b><br><sub><code>KarnatakaBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/karur-vysya-bank.svg" width="40" height="40" alt="Karur Vysya Bank"><br><b>Karur Vysya Bank</b><br><sub><code>KarurVysyaBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/kookmin-bank.svg" width="40" height="40" alt="Kookmin Bank"><br><b>Kookmin Bank</b><br><sub><code>KookminBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/kotak-mahindra-bank.svg" width="40" height="40" alt="Kotak Mahindra Bank"><br><b>Kotak Mahindra Bank</b><br><sub><code>KotakMahindraBankLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/nainital-bank.svg" width="40" height="40" alt="Nainital Bank"><br><b>Nainital Bank</b><br><sub><code>NainitalBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/paytm-payments-bank.svg" width="40" height="40" alt="Paytm Payments Bank"><br><b>Paytm Payments Bank</b><br><sub><code>PaytmPaymentsBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/punjab-and-sind-bank.svg" width="40" height="40" alt="Punjab & Sind Bank"><br><b>Punjab & Sind Bank</b><br><sub><code>PunjabAndSindBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/punjab-national-bank.svg" width="40" height="40" alt="Punjab National Bank"><br><b>Punjab National Bank</b><br><sub><code>PunjabNationalBankLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/rabobank.svg" width="40" height="40" alt="Rabobank"><br><b>Rabobank</b><br><sub><code>RabobankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/rbl-bank.svg" width="40" height="40" alt="RBL Bank"><br><b>RBL Bank</b><br><sub><code>RblBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/saxo-bank.svg" width="40" height="40" alt="Saxo Bank"><br><b>Saxo Bank</b><br><sub><code>SaxoBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/south-indian-bank.svg" width="40" height="40" alt="South Indian Bank"><br><b>South Indian Bank</b><br><sub><code>SouthIndianBankLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/standard-chartered-bank.svg" width="40" height="40" alt="Standard Chartered Bank"><br><b>Standard Chartered Bank</b><br><sub><code>StandardCharteredBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/state-bank-of-india.svg" width="40" height="40" alt="State Bank of India"><br><b>State Bank of India</b><br><sub><code>StateBankOfIndiaLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/sumitomo-mitsui-banking-corporation.svg" width="40" height="40" alt="Sumitomo Mitsui Banking Corporation"><br><b>Sumitomo Mitsui Banking Corporation</b><br><sub><code>SumitomoMitsuiBankingCorporationLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/tamilnad-mercantile-bank.svg" width="40" height="40" alt="Tamilnad Mercantile Bank"><br><b>Tamilnad Mercantile Bank</b><br><sub><code>TamilnadMercantileBankLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/uco-bank.svg" width="40" height="40" alt="UCO Bank"><br><b>UCO Bank</b><br><sub><code>UcoBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/ujjivan-small-finance-bank.svg" width="40" height="40" alt="Ujjivan Small Finance Bank"><br><b>Ujjivan Small Finance Bank</b><br><sub><code>UjjivanSmallFinanceBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/union-bank.svg" width="40" height="40" alt="Union Bank of India"><br><b>Union Bank of India</b><br><sub><code>UnionBankLogo</code></sub></td>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/woori-bank.svg" width="40" height="40" alt="Woori Bank"><br><b>Woori Bank</b><br><sub><code>WooriBankLogo</code></sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="../../dist/svg/yes-bank.svg" width="40" height="40" alt="YES Bank"><br><b>YES Bank</b><br><sub><code>YesBankLogo</code></sub></td>
</tr>
</table>

## Marcas

Os logos são marcas registradas das respectivas instituições e aparecem aqui só para identificá-las.

## Licença

© Despezzas. Todos os direitos reservados.
