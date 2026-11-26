import 'package:despezzas_bank_icons/despezzas_bank_icons.dart';
import 'package:material_ui/material_ui.dart';

void main() => runApp(const GalleryApp());

/// Galeria: todos os logos, com busca e troca de tema.
class GalleryApp extends StatefulWidget {
  const GalleryApp({super.key});

  @override
  State<GalleryApp> createState() => _GalleryAppState();
}

class _GalleryAppState extends State<GalleryApp> {
  String _query = '';
  bool _dark = false;

  @override
  Widget build(BuildContext context) {
    final q = normalizeBankName(_query);
    final logos = DzBankLogos.all
        .where((b) => q.isEmpty || [b.slug, ...b.names].any((n) => normalizeBankName(n).contains(q)))
        .toList();
    return MaterialApp(
      title: 'Despezzas Bank Icons',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(useMaterial3: true, brightness: _dark ? Brightness.dark : Brightness.light),
      home: Scaffold(
        appBar: AppBar(
          title: Text('${logos.length} logos'),
          actions: [
            IconButton(
              icon: Icon(_dark ? Icons.light_mode : Icons.dark_mode),
              onPressed: () => setState(() => _dark = !_dark),
            ),
          ],
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(56),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: TextField(
                decoration: const InputDecoration(hintText: 'Buscar banco', prefixIcon: Icon(Icons.search)),
                onChanged: (v) => setState(() => _query = v),
              ),
            ),
          ),
        ),
        body: GridView.extent(
          maxCrossAxisExtent: 112,
          padding: const EdgeInsets.all(12),
          children: [
            for (final b in logos)
              Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  DzBankLogo.data(b, size: 48, semanticLabel: b.name),
                  const SizedBox(height: 6),
                  Text(b.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11)),
                ],
              ),
          ],
        ),
      ),
    );
  }
}
