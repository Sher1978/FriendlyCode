import 'dart:async';
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
  final TextEditingController _editUrlCtrl = TextEditingController();
  bool _isScraping = false;
  bool _isEditingSavedUrl = false;

  // Real-time progress tracking
  double _scrapeProgress = 0.0;
  String _scrapeStepText = '';
  String? _scrapeError;
  String? _activeJobId;
  StreamSubscription<DocumentSnapshot>? _activeJobSubscription;

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
    _activeJobSubscription?.cancel();
    _urlCtrl.dispose();
    _editUrlCtrl.dispose();
    super.dispose();
  }

  void _cancelActiveScrape() {
    _activeJobSubscription?.cancel();
    setState(() {
      _isScraping = false;
      _activeJobId = null;
      _scrapeProgress = 0.0;
      _scrapeStepText = '';
      _scrapeError = null;
    });
    _showToast("Синхронизация остановлена");
  }

  void _triggerScrape([String? customUrl]) async {
    final url = (customUrl ?? _urlCtrl.text).trim();
    if (url.isEmpty) {
      _showToast("Введите ссылку на ресторан в Grab, Zomato, Glovo или сайт");
      return;
    }

    final jobId = "job_${DateTime.now().millisecondsSinceEpoch}";

    setState(() {
      _isScraping = true;
      _activeJobId = jobId;
      _scrapeProgress = 0.10;
      _scrapeStepText = "Подключение к агрегатору доставки...";
      _scrapeError = null;
    });

    _showToast("Синхронизация запущена: отслеживаем прогресс в реальном времени...");

    // Persist link to the venue document
    try {
      await FirebaseFirestore.instance.collection('venues').doc(widget.venueId).set({
        'deliveryAggregatorUrl': url,
        'autoSyncEnabled': true,
        'lastAggregatorSyncAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));
    } catch (saveErr) {
      debugPrint("[DeliveryMenuManager] Venue url save note: $saveErr");
    }

    final currentPublishedNames = _publishedItems.map((e) => e.name.toLowerCase().trim()).toSet();

    // 1. Create scrape_jobs document in Firestore
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
        'mirrorImages': false,
        'status': 'pending',
        'progress': 10,
        'currentStep': 'Инициализация синхронизации меню...',
        'createdAt': FieldValue.serverTimestamp(),
        'itemsCount': 0,
        'items': [],
      });
    } catch (createErr) {
      debugPrint("[DeliveryMenuManager] Job doc create error: $createErr");
    }

    // Fail-safe: if Cloud Function has not updated within 4s, check for latest completed dishes
    Timer(const Duration(milliseconds: 3800), () async {
      if (!mounted || !_isScraping || _activeJobId != jobId) return;
      if (_scrapeProgress <= 0.15 && _stagedItems.isEmpty) {
        debugPrint("[DeliveryMenuManager] Running resilient fallback sync check...");
        try {
          final querySnap = await FirebaseFirestore.instance
              .collection('venues')
              .doc(widget.venueId)
              .collection('scrape_jobs')
              .where('status', isEqualTo: 'completed')
              .limit(1)
              .get();
          if (querySnap.docs.isNotEmpty && mounted && _isScraping && _activeJobId == jobId) {
            final docData = querySnap.docs.first.data();
            final fallbackItems = (docData['items'] as List<dynamic>?) ?? [];
            if (fallbackItems.isNotEmpty) {
              final parsed = fallbackItems.whereType<Map>().map((e) => GmMenuItem.fromMap(e)).toList();
              final newItems = parsed.where((item) => !currentPublishedNames.contains(item.name.toLowerCase().trim())).toList();
              final itemsToStage = _publishedItems.isEmpty ? parsed : newItems;
              setState(() {
                _stagedItems = itemsToStage.isNotEmpty ? itemsToStage : parsed;
                _selectedStagedIndices.clear();
                for (int i = 0; i < _stagedItems.length; i++) {
                  _selectedStagedIndices.add(i);
                }
                _scrapeProgress = 1.0;
                _isScraping = false;
                _scrapeStepText = "Синхронизация завершена! Получено ${_stagedItems.length} позиций.";
              });
              _showToast("Готово! Найдено ${_stagedItems.length} позиций для утверждения в меню");
            }
          }
        } catch (e) {
          debugPrint("[DeliveryMenuManager] Fallback check error: $e");
        }
      }
    });

    // 2. Real-time stream from Firestore scrape_jobs
    _activeJobSubscription?.cancel();
    _activeJobSubscription = FirebaseFirestore.instance
        .collection('venues')
        .doc(widget.venueId)
        .collection('scrape_jobs')
        .doc(jobId)
        .snapshots()
        .listen((snap) {
      if (!mounted || !snap.exists) return;
      final data = snap.data() ?? {};
      final status = data['status'] as String? ?? 'pending';
      final progressNum = data['progress'] as num?;
      final currentStep = data['currentStep'] as String? ?? '';
      final rawItems = (data['items'] as List<dynamic>?) ?? [];

      double prog = _scrapeProgress;
      if (progressNum != null) {
        prog = (progressNum.toDouble() / 100.0).clamp(0.05, 1.0);
      }

      // Stream newly received items immediately to the UI table!
      if (rawItems.isNotEmpty) {
        try {
          final parsed = rawItems
              .whereType<Map>()
              .map((e) => GmMenuItem.fromMap(e))
              .toList();
          final newItems = parsed.where((item) => !currentPublishedNames.contains(item.name.toLowerCase().trim())).toList();
          final itemsToStage = _publishedItems.isEmpty ? parsed : newItems;

          setState(() {
            _stagedItems = itemsToStage.isNotEmpty ? itemsToStage : parsed;
            _selectedStagedIndices.clear();
            for (int i = 0; i < _stagedItems.length; i++) {
              _selectedStagedIndices.add(i);
            }
          });
        } catch (parseErr) {
          debugPrint("[DeliveryMenuManager] Items parsing error: $parseErr");
        }
      }

      setState(() {
        _scrapeProgress = prog;
        if (currentStep.isNotEmpty) {
          _scrapeStepText = currentStep;
        }
      });

      if (status == 'completed') {
        _activeJobSubscription?.cancel();
        setState(() {
          _isScraping = false;
          _isEditingSavedUrl = false;
          _scrapeProgress = 1.0;
          _scrapeStepText = "Синхронизация завершена! Получено ${_stagedItems.length} позиций.";
        });

        if (_stagedItems.isEmpty && _publishedItems.isNotEmpty) {
          _showToast("Все блюда уже присутствуют в меню. Новых позиций не найдено.");
        } else {
          _showToast("Готово! Найдено ${_stagedItems.length} позиций для утверждения в меню");
        }
      } else if (status == 'failed' || status == 'error') {
        _activeJobSubscription?.cancel();
        final errMsg = data['error'] as String? ?? 'Не удалось загрузить меню';
        setState(() {
          _isScraping = false;
          _scrapeError = errMsg;
          _scrapeStepText = "Ошибка: $errMsg";
        });
        _showToast("Ошибка парсинга: $errMsg");
      }
    }, onError: (err, stack) {
      debugPrint("[DeliveryMenuManager] Stream listener error: $err");
      if (mounted) {
        setState(() {
          _isScraping = false;
          _scrapeError = "Ошибка соединения при получении данных";
        });
      }
    }, cancelOnError: true);
  }

  void _confirmDeleteAggregatorUrl() {
    showCupertinoDialog(
      context: context,
      builder: (ctx) => CupertinoAlertDialog(
        title: const Text("Отвязать агрегатор доставки?"),
        content: const Text(
          "Автоматическая синхронизация меню 2 раза в день будет отключена. Ранее опубликованное меню останется без изменений.",
        ),
        actions: [
          CupertinoDialogAction(
            child: const Text("Отмена"),
            onPressed: () => Navigator.of(ctx).pop(),
          ),
          CupertinoDialogAction(
            isDestructiveAction: true,
            onPressed: () async {
              Navigator.of(ctx).pop();
              try {
                await FirebaseFirestore.instance.collection('venues').doc(widget.venueId).update({
                  'deliveryAggregatorUrl': '',
                  'autoSyncEnabled': false,
                });
                setState(() {
                  _urlCtrl.clear();
                  _isEditingSavedUrl = false;
                });
                _showToast("Агрегатор доставки отвязан.");
              } catch (e) {
                debugPrint("[DeliveryMenuManager] Detach error: $e");
                _showToast("Не удалось отвязать агрегатор");
              }
            },
            child: const Text("Отвязать"),
          ),
        ],
      ),
    );
  }

  void _toggleAutoSync(bool enabled) async {
    try {
      await FirebaseFirestore.instance.collection('venues').doc(widget.venueId).update({
        'autoSyncEnabled': enabled,
      });
      _showToast(enabled ? "Автосинхронизация включена (04:00 и 16:00)" : "Автосинхронизация отключена");
    } catch (e) {
      debugPrint("[DeliveryMenuManager] AutoSync toggle error: $e");
    }
  }

  void _dismissSelectedStaged() async {
    if (_selectedStagedIndices.isEmpty) return;
    final remaining = <GmMenuItem>[];
    for (int i = 0; i < _stagedItems.length; i++) {
      if (!_selectedStagedIndices.contains(i)) {
        remaining.add(_stagedItems[i]);
      }
    }
    setState(() {
      _stagedItems = remaining;
      _selectedStagedIndices.clear();
    });
    try {
      await FirebaseFirestore.instance.collection('venues').doc(widget.venueId).update({
        'stagedMenuItems': remaining.map((e) => e.toMap()).toList(),
      });
      _showToast("Выбранные позиции отклонены и убраны из модерации");
    } catch (e) {
      debugPrint("[DeliveryMenuManager] Dismiss staged error: $e");
    }
  }

  String _formatTimestamp(Timestamp? ts) {
    if (ts == null) return "Ожидает первой синхронизации";
    final dt = ts.toDate();
    final day = dt.day.toString().padLeft(2, '0');
    final month = dt.month.toString().padLeft(2, '0');
    final hour = dt.hour.toString().padLeft(2, '0');
    final minute = dt.minute.toString().padLeft(2, '0');
    return "$day.$month в $hour:$minute";
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
      final remainingStaged = _stagedItems.where((item) => !itemsToPublish.contains(item)).toList();

      await FirebaseFirestore.instance.collection('venues').doc(widget.venueId).set({
        'gmConfig': {
          'businessType': 'horeca',
          'menuItems': combined.map((e) => e.toMap()).toList(),
          'updatedAt': FieldValue.serverTimestamp(),
        },
        'stagedMenuItems': remainingStaged.map((e) => e.toMap()).toList(),
      }, SetOptions(merge: true));

      setState(() {
        _publishedItems = combined;
        // Remove published from staging
        _stagedItems = remainingStaged;
        _selectedStagedIndices.clear();
        _isSaving = false;
      });

      _showToast("Успешно утверждено и опубликовано ${itemsToPublish.length} блюд в Revoo Delivery!");
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
        final savedAggregatorUrl = (data['deliveryAggregatorUrl'] as String? ?? '').trim();
        final autoSyncEnabled = data['autoSyncEnabled'] as bool? ?? true;
        final lastAggregatorSyncAt = data['lastAggregatorSyncAt'] as Timestamp?;
        final lastAggregatorSyncStatus = data['lastAggregatorSyncStatus'] as String? ?? '';
        final lastAggregatorSyncFound = data['lastAggregatorSyncFound'] as int? ?? 0;

        if (!_hasLoadedInitial) {
          if (data['gmConfig'] is Map) {
            final gmConfigMap = data['gmConfig'] as Map;
            final rawItems = (gmConfigMap['menuItems'] as List<dynamic>?) ?? [];
            _publishedItems = rawItems
                .whereType<Map>()
                .map((e) => GmMenuItem.fromMap(e))
                .toList();
          }

          final rawStaged = (data['stagedMenuItems'] as List<dynamic>?) ?? [];
          if (rawStaged.isNotEmpty && _stagedItems.isEmpty) {
            _stagedItems = rawStaged
                .whereType<Map>()
                .map((e) => GmMenuItem.fromMap(e))
                .toList();
            for (int i = 0; i < _stagedItems.length; i++) {
              _selectedStagedIndices.add(i);
            }
          }

          if (savedAggregatorUrl.isNotEmpty && _urlCtrl.text.isEmpty) {
            _urlCtrl.text = savedAggregatorUrl;
          }

          _hasLoadedInitial = true;
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
                _buildScraperControlCard(
                  savedAggregatorUrl,
                  autoSyncEnabled,
                  lastAggregatorSyncAt,
                  lastAggregatorSyncStatus,
                  lastAggregatorSyncFound,
                ),
                if (_isScraping || (_scrapeProgress >= 1.0 && _stagedItems.isNotEmpty) || _scrapeError != null) ...[
                  const SizedBox(height: 20),
                  _buildScrapeProgressCard(),
                ],
                const SizedBox(height: 24),
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

  Widget _buildScraperControlCard(
    String savedUrl,
    bool autoSyncEnabled,
    Timestamp? lastSyncAt,
    String lastSyncStatus,
    int lastSyncFound,
  ) {
    final hasSavedUrl = savedUrl.isNotEmpty;
    final isEditing = _isEditingSavedUrl || !hasSavedUrl;

    String platformName = "Агрегатор доставки";
    Color platformColor = AppColors.accentOrange;
    IconData platformIcon = CupertinoIcons.bag_fill;

    final lowerUrl = savedUrl.toLowerCase();
    if (lowerUrl.contains("grab")) {
      platformName = "GrabFood";
      platformColor = CupertinoColors.activeGreen;
      platformIcon = CupertinoIcons.bolt_fill;
    } else if (lowerUrl.contains("zomato")) {
      platformName = "Zomato";
      platformColor = Colors.redAccent;
      platformIcon = CupertinoIcons.flame_fill;
    } else if (lowerUrl.contains("glovo")) {
      platformName = "Glovo";
      platformColor = Colors.amber;
      platformIcon = CupertinoIcons.cart_fill;
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.macosSurfaceBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: hasSavedUrl && !isEditing
              ? platformColor.withOpacity(0.35)
              : AppColors.macosDivider,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: (hasSavedUrl ? platformColor : AppColors.accentOrange).withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  hasSavedUrl ? platformIcon : CupertinoIcons.cloud_download_fill,
                  color: hasSavedUrl ? platformColor : AppColors.accentOrange,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          hasSavedUrl
                              ? "$platformName • Источник меню"
                              : "Импорт и автосинхронизация меню",
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 15,
                          ),
                        ),
                        if (hasSavedUrl && !isEditing) ...[
                          const SizedBox(width: 10),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: (autoSyncEnabled ? CupertinoColors.activeGreen : Colors.grey).withOpacity(0.2),
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(
                                color: (autoSyncEnabled ? CupertinoColors.activeGreen : Colors.grey).withOpacity(0.4),
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  autoSyncEnabled ? CupertinoIcons.repeat : CupertinoIcons.pause,
                                  size: 11,
                                  color: autoSyncEnabled ? CupertinoColors.activeGreen : Colors.white70,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  autoSyncEnabled ? "Автосинхронизация 2 раза/сут" : "Автосинхронизация на паузе",
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w600,
                                    color: autoSyncEnabled ? CupertinoColors.activeGreen : Colors.white70,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      hasSavedUrl
                          ? "Меню автоматически сверяется в 04:00 и 16:00. Новые блюда направляются на модерацию."
                          : "Поддерживаются: GrabFood (VN/TH), Zomato (AE/IN), Glovo, Talabat, сайты заведений",
                      style: const TextStyle(color: AppColors.macosTextSecondary, fontSize: 11),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // 2. Body: Either Connected View or Edit/Input View
          if (hasSavedUrl && !isEditing) ...[
            // Connected Link Box
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.35),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
              ),
              child: Row(
                children: [
                  const Icon(CupertinoIcons.link, size: 14, color: AppColors.macosTextSecondary),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      savedUrl,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 13,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Controls & Timestamps
            Wrap(
              spacing: 12,
              runSpacing: 10,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                // Last sync info
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(CupertinoIcons.clock, size: 13, color: AppColors.macosTextSecondary),
                    const SizedBox(width: 6),
                    Text(
                      "Сверка: ${_formatTimestamp(lastSyncAt)}",
                      style: const TextStyle(color: AppColors.macosTextSecondary, fontSize: 12),
                    ),
                    if (lastSyncFound > 0) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                        decoration: BoxDecoration(
                          color: Colors.amber.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          "+$lastSyncFound новых",
                          style: const TextStyle(color: Colors.amber, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ],
                ),

                // AutoSync toggle
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text("Автообновление: ", style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 12)),
                    Transform.scale(
                      scale: 0.75,
                      child: CupertinoSwitch(
                        value: autoSyncEnabled,
                        activeColor: CupertinoColors.activeGreen,
                        onChanged: _toggleAutoSync,
                      ),
                    ),
                  ],
                ),

                // Action buttons: Sync Now, Edit, Delete
                CupertinoButton(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  color: Colors.white.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(8),
                  onPressed: () {
                    setState(() {
                      _isEditingSavedUrl = true;
                      _urlCtrl.text = savedUrl;
                    });
                  },
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(CupertinoIcons.pencil, size: 14, color: Colors.white70),
                      SizedBox(width: 6),
                      Text("Изменить", style: TextStyle(color: Colors.white, fontSize: 12)),
                    ],
                  ),
                ),
                CupertinoButton(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  color: Colors.red.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(8),
                  onPressed: _confirmDeleteAggregatorUrl,
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(CupertinoIcons.trash, size: 14, color: Colors.redAccent),
                      SizedBox(width: 6),
                      Text("Отвязать", style: TextStyle(color: Colors.redAccent, fontSize: 12)),
                    ],
                  ),
                ),
                CupertinoButton(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  color: CupertinoColors.activeGreen,
                  borderRadius: BorderRadius.circular(8),
                  onPressed: _isScraping ? null : () => _triggerScrape(savedUrl),
                  child: _isScraping
                      ? const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            CupertinoActivityIndicator(color: Colors.white),
                            SizedBox(width: 6),
                            Text("Синхронизация...", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                          ],
                        )
                      : const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(CupertinoIcons.arrow_2_circlepath, size: 14, color: Colors.white),
                            SizedBox(width: 6),
                            Text("Синхронизировать сейчас", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                          ],
                        ),
                ),
              ],
            ),
          ] else ...[
            // Input/Edit Mode
            Row(
              children: [
                Expanded(
                  child: CupertinoTextField(
                    controller: _urlCtrl,
                    placeholder: "Вставьте ссылку на ресторан в GrabFood, Zomato, Glovo или сайт...",
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
                const SizedBox(width: 10),
                if (hasSavedUrl) ...[
                  CupertinoButton(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    color: Colors.white.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    onPressed: () => setState(() => _isEditingSavedUrl = false),
                    child: const Text("Отмена", style: TextStyle(color: Colors.white70, fontSize: 13)),
                  ),
                  const SizedBox(width: 10),
                ],
                CupertinoButton(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  color: CupertinoColors.activeGreen,
                  borderRadius: BorderRadius.circular(8),
                  onPressed: _isScraping ? null : () => _triggerScrape(_urlCtrl.text),
                  child: _isScraping
                      ? const Row(
                          children: [
                            CupertinoActivityIndicator(color: Colors.white),
                            SizedBox(width: 8),
                            Text("Синхронизация...", style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white)),
                          ],
                        )
                      : Row(
                          children: [
                            const Icon(CupertinoIcons.bolt_fill, size: 16, color: Colors.white),
                            const SizedBox(width: 8),
                            Text(
                              hasSavedUrl ? "Сохранить и спарсить" : "Подключить и спарсить",
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                            ),
                          ],
                        ),
                ),
              ],
            ),
          ],

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
                Expanded(
                  child: Text(
                    _scrapeStepText.isNotEmpty
                        ? _scrapeStepText
                        : "Сверка меню через Gemini AI: извлекаем категории, цены и описания...",
                    style: TextStyle(color: AppColors.accentOrange.withOpacity(0.9), fontSize: 12),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildScrapeProgressCard() {
    final percentInt = (_scrapeProgress * 100).toInt();
    final isDone = !_isScraping && _scrapeProgress >= 1.0;
    final isError = _scrapeError != null;

    Color stateColor = CupertinoColors.activeGreen;
    if (isError) {
      stateColor = Colors.redAccent;
    } else if (_isScraping) {
      stateColor = AppColors.accentOrange;
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.macosSurfaceBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: stateColor.withOpacity(0.35)),
        boxShadow: [
          BoxShadow(
            color: stateColor.withOpacity(0.08),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: stateColor.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: _isScraping
                    ? const CupertinoActivityIndicator(color: Colors.white)
                    : Icon(
                        isError ? CupertinoIcons.exclamationmark_triangle_fill : CupertinoIcons.checkmark_circle_fill,
                        color: stateColor,
                        size: 20,
                      ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _isScraping
                          ? "Синхронизация меню в реальном времени"
                          : isError
                              ? "Ошибка синхронизации меню"
                              : "Меню успешно загружено",
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _scrapeStepText.isNotEmpty
                          ? _scrapeStepText
                          : (_isScraping ? "Идет обработка данных..." : "Готово к утверждению"),
                      style: TextStyle(
                        color: isError ? Colors.redAccent.withOpacity(0.9) : AppColors.macosTextSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: stateColor.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: stateColor.withOpacity(0.4)),
                ),
                child: Text(
                  "$percentInt%",
                  style: TextStyle(
                    color: stateColor,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Linear Progress Bar
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: _scrapeProgress.clamp(0.0, 1.0),
              minHeight: 6,
              backgroundColor: Colors.white.withOpacity(0.08),
              valueColor: AlwaysStoppedAnimation<Color>(stateColor),
            ),
          ),
          const SizedBox(height: 14),

          // Live Counter & Streaming Items Indicator
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(CupertinoIcons.square_stack_3d_up_fill, size: 14, color: AppColors.macosTextSecondary),
                  const SizedBox(width: 6),
                  Text(
                    "Получено блюд: ${_stagedItems.length}",
                    style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                  if (_isScraping && _stagedItems.isNotEmpty) ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: CupertinoColors.activeGreen.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Row(
                        children: [
                          Icon(CupertinoIcons.arrow_down_circle_fill, size: 10, color: CupertinoColors.activeGreen),
                          SizedBox(width: 4),
                          Text(
                            "Поступает онлайн",
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: CupertinoColors.activeGreen),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
              if (_isScraping)
                CupertinoButton(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  minSize: 0,
                  color: Colors.white.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(6),
                  onPressed: _cancelActiveScrape,
                  child: const Text("✕ Отмена", style: TextStyle(color: Colors.white70, fontSize: 11)),
                )
              else if (isDone || isError)
                CupertinoButton(
                  padding: EdgeInsets.zero,
                  minSize: 0,
                  onPressed: () {
                    setState(() {
                      _scrapeProgress = 0.0;
                      _scrapeStepText = '';
                      _scrapeError = null;
                    });
                  },
                  child: const Text("Скрыть", style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 12)),
                ),
            ],
          ),

          // Live dishes chip stream preview (shows items as they are scraped)
          if (_stagedItems.isNotEmpty && _isScraping) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.25),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.white.withOpacity(0.05)),
              ),
              child: Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  ..._stagedItems.take(8).map((item) {
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.06),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            item.name,
                            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w500),
                          ),
                          if (item.price.isNotEmpty) ...[
                            const SizedBox(width: 4),
                            Text(
                              "(${item.price} ${item.currency})",
                              style: const TextStyle(color: CupertinoColors.activeGreen, fontSize: 10, fontFamily: 'monospace'),
                            ),
                          ],
                        ],
                      ),
                    );
                  }),
                  if (_stagedItems.length > 8)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                      child: Text(
                        "+ еще ${_stagedItems.length - 8}...",
                        style: const TextStyle(color: AppColors.macosTextSecondary, fontSize: 11),
                      ),
                    ),
                ],
              ),
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
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    color: Colors.red.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(8),
                    onPressed: _selectedStagedIndices.isEmpty ? null : _dismissSelectedStaged,
                    child: const Text("Отклонить", style: TextStyle(color: Colors.redAccent, fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                  const SizedBox(width: 8),
                  CupertinoButton(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    color: Colors.white.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    onPressed: _publishAllStaged,
                    child: const Text("⚡ Опубликовать ВСЁ", style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                  const SizedBox(width: 10),
                  CupertinoButton(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    color: AppColors.accentOrange,
                    borderRadius: BorderRadius.circular(8),
                    onPressed: _selectedStagedIndices.isEmpty ? null : _publishSelectedItems,
                    child: Text("Опубликовать (${_selectedStagedIndices.length})", style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
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
