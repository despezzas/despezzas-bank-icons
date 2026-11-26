# CLAUDE.md

Biblioteca de logos de bancos e cartões do Despezzas (azulejos quadrados 64×64). Leia o README antes de mexer.

- Fonte: `catalog.json` + `source/` (originais) + `overrides.json` + `manual/`. `svg/` sai de `npm run square`; `packages/react/dist`, `packages/flutter/lib/src/bank_logos.g.dart`, `dist/svg`, `preview/` e os READMEs dos pacotes saem de `npm run build`. Não edite gerados à mão; rode square + build antes de commitar (os gerados são versionados).
- Nunca redesenhe a marca de um banco: forma e cores ficam como no original. Ajuste por `overrides.json`; só em último caso `manual/<slug>.svg`.
- Mudou o gerador? Rode `npm run sheet` e olhe TODAS as páginas de `build/sheets/compare-*.png` (antes/depois, claro e escuro) com a ferramenta de leitura de imagem.
- Antes de entregar: `npm test` (build + render React + tipos + `flutter analyze` + `flutter test`).
- Bancos sem SVG de origem (404 ou só raster) têm azulejo provisório com monograma; troque por `source/<slug>.svg` vetorial quando houver.
- Os pacotes não são publicados (npm/pub.dev): consumidos pelo git. Nada de processo interno nem URL de CDN versionada nos READMEs; imagens por caminho relativo do repositório.
