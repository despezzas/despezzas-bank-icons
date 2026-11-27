# CLAUDE.md

Biblioteca de logos de bancos e cartões do Despezzas (azulejos quadrados 64×64, **cantos retos, sem raio**). Leia o README antes de mexer.

- Saída sempre SVG puro e achatado: `<rect>` de fundo (+ contorno fino) e `<path>`s no espaço 64, sem `<g>`, `transform`, `clip-path`, `<mask>`, `<pattern>`, `<image>` nem `data:`. `npm test` (scripts/check-pure.mjs) falha se sobrar algum.

- Fonte: `catalog.json` + `source/` (originais) + `overrides.json` + `manual/`. `svg/` sai de `npm run square`; `packages/react/dist`, `packages/flutter/lib/src/bank_logos.g.dart`, `dist/svg`, `preview/` e os READMEs dos pacotes saem de `npm run build`. Não edite gerados à mão; rode square + build antes de commitar (os gerados são versionados).
- Nunca redesenhe a marca de um banco: forma e cores ficam como no original. Ajuste por `overrides.json`; só em último caso `manual/<slug>.svg`.
- Mudou o gerador? Rode `npm run sheet` e olhe TODAS as páginas de `build/sheets/compare-*.png` (antes/depois, claro e escuro) e `small-*.png` (32 e 16 px) com a ferramenta de leitura de imagem. Para comparar pixels antes/depois do achatamento: `DZ_NOFLAT=1 npm run square` gera a referência sem achatar.
- Antes de entregar: `npm test` (build + render React + tipos + `flutter analyze` + `flutter test`).
- Bancos sem SVG de origem (404 ou só raster) têm azulejo provisório com monograma e a origem em `sources.json`; troque por `source/<slug>.svg` vetorial ou `manual/<slug>.svg` quando houver. Raster não entra no repositório.
- Mesma marca em países diferentes = mesmo tratamento (`"source": "<outro-slug>"` em overrides.json).
- Os pacotes não são publicados (npm/pub.dev): consumidos pelo git. Nada de processo interno nem URL de CDN versionada nos READMEs; imagens por caminho relativo do repositório.
