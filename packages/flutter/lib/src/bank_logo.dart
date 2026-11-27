import 'package:flutter/widgets.dart';
import 'package:flutter_svg/flutter_svg.dart';

import 'bank_logo_data.dart';

/// Logo de banco ou cartão num azulejo quadrado de cantos retos (sem raio).
/// O SVG é desenhado como está, sem recorte.
///
/// ```dart
/// DzBankLogo('nubank', size: 32, semanticLabel: 'Nubank')
/// DzBankLogo.find('Banco do Brasil')
/// DzBankLogo.data(DzBankLogos.itau)
/// ```
///
/// Slug ou nome desconhecido mostra [fallback] (padrão: espaço vazio do
/// mesmo tamanho).
class DzBankLogo extends StatelessWidget {
  /// Pelo slug do catálogo (`'banco-do-brasil'`).
  DzBankLogo(String slug, {super.key, this.size = 32, this.semanticLabel, this.fallback})
      : logo = bankLogoBySlug(slug);

  /// Pelos dados (`DzBankLogos.nubank`).
  const DzBankLogo.data(DzBankLogoData this.logo, {super.key, this.size = 32, this.semanticLabel, this.fallback});

  /// Pelo nome, apelido, slug, URL antiga do logo ou nome do arquivo.
  /// [country] desempata nomes que existem em mais de um país.
  DzBankLogo.find(String? nameOrUrl, {super.key, String? country, this.size = 32, this.semanticLabel, this.fallback})
      : logo = findBankLogo(nameOrUrl, country: country);

  /// `null` quando não encontrado.
  final DzBankLogoData? logo;

  /// Lado em pixels lógicos. Padrão 32.
  final double size;

  /// Rótulo acessível. Sem ele o logo é decorativo.
  final String? semanticLabel;

  /// Mostrado quando o logo não existe no catálogo.
  final Widget? fallback;

  @override
  Widget build(BuildContext context) {
    final logo = this.logo;
    if (logo == null) return SizedBox.square(dimension: size, child: fallback);
    return SvgPicture.string(
      logo.svg,
      width: size,
      height: size,
      semanticsLabel: semanticLabel,
      excludeFromSemantics: semanticLabel == null,
    );
  }
}
