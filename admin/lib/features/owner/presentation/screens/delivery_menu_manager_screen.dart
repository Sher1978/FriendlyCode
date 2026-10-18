import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/theme/colors.dart';

class DeliveryMenuManagerScreen extends StatefulWidget {
  final String venueId;
  const DeliveryMenuManagerScreen({super.key, required this.venueId});

  @override
  State<DeliveryMenuManagerScreen> createState() => _DeliveryMenuManagerScreenState();
}

class _DeliveryMenuManagerScreenState extends State<DeliveryMenuManagerScreen> {
  final TextEditingController _urlCtrl = TextEditingController();
  bool _isScraping = false;
  String? _activeJobId;

  // Staging items from scrapers
  List<GmMenuItem> _stagedItems = [];
  final Set<int> _selectedStagedIndices = {};
  String _selectedCategoryFilter = 'ALL';

  // Active published menu items
  List<GmMenuItem> _publishedItems = [];
  bool _isSaving = false;
  bool _hasLoadedInitial = false;

  @override
  void dispose() {
    _urlCtrl.dispose();
    super.dispose();
  }

  void _triggerScrape() async {
    final url = _urlCtrl.text.trim();
    if (url.isEmpty) {
      _showToast("Введите ссылку на ресторан в Grab, Zomato, Glovo или сайт");
      return;
    }

    setState(() {
      _isScraping = true;
    });

    final jobId = "job_${DateTime.now().millisecondsSinceEpoch}";
    _activeJobId = jobId;

    try {
      await FirebaseFirestore.instance
          .collection('venues')
          .doc(widget.venueId)
          .collection('scrape_jobs')
          .doc(jobId)
          .set({
        'jobId': jobId,
        'venueId': widget.venueId,
        'url': url,
        'status': 'pending',
        'createdAt': FieldValue.serverTimestamp(),
        'itemsCount': 0,
        'items': [],
      });

      FirebaseFirestore.instance
          .collection('venues')
          .doc(widget.venueId)
          .collection('scrape_jobs')
          .doc(jobId)
          .snapshots()
          .listen((snap) {
        if (!mounted || !snap.exists) return;
        final data = snap.data() ?? {};
        final status = data['status'];
        if (status == 'completed') {
          final itemsRaw = data['items'] as List<dynamic>? ?? [];
          final parsed = itemsRaw.map((e) => GmMenuItem.fromMap(Map<String, dynamic>.from(e))).toList();
          setState(() {
            _stagedItems = parsed;
            _selectedStagedIndices.clear();
            for (int i = 0; i < _stagedItems.length; i++) {
              _selectedStagedIndices.add(i);
            }
            _isScraping = false;
          });
          _showToast("Готово! Загружено ${parsed.length} блюд в зону модерации");
        } else if (status == 'error') {
          setState(() => _isScraping = false);
          _showToast("Ошибка парсинга: ${data['error'] ?? 'Неизвестная ошибка'}");
        }
      });

      _showToast("Парсинг запущен через Apify & Gemini AI...");
    } catch (e) {
      setState(() => _isScraping = false);
      _showToast("Ошибка запуска: $e");
    }
  }

  void _applyMassPriceDiscount(double discountFraction) {
    if (_stagedItems.isEmpty) return;

    setState(() {
      for (int i = 0; i < _stagedItems.length; i++) {
        if (_selectedStagedIndices.contains(i)) {
          final item = _stagedItems[i];
          final rawAggPrice = item.aggregatorPrice.replaceAll(RegExp(r'[^\d.]'), '');
          final numPrice = double.tryParse(rawAggPrice) ?? 0.0;
          if (numPrice > 0) {
            final discounted = (numPrice * (1.0 - discountFraction)).round();
            _stagedItems[i] = item.copyWith(price: discounted.toString());
          }
        }
      }
    });
    _showToast("Цены пересчитаны со скидкой ${(discountFraction * 100).toInt()}%");
  }

  void _publishSelectedItems() async {
    final itemsToPublish = <GmMenuItem>[];
    for (int i = 0; i < _stagedItems.length; i++) {
      if (_selectedStagedIndices.contains(i)) {
        itemsToPublish.add(_stagedItems[i].copyWith(isPublished: true));
      }
    }

    if (itemsToPublish.isEmpty) {
      _showToast("Выберите хотя бы одну позицию для публикации");
      return;
    }

    setState(() => _isSaving = true);
    try {
      // Merge with published items
      final combined = [..._publishedItems, ...itemsToPublish];
      await FirebaseFirestore.instance.collection('venues').doc(widget.venueId).set({
        'gmConfig': {
          'businessType': 'horeca',
          'menuItems': combined.map((e) => e.toMap()).toList(),
          'updatedAt': FieldValue.serverTimestamp(),
        }
      }, SetOptions(merge: true));

      setState(() {
        _publishedItems = combined;
        // Remove published from staging
        _stagedItems = _stagedItems.where((item) => !itemsToPublish.contains(item)).toList();
        _selectedStagedIndices.clear();
        _isSaving = false;
      });

      _showToast("Успешно опубликовано ${itemsToPublish.length} блюд в Revoo Delivery!");
    } catch (e) {
      setState(() => _isSaving = false);
      _showToast("Ошибка публикации: $e");
    }
  }

  void _publishAllStaged() async {
    if (_stagedItems.isEmpty) return;

    setState(() {
      _selectedStagedIndices.clear();
      for (int i = 0; i < _stagedItems.length; i++) {
        _selectedStagedIndices.add(i);
      }
    });
    _publishSelectedItems();
  }

  void _savePublishedMenu() async {
    setState(() => _isSaving = true);
    try {
      await FirebaseFirestore.instance.collection('venues').doc(widget.venueId).set({
        'gmConfig': {
          'businessType': 'horeca',
          'menuItems': _publishedItems.map((e) => e.toMap()).toList(),
          'updatedAt': FieldValue.serverTimestamp(),
        }
      }, SetOptions(merge: true));

      setState(() => _isSaving = false);
      _showToast("Боевое меню сохранено!");
    } catch (e) {
      setState(() => _isSaving = false);
      _showToast("Ошибка сохранения: $e");
    }
  }

  void _showToast(String msg) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(msg),
          backgroundColor: AppColors.accentOrange,
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<DocumentSnapshot>(
      stream: FirebaseFirestore.instance.collection('venues').doc(widget.venueId).snapshots(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Center(child: CupertinoActivityIndicator(radius: 14));
        }

        final data = snapshot.data!.data() as Map<String, dynamic>? ?? {};
        if (!_hasLoadedInitial) {
          final gmConfigMap = data['gmConfig'] as Map<String, dynamic>? ?? {};
          final rawItems = (gmConfigMap['menuItems'] as List<dynamic>?) ?? [];
          _publishedItems = rawItems.map((e) => GmMenuItem.fromMap(e as Map<String, dynamic>)).toList();
          _hasLoadedInitial = true;
        }

        return StreamBuilder<QuerySnapshot>(
          stream: FirebaseFirestore.instance
              .collection('venues')
              .doc(widget.venueId)
              .collection('scrape_jobs')
              .orderBy('createdAt', descending: true)
              .limit(1)
              .snapshots(),
          builder: (context, jobSnap) {
            if (jobSnap.hasData && jobSnap.data!.docs.isNotEmpty) {
              final latestJob = jobSnap.data!.docs.first.data() as Map<String, dynamic>;
              final status = latestJob['status'] as String? ?? '';
              
              if (status == 'completed' && _isScraping) {
                _isScraping = false;
                final rawScraped = (latestJob['items'] as List<dynamic>?) ?? [];
                _stagedItems = rawScraped.map((e) => GmMenuItem.fromMap(e as Map<String, dynamic>)).toList();
                _selectedStagedIndices.clear();
                for (int i = 0; i < _stagedItems.length; i++) {
                  _selectedStagedIndices.add(i);
                }
              } else if (status == 'failed' && _isScraping) {
                _isScraping = false;
              }
            }

            return Scaffold(
              backgroundColor: AppColors.background,
              body: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildHeader(),
                    const SizedBox(height: 24),
                    _buildScraperControlCard(),
                    const SizedBox(height: 32),
                    if (_stagedItems.isNotEmpty) ...[
                      _buildStagingReviewSection(),
                      const SizedBox(height: 40),
                    ],
                    _buildActiveMenuSection(),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildHeader() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              "МЕНЮ И ИМПОРТ ДОСТАВКИ",
              style: TextStyle(
                color: Colors.white,
                fontSize: 24,
                fontWeight: FontWeight.w900,
                letterSpacing: -0.5,
              ),
            ),
            if (_publishedItems.isNotEmpty)
              CupertinoButton(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                color: AppColors.accentOrange,
                borderRadius: BorderRadius.circular(10),
                onPressed: _isSaving ? null : _savePublishedMenu,
                child: _isSaving
                    ? const CupertinoActivityIndicator(color: Colors.white)
                    : const Row(
                        children: [
                          Icon(CupertinoIcons.checkmark_alt, size: 16, color: Colors.white),
                          SizedBox(width: 8),
                          Text("СОХРАНИТЬ МЕНЮ", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white)),
                        ],
                      ),
              ),
          ],
        ),
        const SizedBox(height: 6),
        const Text(
          "Автоматический перенос позиций из GrabFood, Zomato, Glovo или сайтов ресторанов с гибким управлением ценами.",
          style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 13),
        ),
      ],
    );
  }

  Widget _buildScraperControlCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.macosSurfaceBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.macosDivider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.accentOrange.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(CupertinoIcons.cloud_download_fill, color: AppColors.accentOrange, size: 20),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text("Импорт из агрегаторов еды", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                    Text("Поддерживаются: GrabFood (VN/TH), Zomato (AE/IN), Glovo, Talabat, сайты заведений", style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 11)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: CupertinoTextField(
                  controller: _urlCtrl,
                  placeholder: "https://food.grab.com/vn/en/restaurant/... или https://www.zomato.com/dubai/...",
                  placeholderStyle: TextStyle(color: Colors.white.withOpacity(0.3), fontSize: 13),
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.4),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.white.withOpacity(0.15)),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              CupertinoButton(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                color: CupertinoColors.activeGreen,
                borderRadius: BorderRadius.circular(8),
                onPressed: _isScraping ? null : _triggerScrape,
                child: _isScraping
                    ? const Row(
                        children: [
                          CupertinoActivityIndicator(color: Colors.white),
                          SizedBox(width: 8),
                          Text("Парсинг...", style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white)),
                        ],
                      )
                    : const Row(
                        children: [
                          Icon(CupertinoIcons.bolt_fill, size: 16, color: Colors.white),
                          SizedBox(width: 8),
                          Text("Спарсить меню", style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white)),
                        ],
                      ),
              ),
            ],
          ),
          if (_isScraping) ...[
            const SizedBox(height: 14),
            Row(
              children: [
                const SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.accentOrange),
                ),
                const SizedBox(width: 10),
                Text(
                  "Apify Actor подключен. Gemini AI извлекает категории, цены и фото...",
                  style: TextStyle(color: AppColors.accentOrange.withOpacity(0.9), fontSize: 12),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildStagingReviewSection() {
    final categories = {'ALL', ..._stagedItems.map((e) => e.category.trim().isEmpty ? 'General' : e.category.trim())}.toList();
    final filteredItems = _selectedCategoryFilter == 'ALL'
        ? _stagedItems
        : _stagedItems.where((item) => (item.category.trim().isEmpty ? 'General' : item.category.trim()) == _selectedCategoryFilter).toList();

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.macosSurfaceBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.amber.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.amber.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      "STAGING (${_stagedItems.length} блюд)",
                      style: const TextStyle(color: Colors.amber, fontWeight: FontWeight.w900, fontSize: 12),
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Text("Проверьте и выберите блюда для публикации", style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 12)),
                ],
              ),
              Row(
                children: [
                  CupertinoButton(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    color: Colors.white.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    onPressed: _publishAllStaged,
                    child: const Text("⚡ Опубликовать ВСЁ в 1 клик", style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                  const SizedBox(width: 10),
                  CupertinoButton(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    color: AppColors.accentOrange,
                    borderRadius: BorderRadius.circular(8),
                    onPressed: _selectedStagedIndices.isEmpty ? null : _publishSelectedItems,
                    child: Text("Опубликовать выбранные (${_selectedStagedIndices.length})", style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Mass price adjuster buttons
          Row(
            children: [
              const Text("Массовая скидка от цены агрегатора:", style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 12)),
              const SizedBox(width: 10),
              _buildSmallDiscountBtn("-10%", 0.10),
              const SizedBox(width: 6),
              _buildSmallDiscountBtn("-15%", 0.15),
              const SizedBox(width: 6),
              _buildSmallDiscountBtn("-20%", 0.20),
              const SizedBox(width: 6),
              _buildSmallDiscountBtn("1 в 1", 0.0),
            ],
          ),
          const SizedBox(height: 16),

          // Category filter pills
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: categories.map((cat) {
                final isSel = _selectedCategoryFilter == cat;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(cat, style: TextStyle(fontSize: 11, color: isSel ? Colors.black : Colors.white)),
                    selected: isSel,
                    selectedColor: AppColors.accentOrange,
                    backgroundColor: Colors.white.withOpacity(0.08),
                    onSelected: (val) {
                      setState(() => _selectedCategoryFilter = cat);
                    },
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 16),

          // Staged Items List
          Column(
            children: List.generate(filteredItems.length, (idx) {
              final item = filteredItems[idx];
              final realIdx = _stagedItems.indexOf(item);
              final isChecked = _selectedStagedIndices.contains(realIdx);

              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isChecked ? Colors.white.withOpacity(0.06) : Colors.black.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: isChecked ? AppColors.accentOrange.withOpacity(0.5) : Colors.white.withOpacity(0.08),
                  ),
                ),
                child: Row(
                  children: [
                    CupertinoCheckbox(
                      value: isChecked,
                      activeColor: AppColors.accentOrange,
                      onChanged: (val) {
                        setState(() {
                          if (val == true) {
                            _selectedStagedIndices.add(realIdx);
                          } else {
                            _selectedStagedIndices.remove(realIdx);
                          }
                        });
                      },
                    ),
                    const SizedBox(width: 8),
                    Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                        image: (item.imageUrl.isNotEmpty)
                            ? DecorationImage(image: NetworkImage(item.imageUrl), fit: BoxFit.cover)
                            : null,
                      ),
                      child: item.imageUrl.isEmpty
                          ? const Icon(CupertinoIcons.photo, color: Colors.white30, size: 24)
                          : null,
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      flex: 4,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(item.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                          if (item.description.isNotEmpty)
                            Text(item.description, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.macosTextSecondary, fontSize: 11)),
                          Text("Категория: ${item.category}", style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 10)),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      flex: 2,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text("В агрегаторе: ${item.aggregatorPrice}", style: const TextStyle(color: Colors.grey, fontSize: 11, decoration: TextDecoration.lineThrough)),
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Text("Revo: ", style: TextStyle(color: CupertinoColors.activeGreen, fontSize: 11, fontWeight: FontWeight.bold)),
                              SizedBox(
                                width: 85,
                                child: CupertinoTextField(
                                  controller: TextEditingController(text: item.price),
                                  style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: Colors.black.withOpacity(0.4),
                                    borderRadius: BorderRadius.circular(4),
                                    border: Border.all(color: Colors.white24),
                                  ),
                                  onChanged: (newPrice) {
                                    _stagedItems[realIdx] = item.copyWith(price: newPrice);
                                  },
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            }),
          ),
        ],
      ),
    );
  }

  Widget _buildSmallDiscountBtn(String label, double fraction) {
    return CupertinoButton(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      color: Colors.white.withOpacity(0.08),
      borderRadius: BorderRadius.circular(6),
      onPressed: () => _applyMassPriceDiscount(fraction),
      child: Text(label, style: const TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold)),
    );
  }

  Widget _buildActiveMenuSection() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.macosSurfaceBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.macosDivider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(CupertinoIcons.bag_fill, color: CupertinoColors.activeGreen, size: 20),
                  const SizedBox(width: 10),
                  Text(
                    "ОПУБЛИКОВАННОЕ МЕНЮ (${_publishedItems.length} позиций)",
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                ],
              ),
              CupertinoButton(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                color: Colors.white.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
                onPressed: () {
                  setState(() {
                    _publishedItems.add(GmMenuItem(
                      id: "item_${DateTime.now().millisecondsSinceEpoch}",
                      name: "Новое блюдо",
                      category: "General",
                      price: "0",
                      isPublished: true,
                    ));
                  });
                },
                child: const Row(
                  children: [
                    Icon(CupertinoIcons.add, size: 14, color: Colors.white),
                    SizedBox(width: 6),
                    Text("Добавить вручную", style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (_publishedItems.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 32),
              child: Center(
                child: Column(
                  children: [
                    Icon(CupertinoIcons.cart_badge_plus, size: 48, color: Colors.white.withOpacity(0.2)),
                    const SizedBox(height: 12),
                    const Text("В меню пока нет блюд. Вставьте ссылку на агрегатор выше и нажмите «Спарсить меню».", style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 13)),
                  ],
                ),
              ),
            )
          else
            Column(
              children: List.generate(_publishedItems.length, (idx) {
                final item = _publishedItems[idx];
                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.04),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.white.withOpacity(0.08)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                          image: (item.imageUrl.isNotEmpty)
                              ? DecorationImage(image: NetworkImage(item.imageUrl), fit: BoxFit.cover)
                              : null,
                        ),
                        child: item.imageUrl.isEmpty ? const Icon(CupertinoIcons.photo, color: Colors.white24, size: 20) : null,
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(item.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                            Text("${item.category} • ${item.price}", style: const TextStyle(color: CupertinoColors.activeGreen, fontSize: 12, fontWeight: FontWeight.w600)),
                          ],
                        ),
                      ),
                      Row(
                        children: [
                          // In stock toggle
                          Text(item.isAvailable ? "В наличии" : "Стоп-лист", style: TextStyle(color: item.isAvailable ? Colors.green : Colors.red, fontSize: 11)),
                          CupertinoSwitch(
                            value: item.isAvailable,
                            activeColor: CupertinoColors.activeGreen,
                            onChanged: (val) {
                              setState(() {
                                _publishedItems[idx] = item.copyWith(isAvailable: val);
                              });
                            },
                          ),
                          const SizedBox(width: 8),
                          IconButton(
                            icon: const Icon(CupertinoIcons.delete, color: Colors.redAccent, size: 18),
                            onPressed: () {
                              setState(() {
                                _publishedItems.removeAt(idx);
                              });
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              }),
            ),
        ],
      ),
    );
  }
}
