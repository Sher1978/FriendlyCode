import 'dart:convert';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:file_picker/file_picker.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/models/services/ai_knowledge_profile_model.dart';
import 'package:friendly_code/core/services/continuous_knowledge_service.dart';
import 'package:friendly_code/core/theme/colors.dart';

class VenueThreeStageWorkspaceScreen extends StatefulWidget {
  final VenueModel? venue;
  final String? venueId;
  final VoidCallback? onSaved;

  const VenueThreeStageWorkspaceScreen({
    super.key,
    this.venue,
    this.venueId,
    this.onSaved,
  });

  @override
  State<VenueThreeStageWorkspaceScreen> createState() => _VenueThreeStageWorkspaceScreenState();
}

class _VenueThreeStageWorkspaceScreenState extends State<VenueThreeStageWorkspaceScreen> {
  int _currentStep = 0; // 0 = Сбор мультиданных, 1 = Двухуровневый JSON & Дозаполнение, 2 = AI-Интервью & Финал
  int _stage2ViewMode = 0; // 0 = Понятное резюме (Narrative), 1 = Редактор полей, 2 = JSON код
  String _aiNarrative = '';

  bool _isLoading = true;
  bool _isAnalyzing = false;
  String _analyzingStatus = '';
  VenueModel? _venue;

  // --- STAGE 1 CONTROLLERS (Data Intake) ---
  final _googleMapsUrlCtrl = TextEditingController();
  final _websiteUrlCtrl = TextEditingController();
  final _telegramChannelCtrl = TextEditingController();
  final _otherSocialsCtrl = TextEditingController();
  final _freeformNotesCtrl = TextEditingController();

  bool _isParsingMaps = false;
  String? _mapsParseSuccess;
  final List<Map<String, dynamic>> _attachedFiles = []; // [{'name': str, 'bytes': Uint8List, 'mime': str}]

  // Live Extraction Steps for Modal Overlay Console
  final List<Map<String, dynamic>> _liveExtractionSteps = [];
  String _livePreviewSnippet = '';

  // --- STAGE 2 CONTROLLERS (Two-Tier JSON Grid) ---
  final _nameCtrl = TextEditingController();
  final _archetypeCtrl = TextEditingController(text: 'batch');
  final _categoryCtrl = TextEditingController(text: 'Бордер-ран / Виза-ран');
  final _cityAddressCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _telegramStaffChatCtrl = TextEditingController();
  final _currencyCtrl = TextEditingController(text: '฿');
  final _visaRulesCtrl = TextEditingController();

  // Tier 2 Optional
  final _ratingCtrl = TextEditingController();
  final _reviewCountCtrl = TextEditingController();
  final _coverPhotoUrlCtrl = TextEditingController();
  final _timingCtrl = TextEditingController();
  final _fleetCtrl = TextEditingController();
  final _lunchCtrl = TextEditingController();
  final _luggageCtrl = TextEditingController();
  final _cancellationCtrl = TextEditingController();

  // Stage 2 Live AI Chat
  final _liveAiCorrectionCtrl = TextEditingController();
  final List<Map<String, String>> _aiChatHistory = [];
  bool _isLiveAiThinking = false;

  // --- STAGE 3 STATE (Finalization, Markdown & Interview) ---
  final _masterDocCtrl = TextEditingController();
  List<Map<String, dynamic>> _interviewQuestions = [];
  final Map<String, TextEditingController> _interviewAnswerControllers = {};
  bool _isFinalizing = false;

  // Personal Concierge Profile
  final _conciergeNameCtrl = TextEditingController(text: 'Алиса');
  final _conciergeAvatarCtrl = TextEditingController(
    text: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
  );

  // Sandbox Chat State
  final List<Map<String, String>> _sandboxMessages = [];
  final _sandboxInputCtrl = TextEditingController();
  final ScrollController _sandboxScrollCtrl = ScrollController();
  bool _isSandboxReplying = false;

  @override
  void initState() {
    super.initState();
    _loadVenue();
  }

  @override
  void dispose() {
    _googleMapsUrlCtrl.dispose();
    _websiteUrlCtrl.dispose();
    _telegramChannelCtrl.dispose();
    _otherSocialsCtrl.dispose();
    _freeformNotesCtrl.dispose();

    _nameCtrl.dispose();
    _archetypeCtrl.dispose();
    _categoryCtrl.dispose();
    _cityAddressCtrl.dispose();
    _phoneCtrl.dispose();
    _telegramStaffChatCtrl.dispose();
    _currencyCtrl.dispose();
    _visaRulesCtrl.dispose();

    _ratingCtrl.dispose();
    _reviewCountCtrl.dispose();
    _coverPhotoUrlCtrl.dispose();
    _timingCtrl.dispose();
    _fleetCtrl.dispose();
    _lunchCtrl.dispose();
    _luggageCtrl.dispose();
    _cancellationCtrl.dispose();

    _liveAiCorrectionCtrl.dispose();
    _masterDocCtrl.dispose();
    _conciergeNameCtrl.dispose();
    _conciergeAvatarCtrl.dispose();
    _sandboxInputCtrl.dispose();
    _sandboxScrollCtrl.dispose();

    for (final c in _interviewAnswerControllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _loadVenue() async {
    setState(() => _isLoading = true);
    try {
      final vid = widget.venueId ?? widget.venue?.id;
      if (vid != null && vid.isNotEmpty) {
        final doc = await FirebaseFirestore.instance.collection('venues').doc(vid).get();
        if (doc.exists && doc.data() != null) {
          _venue = VenueModel.fromMap(doc.id, doc.data()!);
          _populateControllersFromVenue(_venue!);
          // If already configured, jump to step 1 (Review)
          if ((_venue!.name.isNotEmpty && _venue!.name != 'Sir Visaranus (демо)') && _venue!.address.isNotEmpty) {
            _currentStep = 1;
          }
        }
      } else if (widget.venue != null) {
        _venue = widget.venue;
        _populateControllersFromVenue(_venue!);
      }
    } catch (e) {
      debugPrint("[VenueThreeStageWorkspace] Load error: $e");
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _populateControllersFromVenue(VenueModel v) {
    _nameCtrl.text = v.name;
    _categoryCtrl.text = v.category.isNotEmpty ? v.category : 'Бордер-ран / Виза-ран';
    _archetypeCtrl.text = v.archetype.isNotEmpty ? v.archetype : 'batch';
    _cityAddressCtrl.text = v.address;
    _phoneCtrl.text = v.phone;
    _telegramStaffChatCtrl.text = v.telegramStaffChatId;
    _currencyCtrl.text = v.currency.isNotEmpty ? v.currency : '฿';
    _googleMapsUrlCtrl.text = v.googleMapsUrl ?? '';
    _websiteUrlCtrl.text = v.websiteUrl ?? '';
    _coverPhotoUrlCtrl.text = v.coverPhotoUrl ?? '';
    _ratingCtrl.text = (v.rating != null && v.rating! > 0) ? v.rating.toString() : '';
    _reviewCountCtrl.text = (v.reviewCount != null && v.reviewCount! > 0) ? v.reviewCount.toString() : '';
    _masterDocCtrl.text = v.masterKnowledgeDoc ?? '';
    if (v.conciergeName.isNotEmpty) {
      _conciergeNameCtrl.text = v.conciergeName;
    }
    if ((v.conciergeAvatarUrl ?? '').isNotEmpty) {
      _conciergeAvatarCtrl.text = v.conciergeAvatarUrl!;
    }
  }

  // --- STAGE 1: AUTO-PARSE GOOGLE MAPS ON BLUR/SUBMIT ---

  Future<void> _autoParseGoogleMaps(String url) async {
    final clean = url.trim();
    if (clean.isEmpty) return;

    setState(() {
      _isParsingMaps = true;
      _mapsParseSuccess = null;
    });

    try {
      final data = await ContinuousKnowledgeService.parseGoogleMapsListing(clean);
      setState(() {
        if ((data['name'] ?? '').toString().isNotEmpty && _nameCtrl.text.isEmpty) {
          _nameCtrl.text = data['name'].toString();
        }
        if ((data['address'] ?? '').toString().isNotEmpty) {
          _cityAddressCtrl.text = data['address'].toString();
        }
        if ((data['phone'] ?? '').toString().isNotEmpty && _phoneCtrl.text.isEmpty) {
          _phoneCtrl.text = data['phone'].toString();
        }
        if ((data['websiteUrl'] ?? '').toString().isNotEmpty && _websiteUrlCtrl.text.isEmpty) {
          _websiteUrlCtrl.text = data['websiteUrl'].toString();
        }
        if ((data['coverPhotoUrl'] ?? '').toString().isNotEmpty && _coverPhotoUrlCtrl.text.isEmpty) {
          _coverPhotoUrlCtrl.text = data['coverPhotoUrl'].toString();
        }
        if (data['rating'] != null && data['rating'].toString() != 'null') {
          final r = double.tryParse(data['rating'].toString());
          if (r != null && r > 0) {
            _ratingCtrl.text = r.toString();
          } else {
            _ratingCtrl.text = '';
          }
        } else {
          _ratingCtrl.text = '';
        }
        if (data['reviewCount'] != null && data['reviewCount'].toString() != 'null') {
          final rc = int.tryParse(data['reviewCount'].toString());
          if (rc != null && rc > 0) {
            _reviewCountCtrl.text = rc.toString();
          } else {
            _reviewCountCtrl.text = '';
          }
        } else {
          _reviewCountCtrl.text = '';
        }

        final addrText = _cityAddressCtrl.text.isNotEmpty ? " • Точка: ${_cityAddressCtrl.text}" : "";
        final currentRating = double.tryParse(_ratingCtrl.text) ?? 0;
        final currentReviews = int.tryParse(_reviewCountCtrl.text) ?? 0;
        if (currentRating > 0) {
          final reviewsSuffix = currentReviews > 0 ? " ($currentReviews отзывов)" : "";
          _mapsParseSuccess = "✅ Google Карты: ${_ratingCtrl.text} ★$reviewsSuffix$addrText";
        } else {
          _mapsParseSuccess = "✅ Точка найдена на картах: ${_nameCtrl.text.isNotEmpty ? _nameCtrl.text : 'Объект'}$addrText\n⭐ На картах пока нет отзывов или они скрыты (рейтинг можно ввести вручную)";
        }
      });
    } catch (e) {
      debugPrint("[_autoParseGoogleMaps] Error: $e");
    } finally {
      if (mounted) setState(() => _isParsingMaps = false);
    }
  }

  Future<void> _pickFiles() async {
    try {
      final res = await FilePicker.pickFiles(
        allowMultiple: true,
        type: FileType.custom,
        allowedExtensions: ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'txt', 'md'],
        withData: true,
      );
      if (res != null && res.files.isNotEmpty) {
        setState(() {
          for (final f in res.files) {
            if (f.bytes != null) {
              _attachedFiles.add({
                'name': f.name,
                'bytes': f.bytes!,
                'mime': f.extension ?? 'image/jpeg',
              });
            }
          }
        });
      }
    } catch (e) {
      debugPrint("[_pickFiles] Error: $e");
    }
  }

  void _fillSampleDemoData() {
    setState(() {
      _nameCtrl.text = "Sir Visaranus";
      _categoryCtrl.text = "Виза-ран / Трансферы в Лаос";
      _archetypeCtrl.text = "batch";
      _cityAddressCtrl.text = "60 Hòn Chồng, Нячанг, Вьетнам";
      _phoneCtrl.text = "+84 90 123 4567";
      _currencyCtrl.text = "₫";
      _googleMapsUrlCtrl.text = "https://share.google/QRdjqW0kZOH2bpqcE";
      _websiteUrlCtrl.text = "https://www.sirvisaran.us/";
      _telegramChannelCtrl.text = "https://t.me/Dora_Sir_Visaranus";
      _otherSocialsCtrl.text = "https://www.instagram.com/sir_visarun_go_to_laos/";
      _ratingCtrl.text = "";
      _reviewCountCtrl.text = "";
      _coverPhotoUrlCtrl.text = "https://www.sirvisaran.us/images/hero.png";
      _timingCtrl.text = "Дорога Нячанг-граница Лаоса ~12-14 часов в одну сторону. Выезды по графику.";
      _fleetCtrl.text = "Комфортабельные VIP-слипбасы с индивидуальными USB, розетками и Wi-Fi";
      _lunchCtrl.text = "Остановки в пути в кафе и на санитарных стоянках";
      _luggageCtrl.text = "Стандартный багаж и ручная кладь";
      _cancellationCtrl.text = "Условия отмены уточнять у менеджера до формирования списков";
      _visaRulesCtrl.text = "Загранпаспорт (срок >= 6 мес), 2 фото 4х6. Штамп в Лаос для граждан РФ на 30 дней. Сопровождение E-Visa во Вьетнам.";
      _freeformNotesCtrl.text = "Нячанг, Вьетнам. Трансфер на VIP слипбасах до границы с Лаосом. E-Visa Вьетнам, Fast Track в аэропорту Камрань. Скидки у партнеров в Нячанге.";
      _aiNarrative = "Компания «Sir Visaranus» — ведущий сервис трансферов и экспат-сообщество в Нячанге (Вьетнам). Специализируется на регулярных комфортабельных визаранах из Нячанга в Лаос на современных VIP-слипбасах с кондиционером, индивидуальными USB-портами и Wi-Fi. Точка отправления: 60 Hòn Chồng, Нячанг. Для граждан РФ предоставляется безвизовый штамп в Лаос на 30 дней. Сервис также обеспечивает оформление и ускорение вьетнамских электронных виз (E-Visa) и Fast Track в аэропорту Камрань.";
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text("💡 Демо-шаблон (Sir Visaranus Нячанг) подставлен!"), backgroundColor: AppColors.accentTeal),
    );
  }

    IconData _getIconForStepKey(String key) {
    switch (key) {
      case 'maps':
        return CupertinoIcons.map_pin_ellipse;
      case 'website':
        return CupertinoIcons.globe;
      case 'socials':
        return CupertinoIcons.chat_bubble_2_fill;
      case 'files':
        return CupertinoIcons.photo_on_rectangle;
      case 'gemini':
        return CupertinoIcons.sparkles;
      case 'doc':
        return CupertinoIcons.doc_text_fill;
      case 'audit':
        return CupertinoIcons.question_circle_fill;
      default:
        return CupertinoIcons.doc_text_search;
    }
  }

  // --- STAGE 1 -> STAGE 2 TRANSITION ---

  Future<void> _startStage1Analysis() async {
    final hasMaps = _googleMapsUrlCtrl.text.trim().isNotEmpty;
    final hasWeb = _websiteUrlCtrl.text.trim().isNotEmpty;
    final hasSocials = _telegramChannelCtrl.text.trim().isNotEmpty || _otherSocialsCtrl.text.trim().isNotEmpty;
    final hasFiles = _attachedFiles.isNotEmpty;

    setState(() {
      _isAnalyzing = true;
      _analyzingStatus = "Инициализация мультимодального анализа Gemini Flash...";
      _livePreviewSnippet = '';
      _liveExtractionSteps.clear();

      if (hasMaps) {
        _liveExtractionSteps.add({
          'id': 'maps',
          'title': 'Google Карты',
          'statusText': 'Ожидание считывания карточки...',
          'isDone': false,
          'icon': CupertinoIcons.map_pin_ellipse,
          'previewData': null,
        });
      }
      if (hasWeb) {
        _liveExtractionSteps.add({
          'id': 'website',
          'title': 'Официальный сайт',
          'statusText': 'Ожидание загрузки содержимого...',
          'isDone': false,
          'icon': CupertinoIcons.globe,
          'previewData': null,
        });
      }
      if (hasSocials) {
        _liveExtractionSteps.add({
          'id': 'socials',
          'title': 'Telegram и соцсети',
          'statusText': 'Ожидание проверки каналов...',
          'isDone': false,
          'icon': CupertinoIcons.chat_bubble_2_fill,
          'previewData': null,
        });
      }
      if (hasFiles) {
        _liveExtractionSteps.add({
          'id': 'files',
          'title': 'Мультимодальные файлы',
          'statusText': 'Ожидание прикрепленных материалов...',
          'isDone': false,
          'icon': CupertinoIcons.photo_on_rectangle,
          'previewData': null,
        });
      }
      _liveExtractionSteps.add({
        'id': 'gemini',
        'title': 'Синтез базы знаний (Gemini Flash)',
        'statusText': 'Ожидание всех собранных данных...',
        'isDone': false,
        'icon': CupertinoIcons.sparkles,
        'previewData': null,
      });
    });

    try {
      final links = [
        _googleMapsUrlCtrl.text.trim(),
        _websiteUrlCtrl.text.trim(),
        _telegramChannelCtrl.text.trim(),
        _otherSocialsCtrl.text.trim(),
      ].where((l) => l.isNotEmpty).toList();

      final result = await ContinuousKnowledgeService.extractTwoTierJsonFromMultimodalPack(
        links: links,
        files: _attachedFiles,
        rawText: _freeformNotesCtrl.text.trim(),
        defaultVenueName: _nameCtrl.text.trim().isNotEmpty ? _nameCtrl.text.trim() : null,
        defaultAddress: _cityAddressCtrl.text.trim().isNotEmpty ? _cityAddressCtrl.text.trim() : null,
        defaultArchetype: _archetypeCtrl.text.trim(),
        onProgress: ({
          required String stepKey,
          required String stepTitle,
          required String statusText,
          required bool isDone,
          String? previewData,
        }) {
          if (!mounted) return;
          setState(() {
            _analyzingStatus = statusText;
            if (previewData != null && previewData.isNotEmpty) {
              _livePreviewSnippet = previewData;
            }
            final idx = _liveExtractionSteps.indexWhere((s) => s['id'] == stepKey);
            if (idx != -1) {
              _liveExtractionSteps[idx]['statusText'] = statusText;
              _liveExtractionSteps[idx]['isDone'] = isDone;
              if (previewData != null) {
                _liveExtractionSteps[idx]['previewData'] = previewData;
              }
            } else {
              _liveExtractionSteps.add({
                'id': stepKey,
                'title': stepTitle,
                'statusText': statusText,
                'isDone': isDone,
                'icon': _getIconForStepKey(stepKey),
                'previewData': previewData,
              });
            }
          });
        },
      );

      // Brief delay to allow user to visually appreciate all completed steps
      await Future.delayed(const Duration(milliseconds: 700));

      final crit = result['critical_required'] as Map<String, dynamic>? ?? {};
      final opt = result['optional_enrichment'] as Map<String, dynamic>? ?? {};

      setState(() {
        if ((crit['venue_name'] ?? '').toString().isNotEmpty) _nameCtrl.text = crit['venue_name'].toString();
        if ((crit['category'] ?? '').toString().isNotEmpty) _categoryCtrl.text = crit['category'].toString();
        if ((crit['archetype'] ?? '').toString().isNotEmpty) _archetypeCtrl.text = crit['archetype'].toString();
        if ((crit['city_address'] ?? '').toString().isNotEmpty) _cityAddressCtrl.text = crit['city_address'].toString();
        if ((crit['currency'] ?? '').toString().isNotEmpty) _currencyCtrl.text = crit['currency'].toString();
        if ((crit['phone_dispatcher'] ?? '').toString().isNotEmpty) _phoneCtrl.text = crit['phone_dispatcher'].toString();
        if ((crit['telegram_group_id'] ?? '').toString().isNotEmpty) _telegramStaffChatCtrl.text = crit['telegram_group_id'].toString();
        if ((crit['visa_rules_summary'] ?? '').toString().isNotEmpty) _visaRulesCtrl.text = crit['visa_rules_summary'].toString();

        if ((result['ai_plain_narrative'] ?? '').toString().isNotEmpty) {
          _aiNarrative = result['ai_plain_narrative'].toString();
        }

        if (opt['rating'] != null && opt['rating'].toString().isNotEmpty && opt['rating'].toString() != 'null') {
          final parsedR = double.tryParse(opt['rating'].toString());
          _ratingCtrl.text = (parsedR != null && parsedR > 0) ? parsedR.toString() : '';
        } else {
          _ratingCtrl.text = '';
        }
        if (opt['review_count'] != null && opt['review_count'].toString().isNotEmpty && opt['review_count'].toString() != 'null') {
          final parsedRc = int.tryParse(opt['review_count'].toString());
          _reviewCountCtrl.text = (parsedRc != null && parsedRc > 0) ? parsedRc.toString() : '';
        } else {
          _reviewCountCtrl.text = '';
        }
        if ((opt['timing_summary'] ?? '').toString().isNotEmpty) _timingCtrl.text = opt['timing_summary'].toString();
        if ((opt['fleet_summary'] ?? '').toString().isNotEmpty) _fleetCtrl.text = opt['fleet_summary'].toString();
        if ((opt['lunch_included'] ?? '').toString().isNotEmpty) _lunchCtrl.text = opt['lunch_included'].toString();
        if ((opt['luggage_policy'] ?? '').toString().isNotEmpty) _luggageCtrl.text = opt['luggage_policy'].toString();
        if ((opt['cancellation_policy'] ?? '').toString().isNotEmpty) _cancellationCtrl.text = opt['cancellation_policy'].toString();
        if ((opt['cover_photo_url'] ?? '').toString().isNotEmpty && _coverPhotoUrlCtrl.text.isEmpty) {
          _coverPhotoUrlCtrl.text = opt['cover_photo_url'].toString();
        }

        _currentStep = 1; // Transition to Stage 2
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Ошибка анализа: $e"), backgroundColor: Colors.redAccent),
      );
    } finally {
      if (mounted) setState(() => _isAnalyzing = false);
    }
  }

  // --- STAGE 2: LIVE AI CHAT AMENDMENT ---

  Future<void> _submitLiveAiCorrection() async {
    final text = _liveAiCorrectionCtrl.text.trim();
    if (text.isEmpty) return;

    _liveAiCorrectionCtrl.clear();
    setState(() {
      _aiChatHistory.add({'role': 'user', 'text': text});
      _isLiveAiThinking = true;
    });

    final currentJson = _buildCurrentTwoTierJson();

    try {
      final updated = await ContinuousKnowledgeService.amendAndEnrichJsonWithInstruction(
        currentJson: currentJson,
        ownerInstruction: text,
      );

      final crit = updated['critical_required'] as Map<String, dynamic>? ?? {};
      final opt = updated['optional_enrichment'] as Map<String, dynamic>? ?? {};
      final reply = updated['ai_reply_to_owner'] as String? ?? "✅ База знаний успешно обновлена!";
      if ((updated['ai_plain_narrative'] ?? '').toString().isNotEmpty) {
        _aiNarrative = updated['ai_plain_narrative'].toString();
      }

      setState(() {
        if (crit['venue_name'] != null) _nameCtrl.text = crit['venue_name'].toString();
        if (crit['city_address'] != null) _cityAddressCtrl.text = crit['city_address'].toString();
        if (crit['phone_dispatcher'] != null) _phoneCtrl.text = crit['phone_dispatcher'].toString();
        if (crit['visa_rules_summary'] != null) _visaRulesCtrl.text = crit['visa_rules_summary'].toString();
        if (opt['timing_summary'] != null) _timingCtrl.text = opt['timing_summary'].toString();
        if (opt['fleet_summary'] != null) _fleetCtrl.text = opt['fleet_summary'].toString();
        if (opt['lunch_included'] != null) _lunchCtrl.text = opt['lunch_included'].toString();
        if (opt['luggage_policy'] != null) _luggageCtrl.text = opt['luggage_policy'].toString();

        _aiChatHistory.add({'role': 'assistant', 'text': reply});
      });
    } catch (e) {
      setState(() {
        _aiChatHistory.add({'role': 'assistant', 'text': "Произошла ошибка обновления: $e"});
      });
    } finally {
      if (mounted) setState(() => _isLiveAiThinking = false);
    }
  }

  Map<String, dynamic> _buildCurrentTwoTierJson() {
    return {
      "critical_required": {
        "venue_name": _nameCtrl.text.trim(),
        "category": _categoryCtrl.text.trim(),
        "archetype": _archetypeCtrl.text.trim(),
        "city_address": _cityAddressCtrl.text.trim(),
        "currency": _currencyCtrl.text.trim(),
        "phone_dispatcher": _phoneCtrl.text.trim(),
        "telegram_group_id": _telegramStaffChatCtrl.text.trim(),
        "visa_rules_summary": _visaRulesCtrl.text.trim(),
      },
      "optional_enrichment": {
        "website_url": _websiteUrlCtrl.text.trim(),
        "google_maps_url": _googleMapsUrlCtrl.text.trim(),
        "cover_photo_url": _coverPhotoUrlCtrl.text.trim(),
        "rating": double.tryParse(_ratingCtrl.text.trim()),
        "review_count": int.tryParse(_reviewCountCtrl.text.trim()),
        "timing_summary": _timingCtrl.text.trim(),
        "fleet_summary": _fleetCtrl.text.trim(),
        "lunch_included": _lunchCtrl.text.trim(),
        "luggage_policy": _luggageCtrl.text.trim(),
        "cancellation_policy": _cancellationCtrl.text.trim(),
      }
    };
  }

  // --- STAGE 2 -> STAGE 3 TRANSITION (Finalization & Interview Generation) ---

  Future<void> _startStage2Finalization() async {
    setState(() {
      _isFinalizing = true;
      _analyzingStatus = "Gemini структурирует финальный канонический JSON, формирует Мастер-Документ и готовит вопросы интервью...";
      _isAnalyzing = true;
      _livePreviewSnippet = '';
      _liveExtractionSteps.clear();
      _liveExtractionSteps.addAll([
        {
          'id': 'json',
          'title': 'Гармонизация данных',
          'statusText': 'Проверка критических и опциональных полей...',
          'isDone': true,
          'icon': CupertinoIcons.check_mark_circled,
          'previewData': "${_nameCtrl.text} • ${_cityAddressCtrl.text}",
        },
        {
          'id': 'doc',
          'title': 'Мастер-Документ Markdown',
          'statusText': 'Gemini синтезирует полный регламент бизнеса...',
          'isDone': false,
          'icon': CupertinoIcons.doc_text_fill,
          'previewData': null,
        },
        {
          'id': 'audit',
          'title': 'Аудит пробелов (Gap Analysis)',
          'statusText': 'Формирование целевых вопросов интервью...',
          'isDone': false,
          'icon': CupertinoIcons.question_circle_fill,
          'previewData': null,
        },
      ]);
    });

    final currentJson = _buildCurrentTwoTierJson();
    final crit = currentJson['critical_required'] as Map<String, dynamic>;
    final opt = currentJson['optional_enrichment'] as Map<String, dynamic>;

    try {
      final res = await ContinuousKnowledgeService.finalizeAndStructureJsonAndDoc(
        criticalData: crit,
        optionalData: opt,
        extraNotes: _freeformNotesCtrl.text.trim(),
        venueName: _nameCtrl.text.trim(),
        archetype: _archetypeCtrl.text.trim(),
      );

      final markdown = res['master_knowledge_markdown'] as String? ?? '';
      final questions = (res['interview_questions'] as List<dynamic>? ?? []).map((e) => Map<String, dynamic>.from(e as Map)).toList();

      // Mark all finalization steps as complete
      setState(() {
        for (final s in _liveExtractionSteps) {
          s['isDone'] = true;
        }
        _livePreviewSnippet = "Сформирован регламент (${markdown.length} симв.) и ${questions.length} вопроса интервью";
      });

      await Future.delayed(const Duration(milliseconds: 650));

      if (!mounted) return;
      setState(() {
        if (markdown.isNotEmpty) _masterDocCtrl.text = markdown;
        _interviewQuestions = questions;
        for (final q in questions) {
          final qId = q['id']?.toString() ?? 'q_${q.hashCode}';
          if (!_interviewAnswerControllers.containsKey(qId)) {
            _interviewAnswerControllers[qId] = TextEditingController();
          }
        }
        _currentStep = 2; // Advance to Stage 3
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Ошибка финализации: $e"), backgroundColor: Colors.redAccent),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isFinalizing = false;
          _isAnalyzing = false;
        });
      }
    }
  }

  // --- STAGE 3: INTERVIEW & SAVE ---

  Future<void> _mergeInterviewAnswers() async {
    final qaList = <Map<String, String>>[];
    for (final q in _interviewQuestions) {
      final qId = q['id']?.toString() ?? '';
      final qText = q['question']?.toString() ?? '';
      final answer = _interviewAnswerControllers[qId]?.text.trim() ?? '';
      if (answer.isNotEmpty) {
        qaList.add({'question': qText, 'answer': answer});
      }
    }

    if (qaList.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Введите хотя бы один ответ для интеграции в базу"), backgroundColor: Colors.orangeAccent),
      );
      return;
    }

    setState(() {
      _isAnalyzing = true;
      _analyzingStatus = "Интеграция ответов владельца в Мастер-Документ базы знаний...";
      _livePreviewSnippet = '';
      _liveExtractionSteps.clear();
      _liveExtractionSteps.addAll([
        {
          'id': 'answers',
          'title': 'Ответы интервью',
          'statusText': 'Подготовка ${qaList.length} подтвержденных правил...',
          'isDone': true,
          'icon': CupertinoIcons.chat_bubble_text_fill,
          'previewData': "${qaList.length} ответа(ов) передано в обработку",
        },
        {
          'id': 'merge',
          'title': 'Интеграция в Регламент (Groq LPU / AI)',
          'statusText': 'Встраивание в разделы мастер-документа Markdown...',
          'isDone': false,
          'icon': CupertinoIcons.sparkles,
          'previewData': null,
        },
      ]);
    });

    try {
      final updated = await ContinuousKnowledgeService.mergeAnswersIntoMasterKnowledgeDoc(
        currentDoc: _masterDocCtrl.text,
        qaList: qaList,
      );

      setState(() {
        _masterDocCtrl.text = updated;
        for (final c in _interviewAnswerControllers.values) {
          c.clear();
        }
        final mIdx = _liveExtractionSteps.indexWhere((s) => s['id'] == 'merge');
        if (mIdx != -1) {
          _liveExtractionSteps[mIdx]['isDone'] = true;
          _liveExtractionSteps[mIdx]['statusText'] = 'Регламент успешно обновлен!';
          _liveExtractionSteps[mIdx]['previewData'] = 'Все факты встроены в разделы Markdown';
        }
      });

      await Future.delayed(const Duration(milliseconds: 650));

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("✅ ${qaList.length} ответа(ов) вшиты в регламент!"), backgroundColor: AppColors.accentGreen),
      );
    } catch (e) {
      debugPrint("[_mergeInterviewAnswers] AI merge error: $e. Appending answers directly as fallback.");
      final buf = StringBuffer();
      buf.writeln("\n\n## Дополнительные регламенты и ответы владельца");
      for (final qa in qaList) {
        buf.writeln("- **${qa['question']}**: ${qa['answer']}");
      }
      setState(() {
        _masterDocCtrl.text = "${_masterDocCtrl.text.trim()}${buf.toString()}";
        for (final c in _interviewAnswerControllers.values) {
          c.clear();
        }
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("✅ ${qaList.length} ответа(ов) сохранены в регламенте!"), backgroundColor: AppColors.accentGreen),
      );
    } finally {
      if (mounted) setState(() => _isAnalyzing = false);
    }
  }

  Future<void> _sendSandboxTest(String text) async {
    final clean = text.trim();
    if (clean.isEmpty) return;

    _sandboxInputCtrl.clear();
    setState(() {
      _sandboxMessages.add({'role': 'user', 'text': clean});
      _isSandboxReplying = true;
    });

    _scrollSandbox();

    try {
      final reply = await ContinuousKnowledgeService.askSandboxConcierge(
        masterDoc: _masterDocCtrl.text.isNotEmpty ? _masterDocCtrl.text : "Регламент заведения формируется.",
        userMessage: clean,
        venueName: _nameCtrl.text.isNotEmpty ? _nameCtrl.text : 'Сервис',
        conciergeName: _conciergeNameCtrl.text.trim().isNotEmpty ? _conciergeNameCtrl.text.trim() : 'AI-Консьерж',
        chatHistory: _sandboxMessages,
      );

      setState(() {
        _sandboxMessages.add({'role': 'assistant', 'text': reply});
      });
    } catch (e) {
      setState(() {
        _sandboxMessages.add({'role': 'assistant', 'text': "Ошибка ответа: $e"});
      });
    } finally {
      if (mounted) {
        setState(() => _isSandboxReplying = false);
        _scrollSandbox();
      }
    }
  }

  void _scrollSandbox() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_sandboxScrollCtrl.hasClients) {
        _sandboxScrollCtrl.animateTo(
          _sandboxScrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  // --- SAVE TO FIRESTORE (PRODUCTION LAUNCH) ---

  Future<void> _saveAndLaunchVenue() async {
    setState(() {
      _isAnalyzing = true;
      _analyzingStatus = "Сохранение заведения и боевая активация AI-Консьержа 24/7...";
    });

    try {
      final vid = widget.venueId ?? widget.venue?.id ?? FirebaseFirestore.instance.collection('venues').doc().id;

      final dataToSave = {
        'id': vid,
        'name': _nameCtrl.text.trim(),
        'category': _categoryCtrl.text.trim(),
        'archetype': _archetypeCtrl.text.trim(),
        'address': _cityAddressCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        'currency': _currencyCtrl.text.trim(),
        'telegramStaffChatId': _telegramStaffChatCtrl.text.trim(),
        'telegram_group_id': _telegramStaffChatCtrl.text.trim(),
        'websiteUrl': _websiteUrlCtrl.text.trim(),
        'googleMapsUrl': _googleMapsUrlCtrl.text.trim(),
        'coverPhotoUrl': _coverPhotoUrlCtrl.text.trim(),
        'rating': double.tryParse(_ratingCtrl.text.trim()),
        'reviewCount': int.tryParse(_reviewCountCtrl.text.trim()),
        'masterKnowledgeDoc': _masterDocCtrl.text.trim(),
        'conciergeName': _conciergeNameCtrl.text.trim().isNotEmpty ? _conciergeNameCtrl.text.trim() : 'AI-Консьерж',
        'conciergeAvatarUrl': _conciergeAvatarCtrl.text.trim(),
        'isActive': true,
        'isManuallyBlocked': false,
        'updatedAt': FieldValue.serverTimestamp(),
      };

      await FirebaseFirestore.instance.collection('venues').doc(vid).set(dataToSave, SetOptions(merge: true));

      // Synchronize master_doc subcollection
      await FirebaseFirestore.instance.collection('venues').doc(vid).collection('ai_knowledge').doc('master_doc').set({
        'content': _masterDocCtrl.text.trim(),
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));

      // Synchronize ai_knowledge/profile subcollection
      await FirebaseFirestore.instance.collection('venues').doc(vid).collection('ai_knowledge').doc('profile').set({
        'venueId': vid,
        'conciergeName': _conciergeNameCtrl.text.trim().isNotEmpty ? _conciergeNameCtrl.text.trim() : 'AI-Консьерж',
        'conciergeAvatarUrl': _conciergeAvatarCtrl.text.trim(),
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("🎉 Заведение успешно сохранено и готово к работе на 100%!"),
          backgroundColor: AppColors.accentGreen,
          duration: Duration(seconds: 3),
        ),
      );

      widget.onSaved?.call();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Ошибка сохранения: $e"), backgroundColor: Colors.redAccent),
      );
    } finally {
      if (mounted) setState(() => _isAnalyzing = false);
    }
  }

  // --- TELEGRAM PING TEST ---

  Future<void> _testTelegramPing() async {
    final chatId = _telegramStaffChatCtrl.text.trim();
    if (chatId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Введите ID группы Telegram (например, -100...)"), backgroundColor: Colors.orangeAccent),
      );
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text("Отправка тестового пинга в Telegram..."), backgroundColor: Color(0xFF2AABEE)),
    );

    final ok = await ContinuousKnowledgeService.sendTelegramTestPing(
      chatId: chatId,
      venueName: _nameCtrl.text.trim().isNotEmpty ? _nameCtrl.text.trim() : 'Сервис',
    );

    if (!mounted) return;
    if (ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("✅ Тестовый пинг успешно доставлен в группу диспетчеров!"), backgroundColor: AppColors.accentGreen),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Бот не смог отправить сообщение. Добавьте @revoogiftx_bot в группу."), backgroundColor: Colors.redAccent),
      );
    }
  }

  // =========================================================================
  // BUILD METHOD
  // =========================================================================

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(child: CupertinoActivityIndicator(color: AppColors.accentGreen)),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CupertinoNavigationBar(
        backgroundColor: AppColors.surface.withValues(alpha: 0.95),
        leading: CupertinoButton(
          padding: EdgeInsets.zero,
          child: const Icon(CupertinoIcons.chevron_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        middle: Text(
          _nameCtrl.text.isNotEmpty ? _nameCtrl.text : "Мастер настройки заведения",
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
        ),
        trailing: _currentStep == 2
            ? CupertinoButton(
                padding: EdgeInsets.zero,
                onPressed: _isAnalyzing ? null : _saveAndLaunchVenue,
                child: const Text("Сохранить", style: TextStyle(color: AppColors.accentGreen, fontWeight: FontWeight.bold)),
              )
            : null,
      ),
      body: Stack(
        children: [
          Column(
            children: [
              // 3-STAGE STEPPER HEADER
              _buildStepperHeader(),

              // CURRENT STAGE BODY
              Expanded(
                child: _buildCurrentStageBody(),
              ),
            ],
          ),

          // OVERLAY WHEN ANALYZING WITH LIVE EXTRACTION STREAM
          if (_isAnalyzing)
            Container(
              color: Colors.black.withValues(alpha: 0.85),
              child: Center(
                child: Container(
                  constraints: const BoxConstraints(maxWidth: 580),
                  padding: const EdgeInsets.all(24),
                  margin: const EdgeInsets.symmetric(horizontal: 24),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.accentGreen.withValues(alpha: 0.35)),
                    boxShadow: [
                      BoxShadow(color: AppColors.accentGreen.withValues(alpha: 0.25), blurRadius: 36),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppColors.accentGreen.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const CupertinoActivityIndicator(color: AppColors.accentGreen, radius: 12),
                          ),
                          const SizedBox(width: 14),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  "Живой синтез данных (Groq LPU + Gemini)",
                                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                                ),
                                SizedBox(height: 2),
                                Text(
                                  "Считывание и проверка источников в реальном времени",
                                  style: TextStyle(color: Colors.white54, fontSize: 12),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),
                      const Divider(color: Colors.white10, height: 1),
                      const SizedBox(height: 14),

                      // Steps list
                      if (_liveExtractionSteps.isNotEmpty)
                        Column(
                          children: _liveExtractionSteps.map((step) {
                            final isDone = step['isDone'] == true;
                            final hasPreview = (step['previewData'] ?? '').toString().isNotEmpty;
                            return Container(
                              margin: const EdgeInsets.only(bottom: 10),
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              decoration: BoxDecoration(
                                color: isDone
                                    ? AppColors.accentGreen.withValues(alpha: 0.08)
                                    : Colors.white.withValues(alpha: 0.03),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: isDone
                                      ? AppColors.accentGreen.withValues(alpha: 0.3)
                                      : Colors.white10,
                                ),
                              ),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Padding(
                                    padding: const EdgeInsets.only(top: 2),
                                    child: isDone
                                        ? const Icon(CupertinoIcons.checkmark_circle_fill, color: AppColors.accentGreen, size: 18)
                                        : const CupertinoActivityIndicator(radius: 8, color: Colors.white70),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Text(
                                              step['title']?.toString() ?? '',
                                              style: TextStyle(
                                                color: isDone ? Colors.white : Colors.white70,
                                                fontWeight: FontWeight.w600,
                                                fontSize: 13,
                                              ),
                                            ),
                                            const Spacer(),
                                            Text(
                                              isDone ? "Готово" : "В процессе",
                                              style: TextStyle(
                                                color: isDone ? AppColors.accentGreen : Colors.white38,
                                                fontSize: 10,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 3),
                                        Text(
                                          step['statusText']?.toString() ?? '',
                                          style: const TextStyle(color: Colors.white54, fontSize: 11),
                                        ),
                                        if (hasPreview) ...[
                                          const SizedBox(height: 5),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                            decoration: BoxDecoration(
                                              color: Colors.black38,
                                              borderRadius: BorderRadius.circular(6),
                                              border: Border.all(color: Colors.white12),
                                            ),
                                            child: Row(
                                              children: [
                                                const Icon(CupertinoIcons.arrow_right_circle, size: 12, color: AppColors.accentTeal),
                                                const SizedBox(width: 6),
                                                Expanded(
                                                  child: Text(
                                                    step['previewData'].toString(),
                                                    style: const TextStyle(color: AppColors.accentTeal, fontSize: 11, fontWeight: FontWeight.w500),
                                                    maxLines: 2,
                                                    overflow: TextOverflow.ellipsis,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }).toList(),
                        )
                      else ...[
                        Text(
                          _analyzingStatus,
                          style: const TextStyle(color: Colors.white70, fontSize: 13),
                        ),
                      ],

                      // Live preview ticker if available
                      if (_livePreviewSnippet.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.4),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.accentGreen.withValues(alpha: 0.2)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Row(
                                children: [
                                  Icon(CupertinoIcons.sparkles, size: 12, color: AppColors.accentGreen),
                                  SizedBox(width: 6),
                                  Text(
                                    "Последние спарсенные данные:",
                                    style: TextStyle(color: AppColors.accentGreen, fontSize: 11, fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                _livePreviewSnippet,
                                style: const TextStyle(color: Colors.white70, fontSize: 11, height: 1.3),
                                maxLines: 3,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  // --- STEPPER HEADER ---

  Widget _buildStepperHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border(bottom: BorderSide(color: AppColors.macosDivider)),
      ),
      child: Row(
        children: [
          _buildStepPill(0, "1. Сбор данных", "Ссылки, фото, текст"),
          const SizedBox(width: 8),
          const Icon(CupertinoIcons.chevron_right, size: 14, color: Colors.white24),
          const SizedBox(width: 8),
          _buildStepPill(1, "2. Двухуровневый JSON", "Критичные поля & AI-чат"),
          const SizedBox(width: 8),
          const Icon(CupertinoIcons.chevron_right, size: 14, color: Colors.white24),
          const SizedBox(width: 8),
          _buildStepPill(2, "3. Финал & Интервью", "Регламент & Запуск"),
        ],
      ),
    );
  }

  Widget _buildStepPill(int stepIndex, String title, String subtitle) {
    final isActive = _currentStep == stepIndex;
    final isDone = _currentStep > stepIndex;

    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _currentStep = stepIndex),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
          decoration: BoxDecoration(
            color: isActive ? AppColors.accentTeal.withValues(alpha: 0.15) : (isDone ? Colors.black.withValues(alpha: 0.3) : Colors.transparent),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isActive ? AppColors.accentTeal : (isDone ? AppColors.accentGreen.withValues(alpha: 0.4) : Colors.white10),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 16,
                    height: 16,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isDone ? AppColors.accentGreen : (isActive ? AppColors.accentTeal : Colors.white24),
                    ),
                    child: Center(
                      child: isDone
                          ? const Icon(Icons.check, size: 10, color: Colors.black)
                          : Text("${stepIndex + 1}", style: const TextStyle(color: Colors.black, fontSize: 10, fontWeight: FontWeight.bold)),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Flexible(
                    child: Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: isActive ? Colors.white : (isDone ? AppColors.accentGreen : Colors.white54),
                        fontSize: 11,
                        fontWeight: isActive ? FontWeight.bold : FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: Colors.white38, fontSize: 9),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCurrentStageBody() {
    switch (_currentStep) {
      case 0:
        return _buildStage1Intake();
      case 1:
        return _buildStage2TwoTierJson();
      case 2:
        return _buildStage3FinalizeAndInterview();
      default:
        return _buildStage1Intake();
    }
  }

  // =========================================================================
  // ЭТАП 1: МАКСИМАЛЬНЫЙ СБОР ДАННЫХ (MULTIMODAL INTAKE)
  // =========================================================================

  Widget _buildStage1Intake() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Intro Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.accentTeal.withValues(alpha: 0.3)),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.accentTeal.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(CupertinoIcons.cloud_upload_fill, color: AppColors.accentTeal, size: 24),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "Этап 1: Сбор данных из всех источников",
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    const SizedBox(height: 3),
                    const Text(
                      "Вставьте ссылки на карты, сайт или соцсети, прикрепите файлы/баннеры. Gemini Flash автоматически вытянет и структурирует все факты.",
                      style: TextStyle(color: Colors.white70, fontSize: 11, height: 1.35),
                    ),
                  ],
                ),
              ),
              CupertinoButton(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                color: Colors.black.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(8),
                onPressed: _fillSampleDemoData,
                child: const Row(
                  children: [
                    Icon(CupertinoIcons.lightbulb_fill, color: Colors.amberAccent, size: 12),
                    SizedBox(width: 4),
                    Text("Пример", style: TextStyle(color: Colors.amberAccent, fontSize: 11, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // SECTION 1: LINKS & GOOGLE MAPS AUTO-PARSER
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.macosDivider),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(CupertinoIcons.link, color: AppColors.accentGreen, size: 16),
                  SizedBox(width: 8),
                  Text("Ссылки на ресурсы компании", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                ],
              ),
              const SizedBox(height: 12),

              // Google Maps field with auto-parser
              const Text("1. Ссылка на Google Карты (автоматический сбор рейтинга, отзывов, адреса и фото):", style: TextStyle(color: Colors.white70, fontSize: 11)),
              const SizedBox(height: 6),
              Row(
                children: [
                  Expanded(
                    child: CupertinoTextField(
                      controller: _googleMapsUrlCtrl,
                      placeholder: "https://maps.app.goo.gl/... или https://google.com/maps/place/...",
                      placeholderStyle: const TextStyle(color: Colors.white30, fontSize: 12),
                      style: const TextStyle(color: Colors.white, fontSize: 13),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.4),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.white24),
                      ),
                      onEditingComplete: () => _autoParseGoogleMaps(_googleMapsUrlCtrl.text),
                      onSubmitted: (val) => _autoParseGoogleMaps(val),
                    ),
                  ),
                  const SizedBox(width: 8),
                  CupertinoButton(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    color: AppColors.accentTeal.withValues(alpha: 0.25),
                    borderRadius: BorderRadius.circular(10),
                    onPressed: _isParsingMaps ? null : () => _autoParseGoogleMaps(_googleMapsUrlCtrl.text),
                    child: _isParsingMaps
                        ? const CupertinoActivityIndicator(color: AppColors.accentTeal)
                        : const Text("Считать", style: TextStyle(color: AppColors.accentTeal, fontWeight: FontWeight.bold, fontSize: 12)),
                  ),
                ],
              ),
              if (_mapsParseSuccess != null) ...[
                const SizedBox(height: 6),
                Text(_mapsParseSuccess!, style: const TextStyle(color: AppColors.accentGreen, fontSize: 11, fontWeight: FontWeight.w500)),
              ],

              const SizedBox(height: 12),

              // Website URL
              const Text("2. Официальный сайт заведения (Gemini считает тарифы, правила и расписания):", style: TextStyle(color: Colors.white70, fontSize: 11)),
              const SizedBox(height: 6),
              CupertinoTextField(
                controller: _websiteUrlCtrl,
                placeholder: "https://example.com/visa-runs",
                placeholderStyle: const TextStyle(color: Colors.white30, fontSize: 12),
                style: const TextStyle(color: Colors.white, fontSize: 13),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.white24),
                ),
              ),

              const SizedBox(height: 12),

              // Socials (Telegram, Instagram, VK)
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("Telegram-канал / чат:", style: TextStyle(color: Colors.white70, fontSize: 11)),
                        const SizedBox(height: 6),
                        CupertinoTextField(
                          controller: _telegramChannelCtrl,
                          placeholder: "https://t.me/channel_name",
                          placeholderStyle: const TextStyle(color: Colors.white30, fontSize: 12),
                          style: const TextStyle(color: Colors.white, fontSize: 13),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.4),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: Colors.white24),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("Другие соцсети (Instagram, VK, FB):", style: TextStyle(color: Colors.white70, fontSize: 11)),
                        const SizedBox(height: 6),
                        CupertinoTextField(
                          controller: _otherSocialsCtrl,
                          placeholder: "https://instagram.com/...",
                          placeholderStyle: const TextStyle(color: Colors.white30, fontSize: 12),
                          style: const TextStyle(color: Colors.white, fontSize: 13),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.4),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: Colors.white24),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // SECTION 2: MULTIMODAL ATTACHMENTS (PDF, IMAGES, BANNERS)
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.macosDivider),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Row(
                    children: [
                      Icon(CupertinoIcons.photo_on_rectangle, color: Colors.blueAccent, size: 16),
                      SizedBox(width: 8),
                      Text("Файлы, фото баннеров и регламенты (PDF / Картинки)", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                    ],
                  ),
                  CupertinoButton(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    color: Colors.blueAccent.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(8),
                    onPressed: _pickFiles,
                    child: const Row(
                      children: [
                        Icon(CupertinoIcons.plus, size: 12, color: Colors.blueAccent),
                        SizedBox(width: 4),
                        Text("Добавить файлы", style: TextStyle(color: Colors.blueAccent, fontSize: 11, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              const Text(
                "Прикрепите фото рекламных баннеров, визиток, фото расписаний с остановок или PDF-файлы консульских правил.",
                style: TextStyle(color: Colors.white54, fontSize: 11),
              ),
              const SizedBox(height: 10),
              if (_attachedFiles.isEmpty)
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.white10),
                  ),
                  child: const Center(
                    child: Text("Файлы не прикреплены. Нажмите «Добавить файлы» для мультимодального анализа.", style: TextStyle(color: Colors.white30, fontSize: 11)),
                  ),
                )
              else
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _attachedFiles.map((f) {
                    final name = f['name'] as String? ?? 'file';
                    final isPdf = name.toLowerCase().endsWith('.pdf');
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.4),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: isPdf ? Colors.redAccent.withValues(alpha: 0.4) : Colors.blueAccent.withValues(alpha: 0.4)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(isPdf ? CupertinoIcons.doc_fill : CupertinoIcons.photo, size: 12, color: isPdf ? Colors.redAccent : Colors.blueAccent),
                          const SizedBox(width: 6),
                          Text(name, style: const TextStyle(color: Colors.white, fontSize: 11)),
                          const SizedBox(width: 6),
                          GestureDetector(
                            onTap: () => setState(() => _attachedFiles.remove(f)),
                            child: const Icon(CupertinoIcons.xmark_circle_fill, size: 14, color: Colors.white30),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // SECTION 3: FREEFORM TEXT & NOTES
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.macosDivider),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(CupertinoIcons.pencil_ellipsis_rectangle, color: Colors.amberAccent, size: 16),
                  SizedBox(width: 8),
                  Text("Свободный текст, заметки и переписки (неограниченно)", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                ],
              ),
              const SizedBox(height: 6),
              const Text(
                "Вставьте любой скопированный текст: сообщения из клиентских чатов, памятку пассажиру, список остановок или внутренние инструкции.",
                style: TextStyle(color: Colors.white54, fontSize: 11),
              ),
              const SizedBox(height: 10),
              CupertinoTextField(
                controller: _freeformNotesCtrl,
                maxLines: 4,
                placeholder: "Вставьте скопированный текст или введите заметки...",
                placeholderStyle: const TextStyle(color: Colors.white30, fontSize: 12),
                style: const TextStyle(color: Colors.white, fontSize: 12.5),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.white12),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 24),

        // PRIMARY ACTION BUTTON (STAGE 1 -> STAGE 2)
        SizedBox(
          width: double.infinity,
          child: CupertinoButton(
            padding: const EdgeInsets.symmetric(vertical: 14),
            color: AppColors.accentTeal,
            borderRadius: BorderRadius.circular(14),
            onPressed: _startStage1Analysis,
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(CupertinoIcons.bolt_fill, color: Colors.black, size: 18),
                SizedBox(width: 8),
                Text(
                  "🚀 Синтезировать данные заведения (Groq LPU + Gemini) ➔",
                  style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 14),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // =========================================================================
  // ЭТАП 2: ДВУХУРОВНЕВАЯ JSON-ТАБЛИЦА & ЖИВОЙ AI-ДИАЛОГ
  // =========================================================================

  Widget _buildStage2TwoTierJson() {
    // Check readiness of critical fields
    final missingCritical = <String>[];
    if (_nameCtrl.text.trim().isEmpty) missingCritical.add("Название заведения");
    if (_cityAddressCtrl.text.trim().isEmpty) missingCritical.add("Город и точка сбора (Адрес)");
    if (_phoneCtrl.text.trim().isEmpty) missingCritical.add("Телефон диспетчера");
    if (_telegramStaffChatCtrl.text.trim().isEmpty) missingCritical.add("Telegram Staff Group ID");
    if (_visaRulesCtrl.text.trim().isEmpty) missingCritical.add("Визовый регламент");

    final is100Ready = missingCritical.isEmpty;
    final totalCrit = 7;
    final filledCrit = totalCrit - missingCritical.length;
    final pct = ((filledCrit / totalCrit) * 100).round();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Readiness Status Pill
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: is100Ready ? AppColors.accentGreen : Colors.orangeAccent),
          ),
          child: Row(
            children: [
              Icon(
                is100Ready ? CupertinoIcons.checkmark_shield_fill : CupertinoIcons.exclamationmark_shield_fill,
                color: is100Ready ? AppColors.accentGreen : Colors.orangeAccent,
                size: 20,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      is100Ready ? "Все критические данные заполнены (100%)" : "Готовность паспорта: $pct% • Требуется заполнить поля ниже",
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                    if (missingCritical.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text(
                          "Осталось уточнить: ${missingCritical.join(', ')}",
                          style: const TextStyle(color: Colors.orangeAccent, fontSize: 11),
                        ),
                      ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: is100Ready ? AppColors.accentGreen.withValues(alpha: 0.2) : Colors.orangeAccent.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  "$pct%",
                  style: TextStyle(
                    color: is100Ready ? AppColors.accentGreen : Colors.orangeAccent,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // 3-Mode View Switcher (User request: Human readable summary OR JSON OR Form fields)
        Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.4),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.macosDivider),
          ),
          child: Row(
            children: [
              _buildStage2TabButton(0, CupertinoIcons.doc_text_fill, "📋 Резюме ИИ (понятный текст)"),
              _buildStage2TabButton(1, CupertinoIcons.slider_horizontal_3, "📝 Редактор полей (Tier 1 & 2)"),
              _buildStage2TabButton(2, CupertinoIcons.chevron_left_slash_chevron_right, "{ } JSON код"),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // View Mode Body
        if (_stage2ViewMode == 0)
          _buildStage2NarrativeView(missingCritical, is100Ready)
        else if (_stage2ViewMode == 1)
          _buildStage2FieldsView(missingCritical)
        else
          _buildStage2JsonView(),

        const SizedBox(height: 16),

        // PERMANENT LIVE AI DIALOGUE BOX (USER'S REQUEST: Always visible input for additions & amendments)
        _buildStage2LiveAiDialogueBox(),

        const SizedBox(height: 24),

        // PRIMARY ACTION BUTTON (STAGE 2 -> STAGE 3)
        SizedBox(
          width: double.infinity,
          child: CupertinoButton(
            padding: const EdgeInsets.symmetric(vertical: 14),
            color: AppColors.accentTeal,
            borderRadius: BorderRadius.circular(14),
            onPressed: _isFinalizing ? null : _startStage2Finalization,
            child: _isFinalizing ? const CupertinoActivityIndicator(color: Colors.black) : const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(CupertinoIcons.sparkles, color: Colors.black, size: 18),
                SizedBox(width: 8),
                Text(
                  "✨ Подтвердить данные ➔ Перейти к AI-Интервью & Песочнице",
                  style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 14),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStage2TabButton(int mode, IconData icon, String title) {
    final isSelected = _stage2ViewMode == mode;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _stage2ViewMode = mode),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.accentTeal.withValues(alpha: 0.25) : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: isSelected ? AppColors.accentTeal : Colors.transparent),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 13, color: isSelected ? AppColors.accentTeal : Colors.white60),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: isSelected ? AppColors.accentTeal : Colors.white70,
                    fontSize: 12,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // --- MODE 0: HUMAN READABLE SUMMARY (NARRATIVE) ---
  Widget _buildStage2NarrativeView(List<String> missingCritical, bool is100Ready) {
    final currentCity = _cityAddressCtrl.text.trim();
    String effectiveNarrative = _aiNarrative.trim();

    // Anti-Hallucination Guard: If user entered Nha Trang or Vietnam, but narrative has Pattaya/Cambodia, sanitize or rebuild
    if (currentCity.isNotEmpty && !currentCity.toLowerCase().contains("паттай")) {
      if (effectiveNarrative.toLowerCase().contains("паттай") || effectiveNarrative.toLowerCase().contains("ban laem") || effectiveNarrative.toLowerCase().contains("central festival")) {
        effectiveNarrative = "Компания «${_nameCtrl.text.isNotEmpty ? _nameCtrl.text : 'Sir Visaranus'}» ($currentCity). Специализируется на направлении ${_categoryCtrl.text}. Точка отправления/сбора: $currentCity. Транспорт: ${_fleetCtrl.text.isNotEmpty ? _fleetCtrl.text : 'комфортабельные VIP-слипбасы'}. График: ${_timingCtrl.text.isNotEmpty ? _timingCtrl.text : 'по расписанию'}. Визовые требования: ${_visaRulesCtrl.text.isNotEmpty ? _visaRulesCtrl.text : 'загранпаспорт'}. Связь и бронирование через диспетчера.";
      }
    }

    if (effectiveNarrative.isEmpty) {
      effectiveNarrative = "Компания «${_nameCtrl.text.isNotEmpty ? _nameCtrl.text : 'Сервис'}» (${_categoryCtrl.text}). Локация и точка сбора: ${currentCity.isNotEmpty ? currentCity : 'уточняется'}. Автопарк: ${_fleetCtrl.text.isNotEmpty ? _fleetCtrl.text : 'комфортабельный транспорт'}. График: ${_timingCtrl.text.isNotEmpty ? _timingCtrl.text : 'по расписанию'}. Визовый регламент: ${_visaRulesCtrl.text.isNotEmpty ? _visaRulesCtrl.text : 'загранпаспорт'}. Питание: ${_lunchCtrl.text.isNotEmpty ? _lunchCtrl.text : 'уточняется'}.";
    }

    return Column(
      children: [
        // Company Identity Hero Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.macosDivider),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppColors.accentTeal.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.accentTeal.withValues(alpha: 0.3)),
                    ),
                    child: const Icon(CupertinoIcons.building_2_fill, color: AppColors.accentTeal, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _nameCtrl.text.isNotEmpty ? _nameCtrl.text : "Название компании не указано",
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(color: Colors.white10, borderRadius: BorderRadius.circular(6)),
                              child: Text(_categoryCtrl.text, style: const TextStyle(color: Colors.white70, fontSize: 10)),
                            ),
                            const SizedBox(width: 8),
                            if ((double.tryParse(_ratingCtrl.text.trim()) ?? 0) > 0) ...[
                              const Icon(CupertinoIcons.star_fill, color: Colors.amberAccent, size: 11),
                              const SizedBox(width: 3),
                              Text(
                                "${_ratingCtrl.text} (${_reviewCountCtrl.text.isNotEmpty ? '${_reviewCountCtrl.text} отзывов' : 'нет отзывов'})",
                                style: const TextStyle(color: Colors.amberAccent, fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                  CupertinoButton(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    color: Colors.white10,
                    borderRadius: BorderRadius.circular(8),
                    onPressed: () => setState(() => _stage2ViewMode = 1),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(CupertinoIcons.pencil, size: 12, color: Colors.white70),
                        SizedBox(width: 4),
                        Text("Править поля", style: TextStyle(color: Colors.white70, fontSize: 11)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const Divider(color: Colors.white10, height: 1),
              const SizedBox(height: 12),
              Row(
                children: [
                  const Icon(CupertinoIcons.location_solid, color: Colors.redAccent, size: 14),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      _cityAddressCtrl.text.isNotEmpty ? _cityAddressCtrl.text : "Точка сбора не указана (заполните в редакторе полей)",
                      style: TextStyle(
                        color: _cityAddressCtrl.text.isNotEmpty ? Colors.white : Colors.orangeAccent,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // AI Synthesis Plain Narrative
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.accentTeal.withValues(alpha: 0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(CupertinoIcons.sparkles, color: AppColors.accentTeal, size: 16),
                  SizedBox(width: 8),
                  Text("Что узнал и синтезировал ИИ из ваших источников:", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                ],
              ),
              const SizedBox(height: 10),
              SelectableText(
                effectiveNarrative,
                style: const TextStyle(color: Colors.white70, fontSize: 12.5, height: 1.45),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // Fact Cards Grid (Schedule, Fleet, Lunch, Luggage, Visa, Cancellation)
        Row(
          children: [
            Expanded(
              child: _buildNarrativeFactCard(
                icon: CupertinoIcons.time,
                title: "Тайминг & Сбор",
                value: _timingCtrl.text.isNotEmpty ? _timingCtrl.text : "Не указано",
                accentColor: AppColors.accentTeal,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildNarrativeFactCard(
                icon: CupertinoIcons.bus,
                title: "Автопарк",
                value: _fleetCtrl.text.isNotEmpty ? _fleetCtrl.text : "Не указано",
                accentColor: Colors.blueAccent,
              ),
            ),
          ],
        ),

        const SizedBox(height: 10),

        Row(
          children: [
            Expanded(
              child: _buildNarrativeFactCard(
                icon: CupertinoIcons.cart_fill,
                title: "Обед & Напитки",
                value: _lunchCtrl.text.isNotEmpty ? _lunchCtrl.text : "Не указано",
                accentColor: Colors.amberAccent,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildNarrativeFactCard(
                icon: CupertinoIcons.cube_box_fill,
                title: "Багаж",
                value: _luggageCtrl.text.isNotEmpty ? _luggageCtrl.text : "Не указано",
                accentColor: Colors.purpleAccent,
              ),
            ),
          ],
        ),

        const SizedBox(height: 10),

        Row(
          children: [
            Expanded(
              child: _buildNarrativeFactCard(
                icon: CupertinoIcons.doc_checkmark_fill,
                title: "Визы & Оверстей",
                value: _visaRulesCtrl.text.isNotEmpty ? _visaRulesCtrl.text : "Не указано",
                accentColor: Colors.greenAccent,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildNarrativeFactCard(
                icon: CupertinoIcons.xmark_shield_fill,
                title: "Правила отмены",
                value: _cancellationCtrl.text.isNotEmpty ? _cancellationCtrl.text : "Бесплатно за 12 часов",
                accentColor: Colors.orangeAccent,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildNarrativeFactCard({
    required IconData icon,
    required String title,
    required String value,
    required Color accentColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.macosDivider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: accentColor, size: 14),
              const SizedBox(width: 6),
              Text(title, style: TextStyle(color: accentColor, fontSize: 11, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            value,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: Colors.white, fontSize: 11.5, height: 1.3),
          ),
        ],
      ),
    );
  }

  // --- MODE 1: FORM FIELDS (TIER-1 & TIER-2) ---
  Widget _buildStage2FieldsView(List<String> missingCritical) {
    return Column(
      children: [
        // CRITICAL REQUIRED (TIER-1)
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.accentGreen.withValues(alpha: 0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(CupertinoIcons.star_fill, color: AppColors.accentGreen, size: 14),
                  SizedBox(width: 8),
                  Text("КРИТИЧНЫЕ ДАННЫЕ (Tier-1: Обязательно для запуска AI)", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                ],
              ),
              const SizedBox(height: 4),
              const Text("Каждое поле можно отредактировать прямо здесь:", style: TextStyle(color: Colors.white54, fontSize: 11)),
              const SizedBox(height: 14),

              // 1. Name & Currency
              Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: _buildInlineFormField("Название заведения:", _nameCtrl, "Например: Sir Visaranus VIP", isRequired: true),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildInlineFormField("Валюта:", _currencyCtrl, "฿"),
                  ),
                ],
              ),

              const SizedBox(height: 12),

              // 2. City & Address
              _buildInlineFormField(
                "Город и главная точка сбора пассажиров (Адрес):",
                _cityAddressCtrl,
                "Например: 60 Hòn Chồng, Нячанг (или адрес точки сбора)",
                isRequired: true,
              ),

              const SizedBox(height: 12),

              // 3. Phone & Telegram Staff Chat ID with Ping Button
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: _buildInlineFormField(
                      "Телефон / WhatsApp диспетчера:",
                      _phoneCtrl,
                      "+66 81 234 5678",
                      isRequired: true,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Text("Telegram Staff Group ID:", style: TextStyle(color: Colors.white70, fontSize: 11)),
                            const Spacer(),
                            GestureDetector(
                              onTap: _testTelegramPing,
                              child: const Text("🔔 Пинг", style: TextStyle(color: Color(0xFF2AABEE), fontSize: 11, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        CupertinoTextField(
                          controller: _telegramStaffChatCtrl,
                          placeholder: "-10023456789",
                          placeholderStyle: const TextStyle(color: Colors.white30, fontSize: 12),
                          style: const TextStyle(color: Colors.white, fontSize: 13),
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.4),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: _telegramStaffChatCtrl.text.trim().isEmpty ? Colors.orangeAccent : Colors.white24,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 12),

              // 4. Visa & Overstay Rules
              _buildInlineFormField(
                "Базовый визовый регламент и политика оверстея:",
                _visaRulesCtrl,
                "Паспорт >= 6 мес, 2 фото 3х4, оверстей 500฿/день (до 7 дней)...",
                isRequired: true,
                maxLines: 2,
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // OPTIONAL ENRICHMENT (TIER-2)
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.macosDivider),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(CupertinoIcons.sparkles, color: AppColors.accentTeal, size: 14),
                  SizedBox(width: 8),
                  Text("ОПЦИОНАЛЬНЫЕ ДАННЫЕ (Tier-2: Обогащение витрины и AI)", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                ],
              ),
              const SizedBox(height: 12),

              // Rating, reviews, cover photo
              Row(
                children: [
                  Expanded(
                    child: _buildInlineFormField("Рейтинг с карт:", _ratingCtrl, "4.9"),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildInlineFormField("Число отзывов:", _reviewCountCtrl, "142"),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    flex: 2,
                    child: _buildInlineFormField("Фото-обложка (URL):", _coverPhotoUrlCtrl, "https://..."),
                  ),
                ],
              ),

              const SizedBox(height: 10),

              // Timing & Fleet
              Row(
                children: [
                  Expanded(
                    child: _buildInlineFormField("Тайминг сбора и выезда:", _timingCtrl, "Сбор 05:30, выезд 06:00, возврат 16:30"),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildInlineFormField("Автопарк:", _fleetCtrl, "Toyota Commuter VIP (13 мест)"),
                  ),
                ],
              ),

              const SizedBox(height: 10),

              // Lunch, Luggage & Cancellation
              Row(
                children: [
                  Expanded(
                    child: _buildInlineFormField("Обед & Напитки:", _lunchCtrl, "Горячий обед у границы включен"),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildInlineFormField("Багаж:", _luggageCtrl, "Ручная кладь до 7 кг"),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildInlineFormField("Отмена:", _cancellationCtrl, "Бесплатно за 12 часов"),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  // --- MODE 2: RAW JSON CODE VIEW ---
  Widget _buildStage2JsonView() {
    final currentJson = _buildCurrentTwoTierJson();
    final jsonString = const JsonEncoder.withIndent('  ').convert(currentJson);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0D1117),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.accentTeal.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(CupertinoIcons.chevron_left_slash_chevron_right, color: AppColors.accentTeal, size: 16),
              const SizedBox(width: 8),
              const Text("Двухуровневый JSON онбординга", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
              const Spacer(),
              CupertinoButton(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                color: Colors.white10,
                borderRadius: BorderRadius.circular(8),
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: jsonString));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("JSON скопирован в буфер!"), backgroundColor: AppColors.accentTeal),
                  );
                },
                child: const Row(
                  children: [
                    Icon(CupertinoIcons.doc_on_clipboard, size: 12, color: Colors.white70),
                    SizedBox(width: 4),
                    Text("Копировать JSON", style: TextStyle(color: Colors.white70, fontSize: 11)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          SelectableText(
            jsonString,
            style: const TextStyle(
              color: Color(0xFF58A6FF),
              fontFamily: 'monospace',
              fontSize: 11.5,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }

  // --- PERMANENT LIVE AI DIALOGUE & CORRECTION (USER'S REQUEST!) ---
  Widget _buildStage2LiveAiDialogueBox() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF2AABEE).withValues(alpha: 0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(CupertinoIcons.chat_bubble_2_fill, color: Color(0xFF2AABEE), size: 16),
              SizedBox(width: 8),
              Text("💬 Дополнить или исправить через диалог с ИИ", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
            ],
          ),
          const SizedBox(height: 4),
          const Text(
            "Напишите в произвольной форме любое правило, тариф или уточнение. ИИ моментально поймет его, обновит базу данных, поля формы, понятное резюме и JSON.",
            style: TextStyle(color: Colors.white54, fontSize: 11, height: 1.35),
          ),
          const SizedBox(height: 10),

          // Smart suggestion chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildLiveAiChip("Скидка 200฿ для двоих"),
                _buildLiveAiChip("Сбор у Central Festival в 05:30"),
                _buildLiveAiChip("Запрещен оверстей > 5 дней"),
                _buildLiveAiChip("Обед шведский стол включен"),
                _buildLiveAiChip("Забор из отеля +300฿"),
              ],
            ),
          ),

          const SizedBox(height: 10),

          // Dialogue history if any
          if (_aiChatHistory.isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.all(10),
              margin: const EdgeInsets.only(bottom: 10),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: _aiChatHistory.map((m) {
                  final isUser = m['role'] == 'user';
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isUser ? "👤 Вы: " : "🤖 Revoo AI: ",
                          style: TextStyle(
                            color: isUser ? AppColors.accentTeal : const Color(0xFF2AABEE),
                            fontWeight: FontWeight.bold,
                            fontSize: 11.5,
                          ),
                        ),
                        Expanded(
                          child: Text(
                            m['text'] ?? '',
                            style: const TextStyle(color: Colors.white70, fontSize: 11.5, height: 1.3),
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),
          ],

          // Input row
          Row(
            children: [
              Expanded(
                child: CupertinoTextField(
                  controller: _liveAiCorrectionCtrl,
                  placeholder: "Например: «Мы теперь забираем из отелей в центре бесплатно»...",
                  placeholderStyle: const TextStyle(color: Colors.white30, fontSize: 12),
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.4),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.white24),
                  ),
                  onSubmitted: (_) => _submitLiveAiCorrection(),
                ),
              ),
              const SizedBox(width: 8),
              CupertinoButton(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                color: const Color(0xFF2AABEE),
                borderRadius: BorderRadius.circular(10),
                onPressed: _isLiveAiThinking ? null : _submitLiveAiCorrection,
                child: _isLiveAiThinking
                    ? const CupertinoActivityIndicator(color: Colors.black)
                    : const Text("Обновить ИИ", style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 12)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLiveAiChip(String prompt) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: () {
          _liveAiCorrectionCtrl.text = prompt;
          _submitLiveAiCorrection();
        },
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: const Color(0xFF2AABEE).withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: const Color(0xFF2AABEE).withValues(alpha: 0.4)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(CupertinoIcons.add, size: 10, color: Color(0xFF2AABEE)),
              const SizedBox(width: 4),
              Text(prompt, style: const TextStyle(color: Color(0xFF2AABEE), fontSize: 11, fontWeight: FontWeight.w500)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInlineFormField(
    String label,
    TextEditingController controller,
    String placeholder, {
    bool isRequired = false,
    int maxLines = 1,
  }) {
    final isMissing = isRequired && controller.text.trim().isEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(label, style: const TextStyle(color: Colors.white70, fontSize: 11)),
            if (isRequired && isMissing) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                decoration: BoxDecoration(color: Colors.orangeAccent.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(4)),
                child: const Text("ОБЯЗАТЕЛЬНО", style: TextStyle(color: Colors.orangeAccent, fontSize: 8, fontWeight: FontWeight.bold)),
              ),
            ],
          ],
        ),
        const SizedBox(height: 4),
        CupertinoTextField(
          controller: controller,
          maxLines: maxLines,
          placeholder: placeholder,
          placeholderStyle: const TextStyle(color: Colors.white30, fontSize: 12),
          style: const TextStyle(color: Colors.white, fontSize: 13),
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.4),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: isMissing ? Colors.orangeAccent : Colors.white24),
          ),
          onChanged: (_) => setState(() {}),
        ),
      ],
    );
  }

  // =========================================================================
  // ЭТАП 3: ФИНАЛЬНАЯ ОБРАБОТКА, AI-ИНТЕРВЬЮ & ПЕСОЧНИЦА
  // =========================================================================

  Widget _buildStage3FinalizeAndInterview() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Master Knowledge Document Preview & Fullscreen Button
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.accentTeal.withValues(alpha: 0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Row(
                    children: [
                      Icon(CupertinoIcons.doc_text_fill, color: AppColors.accentTeal, size: 16),
                      SizedBox(width: 8),
                      Text("Мастер-Документ Базы Знаний (Markdown)", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                    ],
                  ),
                  CupertinoButton(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    color: AppColors.accentTeal.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(8),
                    onPressed: _showFullscreenMarkdownModal,
                    child: const Row(
                      children: [
                        Icon(CupertinoIcons.fullscreen, color: AppColors.accentTeal, size: 12),
                        SizedBox(width: 4),
                        Text("На весь экран", style: TextStyle(color: AppColors.accentTeal, fontSize: 11, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                "${_masterDocCtrl.text.length} символов • ${_masterDocCtrl.text.split('\n').length} строк • 100% фактов для AI-Консьержа",
                style: const TextStyle(color: Colors.white54, fontSize: 11),
              ),
              const SizedBox(height: 10),
              Container(
                height: 160,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.white12),
                ),
                child: CupertinoTextField(
                  controller: _masterDocCtrl,
                  maxLines: null,
                  expands: true,
                  style: const TextStyle(color: Colors.white, fontSize: 12, height: 1.4, fontFamily: 'monospace'),
                  decoration: null,
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // INTERVIEW GAP-FILLER CARDS
        if (_interviewQuestions.isNotEmpty) ...[
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.accentGreen.withValues(alpha: 0.3)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(CupertinoIcons.question_diamond_fill, color: AppColors.accentGreen, size: 16),
                        SizedBox(width: 8),
                        Text("Режим AI-Интервью (Устранение пробелов)", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                      ],
                    ),
                    CupertinoButton(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      color: AppColors.accentGreen,
                      borderRadius: BorderRadius.circular(8),
                      onPressed: _mergeInterviewAnswers,
                      child: const Text("Вшить ответы", style: TextStyle(color: Colors.black, fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                const Text("Ответьте на вопросы ИИ, чтобы консьерж не сомневался ни в одном клиентском сценарии:", style: TextStyle(color: Colors.white54, fontSize: 11)),
                const SizedBox(height: 12),
                ..._interviewQuestions.map((q) => _buildInterviewQuestionCard(q)),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],

        // PERSONAL CONCIERGE IDENTITY CARD
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.purpleAccent.withValues(alpha: 0.35)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.purpleAccent.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(CupertinoIcons.person_crop_circle_badge_checkmark, color: Colors.purpleAccent, size: 18),
                  ),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text("Личность и Аватар AI-Консьержа", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                        SizedBox(height: 2),
                        Text("Имя и фотография ассистента в веб-интерфейсе и чатах с гостями", style: TextStyle(color: Colors.purpleAccent, fontSize: 11)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              // Live Avatar Row
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white12),
                ),
                child: Row(
                  children: [
                    Stack(
                      children: [
                        CircleAvatar(
                          radius: 24,
                          backgroundColor: Colors.purpleAccent.withValues(alpha: 0.25),
                          backgroundImage: _conciergeAvatarCtrl.text.trim().isNotEmpty ? NetworkImage(_conciergeAvatarCtrl.text.trim()) : null,
                          child: _conciergeAvatarCtrl.text.trim().isEmpty ? const Icon(CupertinoIcons.person_fill, color: Colors.white, size: 24) : null,
                        ),
                        Positioned(
                          bottom: 0,
                          right: 0,
                          child: Container(
                            width: 12,
                            height: 12,
                            decoration: BoxDecoration(
                              color: AppColors.accentGreen,
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.black, width: 2),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                _conciergeNameCtrl.text.trim().isNotEmpty ? _conciergeNameCtrl.text.trim() : 'AI-Консьерж',
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                              ),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: AppColors.accentGreen.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(color: AppColors.accentGreen.withValues(alpha: 0.4)),
                                ),
                                child: const Text("Онлайн 24/7", style: TextStyle(color: AppColors.accentGreen, fontSize: 9, fontWeight: FontWeight.bold)),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          const Text("Официальный ассистент сервиса • Отвечает за 0.4 сек через Groq LPU", style: TextStyle(color: Colors.white54, fontSize: 10.5)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              // Fields
              Row(
                children: [
                  Expanded(
                    flex: 4,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("Имя консьержа:", style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 4),
                        CupertinoTextField(
                          controller: _conciergeNameCtrl,
                          placeholder: "Имя (e.g. Алиса, Алексей)",
                          placeholderStyle: const TextStyle(color: Colors.white30, fontSize: 12),
                          style: const TextStyle(color: Colors.white, fontSize: 12.5),
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.4),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.white12),
                          ),
                          onChanged: (_) => setState(() {}),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    flex: 6,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("URL фотографии аватара:", style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 4),
                        CupertinoTextField(
                          controller: _conciergeAvatarCtrl,
                          placeholder: "https://... (фото лица)",
                          placeholderStyle: const TextStyle(color: Colors.white30, fontSize: 12),
                          style: const TextStyle(color: Colors.white, fontSize: 12.5),
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.4),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.white12),
                          ),
                          onChanged: (_) => setState(() {}),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              // Presets
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: kConciergeAvatarPresets.map((preset) {
                    final isSelected = _conciergeAvatarCtrl.text.trim() == preset.avatarUrl;
                    return Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: GestureDetector(
                        onTap: () {
                          setState(() {
                            _conciergeAvatarCtrl.text = preset.avatarUrl;
                            if (_conciergeNameCtrl.text.isEmpty || _conciergeNameCtrl.text == 'AI-Консьерж' || kConciergeAvatarPresets.any((p) => p.name == _conciergeNameCtrl.text)) {
                              _conciergeNameCtrl.text = preset.name;
                            }
                          });
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: isSelected ? Colors.purpleAccent.withValues(alpha: 0.3) : Colors.black.withValues(alpha: 0.3),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: isSelected ? Colors.purpleAccent : Colors.white12),
                          ),
                          child: Row(
                            children: [
                              CircleAvatar(
                                radius: 10,
                                backgroundImage: NetworkImage(preset.avatarUrl),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                preset.name,
                                style: TextStyle(
                                  color: isSelected ? Colors.white : Colors.white70,
                                  fontSize: 10.5,
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // SANDBOX TESTING CHAT
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.macosDivider),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 12,
                    backgroundColor: Colors.purpleAccent.withValues(alpha: 0.25),
                    backgroundImage: _conciergeAvatarCtrl.text.trim().isNotEmpty
                        ? NetworkImage(_conciergeAvatarCtrl.text.trim())
                        : null,
                    child: _conciergeAvatarCtrl.text.trim().isEmpty
                        ? const Icon(CupertinoIcons.sparkles, color: AppColors.accentGreen, size: 12)
                        : null,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    "Песочница: ${_conciergeNameCtrl.text.trim().isNotEmpty ? _conciergeNameCtrl.text.trim() : 'AI-Консьерж'} (Проверка регламента)",
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              // Fast scenario chips
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _buildScenarioChip("🛂 У меня оверстей 5 дней, возьмете?"),
                    _buildScenarioChip("📍 Где сбор и заберете от отеля?"),
                    _buildScenarioChip("💰 Что входит в VIP-пакет?"),
                    _buildScenarioChip("📄 Какие фото нужны для визы?"),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              Container(
                height: 150,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: ListView.builder(
                  controller: _sandboxScrollCtrl,
                  itemCount: _sandboxMessages.length,
                  itemBuilder: (context, index) {
                    final msg = _sandboxMessages[index];
                    final isUser = msg['role'] == 'user';
                    final conciergeTitle = _conciergeNameCtrl.text.trim().isNotEmpty
                        ? _conciergeNameCtrl.text.trim()
                        : 'AI-Консьерж';

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (!isUser) ...[
                            ClipRRect(
                              borderRadius: BorderRadius.circular(6),
                              child: _conciergeAvatarCtrl.text.trim().isNotEmpty
                                  ? Image.network(
                                      _conciergeAvatarCtrl.text.trim(),
                                      width: 16,
                                      height: 16,
                                      fit: BoxFit.cover,
                                      errorBuilder: (context, error, stackTrace) => const Icon(
                                        CupertinoIcons.sparkles,
                                        size: 14,
                                        color: AppColors.accentGreen,
                                      ),
                                    )
                                  : const Icon(
                                      CupertinoIcons.sparkles,
                                      size: 14,
                                      color: AppColors.accentGreen,
                                    ),
                            ),
                            const SizedBox(width: 6),
                          ],
                          Expanded(
                            child: RichText(
                              text: TextSpan(
                                children: [
                                  TextSpan(
                                    text: "${isUser ? 'Гость' : conciergeTitle}: ",
                                    style: TextStyle(
                                      color: isUser ? AppColors.accentTeal : AppColors.accentGreen,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 12,
                                    ),
                                  ),
                                  TextSpan(
                                    text: msg['text'] ?? '',
                                    style: TextStyle(
                                      color: isUser ? Colors.white : Colors.white70,
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: CupertinoTextField(
                      controller: _sandboxInputCtrl,
                      placeholder: "Задайте контрольный вопрос консьержу...",
                      placeholderStyle: const TextStyle(color: Colors.white30, fontSize: 12),
                      style: const TextStyle(color: Colors.white, fontSize: 13),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.4),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      onSubmitted: (val) => _sendSandboxTest(val),
                    ),
                  ),
                  const SizedBox(width: 8),
                  CupertinoButton(
                    padding: const EdgeInsets.all(8),
                    color: AppColors.accentGreen,
                    borderRadius: BorderRadius.circular(8),
                    onPressed: _isSandboxReplying ? null : () => _sendSandboxTest(_sandboxInputCtrl.text),
                    child: _isSandboxReplying ? const CupertinoActivityIndicator(color: Colors.black) : const Icon(CupertinoIcons.arrow_up, size: 14, color: Colors.black),
                  ),
                ],
              ),
            ],
          ),
        ),

        const SizedBox(height: 24),

        // FINAL SAVE & LAUNCH BUTTON
        SizedBox(
          width: double.infinity,
          child: CupertinoButton(
            padding: const EdgeInsets.symmetric(vertical: 14),
            color: AppColors.accentGreen,
            borderRadius: BorderRadius.circular(14),
            onPressed: _saveAndLaunchVenue,
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(CupertinoIcons.checkmark_seal_fill, color: Colors.black, size: 18),
                SizedBox(width: 8),
                Text(
                  "✅ Сохранить и запустить заведение (100% готовность)",
                  style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 14),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildInterviewQuestionCard(Map<String, dynamic> q) {
    final qId = q['id']?.toString() ?? '';
    final qText = q['question']?.toString() ?? '';
    final suggested = (q['suggested'] as List<dynamic>? ?? []).map((e) => e.toString()).toList();
    final ctrl = _interviewAnswerControllers[qId];

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(qText, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12.5)),
          if (suggested.isNotEmpty) ...[
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              runSpacing: 4,
              children: suggested.map((s) {
                return GestureDetector(
                  onTap: () {
                    if (ctrl != null) {
                      setState(() => ctrl.text = s);
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(color: Colors.white12, borderRadius: BorderRadius.circular(6)),
                    child: Text("💡 $s", style: const TextStyle(color: Colors.white70, fontSize: 11)),
                  ),
                );
              }).toList(),
            ),
          ],
          const SizedBox(height: 6),
          CupertinoTextField(
            controller: ctrl,
            placeholder: "Ответ заведения...",
            placeholderStyle: const TextStyle(color: Colors.white30, fontSize: 11),
            style: const TextStyle(color: Colors.white, fontSize: 12),
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.4),
              borderRadius: BorderRadius.circular(6),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildScenarioChip(String text) {
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: GestureDetector(
        onTap: () => _sendSandboxTest(text),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.4),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.purpleAccent.withValues(alpha: 0.3)),
          ),
          child: Text(text, style: const TextStyle(color: Colors.purpleAccent, fontSize: 11)),
        ),
      ),
    );
  }

  void _showFullscreenMarkdownModal() {
    showGeneralDialog(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.black.withValues(alpha: 0.85),
      pageBuilder: (ctx, anim1, anim2) {
        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: CupertinoNavigationBar(
            backgroundColor: AppColors.surface,
            leading: CupertinoButton(
              padding: EdgeInsets.zero,
              child: const Text("Закрыть"),
              onPressed: () => Navigator.pop(ctx),
            ),
            middle: const Text("Мастер-Документ Базы Знаний", style: TextStyle(color: Colors.white)),
            trailing: CupertinoButton(
              padding: EdgeInsets.zero,
              child: const Text("Применить", style: TextStyle(color: AppColors.accentGreen, fontWeight: FontWeight.bold)),
              onPressed: () {
                setState(() {});
                Navigator.pop(ctx);
              },
            ),
          ),
          body: Padding(
            padding: const EdgeInsets.all(16),
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.macosDivider),
              ),
              child: CupertinoTextField(
                controller: _masterDocCtrl,
                maxLines: null,
                expands: true,
                style: const TextStyle(color: Colors.white, fontSize: 13, height: 1.45, fontFamily: 'monospace'),
                decoration: null,
              ),
            ),
          ),
        );
      },
    );
  }
}
