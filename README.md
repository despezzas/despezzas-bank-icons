<p align="center"><img src="assets/banner.png" alt="Despezzas Bank Icons" width="100%"></p>

# Despezzas Bank Icons

Os logos de bancos e cartões do Despezzas em azulejos quadrados (SVG 64×64, cantos retos, sem raio), com pacotes para **React** (web) e **Flutter** (app) gerados da mesma fonte.

| Pacote | Pasta | Documentação |
|---|---|---|
| `@despezzas/bank-icons` | `packages/react` | [packages/react/README.md](packages/react/README.md): instalação via git, uso, busca pelo nome e catálogo |
| `despezzas_bank_icons` | `packages/flutter` | [packages/flutter/README.md](packages/flutter/README.md) |

```tsx
import { NubankLogo } from '@despezzas/bank-icons';
import { findBankLogo } from '@despezzas/bank-icons/all';
<NubankLogo size={32} />
```

```dart
DzBankLogo('nubank', size: 32)
DzBankLogo.find('Banco do Brasil')
```

Abra `preview/index.html` para ver todos os logos (claro e escuro) e copiar o nome do componente.

## Estrutura

```
catalog.json            bancos: slug, URL antiga do logo, nomes e países (fonte da verdade)
source/                 logos originais (redondos, só SVG vetorial), baixados por `npm run fetch`
sources.json            origem dos bancos sem SVG vetorial (URL que só serve raster ou dá 404)
overrides.json          ajustes por banco para o gerador (escala, fundo, recorte…)
manual/<slug>.svg       azulejo feito à mão; vence o gerador
svg/                    azulejos quadrados gerados por `npm run square` (+ manual/)
scripts/fetch.mjs       catalog.json → source/
scripts/square.mjs      source/ → svg/ (mede com scripts/measure.js e achata com scripts/flatten.js, no Chrome headless)
scripts/sheet.mjs       folhas de revisão em build/sheets (claro, escuro, 32/16 px, antes/depois)
scripts/check-pure.mjs  teste: todo azulejo é SVG puro e achatado
scripts/build.mjs       svg/ → pacotes, dist/svg, preview e READMEs
scripts/png.mjs         assets/banner.png e assets/catalog.png (imagens dos READMEs)
packages/react/         @despezzas/bank-icons (dist/ gerado e versionado)
packages/flutter/       despezzas_bank_icons (lib/src/bank_logos.g.dart gerado e versionado)
dist/svg/               SVGs estáticos
docs/README.*.md        templates dos READMEs dos pacotes
```

Os arquivos gerados são versionados de propósito: os apps consomem o repositório direto pelo git, sem etapa de build.

## Como o azulejo é feito

O logo original (círculo da cor da marca + marca por cima) vira um quadrado sem redesenhar nada:

1. O fundo é detectado: a forma que cobre o círculo inteiro (círculo, quadrado ou path do tamanho do viewBox). Vira `<rect width="64" height="64">` na mesma cor, quadrado e **sem cantos arredondados** (gradientes mantidos). Fundo vazado (marca recortada no círculo) vira fundo + os recortes em branco.
2. Sem fundo, ou fundo branco/quase branco: azulejo branco com contorno fino por dentro da borda (`<rect x="0.5" y="0.5" width="63" height="63" fill="none" stroke="#000" stroke-opacity="0.08"/>`), visível em telas claras. Fundo quase preto (luminância < 0,015): o mesmo contorno em branco a 12%, visível em telas escuras.
3. Clip-paths e máscaras que só recortavam no círculo saem; os que cortam a marca ficam.
4. A marca é centralizada e escalada: com fundo, mantém o tamanho do original ×1.08; sem fundo, é normalizada pela área. Teto de tamanho óptico e no mínimo 6 unidades até a borda.
5. O azulejo é achatado (`scripts/flatten.js`, Paper.js no Chrome): cada forma visível vira um `<path>` no espaço 64×64 com todas as transformações aplicadas aos pontos; recortes e máscaras viram interseção/diferença de geometria; `<g>`, `transform`, `clip-path`, `<mask>`, `<pattern>` e `<image>` não sobram. Gradientes ganham as coordenadas finais. Paths vizinhos de mesma tinta que não se tocam são juntados.
6. Ids ganham o prefixo `dzb-<slug>-`; scripts, imagens raster, handlers e links externos são removidos; coordenadas com no máximo 2 casas, retas colineares fundidas e paradas de gradiente redundantes removidas, sem mudança visível.

O resultado é só `<svg>` + `<rect>` de fundo (+ contorno) + `<path>`s (e `<defs>` quando a marca tem gradiente). O pacote React e o Flutter usam o SVG como está, sem recorte extra.

## Adicionar ou corrigir um banco

1. Adicione a entrada em `catalog.json` (`slug` kebab-case, `source` com a URL do logo, `names` com o nome de exibição primeiro e os apelidos, `countries`).
2. `npm run fetch` (baixa o que falta em `source/`; `--force <slug>` baixa de novo).
3. `npm run square` e `npm run sheet`; revise `build/sheets/compare-*.png` e `small-*.png`.
4. Ficou errado? Ajuste em `overrides.json` (`scale`, `offset`, `background`, `knockout: false`, `drop`…; a lista está no `$comment`) ou monte `manual/<slug>.svg` (viewBox `0 0 64 64`, fundo `<rect width="64" height="64">` sem `rx`) a partir do vetor oficial; ele passa pelo mesmo achatamento.
5. `npm run build`, `npm run png` se o catálogo mudou, e `npm test`.

## Licença

© Despezzas. Todos os direitos reservados. Os logos são marcas registradas das respectivas instituições.
