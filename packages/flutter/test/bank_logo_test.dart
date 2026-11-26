import 'package:despezzas_bank_icons/despezzas_bank_icons.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('catálogo consistente', () {
    expect(DzBankLogos.all, hasLength(343));
    final slugs = DzBankLogos.all.map((b) => b.slug).toSet();
    expect(slugs, hasLength(DzBankLogos.all.length));
    for (final b in DzBankLogos.all) {
      expect(b.names, isNotEmpty, reason: b.slug);
      expect(b.countries, isNotEmpty, reason: b.slug);
      expect(b.svg, startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"'), reason: b.slug);
    }
  });

  test('todo SVG é lido pelo flutter_svg', () async {
    for (final b in DzBankLogos.all) {
      final info = await vg.loadPicture(SvgStringLoader(b.svg), null);
      expect(info.size, const Size(64, 64), reason: b.slug);
      info.picture.dispose();
    }
  });

  test('busca por nome, apelido, slug e URL', () {
    expect(DzBankLogos.find('Banco do Brasil'), DzBankLogos.bancoDoBrasil);
    expect(DzBankLogos.find('ITAÚ'), DzBankLogos.itau);
    expect(DzBankLogos.find('MercadoPago'), DzBankLogos.mercadoPago);
    expect(DzBankLogos.find('Bradescard'), DzBankLogos.bradesco);
    expect(DzBankLogos.find('openbank'), DzBankLogos.openbank);
    expect(DzBankLogos.find('https://cdn.despezzas.com.br/argentina-banks/astropay.svg'), DzBankLogos.astropay);
    expect(DzBankLogos.find('astropay.svg'), DzBankLogos.astropay);
    expect(DzBankLogos.find('HSBC', country: 'MX'), DzBankLogos.hsbcMx);
    expect(DzBankLogos.find('não existe'), isNull);
    expect(DzBankLogos.find(null), isNull);
    expect(DzBankLogos.bySlug('99-pay'), DzBankLogos.bank99Pay);
    for (final b in DzBankLogos.all) {
      expect(DzBankLogos.find(b.slug), b, reason: b.slug);
    }
  });

  testWidgets('renderiza todos os logos', (tester) async {
    await tester.pumpWidget(
      Directionality(
        textDirection: TextDirection.ltr,
        child: SingleChildScrollView(
          child: Wrap(children: [for (final b in DzBankLogos.all) DzBankLogo.data(b, size: 24)]),
        ),
      ),
    );
    await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 500)));
    await tester.pumpAndSettle();
    expect(find.byType(SvgPicture), findsNWidgets(343));
    expect(tester.takeException(), isNull);
  });

  testWidgets('tamanho, semântica e fallback', (tester) async {
    final handle = tester.ensureSemantics();
    await tester.pumpWidget(
      Directionality(
        textDirection: TextDirection.ltr,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            DzBankLogo('nubank', size: 40, semanticLabel: 'Nubank'),
            DzBankLogo.find('Banco do Brasil'),
            DzBankLogo('nao-existe', fallback: const Text('?')),
          ],
        ),
      ),
    );
    expect(tester.getSize(find.byType(DzBankLogo).first), const Size(40, 40));
    expect(tester.getSize(find.byType(DzBankLogo).at(1)), const Size(32, 32));
    expect(find.bySemanticsLabel('Nubank'), findsOneWidget);
    expect(find.text('?'), findsOneWidget);
    expect(tester.getSize(find.byType(DzBankLogo).last), const Size(32, 32));
    handle.dispose();
  });
}
