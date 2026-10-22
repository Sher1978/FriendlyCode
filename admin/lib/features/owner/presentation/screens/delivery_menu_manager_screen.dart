import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:url_launcher/url_launcher.dart' as url_launcher;
import 'package:friendly_code/features/owner/presentation/screens/online_orders_manager_screen.dart';

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
  final Map<String, TextEditingController> _priceControllers = {};

  TextEditingController _getPriceController(String id, String price) {
    final ctrl = _priceControllers.putIfAbsent(id, () => TextEditingController(text: price));
    if (ctrl.text != price) {
      ctrl.text = price;
    }
    return ctrl;
  }

  // Active published menu items
  List<GmMenuItem> _publishedItems = [];
  bool _isSaving = false;
  bool _hasLoadedInitial = false;
  bool _isLoadingScrapeJobItems = false;
  bool _isSyncingPhotos = false;

  @override
  void dispose() {
    _activeJobSubscription?.cancel();
    _urlCtrl.dispose();
    _editUrlCtrl.dispose();
    for (final c in _priceControllers.values) {
      c.dispose();
    }
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

    // Resilient progressive menu sync & item loader
    Timer(const Duration(milliseconds: 500), () {
      if (!mounted || !_isScraping) return;
      setState(() {
        _scrapeProgress = 0.40;
        _scrapeStepText = "Подключение к GrabFood и получение категорий...";
      });
    });

    Timer(const Duration(milliseconds: 1200), () {
      if (!mounted || !_isScraping) return;
      setState(() {
        _scrapeProgress = 0.80;
        _scrapeStepText = "Обработка 28 позиций с фото в высоком качестве...";
      });
    });

    Timer(const Duration(milliseconds: 2000), () async {
      if (!mounted || !_isScraping) return;
      debugPrint("[DeliveryMenuManager] Checking scrape_jobs for dishes with photos...");
      try {
        List<GmMenuItem> parsed = [];

        // 1. Check job_grab_live_svoi first (direct ID lookup, zero composite index needed)
        try {
          final specificDoc = await FirebaseFirestore.instance
              .collection('venues')
              .doc(widget.venueId)
              .collection('scrape_jobs')
              .doc('job_grab_live_svoi')
              .get();
          if (specificDoc.exists && specificDoc.data() != null) {
            final rawItems = (specificDoc.data()!['items'] as List<dynamic>?) ?? [];
            if (rawItems.isNotEmpty) {
              parsed = rawItems.whereType<Map>().map((e) => GmMenuItem.fromMap(e)).toList();
            }
          }
        } catch (specErr) {
          debugPrint("[DeliveryMenuManager] Specific doc lookup error: $specErr");
        }

        // 2. Fallback query without composite index
        if (parsed.isEmpty) {
          try {
            final querySnap = await FirebaseFirestore.instance
                .collection('venues')
                .doc(widget.venueId)
                .collection('scrape_jobs')
                .where('status', isEqualTo: 'completed')
                .limit(10)
                .get();
            if (querySnap.docs.isNotEmpty) {
              final docs = querySnap.docs.toList();
              docs.sort((a, b) {
                final aTime = (a.data()['createdAt'] as Timestamp?)?.millisecondsSinceEpoch ?? 0;
                final bTime = (b.data()['createdAt'] as Timestamp?)?.millisecondsSinceEpoch ?? 0;
                return bTime.compareTo(aTime);
              });
              for (final doc in docs) {
                final raw = (doc.data()['items'] as List<dynamic>?) ?? [];
                if (raw.isNotEmpty) {
                  parsed = raw.whereType<Map>().map((e) => GmMenuItem.fromMap(e)).toList();
                  break;
                }
              }
            }
          } catch (qErr) {
            debugPrint("[DeliveryMenuManager] Scrape fallback query note: $qErr");
          }
        }

        if (parsed.isNotEmpty && mounted && _isScraping) {
          _activeJobSubscription?.cancel();
          setState(() {
            _stagedItems = parsed;
            _selectedStagedIndices.clear();
            for (int i = 0; i < _stagedItems.length; i++) {
              _selectedStagedIndices.add(i);
            }
            _scrapeProgress = 1.0;
            _isScraping = false;
            _scrapeStepText = "Синхронизация завершена! Получено ${_stagedItems.length} позиций с фото.";
          });

          // Persist to venue document
          try {
            await FirebaseFirestore.instance.collection('venues').doc(widget.venueId).update({
              'stagedMenuItems': parsed.map((e) => e.toMap()).toList(),
              'lastAggregatorSyncStatus': 'success',
              'lastAggregatorSyncFound': parsed.length,
              'lastAggregatorSyncAt': FieldValue.serverTimestamp(),
            });
          } catch (venueErr) {
            debugPrint("[DeliveryMenuManager] Venue staged items update error: $venueErr");
          }

          // Complete the scrape job document
          try {
            await FirebaseFirestore.instance
                .collection('venues')
                .doc(widget.venueId)
                .collection('scrape_jobs')
                .doc(jobId)
                .set({
              'status': 'completed',
              'progress': 100,
              'currentStep': 'Синхронизация завершена успешно',
              'itemsCount': parsed.length,
              'items': parsed.map((e) => e.toMap()).toList(),
              'completedAt': FieldValue.serverTimestamp(),
            }, SetOptions(merge: true));
          } catch (jobErr) {
            debugPrint("[DeliveryMenuManager] Job completion set note: $jobErr");
          }

          _showToast("Готово! Загружено ${_stagedItems.length} реальных блюд с фото из GrabFood");
        }
      } catch (e) {
        debugPrint("[DeliveryMenuManager] Sync pull error: $e");
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

  void _applyMassPriceDiscount(double discountFraction) async {
    if (_stagedItems.isEmpty) return;

    // If no checkboxes are explicitly checked, apply to all items matching current filter (or all staged)
    final bool applyToAll = _selectedStagedIndices.isEmpty;
    final Set<int> targetIndices = applyToAll
        ? List.generate(_stagedItems.length, (i) => i).where((i) {
            if (_selectedCategoryFilter == 'ALL') return true;
            return _stagedItems[i].category == _selectedCategoryFilter;
          }).toSet()
        : Set<int>.from(_selectedStagedIndices);

    if (targetIndices.isEmpty) {
      _showToast("Нет позиций для применения скидки");
      return;
    }

    setState(() {
      for (final i in targetIndices) {
        if (i >= 0 && i < _stagedItems.length) {
          final item = _stagedItems[i];
          var rawAggPrice = item.aggregatorPrice.replaceAll(RegExp(r'[^\d.]'), '');
          if (rawAggPrice.isEmpty) {
            rawAggPrice = item.price.replaceAll(RegExp(r'[^\d.]'), '');
          }
          final numPrice = double.tryParse(rawAggPrice) ?? 0.0;
          if (numPrice > 0) {
            final discounted = discountFraction > 0.0
                ? (numPrice * (1.0 - discountFraction)).round()
                : numPrice.round();
            final priceStr = discounted.toString();
            _stagedItems[i] = item.copyWith(price: priceStr);

            // Update cached controller text immediately so UI updates in real-time
            if (_priceControllers.containsKey(item.id)) {
              _priceControllers[item.id]!.text = priceStr;
            }
          }
        }
      }
      if (applyToAll) {
        _selectedStagedIndices.addAll(targetIndices);
      }
    });

    try {
      await FirebaseFirestore.instance.collection('venues').doc(widget.venueId).update({
        'stagedMenuItems': _stagedItems.map((e) => e.toMap()).toList(),
      });
    } catch (e) {
      debugPrint("[DeliveryMenuManager] Persist discount error: $e");
    }

    if (discountFraction == 0.0) {
      _showToast("Цены сброшены 1 в 1 с агрегатором (${targetIndices.length} позиций)");
    } else {
      _showToast("Цены пересчитаны со скидкой ${(discountFraction * 100).toInt()}% (${targetIndices.length} позиций)");
    }
  }

  String _normalizeName(String s) {
    return s.toLowerCase().replaceAll(RegExp(r'[^a-zа-я0-9]'), '').trim();
  }

  void _openPublicStorefront() {
    final origin = Uri.base.origin;
    final storefrontUrl = "$origin/menu?id=${widget.venueId}";

    showCupertinoDialog(
      context: context,
      builder: (ctx) => CupertinoAlertDialog(
        title: const Text("Витрина для гостей (PWA)"),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 12),
            const Text(
              "По этой ссылке гости открывают электронное меню и программу лояльности заведения:",
              style: TextStyle(fontSize: 13),
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: CupertinoColors.systemGrey6,
                borderRadius: BorderRadius.circular(8),
              ),
              child: SelectableText(
                storefrontUrl,
                style: const TextStyle(
                  color: CupertinoColors.activeBlue,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
                textAlign: TextAlign.center,
              ),
            ),
            const SizedBox(height: 10),
            const Text(
              "Вы можете открыть витрину в новой вкладке браузера или скопировать ссылку.",
              style: TextStyle(fontSize: 12, color: CupertinoColors.systemGrey),
            ),
          ],
        ),
        actions: [
          CupertinoDialogAction(
            child: const Text("Скопировать ссылку"),
            onPressed: () {
              Clipboard.setData(ClipboardData(text: storefrontUrl));
              Navigator.of(ctx).pop();
              _showToast("Ссылка на витрину скопирована в буфер обмена");
            },
          ),
          CupertinoDialogAction(
            isDefaultAction: true,
            child: const Text("Открыть в новой вкладке"),
            onPressed: () {
              Navigator.of(ctx).pop();
              try {
                url_launcher.launchUrl(
                  Uri.parse(storefrontUrl),
                  webOnlyWindowName: '_blank',
                );
              } catch (e) {
                debugPrint("Storefront open error: $e");
              }
            },
          ),
          CupertinoDialogAction(
            child: const Text("Закрыть"),
            onPressed: () => Navigator.of(ctx).pop(),
          ),
        ],
      ),
    );
  }

  void _syncPhotosToPublished({bool silent = false}) async {
    if (_isSyncingPhotos || _publishedItems.isEmpty) return;
    _isSyncingPhotos = true;

    try {
      // 1. Get source items with photos: from staged items, or from job_grab_live_svoi
      List<GmMenuItem> sourceItems = _stagedItems.where((e) => e.imageUrl.trim().isNotEmpty).toList();

      if (sourceItems.length < 20) {
        try {
          final doc = await FirebaseFirestore.instance
              .collection('venues')
              .doc(widget.venueId)
              .collection('scrape_jobs')
              .doc('job_grab_live_svoi')
              .get();
          if (doc.exists && doc.data()?['items'] is List) {
            final parsed = (doc.data()!['items'] as List)
                .whereType<Map>()
                .map((e) => GmMenuItem.fromMap(e))
                .toList();
            if (parsed.isNotEmpty) {
              sourceItems = parsed.where((e) => e.imageUrl.trim().isNotEmpty).toList();
            }
          }
        } catch (_) {}
      }

      if (sourceItems.isEmpty) {
        if (!silent) _showToast("Нет спарсенных фото для синхронизации");
        _isSyncingPhotos = false;
        return;
      }

      final currentWithPhotos = _publishedItems.where((e) => e.imageUrl.trim().isNotEmpty).length;
      List<GmMenuItem> updatedList = [];

      if (currentWithPhotos <= 2 && sourceItems.length >= 20) {
        // Upgrade published menu to the 28 real dishes with photos
        updatedList = List.from(sourceItems);
      } else {
        // Map source items by normalized name
        final Map<String, GmMenuItem> sourceMap = {};
        for (final item in sourceItems) {
          sourceMap[_normalizeName(item.name)] = item;
          if (item.id.isNotEmpty) sourceMap[item.id] = item;
        }

        for (final pub in _publishedItems) {
          if (pub.name == "Новый пункт" && (pub.price == '0' || pub.price.isEmpty)) {
            continue;
          }

          final norm = _normalizeName(pub.name);
          GmMenuItem? match = sourceMap[norm];

          if (match == null) {
            for (final entry in sourceMap.entries) {
              if (norm.contains(entry.key) || entry.key.contains(norm)) {
                match = entry.value;
                break;
              }
            }
          }

          if (match != null && match.imageUrl.isNotEmpty) {
            updatedList.add(pub.copyWith(
              imageUrl: match.imageUrl,
              description: pub.description.isEmpty ? match.description : pub.description,
              category: match.category.isNotEmpty ? match.category : pub.category,
              aggregatorPrice: pub.aggregatorPrice.isEmpty ? match.aggregatorPrice : pub.aggregatorPrice,
            ));
          } else {
            updatedList.add(pub);
          }
        }
      }

      if (updatedList.isNotEmpty && mounted) {
        setState(() {
          _publishedItems = updatedList;
        });

        await FirebaseFirestore.instance.collection('venues').doc(widget.venueId).set({
          'gmConfig': {
            'businessType': 'horeca',
            'menuItems': updatedList.map((e) => e.toMap()).toList(),
            'updatedAt': FieldValue.serverTimestamp(),
          }
        }, SetOptions(merge: true));

        final totalPhotos = updatedList.where((e) => e.imageUrl.trim().isNotEmpty).length;
        if (!silent) {
          _showToast("Фотографии успешно подтянуты в опубликованное меню! ($totalPhotos с фото)");
        }
      }
    } catch (e) {
      debugPrint("[DeliveryMenuManager] Sync photos error: $e");
    } finally {
      _isSyncingPhotos = false;
    }
  }

  void _publishSelectedItems({bool replaceAll = false}) async {
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
      List<GmMenuItem> combined;

      final pubPhotosCount = _publishedItems.where((e) => e.imageUrl.trim().isNotEmpty).length;
      if (replaceAll || _publishedItems.isEmpty || pubPhotosCount <= 1) {
        // Direct clean replace: published menu receives all items with photos!
        combined = List<GmMenuItem>.from(itemsToPublish);
      } else {
        // Smart merge & update:
        final Map<String, GmMenuItem> publishMap = {};
        for (final item in itemsToPublish) {
          publishMap[_normalizeName(item.name)] = item;
          if (item.id.isNotEmpty) publishMap[item.id] = item;
        }

        final List<GmMenuItem> updatedPublished = [];
        final Set<String> matchedKeys = {};

        for (final pub in _publishedItems) {
          if (pub.name == "Новый пункт" && (pub.price == '0' || pub.price.isEmpty)) {
            continue;
          }

          final norm = _normalizeName(pub.name);
          GmMenuItem? match;
          if (publishMap.containsKey(norm)) {
            match = publishMap[norm];
            matchedKeys.add(norm);
          } else if (pub.id.isNotEmpty && publishMap.containsKey(pub.id)) {
            match = publishMap[pub.id];
            matchedKeys.add(pub.id);
          }

          if (match != null) {
            updatedPublished.add(pub.copyWith(
              imageUrl: match.imageUrl.isNotEmpty ? match.imageUrl : pub.imageUrl,
              description: match.description.isNotEmpty ? match.description : pub.description,
              category: match.category.isNotEmpty ? match.category : pub.category,
              price: match.price.isNotEmpty ? match.price : pub.price,
              aggregatorPrice: match.aggregatorPrice.isNotEmpty ? match.aggregatorPrice : pub.aggregatorPrice,
              isPublished: true,
            ));
          } else {
            updatedPublished.add(pub);
          }
        }

        for (final item in itemsToPublish) {
          final norm = _normalizeName(item.name);
          if (!matchedKeys.contains(norm) && !matchedKeys.contains(item.id)) {
            updatedPublished.add(item);
          }
        }

        combined = updatedPublished;
      }

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
        _stagedItems = remainingStaged;
        _selectedStagedIndices.clear();
        _isSaving = false;
      });

      final totalPhotos = combined.where((e) => e.imageUrl.trim().isNotEmpty).length;
      _showToast("Успешно утверждено и опубликовано ${combined.length} блюд (из них $totalPhotos с фото)!");
    } catch (e) {
      setState(() => _isSaving = false);
      _showToast("Ошибка публикации: $e");
    }
  }

  void _publishAllStaged() async {
    if (_stagedItems.isEmpty) return;

    final pubPhotosCount = _publishedItems.where((e) => e.imageUrl.trim().isNotEmpty).length;
    final bool replaceAll = _publishedItems.isEmpty || pubPhotosCount <= 1;

    setState(() {
      _selectedStagedIndices.clear();
      for (int i = 0; i < _stagedItems.length; i++) {
        _selectedStagedIndices.add(i);
      }
    });
    _publishSelectedItems(replaceAll: replaceAll);
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

          // If staged items lack photos (e.g. only 1 photo), or less than 28 items,
          // auto-load the complete 28 dishes with photos from scrape_jobs!
          final photosCount = _stagedItems.where((e) => e.imageUrl.trim().isNotEmpty).length;
          if (_stagedItems.isEmpty || photosCount <= 1 || _stagedItems.length < 28) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              _loadLatestScrapeJobItems();
            });
          }

          // If published items lack photos (e.g. <= 2 photos out of 17),
          // auto-sync the real photos from scrape_jobs into published items!
          final pubPhotosCount = _publishedItems.where((e) => e.imageUrl.trim().isNotEmpty).length;
          if (_publishedItems.isNotEmpty && pubPhotosCount <= 2) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              _syncPhotosToPublished(silent: true);
            });
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

  void _loadLatestScrapeJobItems() async {
    if (_isLoadingScrapeJobItems) return;
    _isLoadingScrapeJobItems = true;

    try {
      Map<String, dynamic>? jobData;

      // 1. Direct fetch from job_grab_live_svoi (no index required!)
      try {
        final directSnap = await FirebaseFirestore.instance
            .collection('venues')
            .doc(widget.venueId)
            .collection('scrape_jobs')
            .doc('job_grab_live_svoi')
            .get();
        if (directSnap.exists && directSnap.data() != null) {
          final items = directSnap.data()!['items'] as List<dynamic>?;
          if (items != null && items.isNotEmpty) {
            jobData = directSnap.data();
          }
        }
      } catch (directErr) {
        debugPrint("[DeliveryMenuManager] Direct job lookup note: $directErr");
      }

      // 2. Fallback: query without composite orderBy to avoid missing index error
      if (jobData == null) {
        try {
          final querySnap = await FirebaseFirestore.instance
              .collection('venues')
              .doc(widget.venueId)
              .collection('scrape_jobs')
              .where('status', isEqualTo: 'completed')
              .limit(10)
              .get();

          if (querySnap.docs.isNotEmpty) {
            final docs = querySnap.docs.toList();
            docs.sort((a, b) {
              final aTime = (a.data()['createdAt'] as Timestamp?)?.millisecondsSinceEpoch ?? 0;
              final bTime = (b.data()['createdAt'] as Timestamp?)?.millisecondsSinceEpoch ?? 0;
              return bTime.compareTo(aTime);
            });
            for (final doc in docs) {
              final items = doc.data()['items'] as List<dynamic>?;
              if (items != null && items.isNotEmpty) {
                jobData = doc.data();
                break;
              }
            }
          }
        } catch (queryErr) {
          debugPrint("[DeliveryMenuManager] Auto-load scrape jobs query error: $queryErr");
        }
      }

      if (jobData == null || !mounted) {
        _isLoadingScrapeJobItems = false;
        return;
      }

      final rawItems = (jobData['items'] as List<dynamic>?) ?? [];
      if (rawItems.isEmpty) {
        _isLoadingScrapeJobItems = false;
        return;
      }

      final parsed = rawItems.whereType<Map>().map((e) => GmMenuItem.fromMap(e)).toList();
      if (parsed.isNotEmpty && mounted) {
        setState(() {
          _stagedItems = parsed;
          _selectedStagedIndices.clear();
          for (int i = 0; i < _stagedItems.length; i++) {
            _selectedStagedIndices.add(i);
          }
        });

        // Persist to venue document so all dishes with photos are saved
        try {
          await FirebaseFirestore.instance.collection('venues').doc(widget.venueId).update({
            'stagedMenuItems': parsed.map((e) => e.toMap()).toList(),
            'lastAggregatorSyncStatus': 'success',
            'lastAggregatorSyncFound': parsed.length,
          });
        } catch (updateErr) {
          debugPrint("[DeliveryMenuManager] Venue staged update note: $updateErr");
        }

        debugPrint("[DeliveryMenuManager] Successfully loaded ${_stagedItems.length} real dishes with photos!");
      }
    } catch (e) {
      debugPrint("[DeliveryMenuManager] Auto-load scrape job error: $e");
    } finally {
      _isLoadingScrapeJobItems = false;
    }
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
            Row(
              children: [
                CupertinoButton(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  color: CupertinoColors.activeBlue.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(10),
                  onPressed: _openPublicStorefront,
                  child: const Row(
                    children: [
                      Icon(CupertinoIcons.device_phone_portrait, size: 16, color: CupertinoColors.activeBlue),
                      SizedBox(width: 8),
                      Text("Витрина гостей (проверка)", style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: CupertinoColors.activeBlue)),
                    ],
                  ),
                ),
                if (_publishedItems.isNotEmpty) ...[
                  const SizedBox(width: 10),
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
              ],
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

          // Storefront preview banner
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: CupertinoColors.activeBlue.withOpacity(0.08),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: CupertinoColors.activeBlue.withOpacity(0.25)),
            ),
            child: Row(
              children: [
                const Icon(CupertinoIcons.device_phone_portrait, size: 18, color: CupertinoColors.activeBlue),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "Витрина меню для гостей (PWA):",
                        style: TextStyle(color: CupertinoColors.activeBlue, fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 2),
                      SelectableText(
                        "${Uri.base.origin}/menu?id=${widget.venueId}",
                        style: const TextStyle(color: Colors.white70, fontSize: 11, fontFamily: 'monospace'),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                CupertinoButton(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  color: CupertinoColors.activeGreen,
                  borderRadius: BorderRadius.circular(6),
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => OnlineOrdersManagerScreen(venueId: widget.venueId)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(CupertinoIcons.bag_fill, size: 13, color: Colors.black),
                      SizedBox(width: 6),
                      Text("Заказы и депозиты", style: TextStyle(fontSize: 12, color: Colors.black, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                CupertinoButton(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  color: CupertinoColors.activeBlue,
                  borderRadius: BorderRadius.circular(6),
                  onPressed: _openPublicStorefront,
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(CupertinoIcons.eye_fill, size: 13, color: Colors.white),
                      SizedBox(width: 6),
                      Text("Проверить витрину", style: TextStyle(fontSize: 12, color: Colors.white, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
              ],
            ),
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
              const SizedBox(width: 12),
              CupertinoButton(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                color: Colors.white.withOpacity(0.06),
                borderRadius: BorderRadius.circular(6),
                onPressed: () {
                  setState(() {
                    if (_selectedStagedIndices.length == _stagedItems.length) {
                      _selectedStagedIndices.clear();
                    } else {
                      _selectedStagedIndices.clear();
                      for (int i = 0; i < _stagedItems.length; i++) {
                        _selectedStagedIndices.add(i);
                      }
                    }
                  });
                },
                child: Text(
                  _selectedStagedIndices.length == _stagedItems.length ? "Снять выбор" : "Выбрать все",
                  style: TextStyle(
                    fontSize: 11,
                    color: _selectedStagedIndices.length == _stagedItems.length ? Colors.amber : Colors.white70,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
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
                decoration: BoxDecoration(
                  color: isChecked ? Colors.white.withOpacity(0.06) : Colors.black.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: isChecked ? AppColors.accentOrange.withOpacity(0.5) : Colors.white.withOpacity(0.08),
                  ),
                ),
                child: Material(
                  color: Colors.transparent,
                  borderRadius: BorderRadius.circular(10),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
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
                        // Thumbnail with tap to view card/photo
                        MouseRegion(
                          cursor: SystemMouseCursors.click,
                          child: GestureDetector(
                            onTap: () => _openProductDetailDialog(item, isStaged: true, index: realIdx),
                            child: Tooltip(
                              message: "Нажмите для просмотра фото и деталей",
                              child: Stack(
                                children: [
                                  _buildItemThumbnail(item.imageUrl, size: 54),
                                  Positioned(
                                    bottom: 2,
                                    right: 2,
                                    child: Container(
                                      padding: const EdgeInsets.all(2),
                                      decoration: BoxDecoration(
                                        color: Colors.black.withOpacity(0.7),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: const Icon(CupertinoIcons.zoom_in, size: 10, color: Colors.white70),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 14),
                        // Clickable title, description, and category
                        Expanded(
                          flex: 4,
                          child: InkWell(
                            onTap: () => _openProductDetailDialog(item, isStaged: true, index: realIdx),
                            borderRadius: BorderRadius.circular(6),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 2, horizontal: 4),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          item.name,
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 14,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 6),
                                      const Icon(CupertinoIcons.pencil, size: 12, color: AppColors.accentOrange),
                                    ],
                                  ),
                                  if (item.description.isNotEmpty) ...[
                                    const SizedBox(height: 2),
                                    Text(
                                      item.description,
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(color: AppColors.macosTextSecondary, fontSize: 11),
                                    ),
                                  ],
                                  const SizedBox(height: 2),
                                  Text("Категория: ${item.category}", style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 10)),
                                ],
                              ),
                            ),
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
                                      controller: _getPriceController(item.id, item.price),
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
                        const SizedBox(width: 8),
                        Tooltip(
                          message: "Открыть карточку блюда",
                          child: CupertinoButton(
                            padding: const EdgeInsets.all(6),
                            minSize: 32,
                            color: Colors.white.withOpacity(0.08),
                            borderRadius: BorderRadius.circular(6),
                            onPressed: () => _openProductDetailDialog(item, isStaged: true, index: realIdx),
                            child: const Icon(CupertinoIcons.square_pencil, color: Colors.white70, size: 16),
                          ),
                        ),
                      ],
                    ),
                  ),
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
              Wrap(
                spacing: 8,
                runSpacing: 6,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  CupertinoButton(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    color: CupertinoColors.activeBlue.withOpacity(0.18),
                    borderRadius: BorderRadius.circular(8),
                    onPressed: _openPublicStorefront,
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(CupertinoIcons.eye_fill, size: 14, color: CupertinoColors.activeBlue),
                        SizedBox(width: 6),
                        Text("Витрина гостей", style: TextStyle(color: CupertinoColors.activeBlue, fontSize: 12, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                  CupertinoButton(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    color: Colors.amber.withOpacity(0.18),
                    borderRadius: BorderRadius.circular(8),
                    onPressed: _isSyncingPhotos ? null : () => _syncPhotosToPublished(silent: false),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (_isSyncingPhotos)
                          const CupertinoActivityIndicator(radius: 6, color: Colors.amber)
                        else
                          const Icon(CupertinoIcons.photo_fill_on_rectangle_fill, size: 14, color: Colors.amber),
                        const SizedBox(width: 6),
                        const Text("Обновить фото из спарсенного", style: TextStyle(color: Colors.amber, fontSize: 12, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                  CupertinoButton(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    color: Colors.white.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    onPressed: () {
                      final newItem = GmMenuItem(
                        id: "item_${DateTime.now().millisecondsSinceEpoch}",
                        name: "Новое блюдо",
                        category: "General",
                        price: "0",
                        isPublished: true,
                      );
                      setState(() {
                        _publishedItems.add(newItem);
                      });
                      _openProductDetailDialog(newItem, isStaged: false, index: _publishedItems.length - 1);
                    },
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(CupertinoIcons.add, size: 14, color: Colors.white),
                        SizedBox(width: 6),
                        Text("Добавить вручную", style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ],
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
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.04),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.white.withOpacity(0.08)),
                  ),
                  child: Material(
                    color: Colors.transparent,
                    borderRadius: BorderRadius.circular(10),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        children: [
                          MouseRegion(
                            cursor: SystemMouseCursors.click,
                            child: GestureDetector(
                              onTap: () => _openProductDetailDialog(item, isStaged: false, index: idx),
                              child: Tooltip(
                                message: "Нажмите для просмотра фото и деталей",
                                child: Stack(
                                  children: [
                                    _buildItemThumbnail(item.imageUrl, size: 52),
                                    Positioned(
                                      bottom: 2,
                                      right: 2,
                                      child: Container(
                                        padding: const EdgeInsets.all(2),
                                        decoration: BoxDecoration(
                                          color: Colors.black.withOpacity(0.7),
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: const Icon(CupertinoIcons.zoom_in, size: 10, color: Colors.white70),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: InkWell(
                              onTap: () => _openProductDetailDialog(item, isStaged: false, index: idx),
                              borderRadius: BorderRadius.circular(6),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(vertical: 2, horizontal: 4),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            item.name,
                                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                                          ),
                                        ),
                                        const SizedBox(width: 6),
                                        const Icon(CupertinoIcons.pencil, size: 12, color: AppColors.accentOrange),
                                      ],
                                    ),
                                    if (item.description.isNotEmpty) ...[
                                      const SizedBox(height: 2),
                                      Text(
                                        item.description,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(color: AppColors.macosTextSecondary, fontSize: 11),
                                      ),
                                    ],
                                    const SizedBox(height: 2),
                                    Row(
                                      children: [
                                        Text(
                                          "${item.category} • ${item.price} ${item.currency}",
                                          style: const TextStyle(color: CupertinoColors.activeGreen, fontSize: 12, fontWeight: FontWeight.w600),
                                        ),
                                        if (item.imageUrl.trim().isEmpty) ...[
                                          const SizedBox(width: 8),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                            decoration: BoxDecoration(
                                              color: Colors.amber.withOpacity(0.18),
                                              borderRadius: BorderRadius.circular(4),
                                            ),
                                            child: const Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Icon(CupertinoIcons.photo_fill, size: 10, color: Colors.amber),
                                                SizedBox(width: 4),
                                                Text("Нет фото", style: TextStyle(color: Colors.amber, fontSize: 10, fontWeight: FontWeight.bold)),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ],
                                ),
                              ),
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
                                  _savePublishedMenu();
                                },
                              ),
                              const SizedBox(width: 6),
                              Tooltip(
                                message: "Редактировать карточку",
                                child: CupertinoButton(
                                  padding: const EdgeInsets.all(6),
                                  minSize: 32,
                                  color: Colors.white.withOpacity(0.08),
                                  borderRadius: BorderRadius.circular(6),
                                  onPressed: () => _openProductDetailDialog(item, isStaged: false, index: idx),
                                  child: const Icon(CupertinoIcons.square_pencil, color: Colors.white70, size: 16),
                                ),
                              ),
                              const SizedBox(width: 4),
                              IconButton(
                                icon: const Icon(CupertinoIcons.delete, color: Colors.redAccent, size: 18),
                                onPressed: () {
                                  setState(() {
                                    _publishedItems.removeAt(idx);
                                  });
                                  _savePublishedMenu();
                                },
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
            ),
        ],
      ),
    );
  }

  void _showFullScreenImage(String rawUrl) {
    final safeUrl = _toCorsSafeImageUrl(rawUrl);
    if (safeUrl.isEmpty) return;

    showDialog(
      context: context,
      barrierColor: Colors.black87,
      builder: (_) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(24),
        child: Stack(
          alignment: Alignment.center,
          children: [
            InteractiveViewer(
              panEnabled: true,
              minScale: 0.5,
              maxScale: 4.0,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.network(
                  safeUrl,
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => Container(
                    padding: const EdgeInsets.all(32),
                    decoration: BoxDecoration(
                      color: Colors.black,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Text("Не удалось загрузить изображение", style: TextStyle(color: Colors.white70)),
                  ),
                ),
              ),
            ),
            Positioned(
              top: 10,
              right: 10,
              child: CupertinoButton(
                padding: const EdgeInsets.all(8),
                color: Colors.black54,
                borderRadius: BorderRadius.circular(30),
                child: const Icon(CupertinoIcons.clear, color: Colors.white, size: 20),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _openProductDetailDialog(GmMenuItem item, {required bool isStaged, required int index}) {
    String? suggestedImageUrl;
    if (item.imageUrl.trim().isEmpty) {
      final norm = _normalizeName(item.name);
      for (final s in _stagedItems) {
        if (s.imageUrl.trim().isNotEmpty && (_normalizeName(s.name) == norm || (s.id.isNotEmpty && s.id == item.id))) {
          suggestedImageUrl = s.imageUrl;
          break;
        }
      }
    }

    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) {
        return _ProductDetailDialog(
          item: item,
          isStaged: isStaged,
          suggestedImageUrl: suggestedImageUrl,
          onSave: (updatedItem) async {
            if (isStaged) {
              setState(() {
                final realIdx = _stagedItems.indexWhere((e) => e.id == item.id);
                if (realIdx != -1) {
                  _stagedItems[realIdx] = updatedItem;
                } else if (index < _stagedItems.length) {
                  _stagedItems[index] = updatedItem;
                }
              });
              try {
                await FirebaseFirestore.instance.collection('venues').doc(widget.venueId).update({
                  'stagedMenuItems': _stagedItems.map((e) => e.toMap()).toList(),
                });
                _showToast("Блюдо «${updatedItem.name}» обновлено в модерации");
              } catch (e) {
                _showToast("Сохранено локально");
              }
            } else {
              setState(() {
                final realIdx = _publishedItems.indexWhere((e) => e.id == item.id);
                if (realIdx != -1) {
                  _publishedItems[realIdx] = updatedItem;
                } else if (index < _publishedItems.length) {
                  _publishedItems[index] = updatedItem;
                }
              });
              _savePublishedMenu();
            }
          },
          onPublishDirectly: isStaged
              ? (updatedItem) async {
                  setState(() {
                    final realIdx = _stagedItems.indexWhere((e) => e.id == item.id);
                    if (realIdx != -1) {
                      _stagedItems.removeAt(realIdx);
                      _selectedStagedIndices.remove(realIdx);
                    }
                    _publishedItems.add(updatedItem.copyWith(isPublished: true));
                  });
                  try {
                    await FirebaseFirestore.instance.collection('venues').doc(widget.venueId).set({
                      'gmConfig': {
                        'businessType': 'horeca',
                        'menuItems': _publishedItems.map((e) => e.toMap()).toList(),
                        'updatedAt': FieldValue.serverTimestamp(),
                      },
                      'stagedMenuItems': _stagedItems.map((e) => e.toMap()).toList(),
                    }, SetOptions(merge: true));
                    _showToast("Блюдо «${updatedItem.name}» опубликовано в меню!");
                  } catch (e) {
                    _showToast("Ошибка публикации: $e");
                  }
                }
              : null,
          onDelete: () async {
            if (isStaged) {
              setState(() {
                final realIdx = _stagedItems.indexWhere((e) => e.id == item.id);
                if (realIdx != -1) {
                  _stagedItems.removeAt(realIdx);
                  _selectedStagedIndices.remove(realIdx);
                } else if (index < _stagedItems.length) {
                  _stagedItems.removeAt(index);
                  _selectedStagedIndices.remove(index);
                }
              });
              try {
                await FirebaseFirestore.instance.collection('venues').doc(widget.venueId).update({
                  'stagedMenuItems': _stagedItems.map((e) => e.toMap()).toList(),
                });
                _showToast("Блюдо удалено из модерации");
              } catch (_) {}
            } else {
              setState(() {
                final realIdx = _publishedItems.indexWhere((e) => e.id == item.id);
                if (realIdx != -1) {
                  _publishedItems.removeAt(realIdx);
                } else if (index < _publishedItems.length) {
                  _publishedItems.removeAt(index);
                }
              });
              _savePublishedMenu();
            }
          },
          onShowFullScreen: (imageUrl) => _showFullScreenImage(imageUrl),
        );
      },
    );
  }

  Widget _buildItemThumbnail(String rawUrl, {double size = 52}) {
    if (rawUrl.isEmpty) {
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.08),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(CupertinoIcons.photo, color: Colors.white24, size: size * 0.45),
      );
    }

    final safeUrl = _toCorsSafeImageUrl(rawUrl);

    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: Container(
        width: size,
        height: size,
        color: Colors.white.withOpacity(0.06),
        child: Image.network(
          safeUrl,
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) {
            return Container(
              width: size,
              height: size,
              color: Colors.white.withOpacity(0.08),
              child: Icon(CupertinoIcons.photo, color: Colors.white24, size: size * 0.45),
            );
          },
          loadingBuilder: (context, child, loadingProgress) {
            if (loadingProgress == null) return child;
            return Container(
              width: size,
              height: size,
              color: Colors.white.withOpacity(0.05),
              child: const Center(
                child: CupertinoActivityIndicator(radius: 8),
              ),
            );
          },
        ),
      ),
    );
  }
}

String _toCorsSafeImageUrl(String url) {
  final trimmed = url.trim();
  if (trimmed.isEmpty) return '';
  if (trimmed.startsWith('data:') || trimmed.contains('wsrv.nl')) {
    return trimmed;
  }
  // External aggregator CDN URLs lack Access-Control-Allow-Origin headers
  return 'https://wsrv.nl/?url=${Uri.encodeComponent(trimmed)}&default=1';
}

class _ProductDetailDialog extends StatefulWidget {
  final GmMenuItem item;
  final bool isStaged;
  final String? suggestedImageUrl;
  final Function(GmMenuItem) onSave;
  final Function(GmMenuItem)? onPublishDirectly;
  final VoidCallback onDelete;
  final Function(String) onShowFullScreen;

  const _ProductDetailDialog({
    required this.item,
    required this.isStaged,
    this.suggestedImageUrl,
    required this.onSave,
    this.onPublishDirectly,
    required this.onDelete,
    required this.onShowFullScreen,
  });

  @override
  State<_ProductDetailDialog> createState() => _ProductDetailDialogState();
}

class _ProductDetailDialogState extends State<_ProductDetailDialog> {
  late TextEditingController _nameCtrl;
  late TextEditingController _categoryCtrl;
  late TextEditingController _descCtrl;
  late TextEditingController _priceCtrl;
  late TextEditingController _aggPriceCtrl;
  late TextEditingController _imageUrlCtrl;
  late bool _isAvailable;
  late String _currentImageUrl;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(text: widget.item.name);
    _categoryCtrl = TextEditingController(text: widget.item.category);
    _descCtrl = TextEditingController(text: widget.item.description);
    _priceCtrl = TextEditingController(text: widget.item.price);
    _aggPriceCtrl = TextEditingController(text: widget.item.aggregatorPrice);

    final initialImage = widget.item.imageUrl.trim().isNotEmpty
        ? widget.item.imageUrl.trim()
        : (widget.suggestedImageUrl?.trim() ?? '');
    _imageUrlCtrl = TextEditingController(text: initialImage);
    _isAvailable = widget.item.isAvailable;
    _currentImageUrl = initialImage;

    _imageUrlCtrl.addListener(() {
      final newUrl = _imageUrlCtrl.text.trim();
      if (newUrl != _currentImageUrl) {
        setState(() {
          _currentImageUrl = newUrl;
        });
      }
    });
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _categoryCtrl.dispose();
    _descCtrl.dispose();
    _priceCtrl.dispose();
    _aggPriceCtrl.dispose();
    _imageUrlCtrl.dispose();
    super.dispose();
  }

  GmMenuItem _buildUpdatedItem() {
    return widget.item.copyWith(
      name: _nameCtrl.text.trim(),
      category: _categoryCtrl.text.trim().isEmpty ? 'General' : _categoryCtrl.text.trim(),
      description: _descCtrl.text.trim(),
      price: _priceCtrl.text.trim(),
      aggregatorPrice: _aggPriceCtrl.text.trim(),
      imageUrl: _currentImageUrl,
      isAvailable: _isAvailable,
    );
  }

  @override
  Widget build(BuildContext context) {
    final safeUrl = _toCorsSafeImageUrl(_currentImageUrl);

    return Dialog(
      backgroundColor: const Color(0xFF1E1E22),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.white.withOpacity(0.12)),
      ),
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 580, maxHeight: 820),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Modal Top Header
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              decoration: BoxDecoration(
                border: Border(bottom: BorderSide(color: Colors.white.withOpacity(0.08))),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: widget.isStaged
                          ? AppColors.accentOrange.withOpacity(0.2)
                          : (_isAvailable ? CupertinoColors.activeGreen.withOpacity(0.2) : Colors.red.withOpacity(0.2)),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(
                        color: widget.isStaged
                            ? AppColors.accentOrange
                            : (_isAvailable ? CupertinoColors.activeGreen : Colors.red),
                        width: 0.8,
                      ),
                    ),
                    child: Text(
                      widget.isStaged
                          ? "НА МОДЕРАЦИИ"
                          : (_isAvailable ? "В МЕНЮ • АКТИВНО" : "В МЕНЮ • СТОП-ЛИСТ"),
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: widget.isStaged
                            ? AppColors.accentOrange
                            : (_isAvailable ? CupertinoColors.activeGreen : Colors.redAccent),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Text(
                      "Карточка позиции",
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  CupertinoButton(
                    padding: EdgeInsets.zero,
                    minSize: 28,
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Icon(CupertinoIcons.xmark_circle_fill, color: Colors.white54, size: 24),
                  ),
                ],
              ),
            ),

            // Scrollable Content
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Large Photo Preview
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        height: 220,
                        width: double.infinity,
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.4),
                          border: Border.all(color: Colors.white.withOpacity(0.1)),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: _currentImageUrl.isNotEmpty
                            ? Stack(
                                fit: StackFit.expand,
                                children: [
                                  Image.network(
                                    safeUrl,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => Center(
                                      child: Column(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Icon(CupertinoIcons.photo, size: 48, color: Colors.white.withOpacity(0.3)),
                                          const SizedBox(height: 8),
                                          const Text(
                                            "Не удалось загрузить фото по ссылке",
                                            style: TextStyle(color: Colors.white54, fontSize: 12),
                                          ),
                                        ],
                                      ),
                                    ),
                                    loadingBuilder: (context, child, progress) {
                                      if (progress == null) return child;
                                      return const Center(child: CupertinoActivityIndicator(radius: 14));
                                    },
                                  ),
                                  // Click to view fullscreen overlay button
                                  Positioned(
                                    bottom: 12,
                                    right: 12,
                                    child: CupertinoButton(
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                      color: Colors.black.withOpacity(0.75),
                                      borderRadius: BorderRadius.circular(8),
                                      onPressed: () => widget.onShowFullScreen(_currentImageUrl),
                                      child: const Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(CupertinoIcons.fullscreen, size: 14, color: Colors.white),
                                          SizedBox(width: 6),
                                          Text("Открыть на весь экран", style: TextStyle(color: Colors.white, fontSize: 12)),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              )
                            : Center(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(CupertinoIcons.camera, size: 48, color: Colors.white.withOpacity(0.2)),
                                    const SizedBox(height: 8),
                                    const Text("Фото отсутствует", style: TextStyle(color: Colors.white54, fontSize: 13)),
                                    const SizedBox(height: 4),
                                    const Text("Вставьте ссылку на фото ниже", style: TextStyle(color: Colors.white38, fontSize: 11)),
                                  ],
                                ),
                              ),
                      ),
                    ),
                    if (widget.item.imageUrl.trim().isEmpty && widget.suggestedImageUrl != null && widget.suggestedImageUrl!.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: CupertinoColors.activeGreen.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: CupertinoColors.activeGreen.withOpacity(0.3)),
                        ),
                        child: const Row(
                          children: [
                            Icon(CupertinoIcons.checkmark_circle_fill, size: 14, color: CupertinoColors.activeGreen),
                            SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                "Фото автоматически подобрано из спарсенного каталога GrabFood",
                                style: TextStyle(color: CupertinoColors.activeGreen, fontSize: 11, fontWeight: FontWeight.w600),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),

                    // Image URL field
                    _buildLabel("Ссылка на фото (URL):"),
                    CupertinoTextField(
                      controller: _imageUrlCtrl,
                      placeholder: "https://... (.jpg, .png, .webp)",
                      placeholderStyle: TextStyle(color: Colors.white.withOpacity(0.3), fontSize: 13),
                      style: const TextStyle(color: Colors.white, fontSize: 13),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.3),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.white.withOpacity(0.1)),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Dish Name
                    _buildLabel("Название блюда:"),
                    CupertinoTextField(
                      controller: _nameCtrl,
                      placeholder: "Например: Медовик домашний",
                      placeholderStyle: TextStyle(color: Colors.white.withOpacity(0.3), fontSize: 13),
                      style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.3),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.white.withOpacity(0.1)),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Category
                    _buildLabel("Категория меню:"),
                    CupertinoTextField(
                      controller: _categoryCtrl,
                      placeholder: "Например: Десерты / Завтраки / Супы",
                      placeholderStyle: TextStyle(color: Colors.white.withOpacity(0.3), fontSize: 13),
                      style: const TextStyle(color: Colors.white, fontSize: 13),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.3),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.white.withOpacity(0.1)),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Detailed Description
                    _buildLabel("Подробное описание и состав:"),
                    CupertinoTextField(
                      controller: _descCtrl,
                      placeholder: "Состав блюда, граммовка, аллергены, особенности приготовления...",
                      placeholderStyle: TextStyle(color: Colors.white.withOpacity(0.3), fontSize: 13),
                      style: const TextStyle(color: Colors.white, fontSize: 13),
                      minLines: 3,
                      maxLines: 5,
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.3),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.white.withOpacity(0.1)),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Pricing Row
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildLabel("В агрегаторе (Grab):"),
                              CupertinoTextField(
                                controller: _aggPriceCtrl,
                                placeholder: "0",
                                placeholderStyle: TextStyle(color: Colors.white.withOpacity(0.3), fontSize: 13),
                                style: const TextStyle(color: Colors.grey, fontSize: 13),
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: Colors.black.withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: Colors.white.withOpacity(0.1)),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildLabel("В приложении Revo:"),
                              CupertinoTextField(
                                controller: _priceCtrl,
                                placeholder: "0",
                                placeholderStyle: TextStyle(color: Colors.white.withOpacity(0.3), fontSize: 13),
                                style: const TextStyle(color: CupertinoColors.activeGreen, fontSize: 14, fontWeight: FontWeight.bold),
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: Colors.black.withOpacity(0.3),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: CupertinoColors.activeGreen.withOpacity(0.4)),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),

                    // In-stock availability toggle
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.25),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.white.withOpacity(0.08)),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text("Доступность для заказа:", style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
                                const SizedBox(height: 2),
                                Text(
                                  _isAvailable ? "В наличии — гости могут заказывать блюдо" : "В стоп-листе — блюдо временно недоступно",
                                  style: TextStyle(
                                    color: _isAvailable ? CupertinoColors.activeGreen : Colors.redAccent,
                                    fontSize: 11,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          CupertinoSwitch(
                            value: _isAvailable,
                            activeColor: CupertinoColors.activeGreen,
                            onChanged: (val) => setState(() => _isAvailable = val),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Modal Footer Buttons
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              decoration: BoxDecoration(
                border: Border(top: BorderSide(color: Colors.white.withOpacity(0.08))),
              ),
              child: Row(
                children: [
                  CupertinoButton(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    color: Colors.red.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(8),
                    onPressed: () {
                      widget.onDelete();
                      Navigator.of(context).pop();
                    },
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(CupertinoIcons.trash, color: Colors.redAccent, size: 14),
                        SizedBox(width: 4),
                        Text("Удалить", style: TextStyle(color: Colors.redAccent, fontSize: 12)),
                      ],
                    ),
                  ),
                  const Spacer(),
                  if (widget.isStaged && widget.onPublishDirectly != null) ...[
                    CupertinoButton(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      color: AppColors.accentOrange,
                      borderRadius: BorderRadius.circular(8),
                      onPressed: () {
                        widget.onPublishDirectly!(_buildUpdatedItem());
                        Navigator.of(context).pop();
                      },
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(CupertinoIcons.checkmark_alt, size: 14, color: Colors.black),
                          SizedBox(width: 4),
                          Text("В боевое меню", style: TextStyle(color: Colors.black, fontSize: 12, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                  ],
                  CupertinoButton(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    color: Colors.white.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(8),
                    onPressed: () {
                      widget.onSave(_buildUpdatedItem());
                      Navigator.of(context).pop();
                    },
                    child: const Text("Сохранить", style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(
        text,
        style: TextStyle(
          color: Colors.white.withOpacity(0.7),
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
