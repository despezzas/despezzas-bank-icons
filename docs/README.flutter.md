<p align="center">
  <img src="{{ASSETS}}/banner.png" alt="Despezzas Bank Icons: {{COUNT}} logos de bancos e cartões" width="100%">
</p>

# despezzas_bank_icons

Os logos de bancos e cartões do [Despezzas](https://despezzas.com) para Flutter: **{{COUNT}} instituições de {{COUNTRIES}} países**, todas no mesmo azulejo quadrado de cantos retos. São os mesmos arquivos do pacote web `@despezzas/bank-icons`.

- **Um formato só**: quadrado 64×64 sem cantos arredondados, a marca original centralizada e no mesmo tamanho óptico.
- **A marca de cada banco, sem redesenho**: forma e cores originais, sobre a cor de fundo da própria marca.
- **Visíveis em qualquer tema**: logos de fundo branco ganham um contorno fino escuro e os de fundo quase preto, um contorno fino claro.
- **SVG puro**: só um `<rect>` de fundo e `<path>`s, sem grupos, transformações nem recortes; o `flutter_svg` desenha exatamente o que o navegador desenha.
- **Embutidos no pacote**: nada de rede nem cache de imagem; nítidos em qualquer tamanho.
- **Busca pelo nome**: `DzBankLogo.find('Itaú')` resolve nomes com ou sem acento, apelidos e o endereço antigo do logo.
- Única dependência: [`flutter_svg`](https://pub.dev/packages/flutter_svg).

## Instalação

O pacote vive no repositório `despezzas-bank-icons`. Adicione como dependência git:

```yaml
dependencies:
  despezzas_bank_icons:
    git:
      url: https://github.com/despezzas/despezzas-bank-icons.git
      path: packages/flutter
      ref: main   # ou uma tag
```

```dart
import 'package:despezzas_bank_icons/despezzas_bank_icons.dart';
```

## Uso rápido

```dart
DzBankLogo('nubank')                                    // 32 px, decorativo
DzBankLogo('itau', size: 48, semanticLabel: 'Itaú')
DzBankLogo.data(DzBankLogos.bancoDoBrasil, size: 40)    // com autocomplete
```

O azulejo é um quadrado de cantos retos. Para cantos arredondados ou círculo, recorte por fora:

```dart
ClipRRect(borderRadius: BorderRadius.circular(8), child: DzBankLogo('nubank', size: 40))
ClipOval(child: DzBankLogo('nubank', size: 40))
```

## Logo pelo nome do banco

Quando o banco vem da API como texto:

```dart
DzBankLogo.find(account.bankName, size: 36, fallback: const Icon(Icons.account_balance))
```

`DzBankLogo.find` (e `DzBankLogos.find`, que devolve os dados) aceita:

| Entrada | Exemplo |
|---|---|
| Nome de exibição | `'Banco do Brasil'` |
| Apelido, com ou sem acento, espaços ou caixa | `'itau'`, `'MercadoPago'`, `'Bradescard'` |
| Slug | `'banco-do-brasil'` |
| Endereço antigo do logo, ou só o nome do arquivo | `'https://cdn.despezzas.com.br/…/nubank.svg'`, `'nubank.svg'` |

Alguns nomes existem em mais de um país (HSBC, BBVA, Citi…). Passe o país para desempatar:

```dart
DzBankLogo.find('HSBC', country: 'MX')
```

Nome desconhecido mostra o `fallback` (padrão: espaço vazio do mesmo tamanho), sem quebrar o layout.

## Receitas

### Item de lista

```dart
ListTile(
  leading: DzBankLogo.find(account.bank, size: 40),
  title: Text(account.name),
  subtitle: const Text('Conta corrente'),
)
```

### Seletor de banco

```dart
final banks = DzBankLogos.all.where((b) => b.countries.contains('BR')).toList();

DropdownButton<String>(
  value: selected,
  onChanged: (slug) => setState(() => selected = slug),
  items: [
    for (final b in banks)
      DropdownMenuItem(
        value: b.slug,
        child: Row(children: [DzBankLogo.data(b, size: 24), const SizedBox(width: 12), Text(b.name)]),
      ),
  ],
)
```

## Acessibilidade

- Sem `semanticLabel`, o logo é decorativo e fica fora da árvore de semântica: use quando o nome do banco já aparece ao lado.
- Com `semanticLabel`, ele é anunciado como imagem.

## API

| | |
|---|---|
| `DzBankLogo(String slug, {size, semanticLabel, fallback})` | Pelo slug. |
| `DzBankLogo.data(DzBankLogoData logo, {…})` | Pelos dados. |
| `DzBankLogo.find(String? nameOrUrl, {country, size, semanticLabel, fallback})` | Pelo nome, apelido, slug ou URL antiga. |
| `DzBankLogos.<banco>` | Um `static const` por banco (`DzBankLogos.nubank`). Slugs que começam com número ganham o prefixo `bank` (`bank99Pay`). |
| `DzBankLogos.all` | Lista com todos, na ordem do catálogo. |
| `DzBankLogos.find(…)` / `DzBankLogos.bySlug(…)` | Busca, devolve `DzBankLogoData?`. |
| `DzBankLogoData` | `slug`, `names`, `name`, `countries` e `svg` (o arquivo SVG). |
| `normalizeBankName(String)` | Minúsculas, sem acento e só letras e números. |

`size` é o lado em pixels lógicos (padrão 32).

## Catálogo

<img src="{{ASSETS}}/catalog.png" alt="Os {{COUNT}} logos" width="100%">

{{CATALOG}}

## Marcas

Os logos são marcas registradas das respectivas instituições e aparecem aqui só para identificá-las.

## Licença

© Despezzas. Todos os direitos reservados.
