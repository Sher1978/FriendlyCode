import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:file_picker/file_picker.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/models/venue_onboarding_schema.dart';
import 'package:friendly_code/core/services/continuous_knowledge_service.dart';
import 'package:friendly_code/core/theme/colors.dart';

class AiConciergeConfigScreen extends StatefulWidget {
  final String venueId;
  const AiConciergeConfigScreen({super.key, required this.venueId});

  @override
  State<AiConciergeConfigScreen> createState() => _AiConciergeConfigScreenState();
}

class _AiConciergeConfigScreenState extends State<AiConciergeConfigScreen> {
  int _selectedTab = 0; // 0 = Цифровой паспорт & Мастер-документ, 1 = До-интервью, 2 = Тестовая песочница
  bool _isLoading = true;
  bool _isSaving = false;

  // Analysis / Gemini loading overlay
  bool _isAnalyzing = false;
  String _analyzingStatus = '';

  VenueModel? _venue;

  // Tab 0 Controllers
  final _masterDocCtrl = TextEditingController();
  final _telegramStaffChatCtrl = TextEditingController();
  String _toneOfVoice = 'respectful_formal';
  String _selectedCategory = 'all';

  // Tab 1 Gap-Filler State
  List<Map<String, dynamic>> _gapQuestions = [];
  final Map<String, TextEditingController> _gapAnswerControllers = {};
  bool _isLoadingGapQuestions = false;
  bool _isMergingAnswers = false;
  final _freeformKnowledgeCtrl = TextEditingController();
  bool _isFreeformIngesting = false;

  // Tab 2 Sandbox Chat State
  final List<Map<String, String>> _chatMessages = [];
  final _chatInputCtrl = TextEditingController();
  final ScrollController _chatScrollCtrl = ScrollController();
  bool _isChatReplying = false;

  @override
  void initState() {
    super.initState();
    _loadVenueAndProfile();
    _initInitialSandboxGreeting();
  }

  @override
  void dispose() {
    _masterDocCtrl.dispose();
    _telegramStaffChatCtrl.dispose();
    _freeformKnowledgeCtrl.dispose();
    _chatInputCtrl.dispose();
    _chatScrollCtrl.dispose();
    for (final ctrl in _gapAnswerControllers.values) {
      ctrl.dispose();
    }
    super.dispose();
  }

  void _initInitialSandboxGreeting() {
    _chatMessages.add({
      'role': 'assistant',
      'text': "Здравствуйте! Я официальный AI-консьерж сервиса. Я готов проконсультировать вас по расписанию, визовым правилам границы, ценам и условиям поездки на основе утвержденного регламента компании.\n\nЗадайте любой вопрос или выберите быстрый сценарий ниже!",
      'citation': '0. Вводный регламент консьержа',
    });
  }

  Future<void> _loadVenueAndProfile() async {
    setState(() => _isLoading = true);
    try {
      // 1. Load Venue document
      final venueDoc = await FirebaseFirestore.instance.collection('venues').doc(widget.venueId).get();
      if (venueDoc.exists && venueDoc.data() != null) {
        _venue = VenueModel.fromMap(venueDoc.id, venueDoc.data()!);
        _masterDocCtrl.text = _venue?.masterKnowledgeDoc ?? '';
        _telegramStaffChatCtrl.text = _venue?.telegramStaffChatId ?? '';
      }

      // 2. Load ai_knowledge/profile
      final profileDoc = await FirebaseFirestore.instance
          .collection('venues')
          .doc(widget.venueId)
          .collection('ai_knowledge')
          .doc('profile')
          .get();

      if (profileDoc.exists && profileDoc.data() != null) {
        final data = profileDoc.data()!;
        _toneOfVoice = data['toneOfVoice'] as String? ?? 'respectful_formal';
      }

      // 3. Fallback: if masterDoc is empty, check ai_knowledge/master_doc
      if (_masterDocCtrl.text.isEmpty) {
        final mDoc = await FirebaseFirestore.instance
            .collection('venues')
            .doc(widget.venueId)
            .collection('ai_knowledge')
            .doc('master_doc')
            .get();
        if (mDoc.exists && mDoc.data() != null) {
          final content = mDoc.data()!['content'] as String? ?? '';
          if (content.isNotEmpty) {
            _masterDocCtrl.text = content;
          }
        }
      }
    } catch (e) {
      debugPrint("[AiConciergeConfig] Error loading: $e");
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _saveMasterDocAndSettings() async {
    setState(() => _isSaving = true);
    try {
      final docContent = _masterDocCtrl.text.trim();
      final tgId = _telegramStaffChatCtrl.text.trim();

      // 1. Update parent venue
      await FirebaseFirestore.instance.collection('venues').doc(widget.venueId).update({
        'masterKnowledgeDoc': docContent,
        'telegramStaffChatId': tgId,
        'telegram_group_id': tgId,
        'updatedAt': FieldValue.serverTimestamp(),
      });

      // 2. Update ai_knowledge/master_doc subcollection
      await FirebaseFirestore.instance
          .collection('venues')
          .doc(widget.venueId)
          .collection('ai_knowledge')
          .doc('master_doc')
          .set({
        'content': docContent,
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));

      // 3. Update profile
      await FirebaseFirestore.instance
          .collection('venues')
          .doc(widget.venueId)
          .collection('ai_knowledge')
          .doc('profile')
          .set({
        'venueId': widget.venueId,
        'toneOfVoice': _toneOfVoice,
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));

      if (_venue != null) {
        _venue = _venue!.copyWith(
          masterKnowledgeDoc: docContent,
          telegramStaffChatId: tgId,
        );
      }

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("✅ Мастер-база знаний и настройки успешно сохранены!"),
          backgroundColor: AppColors.accentGreen,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Ошибка сохранения: $e"), backgroundColor: Colors.redAccent),
      );
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  // --- ACTIONS: GEO & NICHE PREFILL ---

  Future<void> _handleGeoPrefill() async {
    final confirmed = await showCupertinoDialog<bool>(
      context: context,
      builder: (ctx) => CupertinoAlertDialog(
        title: const Text("Предзаполнить базу знаний по Гео и Нише?"),
        content: const Padding(
          padding: EdgeInsets.only(top: 8),
          child: Text(
            "Gemini 2.5 Flash проанализирует локацию заведения, визовые регламенты границы (например, Таиланд ➔ Камбоджа КПП Ban Laem / Poipet), оверстей, тайминг сбора и сформирует исчерпывающий Мастер-Документ.\n\nТекущий текст будет обновлен.",
            style: TextStyle(fontSize: 12),
          ),
        ),
        actions: [
          CupertinoDialogAction(child: const Text("Отмена"), onPressed: () => Navigator.pop(ctx, false)),
          CupertinoDialogAction(
            isDefaultAction: true,
            child: const Text("Сгенерировать"),
            onPressed: () => Navigator.pop(ctx, true),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() {
      _isAnalyzing = true;
      _analyzingStatus = "Gemini анализирует локацию «${_venue?.address ?? 'Паттайя'}» и визовые регламенты границы...";
    });

    try {
      final generatedDoc = await ContinuousKnowledgeService.generateGeoAndNicheKnowledgeDoc(
        venueName: _venue?.name ?? 'Виза-ран сервис',
        address: _venue?.address ?? 'Паттайя, Таиланд',
        archetype: _venue?.archetype ?? 'batch',
        currency: _venue?.currency ?? '฿',
      );

      _masterDocCtrl.text = generatedDoc;
      await _saveMasterDocAndSettings();

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("✅ Мастер-документ успешно синтезирован по правилам границы!"),
          backgroundColor: AppColors.accentGreen,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Ошибка генерации: $e"), backgroundColor: Colors.redAccent),
      );
    } finally {
      if (mounted) setState(() => _isAnalyzing = false);
    }
  }

  // --- ACTIONS: TELEGRAM PING TEST ---

  Future<void> _handleTestTelegramPing() async {
    final chatId = _telegramStaffChatCtrl.text.trim();
    if (chatId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Введите ID группы диспетчеров Telegram (например, -100...)"),
          backgroundColor: Colors.orangeAccent,
        ),
      );
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text("Отправка тестового пинга в Telegram..."), backgroundColor: Color(0xFF2AABEE)),
    );

    final ok = await ContinuousKnowledgeService.sendTelegramTestPing(
      chatId: chatId,
      venueName: _venue?.name ?? 'Виза-ран сервис',
    );

    if (!mounted) return;
    if (ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("✅ Тестовый пинг успешно доставлен в группу диспетчеров Telegram!"),
          backgroundColor: AppColors.accentGreen,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Не удалось отправить сообщение. Убедитесь, что бот @revoogiftx_bot добавлен в группу администратором."),
          backgroundColor: Colors.redAccent,
        ),
      );
    }
  }

  // --- TAB 1: GAP-FILLER INTERVIEW LOGIC ---

  Future<void> _loadGapInterviewQuestions() async {
    setState(() => _isLoadingGapQuestions = true);
    try {
      final questions = await ContinuousKnowledgeService.generateGapInterviewQuestions(
        masterDoc: _masterDocCtrl.text.trim().isNotEmpty
            ? _masterDocCtrl.text.trim()
            : "Компания занимается виза-ранами и пассажирскими трансферами.",
        venueName: _venue?.name ?? 'Виза-ран сервис',
        archetype: _venue?.archetype ?? 'batch',
      );

      setState(() {
        _gapQuestions = questions;
        for (final q in questions) {
          final qId = q['id'] as String? ?? 'gap_${q.hashCode}';
          if (!_gapAnswerControllers.containsKey(qId)) {
            _gapAnswerControllers[qId] = TextEditingController();
          }
        }
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Не удалось получить вопросы: $e"), backgroundColor: Colors.redAccent),
      );
    } finally {
      if (mounted) setState(() => _isLoadingGapQuestions = false);
    }
  }

  Future<void> _mergeGapAnswers() async {
    final qaList = <Map<String, String>>[];
    for (final q in _gapQuestions) {
      final qId = q['id'] as String? ?? '';
      final questionText = q['question'] as String? ?? '';
      final answerText = _gapAnswerControllers[qId]?.text.trim() ?? '';
      if (answerText.isNotEmpty) {
        qaList.add({'question': questionText, 'answer': answerText});
      }
    }

    if (qaList.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Заполните хотя бы один ответ перед вшиванием в базу!"),
          backgroundColor: Colors.orangeAccent,
        ),
      );
      return;
    }

    setState(() => _isMergingAnswers = true);
    try {
      final merged = await ContinuousKnowledgeService.mergeAnswersIntoMasterKnowledgeDoc(
        currentDoc: _masterDocCtrl.text.trim(),
        qaList: qaList,
      );

      _masterDocCtrl.text = merged;
      await _saveMasterDocAndSettings();

      // Clear answered controllers
      for (final q in _gapQuestions) {
        final qId = q['id'] as String? ?? '';
        _gapAnswerControllers[qId]?.clear();
      }

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("✅ ${qaList.length} ответа(ов) успешно интегрированы в Мастер-Документ!"),
          backgroundColor: AppColors.accentGreen,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Ошибка интеграции: $e"), backgroundColor: Colors.redAccent),
      );
    } finally {
      if (mounted) setState(() => _isMergingAnswers = false);
    }
  }

  Future<void> _ingestFreeformKnowledge() async {
    final text = _freeformKnowledgeCtrl.text.trim();
    if (text.isEmpty) return;

    setState(() => _isFreeformIngesting = true);
    try {
      final merged = await ContinuousKnowledgeService.mergeAnswersIntoMasterKnowledgeDoc(
        currentDoc: _masterDocCtrl.text.trim(),
        qaList: [
          {'question': "Дополнительный регламент от владельца", 'answer': text}
        ],
      );

      _masterDocCtrl.text = merged;
      await _saveMasterDocAndSettings();
      _freeformKnowledgeCtrl.clear();

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("✅ Информация успешно встроена в Мастер-Документ!"),
          backgroundColor: AppColors.accentGreen,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Ошибка встраивания: $e"), backgroundColor: Colors.redAccent),
      );
    } finally {
      if (mounted) setState(() => _isFreeformIngesting = false);
    }
  }

  // --- TAB 2: SANDBOX CHAT LOGIC ---

  Future<void> _sendSandboxMessage(String messageText) async {
    final text = messageText.trim();
    if (text.isEmpty) return;

    _chatInputCtrl.clear();
    setState(() {
      _chatMessages.add({'role': 'user', 'text': text});
      _isChatReplying = true;
    });

    _scrollChatToBottom();

    try {
      final rawReply = await ContinuousKnowledgeService.askSandboxConcierge(
        masterDoc: _masterDocCtrl.text.trim().isNotEmpty
            ? _masterDocCtrl.text.trim()
            : "Регламент заведения формируется.",
        userMessage: text,
        venueName: _venue?.name ?? 'Виза-ран сервис',
        chatHistory: _chatMessages,
      );

      // Parse citation if present
      String cleanText = rawReply;
      String citation = 'Официальный регламент заведения';

      if (rawReply.contains('📖 [Источник:')) {
        final parts = rawReply.split('📖 [Источник:');
        cleanText = parts[0].trim();
        citation = parts[1].replaceAll(']', '').trim();
      } else if (rawReply.contains('[Источник:')) {
        final parts = rawReply.split('[Источник:');
        cleanText = parts[0].trim();
        citation = parts[1].replaceAll(']', '').trim();
      }

      setState(() {
        _chatMessages.add({
          'role': 'assistant',
          'text': cleanText,
          'citation': citation,
        });
      });
    } catch (e) {
      setState(() {
        _chatMessages.add({
          'role': 'assistant',
          'text': "Извините, произошла ошибка обработки вопроса: $e",
          'citation': "Ошибка связи",
        });
      });
    } finally {
      if (mounted) {
        setState(() => _isChatReplying = false);
        _scrollChatToBottom();
      }
    }
  }

  void _scrollChatToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_chatScrollCtrl.hasClients) {
        _chatScrollCtrl.animateTo(
          _chatScrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _openRuleCorrectionDialog(String replyText) async {
    final correctionCtrl = TextEditingController();
    final ok = await showCupertinoDialog<bool>(
      context: context,
      builder: (ctx) => CupertinoAlertDialog(
        title: const Text("Скорректировать правило в базе знаний"),
        content: Padding(
          padding: const EdgeInsets.only(top: 12),
          child: Column(
            children: [
              const Text(
                "Укажите, что именно AI-консьерж должен исправить в регламенте. Gemini мгновенно обновит соответствующий пункт в Мастер-Документе.",
                style: TextStyle(fontSize: 12, color: Colors.white70),
              ),
              const SizedBox(height: 12),
              CupertinoTextField(
                controller: correctionCtrl,
                maxLines: 4,
                placeholder: "Например: Мы теперь не берем туристов с оверстеем больше 3 дней, штраф строго 500฿/день...",
                style: const TextStyle(color: Colors.white, fontSize: 13),
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.white24),
                ),
              ),
            ],
          ),
        ),
        actions: [
          CupertinoDialogAction(child: const Text("Отмена"), onPressed: () => Navigator.pop(ctx, false)),
          CupertinoDialogAction(
            isDefaultAction: true,
            child: const Text("Внести правку"),
            onPressed: () => Navigator.pop(ctx, true),
          ),
        ],
      ),
    );

    if (ok != true || correctionCtrl.text.trim().isEmpty) return;

    setState(() {
      _isAnalyzing = true;
      _analyzingStatus = "Gemini актуализирует правило в Мастер-Документе...";
    });

    try {
      final updated = await ContinuousKnowledgeService.amendMasterDocRule(
        currentDoc: _masterDocCtrl.text.trim(),
        userCorrection: correctionCtrl.text.trim(),
      );

      _masterDocCtrl.text = updated;
      await _saveMasterDocAndSettings();

      setState(() {
        _chatMessages.add({
          'role': 'assistant',
          'text': "✅ Правило скорректировано владельцем: «${correctionCtrl.text.trim()}».\nРегламент обновлен, консьерж теперь будет отвечать строго по новым условиям.",
          'citation': 'Обновлено владельцем',
        });
      });
      _scrollChatToBottom();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Ошибка коррекции: $e"), backgroundColor: Colors.redAccent),
      );
    } finally {
      if (mounted) setState(() => _isAnalyzing = false);
    }
  }

  // --- FULLSCREEN MASTER DOC MODAL ---

  void _showFullscreenMasterDocEditor() {
    showGeneralDialog(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.black.withValues(alpha: 0.85),
      transitionDuration: const Duration(milliseconds: 250),
      pageBuilder: (ctx, anim1, anim2) {
        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: CupertinoNavigationBar(
            backgroundColor: AppColors.surface.withValues(alpha: 0.95),
            leading: CupertinoButton(
              padding: EdgeInsets.zero,
              child: const Text("Закрыть"),
              onPressed: () => Navigator.pop(ctx),
            ),
            middle: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text("Мастер-Документ Базы Знаний", style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold)),
                Text(
                  "${_masterDocCtrl.text.length} симв. • ${_masterDocCtrl.text.split('\n').length} строк",
                  style: const TextStyle(color: Colors.white54, fontSize: 11),
                ),
              ],
            ),
            trailing: CupertinoButton(
              padding: EdgeInsets.zero,
              child: const Text("Сохранить", style: TextStyle(color: AppColors.accentGreen, fontWeight: FontWeight.bold)),
              onPressed: () async {
                await _saveMasterDocAndSettings();
                if (ctx.mounted) Navigator.pop(ctx);
              },
            ),
          ),
          body: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                // Quick insertion chips
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildQuickSnippetChip("+ Раздел", "\n\n## Название раздела\n- Пункт регламента...\n"),
                      _buildQuickSnippetChip("+ Визы РФ (60 дней)", "\n- Для граждан РФ: безвизовый штамп 60 дней.\n"),
                      _buildQuickSnippetChip("+ Оверстей 500฿", "\n- Оверстей: штраф 500 ฿ в день на границе, до 7 дней.\n"),
                      _buildQuickSnippetChip("+ Пикап Central", "\n- Точка сбора: ТЦ Central Pattaya (выход к пляжу) в 05:30 утра.\n"),
                      _buildQuickSnippetChip("+ Минивэн VIP", "\n- Автопарк: Toyota Commuter VIP 13 мест, кондиционер, Wi-Fi, откидные кресла.\n"),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.macosDivider),
                    ),
                    child: CupertinoTextField(
                      controller: _masterDocCtrl,
                      maxLines: null,
                      expands: true,
                      style: const TextStyle(color: Colors.white, fontSize: 13, height: 1.45, fontFamily: 'monospace'),
                      placeholder: "Введите правила и регламенты заведения в Markdown...",
                      placeholderStyle: const TextStyle(color: Colors.white30, fontSize: 13),
                      decoration: null,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildQuickSnippetChip(String label, String snippet) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: CupertinoButton(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(8),
        onPressed: () {
          final sel = _masterDocCtrl.selection;
          final current = _masterDocCtrl.text;
          if (sel.isValid && sel.start >= 0) {
            final newText = current.replaceRange(sel.start, sel.end, snippet);
            _masterDocCtrl.text = newText;
            _masterDocCtrl.selection = TextSelection.collapsed(offset: sel.start + snippet.length);
          } else {
            _masterDocCtrl.text = current + snippet;
          }
        },
        child: Text(label, style: const TextStyle(color: AppColors.accentTeal, fontSize: 11, fontWeight: FontWeight.bold)),
      ),
    );
  }

  // --- MULTIMODAL INGESTION DIALOGS ---

  Future<void> _handleUploadFile() async {
    try {
      final result = await FilePicker.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'txt', 'md'],
        withData: true,
      );

      if (result == null || result.files.isEmpty) return;
      final file = result.files.first;
      if (file.bytes == null) {
        throw Exception("Не удалось прочитать содержимое файла.");
      }

      setState(() {
        _isAnalyzing = true;
        _analyzingStatus = "Gemini 2.5 Flash анализирует файл «${file.name}» и извлекает факты...";
      });

      final ext = (file.extension ?? '').toLowerCase();
      final sourceType = (ext == 'png' || ext == 'jpg' || ext == 'jpeg' || ext == 'webp') ? 'image' : (ext == 'pdf' ? 'pdf' : 'text');

      final extracted = await ContinuousKnowledgeService.processFile(
        bytes: file.bytes!,
        filename: file.name,
        mimeType: file.extension ?? '',
      );

      setState(() {
        _analyzingStatus = "Сохранение ${extracted.facts.length} правил в базу знаний...";
      });

      await ContinuousKnowledgeService.saveKnowledgeToFirestore(
        venueId: widget.venueId,
        sourceType: sourceType,
        sourceTitle: file.name,
        result: extracted,
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("✅ Успешно выучено ${extracted.facts.length} правил из «${file.name}»!"),
          backgroundColor: AppColors.accentGreen,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Ошибка загрузки файла: $e"), backgroundColor: Colors.redAccent),
      );
    } finally {
      if (mounted) setState(() => _isAnalyzing = false);
    }
  }

  Future<void> _handleAddLink() async {
    final urlCtrl = TextEditingController();
    final ok = await showCupertinoDialog<bool>(
      context: context,
      builder: (ctx) => CupertinoAlertDialog(
        title: const Text("Добавить ссылку на сайт / карту / регламент"),
        content: Padding(
          padding: const EdgeInsets.only(top: 12),
          child: Column(
            children: [
              const Text(
                "Jina Reader загрузит содержимое страницы, а Gemini 2.5 Flash извлечет факты, цены и правила.",
                style: TextStyle(fontSize: 12, color: Colors.white70),
              ),
              const SizedBox(height: 12),
              CupertinoTextField(
                controller: urlCtrl,
                placeholder: "https://example.com/visa-rules",
                style: const TextStyle(color: Colors.white, fontSize: 13),
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.white24),
                ),
              ),
            ],
          ),
        ),
        actions: [
          CupertinoDialogAction(child: const Text("Отмена"), onPressed: () => Navigator.pop(ctx, false)),
          CupertinoDialogAction(
            isDefaultAction: true,
            child: const Text("Анализировать"),
            onPressed: () => Navigator.pop(ctx, true),
          ),
        ],
      ),
    );

    if (ok != true || urlCtrl.text.trim().isEmpty) return;
    final url = urlCtrl.text.trim();

    try {
      setState(() {
        _isAnalyzing = true;
        _analyzingStatus = "Чтение страницы через Jina Reader и извлечение правил...";
      });

      final extracted = await ContinuousKnowledgeService.processUrl(url);

      setState(() {
        _analyzingStatus = "Сохранение ${extracted.facts.length} правил в базу знаний...";
      });

      await ContinuousKnowledgeService.saveKnowledgeToFirestore(
        venueId: widget.venueId,
        sourceType: 'link',
        sourceTitle: url,
        result: extracted,
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("✅ Добавлено ${extracted.facts.length} правил из ссылки!"),
          backgroundColor: AppColors.accentGreen,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Ошибка парсинга ссылки: $e"), backgroundColor: Colors.redAccent),
      );
    } finally {
      if (mounted) setState(() => _isAnalyzing = false);
    }
  }

  Future<void> _handleAddNote() async {
    final titleCtrl = TextEditingController(text: "Оперативная заметка");
    final textCtrl = TextEditingController();

    final ok = await showCupertinoDialog<bool>(
      context: context,
      builder: (ctx) => CupertinoAlertDialog(
        title: const Text("Добавить текст / заметку / регламент"),
        content: Padding(
          padding: const EdgeInsets.only(top: 12),
          child: Column(
            children: [
              CupertinoTextField(
                controller: titleCtrl,
                placeholder: "Название заметки",
                style: const TextStyle(color: Colors.white, fontSize: 13),
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.white24),
                ),
              ),
              const SizedBox(height: 10),
              CupertinoTextField(
                controller: textCtrl,
                maxLines: 5,
                placeholder: "Вставьте скопированный текст регламента или правил...",
                style: const TextStyle(color: Colors.white, fontSize: 13),
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.white24),
                ),
              ),
            ],
          ),
        ),
        actions: [
          CupertinoDialogAction(child: const Text("Отмена"), onPressed: () => Navigator.pop(ctx, false)),
          CupertinoDialogAction(
            isDefaultAction: true,
            child: const Text("Извлечь правила"),
            onPressed: () => Navigator.pop(ctx, true),
          ),
        ],
      ),
    );

    if (ok != true || textCtrl.text.trim().isEmpty) return;

    try {
      setState(() {
        _isAnalyzing = true;
        _analyzingStatus = "Gemini структурирует текст в правила базы знаний...";
      });

      final extracted = await ContinuousKnowledgeService.processText(
        textCtrl.text.trim(),
        title: titleCtrl.text.trim(),
      );

      await ContinuousKnowledgeService.saveKnowledgeToFirestore(
        venueId: widget.venueId,
        sourceType: 'text',
        sourceTitle: titleCtrl.text.trim(),
        result: extracted,
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("✅ Добавлено ${extracted.facts.length} правил!"),
          backgroundColor: AppColors.accentGreen,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Ошибка: $e"), backgroundColor: Colors.redAccent),
      );
    } finally {
      if (mounted) setState(() => _isAnalyzing = false);
    }
  }

  // --- BUILD METHODS ---

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CupertinoNavigationBar(
        backgroundColor: AppColors.surface.withValues(alpha: 0.95),
        middle: CupertinoSlidingSegmentedControl<int>(
          groupValue: _selectedTab,
          children: const {
            0: Padding(padding: EdgeInsets.symmetric(horizontal: 6, vertical: 4), child: Text("Цифровой паспорт", style: TextStyle(fontSize: 11))),
            1: Padding(padding: EdgeInsets.symmetric(horizontal: 6, vertical: 4), child: Text("До-интервью", style: TextStyle(fontSize: 11))),
            2: Padding(padding: EdgeInsets.symmetric(horizontal: 6, vertical: 4), child: Text("Песочница", style: TextStyle(fontSize: 11))),
          },
          onValueChanged: (v) {
            setState(() => _selectedTab = v ?? 0);
            if (_selectedTab == 1 && _gapQuestions.isEmpty && !_isLoadingGapQuestions) {
              _loadGapInterviewQuestions();
            }
          },
        ),
        trailing: _selectedTab == 0
            ? CupertinoButton(
                padding: EdgeInsets.zero,
                onPressed: _isSaving ? null : _saveMasterDocAndSettings,
                child: _isSaving
                    ? const CupertinoActivityIndicator(color: AppColors.accentGreen)
                    : const Text("Сохранить", style: TextStyle(color: AppColors.accentGreen, fontWeight: FontWeight.bold, fontSize: 13)),
              )
            : null,
      ),
      body: Stack(
        children: [
          _isLoading
              ? const Center(child: CupertinoActivityIndicator(color: AppColors.accentGreen))
              : _buildCurrentTab(),

          // Overlay when analyzing with Gemini
          if (_isAnalyzing)
            Container(
              color: Colors.black.withValues(alpha: 0.85),
              child: Center(
                child: Container(
                  padding: const EdgeInsets.all(24),
                  margin: const EdgeInsets.symmetric(horizontal: 32),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.accentGreen.withValues(alpha: 0.3)),
                    boxShadow: [
                      BoxShadow(color: AppColors.accentGreen.withValues(alpha: 0.3), blurRadius: 30),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const CupertinoActivityIndicator(color: AppColors.accentGreen, radius: 18),
                      const SizedBox(height: 18),
                      const Text(
                        "Обучение AI-Консьержа",
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _analyzingStatus,
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.white70, fontSize: 13, height: 1.4),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildCurrentTab() {
    switch (_selectedTab) {
      case 0:
        return _buildPassportAndMasterDocTab();
      case 1:
        return _buildGapInterviewTab();
      case 2:
        return _buildSandboxChatTab();
      default:
        return _buildPassportAndMasterDocTab();
    }
  }

  // =========================================================================
  // SUBTAB 0: ЦИФРОВОЙ ПАСПОРТ & МАСТЕР-ДОКУМЕНТ
  // =========================================================================

  Widget _buildPassportAndMasterDocTab() {
    final validation = _venue != null ? VenueOnboardingSchema.validateVenue(_venue!) : null;
    final isReady = validation?.isValid ?? false;
    final completionPct = validation != null ? (validation.progress * 100).round() : 100;

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      children: [
        // 1. Two-Tier Status & Readiness Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: isReady ? AppColors.accentGreen.withValues(alpha: 0.3) : Colors.orangeAccent.withValues(alpha: 0.4)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: isReady ? AppColors.accentGreen.withValues(alpha: 0.2) : Colors.orangeAccent.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(
                      isReady ? CupertinoIcons.checkmark_shield_fill : CupertinoIcons.exclamationmark_shield_fill,
                      color: isReady ? AppColors.accentGreen : Colors.orangeAccent,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isReady ? "AI-Консьерж готов к работе 24/7" : "Требуется заполнить критические поля",
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          isReady
                              ? "Все $completionPct% обязательных параметров введены"
                              : "Готовность паспорта: $completionPct% • Заполните поля ниже",
                          style: TextStyle(color: Colors.white.withValues(alpha: 0.5), fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: isReady ? AppColors.accentGreen.withValues(alpha: 0.2) : Colors.orangeAccent.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: isReady ? AppColors.accentGreen : Colors.orangeAccent),
                    ),
                    child: Text(
                      "$completionPct%",
                      style: TextStyle(
                        color: isReady ? AppColors.accentGreen : Colors.orangeAccent,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
              if (validation != null && validation.missingLabels.isNotEmpty) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.orange.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.orange.withValues(alpha: 0.2)),
                  ),
                  child: Row(
                    children: [
                      const Icon(CupertinoIcons.info_circle, color: Colors.orangeAccent, size: 16),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          "Не заполнены: ${validation.missingLabels.join(', ')}",
                          style: const TextStyle(color: Colors.orangeAccent, fontSize: 11),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),

        const SizedBox(height: 16),

        // 2. Geo & Niche Auto-Prefill Banner
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                AppColors.accentTeal.withValues(alpha: 0.15),
                AppColors.accentGreen.withValues(alpha: 0.10),
              ],
            ),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.accentTeal.withValues(alpha: 0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.accentTeal.withValues(alpha: 0.25),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(CupertinoIcons.sparkles, color: AppColors.accentTeal, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          "Предиктивное наполнение базы по Гео & Нише",
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          "Локация: ${_venue?.address ?? 'Паттайя, Таиланд'} ➔ КПП Ban Laem / Poipet",
                          style: const TextStyle(color: AppColors.accentTeal, fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              const Text(
                "Gemini автоматически наполнит базу визовыми правилами, требованиями к паспорту (6 мес, 2 фото 3х4), правилами оверстея 500฿/день, расписанием выездов и правилами багажа.",
                style: TextStyle(color: Colors.white70, fontSize: 11, height: 1.35),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: CupertinoButton(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  color: AppColors.accentTeal,
                  borderRadius: BorderRadius.circular(12),
                  onPressed: _handleGeoPrefill,
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(CupertinoIcons.bolt_fill, color: Colors.black, size: 16),
                      SizedBox(width: 6),
                      Text(
                        "⚡ Предзаполнить регламенты границы (Gemini)",
                        style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 20),

        // 3. Telegram Staff Chat Dispatcher Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFF2AABEE).withValues(alpha: 0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF2AABEE).withValues(alpha: 0.25),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(CupertinoIcons.paperplane_fill, color: Color(0xFF2AABEE), size: 20),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "Telegram Staff Chat (Human-in-the-Loop)",
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                        SizedBox(height: 2),
                        Text(
                          "Сюда бот отправляет брони, а при Reply диспетчера дообучается!",
                          style: TextStyle(color: Color(0xFF2AABEE), fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: CupertinoTextField(
                      controller: _telegramStaffChatCtrl,
                      placeholder: "ID группы Telegram (например, -10023456789)",
                      placeholderStyle: const TextStyle(color: Colors.white30, fontSize: 12),
                      style: const TextStyle(color: Colors.white, fontSize: 13),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.4),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.white24),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  CupertinoButton(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    color: const Color(0xFF2AABEE).withValues(alpha: 0.25),
                    borderRadius: BorderRadius.circular(12),
                    onPressed: _handleTestTelegramPing,
                    child: const Row(
                      children: [
                        Icon(CupertinoIcons.bell_fill, color: Color(0xFF2AABEE), size: 16),
                        SizedBox(width: 4),
                        Text("Пинг", style: TextStyle(color: Color(0xFF2AABEE), fontWeight: FontWeight.bold, fontSize: 12)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(CupertinoIcons.link, size: 12, color: Colors.white54),
                    const SizedBox(width: 6),
                    Expanded(
                      child: SelectableText(
                        "https://t.me/revoogiftx_bot?start=mgr_${widget.venueId}",
                        style: const TextStyle(color: Color(0xFF2AABEE), fontSize: 11),
                      ),
                    ),
                    GestureDetector(
                      onTap: () {
                        Clipboard.setData(ClipboardData(text: "https://t.me/revoogiftx_bot?start=mgr_${widget.venueId}"));
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text("Ссылка скопирована!"), backgroundColor: Color(0xFF2AABEE)),
                        );
                      },
                      child: const Text("Копировать", style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 20),

        // 4. Tone of Voice
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text("Тон общения консьержа", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
            CupertinoSegmentedControl<String>(
              children: const {
                'respectful_formal': Padding(padding: EdgeInsets.symmetric(horizontal: 10, vertical: 6), child: Text("На «вы»", style: TextStyle(fontSize: 11))),
                'friendly_informal': Padding(padding: EdgeInsets.symmetric(horizontal: 10, vertical: 6), child: Text("На «ты»", style: TextStyle(fontSize: 11))),
              },
              groupValue: _toneOfVoice,
              onValueChanged: (val) => setState(() => _toneOfVoice = val),
            ),
          ],
        ),

        const SizedBox(height: 20),

        // 5. MASTER KNOWLEDGE DOCUMENT (OPEN-ENDED SOT)
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.macosDivider),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(CupertinoIcons.doc_text_fill, color: AppColors.accentTeal, size: 16),
                          SizedBox(width: 6),
                          Text(
                            "Мастер-Документ Базы Знаний",
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        "${_masterDocCtrl.text.length} симв. • ${_masterDocCtrl.text.split('\n').length} строк",
                        style: const TextStyle(color: Colors.white54, fontSize: 11),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      CupertinoButton(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        color: AppColors.accentTeal.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(10),
                        onPressed: _showFullscreenMasterDocEditor,
                        child: const Row(
                          children: [
                            Icon(CupertinoIcons.fullscreen, color: AppColors.accentTeal, size: 14),
                            SizedBox(width: 4),
                            Text("На весь экран", style: TextStyle(color: AppColors.accentTeal, fontSize: 11, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 8),
              const Text(
                "Единый источник истины (SoT). Содержит 100% регламентов заведения: визовые правила, оверстей, тайминг сбора, цены и отмены. AI оперирует только этими фактами без галлюцинаций.",
                style: TextStyle(color: Colors.white54, fontSize: 11, height: 1.3),
              ),
              const SizedBox(height: 12),
              Container(
                height: 280,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: Colors.white12),
                ),
                child: CupertinoTextField(
                  controller: _masterDocCtrl,
                  maxLines: null,
                  expands: true,
                  style: const TextStyle(color: Colors.white, fontSize: 12.5, height: 1.45, fontFamily: 'monospace'),
                  placeholder: "Нажмите кнопку выше «⚡ Предзаполнить по Гео и Нише» или вставьте регламент...",
                  placeholderStyle: const TextStyle(color: Colors.white30, fontSize: 12),
                  decoration: null,
                ),
              ),
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  CupertinoButton(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    color: AppColors.accentGreen,
                    borderRadius: BorderRadius.circular(10),
                    onPressed: _isSaving ? null : _saveMasterDocAndSettings,
                    child: _isSaving
                        ? const CupertinoActivityIndicator(color: Colors.black)
                        : const Text("💾 Сохранить документ", style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 12)),
                  ),
                ],
              ),
            ],
          ),
        ),

        const SizedBox(height: 24),

        // 6. Multimodal Knowledge Ingestion Toolbar & RAG Rules
        _buildMultimodalSection(),
      ],
    );
  }

  // --- MULTIMODAL INGESTION & RAG SECTION (TAB 0) ---

  Widget _buildMultimodalSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.macosDivider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(CupertinoIcons.cloud_upload_fill, color: Colors.blueAccent, size: 16),
              const SizedBox(width: 8),
              const Text("Мультимодальная подгрузка данных", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
              const Spacer(),
              StreamBuilder<QuerySnapshot>(
                stream: FirebaseFirestore.instance
                    .collection('venues')
                    .doc(widget.venueId)
                    .collection('knowledge_docs')
                    .snapshots(),
                builder: (context, snap) {
                  final count = snap.hasData ? snap.data!.docs.length : 0;
                  return Text("$count правил RAG", style: const TextStyle(color: AppColors.accentGreen, fontSize: 11, fontWeight: FontWeight.bold));
                },
              ),
            ],
          ),
          const SizedBox(height: 6),
          const Text(
            "Загрузите PDF, картинку или ссылку — факты автоматически извлекутся и будут доступны консьержу.",
            style: TextStyle(color: Colors.white54, fontSize: 11),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: CupertinoButton(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  color: Colors.black.withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(10),
                  onPressed: _handleUploadFile,
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(CupertinoIcons.doc_text_fill, color: Colors.blueAccent, size: 14),
                      SizedBox(width: 4),
                      Text("Файл (PDF/Фото)", style: TextStyle(color: Colors.white, fontSize: 11)),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: CupertinoButton(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  color: Colors.black.withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(10),
                  onPressed: _handleAddLink,
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(CupertinoIcons.link, color: AppColors.accentGreen, size: 14),
                      SizedBox(width: 4),
                      Text("Ссылка (Jina)", style: TextStyle(color: Colors.white, fontSize: 11)),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: CupertinoButton(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  color: Colors.black.withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(10),
                  onPressed: _handleAddNote,
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(CupertinoIcons.pencil_outline, color: Colors.amberAccent, size: 14),
                      SizedBox(width: 4),
                      Text("Заметка", style: TextStyle(color: Colors.white, fontSize: 11)),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          // Category filter
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildFilterChip('all', 'Все'),
                _buildFilterChip('visa_rules', 'Визы'),
                _buildFilterChip('routes_and_stops', 'Маршруты'),
                _buildFilterChip('overstay', 'Оверстей'),
                _buildFilterChip('pricing_and_payment', 'Цены'),
                _buildFilterChip('auto_learned', '🤖 Из Telegram'),
              ],
            ),
          ),
          const SizedBox(height: 10),
          // RAG Docs stream
          StreamBuilder<QuerySnapshot>(
            stream: FirebaseFirestore.instance
                .collection('venues')
                .doc(widget.venueId)
                .collection('knowledge_docs')
                .orderBy('createdAt', descending: true)
                .snapshots(),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CupertinoActivityIndicator(color: AppColors.accentGreen));
              }
              final docs = snapshot.data?.docs ?? [];
              final filtered = docs.where((d) {
                if (_selectedCategory == 'all') return true;
                final data = d.data() as Map<String, dynamic>;
                return data['category'] == _selectedCategory;
              }).toList();

              if (filtered.isEmpty) {
                return const Padding(
                  padding: EdgeInsets.symmetric(vertical: 16),
                  child: Center(
                    child: Text("В этой категории пока нет дополнительных правил", style: TextStyle(color: Colors.white30, fontSize: 12)),
                  ),
                );
              }

              return Column(
                children: filtered.take(6).map((doc) {
                  final data = doc.data() as Map<String, dynamic>;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: _buildKnowledgeCard(doc.id, data),
                  );
                }).toList(),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String key, String label) {
    final isSelected = _selectedCategory == key;
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: GestureDetector(
        onTap: () => setState(() => _selectedCategory = key),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.accentGreen.withValues(alpha: 0.3) : Colors.black.withValues(alpha: 0.3),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: isSelected ? AppColors.accentGreen : Colors.white12),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: isSelected ? AppColors.accentGreen : Colors.white70,
              fontSize: 11,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildKnowledgeCard(String docId, Map<String, dynamic> data) {
    final category = data['category'] as String? ?? 'general';
    final question = data['question'] as String? ?? '';
    final answer = data['answer'] as String? ?? '';
    final criticalNote = data['criticalNote'] as String?;
    final active = data['active'] as bool? ?? true;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.accentGreen.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(category.toUpperCase(), style: const TextStyle(color: AppColors.accentGreen, fontSize: 9, fontWeight: FontWeight.bold)),
              ),
              const Spacer(),
              CupertinoSwitch(
                value: active,
                activeTrackColor: AppColors.accentGreen,
                onChanged: (val) => ContinuousKnowledgeService.toggleKnowledgeDoc(widget.venueId, docId, active),
              ),
              const SizedBox(width: 4),
              GestureDetector(
                onTap: () => ContinuousKnowledgeService.deleteKnowledgeDoc(widget.venueId, docId),
                child: const Icon(CupertinoIcons.trash, size: 14, color: Colors.white30),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(question, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
          const SizedBox(height: 4),
          Text(answer, style: const TextStyle(color: Colors.white70, fontSize: 12, height: 1.3)),
          if (criticalNote != null && criticalNote.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text("⚠️ $criticalNote", style: const TextStyle(color: Colors.amberAccent, fontSize: 11)),
          ],
        ],
      ),
    );
  }

  // =========================================================================
  // SUBTAB 1: АДАПТИВНОЕ ДО-ИНТЕРВЬЮ (AI GAP-FILLER)
  // =========================================================================

  Widget _buildGapInterviewTab() {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      children: [
        // Intro Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.accentGreen.withValues(alpha: 0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(CupertinoIcons.question_diamond_fill, color: AppColors.accentGreen, size: 20),
                  SizedBox(width: 8),
                  Text("Адаптивное До-интервью (Gap-Filler)", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                ],
              ),
              const SizedBox(height: 6),
              const Text(
                "Gemini анализирует текущий Мастер-Документ и находит неочевидные пробелы (нюансы виз, оверстей, меню обеда, способы оплаты), чтобы консьерж отвечал без единой запинки.",
                style: TextStyle(color: Colors.white70, fontSize: 11, height: 1.35),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: CupertinoButton(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      color: AppColors.accentGreen.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(10),
                      onPressed: _isLoadingGapQuestions ? null : _loadGapInterviewQuestions,
                      child: _isLoadingGapQuestions
                          ? const CupertinoActivityIndicator(color: AppColors.accentGreen)
                          : const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(CupertinoIcons.refresh_bold, color: AppColors.accentGreen, size: 14),
                                SizedBox(width: 6),
                                Text("Найти пробелы", style: TextStyle(color: AppColors.accentGreen, fontWeight: FontWeight.bold, fontSize: 12)),
                              ],
                            ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: CupertinoButton(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      color: AppColors.accentGreen,
                      borderRadius: BorderRadius.circular(10),
                      onPressed: _isMergingAnswers ? null : _mergeGapAnswers,
                      child: _isMergingAnswers
                          ? const CupertinoActivityIndicator(color: Colors.black)
                          : const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(CupertinoIcons.checkmark_alt, color: Colors.black, size: 16),
                                SizedBox(width: 4),
                                Text("Вшить ответы в базу", style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 12)),
                              ],
                            ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        if (_isLoadingGapQuestions)
          const Padding(
            padding: EdgeInsets.all(32),
            child: Center(
              child: Column(
                children: [
                  CupertinoActivityIndicator(color: AppColors.accentGreen, radius: 14),
                  SizedBox(height: 12),
                  Text("Gemini ищет пробелы в регламенте...", style: TextStyle(color: Colors.white54, fontSize: 12)),
                ],
              ),
            ),
          )
        else if (_gapQuestions.isEmpty)
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.macosDivider),
            ),
            child: Center(
              child: Column(
                children: [
                  const Icon(CupertinoIcons.checkmark_seal_fill, color: AppColors.accentGreen, size: 36),
                  const SizedBox(height: 10),
                  const Text("База знаний полностью укомплектована!", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                  const SizedBox(height: 4),
                  const Text("Нажмите «Найти пробелы» для более глубокого анализа.", style: TextStyle(color: Colors.white54, fontSize: 11)),
                  const SizedBox(height: 12),
                  CupertinoButton(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(10),
                    onPressed: _loadGapInterviewQuestions,
                    child: const Text("🔍 Провести аудит регламентов", style: TextStyle(color: AppColors.accentGreen, fontSize: 12)),
                  ),
                ],
              ),
            ),
          )
        else
          ..._gapQuestions.map((q) => _buildGapQuestionCard(q)),

        const SizedBox(height: 20),

        // Freeform Knowledge Ingestion
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.macosDivider),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(CupertinoIcons.pencil_ellipsis_rectangle, color: AppColors.accentTeal, size: 18),
                  SizedBox(width: 8),
                  Text("Свободное добавление информации (без шаблонов)", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                ],
              ),
              const SizedBox(height: 6),
              const Text(
                "Вставьте любой скопированный регламент, чат с клиентом или заметку. Gemini органично встроит факты в нужные разделы Мастер-Документа.",
                style: TextStyle(color: Colors.white54, fontSize: 11),
              ),
              const SizedBox(height: 10),
              CupertinoTextField(
                controller: _freeformKnowledgeCtrl,
                maxLines: 4,
                placeholder: "Вставьте скопированный текст...",
                style: const TextStyle(color: Colors.white, fontSize: 12.5),
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white12),
                ),
              ),
              const SizedBox(height: 10),
              Align(
                alignment: Alignment.centerRight,
                child: CupertinoButton(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  color: AppColors.accentTeal,
                  borderRadius: BorderRadius.circular(10),
                  onPressed: _isFreeformIngesting ? null : _ingestFreeformKnowledge,
                  child: _isFreeformIngesting
                      ? const CupertinoActivityIndicator(color: Colors.black)
                      : const Text("Интегрировать в документ", style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 12)),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildGapQuestionCard(Map<String, dynamic> q) {
    final qId = q['id'] as String? ?? '';
    final category = q['category'] as String? ?? 'Регламент';
    final question = q['question'] as String? ?? '';
    final hint = q['hint'] as String? ?? '';
    final suggested = (q['suggested'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];

    final ctrl = _gapAnswerControllers[qId];

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.accentTeal.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(category.toUpperCase(), style: const TextStyle(color: AppColors.accentTeal, fontSize: 10, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(question, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13.5)),
          if (hint.isNotEmpty) ...[
            const SizedBox(height: 3),
            Text(hint, style: const TextStyle(color: Colors.white54, fontSize: 11)),
          ],
          if (suggested.isNotEmpty) ...[
            const SizedBox(height: 8),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: suggested.map((s) {
                  return Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: GestureDetector(
                      onTap: () {
                        if (ctrl != null) {
                          setState(() => ctrl.text = s);
                        }
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.35),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.white12),
                        ),
                        child: Text("💡 $s", style: const TextStyle(color: Colors.white70, fontSize: 11)),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ],
          const SizedBox(height: 8),
          CupertinoTextField(
            controller: ctrl,
            placeholder: "Введите ответ заведения...",
            style: const TextStyle(color: Colors.white, fontSize: 12.5),
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.4),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: Colors.white12),
            ),
          ),
        ],
      ),
    );
  }

  // =========================================================================
  // SUBTAB 2: ТЕСТОВАЯ ПЕСОЧНИЦА (SANDBOX CHAT)
  // =========================================================================

  Widget _buildSandboxChatTab() {
    return Column(
      children: [
        // Quick Scenario Chips Bar
        Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          color: AppColors.surface.withValues(alpha: 0.95),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                _buildScenarioChip("🛂 Оверстей 5 дней: возьмете?"),
                _buildScenarioChip("📍 Откуда выезд и заберете от отеля?"),
                _buildScenarioChip("💰 Что входит в VIP за 3 800 ฿?"),
                _buildScenarioChip("📄 Фото и требования к паспорту"),
                _buildScenarioChip("📅 Бронь 2 мест на завтра"),
              ],
            ),
          ),
        ),

        // Chat message list
        Expanded(
          child: ListView.builder(
            controller: _chatScrollCtrl,
            padding: const EdgeInsets.all(16),
            itemCount: _chatMessages.length,
            itemBuilder: (context, index) {
              final msg = _chatMessages[index];
              final isUser = msg['role'] == 'user';
              final text = msg['text'] ?? '';
              final citation = msg['citation'];

              return Align(
                alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                child: Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isUser ? AppColors.accentTeal.withValues(alpha: 0.25) : AppColors.surface,
                    borderRadius: BorderRadius.circular(16).copyWith(
                      bottomRight: isUser ? const Radius.circular(0) : const Radius.circular(16),
                      bottomLeft: !isUser ? const Radius.circular(0) : const Radius.circular(16),
                    ),
                    border: Border.all(
                      color: isUser ? AppColors.accentTeal.withValues(alpha: 0.4) : AppColors.macosDivider,
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            isUser ? CupertinoIcons.person_fill : CupertinoIcons.sparkles,
                            size: 12,
                            color: isUser ? AppColors.accentTeal : AppColors.accentGreen,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            isUser ? "Клиент" : "AI-Консьерж",
                            style: TextStyle(
                              color: isUser ? AppColors.accentTeal : AppColors.accentGreen,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        text,
                        style: const TextStyle(color: Colors.white, fontSize: 13, height: 1.35),
                      ),
                      if (!isUser && citation != null && citation.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.3),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text("📖 $citation", style: const TextStyle(color: Colors.white54, fontSize: 10)),
                        ),
                        const SizedBox(height: 6),
                        GestureDetector(
                          onTap: () => _openRuleCorrectionDialog(text),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(CupertinoIcons.pencil, size: 12, color: Colors.amberAccent),
                              SizedBox(width: 4),
                              Text("Скорректировать правило", style: TextStyle(color: Colors.amberAccent, fontSize: 11, fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              );
            },
          ),
        ),

        // Typing indicator
        if (_isChatReplying)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: const Row(
              children: [
                CupertinoActivityIndicator(color: AppColors.accentGreen, radius: 8),
                SizedBox(width: 8),
                Text("AI-Консьерж сверяется с регламентом...", style: TextStyle(color: Colors.white54, fontSize: 11)),
              ],
            ),
          ),

        // Chat Input Bar
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.surface,
            border: Border(top: BorderSide(color: AppColors.macosDivider)),
          ),
          child: SafeArea(
            top: false,
            child: Row(
              children: [
                Expanded(
                  child: CupertinoTextField(
                    controller: _chatInputCtrl,
                    placeholder: "Задайте вопрос консьержу...",
                    style: const TextStyle(color: Colors.white, fontSize: 13),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.4),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white24),
                    ),
                    onSubmitted: (val) => _sendSandboxMessage(val),
                  ),
                ),
                const SizedBox(width: 8),
                CupertinoButton(
                  padding: const EdgeInsets.all(10),
                  color: AppColors.accentGreen,
                  borderRadius: BorderRadius.circular(20),
                  onPressed: () => _sendSandboxMessage(_chatInputCtrl.text),
                  child: const Icon(CupertinoIcons.arrow_up, color: Colors.black, size: 16),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildScenarioChip(String text) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: () => _sendSandboxMessage(text),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.4),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.accentTeal.withValues(alpha: 0.4)),
          ),
          child: Text(text, style: const TextStyle(color: AppColors.accentTeal, fontSize: 11, fontWeight: FontWeight.w500)),
        ),
      ),
    );
  }
}
