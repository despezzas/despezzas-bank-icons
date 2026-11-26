import 'bank_logos.g.dart';

/// Um logo do catálogo: slug, nomes (exibição primeiro, depois apelidos),
/// países (ISO 3166-1 alfa-2) e o SVG do azulejo 64×64.
class DzBankLogoData {
  const DzBankLogoData(this.slug, this.names, this.countries, this.svg);

  final String slug;
  final List<String> names;
  final List<String> countries;
  final String svg;

  /// Nome de exibição.
  String get name => names.first;

  @override
  String toString() => 'DzBankLogoData($slug)';
}


/// Minúsculas, sem acento e só letras/números: "Itaú Unibanco" → "itauunibanco".
String normalizeBankName(String value) {
  const from = 'àáâãäåāăąçćčďèéêëēėęěìíîïīįłñńňòóôõöøōőŕřśšşťùúûüūůűųýÿžźż';
  const to = 'aaaaaaaaacccdeeeeeeeeiiiiiilnnnoooooooorrsssstuuuuuuuuyyzzz';
  final buffer = StringBuffer();
  for (final rune in value.toLowerCase().runes) {
    var ch = String.fromCharCode(rune);
    final i = from.indexOf(ch);
    if (i >= 0) ch = to[i];
    if (RegExp(r'[a-z0-9]').hasMatch(ch)) buffer.write(ch);
  }
  return buffer.toString();
}

Map<String, List<DzBankLogoData>>? _index;
Map<String, DzBankLogoData>? _bySlug;

/// Logo pelo slug exato (`'banco-do-brasil'`), ou `null`.
DzBankLogoData? bankLogoBySlug(String slug) =>
    (_bySlug ??= {for (final b in DzBankLogos.all) b.slug: b})[slug];

/// Logo a partir do nome (ou apelido), do slug, da URL antiga do logo ou só do
/// nome do arquivo. Com [country] (`'BR'`, `'MX'`…), prefere o banco daquele
/// país quando o nome existe em mais de um (ex.: "HSBC").
DzBankLogoData? findBankLogo(String? nameOrUrl, {String? country}) {
  final q = nameOrUrl?.trim() ?? '';
  if (q.isEmpty) return null;
  final fromUrl = DzBankLogos.sources[q];
  if (fromUrl != null) return bankLogoBySlug(fromUrl);
  final exact = bankLogoBySlug(q);
  if (exact != null) return exact;
  if (q.contains('/') || q.contains('.')) {
    final file = Uri.decodeComponent(q.split(RegExp(r'[?#]')).first.split('/').last)
        .replaceFirst(RegExp(r'\.(svg|png|jpe?g|webp)$', caseSensitive: false), '');
    for (final entry in DzBankLogos.sources.entries) {
      final last = entry.key.split('/').last;
      if (last.substring(0, last.lastIndexOf('.')) == file) return bankLogoBySlug(entry.value);
    }
    final bySlug = bankLogoBySlug(file);
    if (bySlug != null) return bySlug;
  }
  final index = _index ??= () {
    final map = <String, List<DzBankLogoData>>{};
    for (final b in DzBankLogos.all) {
      for (final key in {b.slug, ...b.names}.map(normalizeBankName)) {
        final list = map.putIfAbsent(key, () => []);
        if (!list.contains(b)) list.add(b);
      }
    }
    return map;
  }();
  final hits = index[normalizeBankName(q)];
  if (hits == null) return null;
  final c = country?.toUpperCase();
  if (c != null) {
    for (final b in hits) {
      if (b.countries.contains(c)) return b;
    }
  }
  return hits.first;
}
