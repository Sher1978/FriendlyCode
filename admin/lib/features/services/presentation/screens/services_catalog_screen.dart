import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:friendly_code/core/models/services/index.dart';
import 'package:friendly_code/core/theme/colors.dart';

class ServicesCatalogScreen extends StatefulWidget {
  final String venueId;
  final String currency;
  final String archetype;

  const ServicesCatalogScreen({
    super.key,
    required this.venueId,
    this.currency = '₫',
    this.archetype = 'batch',
  });

  @override
  State<ServicesCatalogScreen> createState() => _ServicesCatalogScreenState();
}

class _ServicesCatalogScreenState extends State<ServicesCatalogScreen> {
  bool _isLoading = true;
  List<ServiceItem> _services = [];
  List<Map<String, dynamic>> _fleetTemplates = [];

  bool get _isBatch => widget.archetype == 'batch';

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      // 1. Load Services
      final snap = await FirebaseFirestore.instance
          .collection('venues')
          .doc(widget.venueId)
          .collection('services')
          .get();

      final list = snap.docs.map((d) => ServiceItem.fromMap(d.data(), d.id)).toList();

      // 2. Load Fleet Templates if batch
      List<Map<String, dynamic>> templates = [];
      if (_isBatch) {
        final fSnap = await FirebaseFirestore.instance
            .collection('venues')
            .doc(widget.venueId)
            .collection('fleetTemplates')
            .get();
        templates = fSnap.docs.map((d) {
          final data = d.data();
          data['id'] = d.id;
          return data;
        }).toList();
      }

      setState(() {
        _services = list;
        _fleetTemplates = templates;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      _showToast("Ошибка загрузки каталога: $e");
    }
  }

  void _showToast(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: AppColors.surface),
    );
  }

  Future<void> _openServiceEditor([ServiceItem? item]) async {
    final nameCtrl = TextEditingController(text: item?.name ?? '');
    final categoryCtrl = TextEditingController(text: item?.category ?? '');
    final isVnd = widget.currency == '₫' || widget.currency == 'VND';
    final defaultPrice = isVnd ? '2200000' : '2900';
    final priceCtrl = TextEditingController(text: item != null ? item.price.toStringAsFixed(0) : defaultPrice);
    final durationCtrl = TextEditingController(text: item != null ? item.durationMinutes.toString() : (_isBatch ? '600' : '45'));
    final descCtrl = TextEditingController(text: item?.description ?? '');
    final photoCtrl = TextEditingController(text: item?.photoUrl ?? '');

    String? selectedTemplateId = item?.fleetTemplateId ?? (_fleetTemplates.isNotEmpty ? _fleetTemplates.first['id'] : null);

    // Multi-tier packages
    List<TripPackageTier> currentPackages = item?.packages != null && item!.packages.isNotEmpty
        ? List<TripPackageTier>.from(item.packages)
        : (_isBatch
            ? [
                TripPackageTier(
                  id: 'stamp_45d',
                  name: '45 дней (Безвизовый штамп)',
                  price: isVnd ? 2200000 : 2900,
                  description: 'Трансфер туда-обратно, граница, обед',
                ),
                TripPackageTier(
                  id: 'visa_90d',
                  name: '90 дней (Туристическая виза TR)',
                  price: isVnd ? 3800000 : 4500,
                  description: 'Трансфер, консульские сборы, оформление',
                ),
              ]
            : []);

    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => Dialog(
          backgroundColor: AppColors.surface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: const BorderSide(color: AppColors.accentTeal, width: 1.5),
          ),
          child: Container(
            width: 620,
            constraints: const BoxConstraints(maxHeight: 780),
            padding: const EdgeInsets.all(24),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.accentTeal.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(
                          _isBatch ? CupertinoIcons.bus : CupertinoIcons.sparkles,
                          color: AppColors.accentTeal,
                          size: 22,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          item == null 
                              ? (_isBatch ? "Новый рейс & Тарифы" : "Новая услуга")
                              : (_isBatch ? "Редактировать рейс" : "Редактировать услугу"),
                          style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(CupertinoIcons.xmark, color: Colors.white54, size: 20),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // FLEET TEMPLATE SELECTOR (MANDATORY FOR BATCH)
                  if (_isBatch) ...[
                    const Text(
                      "Шаблон транспорта и схема мест",
                      style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 6),
                    if (_fleetTemplates.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.amber.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: Colors.amber.withValues(alpha: 0.4)),
                        ),
                        child: const Row(
                          children: [
                            Icon(CupertinoIcons.exclamationmark_triangle_fill, color: Colors.amber, size: 16),
                            SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                "Нет созданных автобусов! Сначала добавьте шаблон во вкладке «Автопарк».",
                                style: TextStyle(color: Colors.amber, fontSize: 12),
                              ),
                            ),
                          ],
                        ),
                      )
                    else
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.3),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.accentTeal.withValues(alpha: 0.5)),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: selectedTemplateId,
                            isExpanded: true,
                            dropdownColor: AppColors.surface,
                            style: const TextStyle(color: Colors.white, fontSize: 14),
                            items: _fleetTemplates.map((t) {
                              return DropdownMenuItem<String>(
                                value: t['id'] as String,
                                child: Text("${t['name']} (${t['totalCapacity']} мест)"),
                              );
                            }).toList(),
                            onChanged: (val) => setDialogState(() => selectedTemplateId = val),
                          ),
                        ),
                      ),
                    const SizedBox(height: 16),
                  ],

                  // Route / Service Name
                  Text(
                    _isBatch ? "Направление и название рейса" : "Название услуги",
                    style: const TextStyle(color: AppColors.macosTextSecondary, fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 6),
                  CupertinoTextField(
                    controller: nameCtrl,
                    placeholder: _isBatch 
                        ? "e.g. Бордер-ран в Камбоджу Ban Laem (Экспресс)" 
                        : "e.g. Мужская стрижка + моделирование бороды",
                    placeholderStyle: TextStyle(color: Colors.white.withValues(alpha: 0.3), fontSize: 14),
                    style: const TextStyle(color: Colors.white, fontSize: 15),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.macosDivider),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Category / Border Point
                  Text(
                    _isBatch ? "Категория направления (КПП / Страна)" : "Категория",
                    style: const TextStyle(color: AppColors.macosTextSecondary, fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 6),
                  CupertinoTextField(
                    controller: categoryCtrl,
                    placeholder: _isBatch 
                        ? "e.g. Камбоджа Ban Laem, Малайзия Пенанг, Лаос" 
                        : "e.g. Стрижки, Борода, Комплекс",
                    placeholderStyle: TextStyle(color: Colors.white.withValues(alpha: 0.3), fontSize: 14),
                    style: const TextStyle(color: Colors.white, fontSize: 15),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.macosDivider),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // MULTI-TIER PACKAGES (FOR BATCH / BORDER RUNS)
                  if (_isBatch) ...[
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          "Пакетные тарифы (Штамп 45д / Виза 90д)",
                          style: TextStyle(color: AppColors.accentTeal, fontSize: 13, fontWeight: FontWeight.bold),
                        ),
                        CupertinoButton(
                          padding: EdgeInsets.zero,
                          minSize: 24,
                          child: const Row(
                            children: [
                              Icon(CupertinoIcons.plus_circle, color: AppColors.accentTeal, size: 14),
                              SizedBox(width: 4),
                              Text("Добавить тариф", style: TextStyle(color: AppColors.accentTeal, fontSize: 12)),
                            ],
                          ),
                          onPressed: () {
                            setDialogState(() {
                              currentPackages.add(
                                TripPackageTier(
                                  id: 'custom_${DateTime.now().millisecondsSinceEpoch}',
                                  name: 'Новый пакет',
                                  price: 3500,
                                  description: 'Описание включенных опций',
                                ),
                              );
                            });
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ...List.generate(currentPackages.length, (idx) {
                      final pkg = currentPackages[idx];
                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.25),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: Colors.white12),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              flex: 3,
                              child: CupertinoTextField(
                                placeholder: "Название тарифа",
                                placeholderStyle: const TextStyle(color: Colors.white24, fontSize: 12),
                                style: const TextStyle(color: Colors.white, fontSize: 13),
                                controller: TextEditingController(text: pkg.name),
                                onChanged: (v) {
                                  currentPackages[idx] = TripPackageTier(
                                    id: pkg.id,
                                    name: v,
                                    price: pkg.price,
                                    description: pkg.description,
                                  );
                                },
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              flex: 2,
                              child: CupertinoTextField(
                                placeholder: "Цена (${widget.currency})",
                                keyboardType: TextInputType.number,
                                placeholderStyle: const TextStyle(color: Colors.white24, fontSize: 12),
                                style: const TextStyle(color: AppColors.accentTeal, fontSize: 13, fontWeight: FontWeight.bold),
                                controller: TextEditingController(text: pkg.price.toStringAsFixed(0)),
                                onChanged: (v) {
                                  currentPackages[idx] = TripPackageTier(
                                    id: pkg.id,
                                    name: pkg.name,
                                    price: double.tryParse(v) ?? pkg.price,
                                    description: pkg.description,
                                  );
                                },
                              ),
                            ),
                            IconButton(
                              icon: const Icon(CupertinoIcons.xmark_circle, color: Colors.redAccent, size: 16),
                              onPressed: () => setDialogState(() => currentPackages.removeAt(idx)),
                            ),
                          ],
                        ),
                      );
                    }),
                    const SizedBox(height: 16),
                  ],

                  // Base Price & Duration
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _isBatch ? "Базовая цена места (${widget.currency})" : "Цена (${widget.currency})",
                              style: const TextStyle(color: AppColors.macosTextSecondary, fontSize: 13, fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 6),
                            CupertinoTextField(
                              controller: priceCtrl,
                              keyboardType: TextInputType.number,
                              placeholder: _isBatch ? "2900" : "1500",
                              placeholderStyle: TextStyle(color: Colors.white.withValues(alpha: 0.3), fontSize: 14),
                              style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: Colors.black.withValues(alpha: 0.3),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppColors.macosDivider),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _isBatch ? "Время в пути (мин)" : "Длительность (мин)",
                              style: const TextStyle(color: AppColors.macosTextSecondary, fontSize: 13, fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 6),
                            CupertinoTextField(
                              controller: durationCtrl,
                              keyboardType: TextInputType.number,
                              placeholder: _isBatch ? "600 (10 ч)" : "45",
                              placeholderStyle: TextStyle(color: Colors.white.withValues(alpha: 0.3), fontSize: 14),
                              style: const TextStyle(color: Colors.white, fontSize: 15),
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: Colors.black.withValues(alpha: 0.3),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppColors.macosDivider),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Photo URL
                  Text(
                    "Ссылка на фото рейса / автобуса",
                    style: const TextStyle(color: AppColors.macosTextSecondary, fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 6),
                  CupertinoTextField(
                    controller: photoCtrl,
                    placeholder: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957",
                    placeholderStyle: TextStyle(color: Colors.white.withValues(alpha: 0.3), fontSize: 13),
                    style: const TextStyle(color: Colors.white, fontSize: 13),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.macosDivider),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Description
                  Text(
                    _isBatch ? "Что входит в стоимость (пакет опций)" : "Описание услуги",
                    style: const TextStyle(color: AppColors.macosTextSecondary, fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 6),
                  CupertinoTextField(
                    controller: descCtrl,
                    maxLines: 3,
                    placeholder: _isBatch 
                        ? "Трансфер туда-обратно от кондо, визовые сборы Камбоджи, VIP-коридор без очередей, обед, вода, кондиционер, Wi-Fi" 
                        : "Подробное описание процедуры для гостя...",
                    placeholderStyle: TextStyle(color: Colors.white.withValues(alpha: 0.3), fontSize: 13),
                    style: const TextStyle(color: Colors.white, fontSize: 14),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.macosDivider),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Action Buttons
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      CupertinoButton(
                        child: const Text("Отмена", style: TextStyle(color: Colors.white70)),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                      const SizedBox(width: 12),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.accentTeal,
                          foregroundColor: Colors.black,
                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: () async {
                          final name = nameCtrl.text.trim();
                          if (name.isEmpty) return;
                          final price = double.tryParse(priceCtrl.text) ?? 2900.0;
                          final duration = int.tryParse(durationCtrl.text) ?? (_isBatch ? 600 : 45);

                          Navigator.pop(ctx);
                          await _saveService(
                            id: item?.id,
                            name: name,
                            category: categoryCtrl.text.trim(),
                            price: price,
                            durationMinutes: duration,
                            description: descCtrl.text.trim(),
                            photoUrl: photoCtrl.text.trim(),
                            fleetTemplateId: selectedTemplateId,
                            packages: currentPackages,
                          );
                        },
                        child: Text(
                          item == null ? "Создать" : "Сохранить",
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _saveService({
    String? id,
    required String name,
    required String category,
    required double price,
    required int durationMinutes,
    required String description,
    String? photoUrl,
    String? fleetTemplateId,
    List<TripPackageTier>? packages,
  }) async {
    try {
      final col = FirebaseFirestore.instance
          .collection('venues')
          .doc(widget.venueId)
          .collection('services');

      final data = {
        'name': name,
        'title': name,
        'category': category.isEmpty ? (_isBatch ? 'Камбоджа' : 'Общие') : category,
        'price': price,
        'durationMinutes': durationMinutes,
        'description': description,
        'photoUrl': photoUrl,
        'currency': widget.currency,
        'isActive': true,
        'fleetTemplateId': fleetTemplateId,
        'packages': packages?.map((p) => p.toMap()).toList() ?? [],
        'updatedAt': FieldValue.serverTimestamp(),
      };

      if (id != null && id.isNotEmpty) {
        await col.doc(id).set(data, SetOptions(merge: true));
      } else {
        await col.add(data);
      }

      await _loadData();
      _showToast("Рейс успешно сохранен");
    } catch (e) {
      _showToast("Ошибка сохранения: $e");
    }
  }

  Future<void> _deleteService(String id) async {
    try {
      await FirebaseFirestore.instance
          .collection('venues')
          .doc(widget.venueId)
          .collection('services')
          .doc(id)
          .delete();
      await _loadData();
      _showToast("Удалено");
    } catch (e) {
      _showToast("Ошибка: $e");
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: _isLoading
          ? const Center(child: CupertinoActivityIndicator(color: AppColors.accentTeal))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _isBatch ? "Маршруты & Пакетные тарифы" : "Каталог услуг",
                            style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _isBatch 
                                ? "Направления, привязка к автобусам, пакеты (45 дней / 90 дней) и базовые тарифы" 
                                : "Услуги заведения, длительность и стоимость",
                            style: const TextStyle(color: AppColors.macosTextSecondary, fontSize: 13),
                          ),
                        ],
                      ),
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.accentTeal,
                          foregroundColor: Colors.black,
                          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        icon: const Icon(CupertinoIcons.plus, size: 16),
                        label: Text(
                          _isBatch ? "Новый маршрут" : "Добавить услугу",
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                        onPressed: () => _openServiceEditor(),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  if (_services.isEmpty) ...[
                    Container(
                      padding: const EdgeInsets.all(32),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.macosDivider),
                      ),
                      child: Center(
                        child: Column(
                          children: [
                            Icon(
                              _isBatch ? CupertinoIcons.bus : CupertinoIcons.scissors,
                              size: 48,
                              color: Colors.white30,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              _isBatch ? "Маршруты еще не созданы" : "В каталоге пока нет услуг",
                              style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              _isBatch 
                                  ? "Создайте первый маршрут в Камбоджу с тарифами на 45 и 90 дней." 
                                  : "Добавьте услуги, чтобы гости могли записываться онлайн.",
                              style: const TextStyle(color: AppColors.macosTextSecondary, fontSize: 13),
                            ),
                            const SizedBox(height: 18),
                            ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.accentTeal,
                                foregroundColor: Colors.black,
                                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              onPressed: () => _openServiceEditor(),
                              icon: const Icon(CupertinoIcons.plus, size: 16),
                              label: Text(
                                _isBatch ? "+ Создать первый маршрут" : "+ Добавить услугу",
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ] else ...[
                    ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: _services.length,
                      itemBuilder: (context, index) {
                        final item = _services[index];
                        final hasPhoto = item.photoUrl != null && item.photoUrl!.isNotEmpty;

                        // Find template name
                        String templateLabel = "Транспорт не выбран";
                        for (final t in _fleetTemplates) {
                          if (t['id'] == item.fleetTemplateId) {
                            templateLabel = "${t['name']} (${t['totalCapacity']} мест)";
                            break;
                          }
                        }

                        return Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                width: 52,
                                height: 52,
                                decoration: BoxDecoration(
                                  color: AppColors.accentTeal.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(12),
                                  image: hasPhoto 
                                      ? DecorationImage(image: NetworkImage(item.photoUrl!), fit: BoxFit.cover) 
                                      : null,
                                ),
                                child: !hasPhoto
                                    ? Icon(
                                        _isBatch ? CupertinoIcons.bus : CupertinoIcons.scissors,
                                        color: AppColors.accentTeal,
                                        size: 24,
                                      )
                                    : null,
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      item.name,
                                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      "${item.category} • ${item.durationMinutes} мин",
                                      style: TextStyle(color: Colors.white.withValues(alpha: 0.5), fontSize: 12),
                                    ),
                                    if (_isBatch) ...[
                                      const SizedBox(height: 6),
                                      Row(
                                        children: [
                                          const Icon(CupertinoIcons.bus, size: 12, color: AppColors.accentTeal),
                                          const SizedBox(width: 4),
                                          Text(
                                            templateLabel,
                                            style: const TextStyle(color: AppColors.accentTeal, fontSize: 12, fontWeight: FontWeight.w600),
                                          ),
                                        ],
                                      ),
                                    ],
                                    if (item.packages.isNotEmpty) ...[
                                      const SizedBox(height: 8),
                                      Wrap(
                                        spacing: 6,
                                        runSpacing: 6,
                                        children: item.packages.map((p) {
                                          return Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                            decoration: BoxDecoration(
                                              color: Colors.white.withValues(alpha: 0.08),
                                              borderRadius: BorderRadius.circular(6),
                                            ),
                                            child: Text(
                                              "${p.name}: ${p.price.toStringAsFixed(0)} ${widget.currency}",
                                              style: const TextStyle(color: Colors.white70, fontSize: 11),
                                            ),
                                          );
                                        }).toList(),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                              const SizedBox(width: 12),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                    "от ${item.price.toStringAsFixed(0)} ${widget.currency}",
                                    style: const TextStyle(color: AppColors.accentTeal, fontWeight: FontWeight.bold, fontSize: 16),
                                  ),
                                  const SizedBox(height: 6),
                                  Row(
                                    children: [
                                      CupertinoButton(
                                        padding: EdgeInsets.zero,
                                        minSize: 28,
                                        child: const Icon(CupertinoIcons.pencil, size: 16, color: Colors.white54),
                                        onPressed: () => _openServiceEditor(item),
                                      ),
                                      const SizedBox(width: 8),
                                      CupertinoButton(
                                        padding: EdgeInsets.zero,
                                        minSize: 28,
                                        child: const Icon(CupertinoIcons.trash, size: 16, color: Colors.redAccent),
                                        onPressed: () => _deleteService(item.id),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ],
                ],
              ),
            ),
    );
  }
}
