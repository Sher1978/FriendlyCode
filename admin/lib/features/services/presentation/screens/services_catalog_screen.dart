import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:friendly_code/core/models/services/index.dart';
import 'package:friendly_code/core/theme/colors.dart';

class ServicesCatalogScreen extends StatefulWidget {
  final String venueId;
  const ServicesCatalogScreen({super.key, required this.venueId});

  @override
  State<ServicesCatalogScreen> createState() => _ServicesCatalogScreenState();
}

class _ServicesCatalogScreenState extends State<ServicesCatalogScreen> {
  bool _isLoading = true;
  List<ServiceItem> _services = [];

  @override
  void initState() {
    super.initState();
    _loadServices();
  }

  Future<void> _loadServices() async {
    setState(() => _isLoading = true);
    try {
      final snap = await FirebaseFirestore.instance
          .collection('venues')
          .doc(widget.venueId)
          .collection('services')
          .get();

      final list = snap.docs.map((d) => ServiceItem.fromMap(d.data(), d.id)).toList();
      setState(() {
        _services = list;
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
    final priceCtrl = TextEditingController(text: item != null ? item.price.toStringAsFixed(0) : '');
    final durationCtrl = TextEditingController(text: item != null ? item.durationMinutes.toString() : '45');
    final descCtrl = TextEditingController(text: item?.description ?? '');

    await showCupertinoDialog(
      context: context,
      builder: (ctx) => CupertinoAlertDialog(
        title: Text(item == null ? "Новая услуга" : "Редактировать услугу"),
        content: Padding(
          padding: const EdgeInsets.only(top: 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CupertinoTextField(
                controller: nameCtrl,
                placeholder: "Название (например: Стрижка мужская)",
                style: const TextStyle(color: Colors.white, fontSize: 13),
              ),
              const SizedBox(height: 8),
              CupertinoTextField(
                controller: categoryCtrl,
                placeholder: "Категория (например: Волосы)",
                style: const TextStyle(color: Colors.white, fontSize: 13),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: CupertinoTextField(
                      controller: priceCtrl,
                      keyboardType: TextInputType.number,
                      placeholder: "Цена (руб.)",
                      style: const TextStyle(color: Colors.white, fontSize: 13),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: CupertinoTextField(
                      controller: durationCtrl,
                      keyboardType: TextInputType.number,
                      placeholder: "Мин. (45)",
                      style: const TextStyle(color: Colors.white, fontSize: 13),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              CupertinoTextField(
                controller: descCtrl,
                placeholder: "Описание (необязательно)",
                maxLines: 2,
                style: const TextStyle(color: Colors.white, fontSize: 13),
              ),
            ],
          ),
        ),
        actions: [
          CupertinoDialogAction(
            child: const Text("Отмена"),
            onPressed: () => Navigator.pop(ctx),
          ),
          CupertinoDialogAction(
            isDefaultAction: true,
            child: const Text("Сохранить"),
            onPressed: () async {
              final name = nameCtrl.text.trim();
              if (name.isEmpty) return;
              final price = double.tryParse(priceCtrl.text) ?? 0.0;
              final duration = int.tryParse(durationCtrl.text) ?? 45;

              Navigator.pop(ctx);
              await _saveService(
                id: item?.id,
                name: name,
                category: categoryCtrl.text.trim(),
                price: price,
                durationMinutes: duration,
                description: descCtrl.text.trim(),
              );
            },
          ),
        ],
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
  }) async {
    try {
      final col = FirebaseFirestore.instance
          .collection('venues')
          .doc(widget.venueId)
          .collection('services');

      final data = {
        'name': name,
        'category': category.isEmpty ? 'Общие' : category,
        'price': price,
        'durationMinutes': durationMinutes,
        'description': description,
        'isActive': true,
        'updatedAt': FieldValue.serverTimestamp(),
      };

      if (id != null && id.isNotEmpty) {
        await col.doc(id).set(data, SetOptions(merge: true));
      } else {
        await col.add(data);
      }
      _loadServices();
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
      _loadServices();
    } catch (e) {
      _showToast("Ошибка удаления: $e");
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CupertinoNavigationBar(
        backgroundColor: AppColors.surface.withOpacity(0.9),
        middle: const Text("Каталог услуг", style: TextStyle(color: Colors.white, fontSize: 16)),
        trailing: CupertinoButton(
          padding: EdgeInsets.zero,
          child: const Icon(CupertinoIcons.plus_circle_fill, color: AppColors.accentGreen),
          onPressed: () => _openServiceEditor(),
        ),
      ),
      body: _isLoading
          ? const Center(child: CupertinoActivityIndicator(color: AppColors.accentGreen))
          : _services.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(CupertinoIcons.scissors, size: 48, color: Colors.white24),
                      const SizedBox(height: 12),
                      const Text("В каталоге пока нет услуг", style: TextStyle(color: Colors.white70, fontSize: 15)),
                      const SizedBox(height: 16),
                      CupertinoButton.filled(
                        child: const Text("Добавить услугу"),
                        onPressed: () => _openServiceEditor(),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
                  itemCount: _services.length,
                  itemBuilder: (context, index) {
                    final item = _services[index];
                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.white.withOpacity(0.08)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: AppColors.accentGreen.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(CupertinoIcons.scissors, color: AppColors.accentGreen, size: 20),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item.name,
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  "${item.category} · ${item.durationMinutes} мин",
                                  style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 12),
                                ),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                "${item.price.toStringAsFixed(0)} ₽",
                                style: const TextStyle(color: AppColors.accentGreen, fontWeight: FontWeight.bold, fontSize: 15),
                              ),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  CupertinoButton(
                                    padding: EdgeInsets.zero,
                                    minSize: 24,
                                    child: const Icon(CupertinoIcons.pencil, size: 16, color: Colors.white54),
                                    onPressed: () => _openServiceEditor(item),
                                  ),
                                  const SizedBox(width: 8),
                                  CupertinoButton(
                                    padding: EdgeInsets.zero,
                                    minSize: 24,
                                    child: const Icon(CupertinoIcons.trash, size: 16, color: Colors.redAccent),
                                    onPressed: () => _deleteService(item.id),
                                  ),
                                ],
                              )
                            ],
                          )
                        ],
                      ),
                    );
                  },
                ),
    );
  }
}
