import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:file_picker/file_picker.dart';
import 'package:friendly_code/core/models/services/index.dart';
import 'package:friendly_code/core/services/continuous_knowledge_service.dart';
import 'package:friendly_code/core/theme/colors.dart';

class AiConciergeConfigScreen extends StatefulWidget {
  final String venueId;
  const AiConciergeConfigScreen({super.key, required this.venueId});

  @override
  State<AiConciergeConfigScreen> createState() => _AiConciergeConfigScreenState();
}

class _AiConciergeConfigScreenState extends State<AiConciergeConfigScreen> {
  int _selectedTab = 0; // 0 = Цифровой паспорт, 1 = База знаний (RAG)
  bool _isLoading = true;
  bool _isSaving = false;

  // Analysis overlay state
  bool _isAnalyzing = false;
  String _analyzingStatus = '';

  // Filter for knowledge docs
  String _selectedCategory = 'all';

  final _parkingCtrl = TextEditingController();
  final _petPolicyCtrl = TextEditingController();
  final _specialCtrl = TextEditingController();
  String _toneOfVoice = 'respectful_formal';

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  @override
  void dispose() {
    _parkingCtrl.dispose();
    _petPolicyCtrl.dispose();
    _specialCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadProfile() async {
    setState(() => _isLoading = true);
    try {
      final doc = await FirebaseFirestore.instance
          .collection('venues')
          .doc(widget.venueId)
          .collection('ai_knowledge')
          .doc('profile')
          .get();

      if (doc.exists && doc.data() != null) {
        final p = AiKnowledgeProfile.fromMap(doc.data()!, doc.id);
        setState(() {
          _parkingCtrl.text = p.parkingInstructions;
          _petPolicyCtrl.text = p.petPolicy;
          _specialCtrl.text = p.specialInstructions;
          _toneOfVoice = p.toneOfVoice;
          _isLoading = false;
        });
      } else {
        setState(() => _isLoading = false);
      }
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _saveProfile() async {
    setState(() => _isSaving = true);
    try {
      await FirebaseFirestore.instance
          .collection('venues')
          .doc(widget.venueId)
          .collection('ai_knowledge')
          .doc('profile')
          .set({
        'venueId': widget.venueId,
        'toneOfVoice': _toneOfVoice,
        'parkingInstructions': _parkingCtrl.text.trim(),
        'petPolicy': _petPolicyCtrl.text.trim(),
        'specialInstructions': _specialCtrl.text.trim(),
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Цифровой паспорт сохранен!"), backgroundColor: AppColors.accentGreen),
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

  // --- MULTIMODAL INGESTION ACTIONS ---

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
        _analyzingStatus = "Gemini 2.5 Flash анализирует файл «${file.name}» и извлекает правила...";
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
          CupertinoDialogAction(
            child: const Text("Отмена"),
            onPressed: () => Navigator.pop(ctx, false),
          ),
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
        _analyzingStatus = "Сохранение ${extracted.facts.length} фактов в базу знаний...";
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
                placeholder: "Название заметки (например: 'Обновление сборов в Камбодже')",
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
          CupertinoDialogAction(
            child: const Text("Отмена"),
            onPressed: () => Navigator.pop(ctx, false),
          ),
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
            0: Padding(padding: EdgeInsets.symmetric(horizontal: 8), child: Text("Цифровой паспорт", style: TextStyle(fontSize: 12))),
            1: Padding(padding: EdgeInsets.symmetric(horizontal: 8), child: Text("База знаний (RAG)", style: TextStyle(fontSize: 12))),
          },
          onValueChanged: (v) => setState(() => _selectedTab = v ?? 0),
        ),
        trailing: _selectedTab == 0
            ? CupertinoButton(
                padding: EdgeInsets.zero,
                onPressed: _isSaving ? null : _saveProfile,
                child: _isSaving
                    ? const CupertinoActivityIndicator(color: AppColors.accentGreen)
                    : const Text("Сохранить", style: TextStyle(color: AppColors.accentGreen, fontWeight: FontWeight.bold, fontSize: 14)),
              )
            : null,
      ),
      body: Stack(
        children: [
          _isLoading
              ? const Center(child: CupertinoActivityIndicator(color: AppColors.accentGreen))
              : _selectedTab == 0
                  ? _buildPassportTab()
                  : _buildKnowledgeHubTab(),

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

  // --- TAB 1: PASSPORT & TELEGRAM DISPATCHER ---

  Widget _buildPassportTab() {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
      children: [
        // Status Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.accentGreen.withValues(alpha: 0.3)),
          ),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: AppColors.accentGreen.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(CupertinoIcons.chat_bubble_2_fill, color: AppColors.accentGreen, size: 24),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "AI-Консьерж активен 24/7",
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      "Консультирует строго по загруженным регламентам",
                      style: TextStyle(color: Colors.white.withValues(alpha: 0.4), fontSize: 12),
                    ),
                  ],
                ),
              ),
              Container(
                width: 10,
                height: 10,
                decoration: const BoxDecoration(
                  color: AppColors.accentGreen,
                  shape: BoxShape.circle,
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 20),

        // HITL Telegram Dispatcher Card
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
                      color: const Color(0xFF2AABEE).withValues(alpha: 0.3),
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
                          "Human-in-the-Loop & Самообучение в Telegram",
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                        SizedBox(height: 2),
                        Text(
                          "Подтверждение броней в 1 клик + бот учится на ответах диспетчера",
                          style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.85),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.macosDivider),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: SelectableText(
                        "https://t.me/revoogiftx_bot?start=mgr_${widget.venueId}",
                        style: const TextStyle(color: Color(0xFF2AABEE), fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ),
                    CupertinoButton(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      color: const Color(0xFF2AABEE).withValues(alpha: 0.3),
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: "https://t.me/revoogiftx_bot?start=mgr_${widget.venueId}"));
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text("Ссылка для диспетчера скопирована!"), backgroundColor: Color(0xFF2AABEE)),
                        );
                      },
                      child: const Text("Копировать", style: TextStyle(color: Color(0xFF2AABEE), fontSize: 12, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                "Привяжите диспетчера по этой ссылке. При сложных вопросах делайте Reply (Ответить) в Telegram — бот сразу сохранит ответ в базу знаний!",
                style: TextStyle(color: Colors.white54, fontSize: 11, height: 1.3),
              ),
            ],
          ),
        ),

        const SizedBox(height: 24),

        // Section 1: Tone of Voice
        const Text("Тон общения с клиентами", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 8),
        CupertinoSegmentedControl<String>(
          children: const {
            'respectful_formal': Padding(padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8), child: Text("На «вы» (уважительно)")),
            'friendly_informal': Padding(padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8), child: Text("На «ты» (по-дружески)")),
          },
          groupValue: _toneOfVoice,
          onValueChanged: (val) => setState(() => _toneOfVoice = val),
        ),

        const SizedBox(height: 24),

        // Section 2: Parking / Pickup instructions
        const Text("Точка сбора / Парковка", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 4),
        Text("AI будет сообщать это гостям при вопросах о точке отправления", style: TextStyle(color: Colors.white.withValues(alpha: 0.4), fontSize: 11)),
        const SizedBox(height: 8),
        CupertinoTextField(
          controller: _parkingCtrl,
          maxLines: 2,
          placeholder: "Например: Главный сбор у ТЦ Central Pattaya (выход к пляжу в 05:30 утра)...",
          style: const TextStyle(color: Colors.white, fontSize: 13),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.white12),
          ),
        ),

        const SizedBox(height: 20),

        // Section 3: Pet policy & Rules
        const Text("Правила багажа, питомцев и опозданий", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 8),
        CupertinoTextField(
          controller: _petPolicyCtrl,
          maxLines: 2,
          placeholder: "Например: С животными строго по согласованию. Ручная кладь до 7 кг бесплатно...",
          style: const TextStyle(color: Colors.white, fontSize: 13),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.white12),
          ),
        ),

        const SizedBox(height: 20),

        // Section 4: Special notes & Hospitality
        const Text("Дополнительный сервис и напитки", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 8),
        CupertinoTextField(
          controller: _specialCtrl,
          maxLines: 2,
          placeholder: "Например: Бутилированная вода и Wi-Fi в минивэне бесплатно...",
          style: const TextStyle(color: Colors.white, fontSize: 13),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.white12),
          ),
        ),
      ],
    );
  }

  // --- TAB 2: CONTINUOUS MULTIMODAL KNOWLEDGE HUB (RAG) ---

  Widget _buildKnowledgeHubTab() {
    return Column(
      children: [
        // Action Hub & Upload Buttons
        Container(
          padding: const EdgeInsets.all(16),
          color: AppColors.surface.withValues(alpha: 0.95),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(CupertinoIcons.sparkles, color: AppColors.accentGreen, size: 18),
                  const SizedBox(width: 8),
                  const Text(
                    "Мультимодальное обучение 24/7",
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  const Spacer(),
                  // Sources count badge
                  StreamBuilder<QuerySnapshot>(
                    stream: FirebaseFirestore.instance
                        .collection('venues')
                        .doc(widget.venueId)
                        .collection('knowledge_docs')
                        .snapshots(),
                    builder: (context, snap) {
                      final count = snap.hasData ? snap.data!.docs.length : 0;
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.accentGreen.withValues(alpha: 0.3),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.accentGreen.withValues(alpha: 0.3)),
                        ),
                        child: Text(
                          "$count правил активно",
                          style: const TextStyle(color: AppColors.accentGreen, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      );
                    },
                  ),
                ],
              ),
              const SizedBox(height: 6),
              const Text(
                "Загружайте PDF-регламенты, фото расписаний, ссылки или заметки. Агент сразу выучит их.",
                style: TextStyle(color: Colors.white60, fontSize: 12),
              ),
              const SizedBox(height: 14),

              // Action buttons row
              Row(
                children: [
                  Expanded(
                    child: CupertinoButton(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(12),
                      onPressed: _handleUploadFile,
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(CupertinoIcons.doc_text_fill, color: Colors.blueAccent, size: 16),
                          SizedBox(width: 6),
                          Text("Файл (PDF/Фото)", style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: CupertinoButton(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(12),
                      onPressed: _handleAddLink,
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(CupertinoIcons.link, color: AppColors.accentGreen, size: 16),
                          SizedBox(width: 6),
                          Text("Ссылка", style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: CupertinoButton(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(12),
                      onPressed: _handleAddNote,
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(CupertinoIcons.pencil_outline, color: Colors.amberAccent, size: 16),
                          SizedBox(width: 6),
                          Text("Заметка", style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),

        // Category filter chips
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: Row(
            children: [
              _buildFilterChip('all', 'Все'),
              _buildFilterChip('visa_rules', 'Визы & Граница'),
              _buildFilterChip('routes_and_stops', 'Маршруты'),
              _buildFilterChip('overstay', 'Оверстей'),
              _buildFilterChip('pricing_and_payment', 'Цены'),
              _buildFilterChip('auto_learned', '🤖 Из Telegram'),
            ],
          ),
        ),

        // Rules Stream
        Expanded(
          child: StreamBuilder<QuerySnapshot>(
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
                return Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(CupertinoIcons.tray, color: Colors.white.withValues(alpha: 0.4), size: 48),
                        const SizedBox(height: 12),
                        const Text(
                          "В этой категории пока нет правил",
                          style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          "Загрузите PDF, картинку или ссылку выше, чтобы накормить агента знаниями.",
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.white38, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                );
              }

              return ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                itemCount: filtered.length,
                separatorBuilder: (context, index) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final doc = filtered[index];
                  final data = doc.data() as Map<String, dynamic>;
                  return _buildKnowledgeCard(doc.id, data);
                },
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildFilterChip(String key, String label) {
    final isSelected = _selectedCategory == key;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: () => setState(() => _selectedCategory = key),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.accentGreen.withValues(alpha: 0.3) : AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isSelected ? AppColors.accentGreen : AppColors.macosDivider,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: isSelected ? AppColors.accentGreen : Colors.white70,
              fontSize: 12,
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
    final sourceType = data['sourceType'] as String? ?? 'text';
    final sourceTitle = data['sourceTitle'] as String? ?? '';
    final active = data['active'] as bool? ?? true;
    final isAutoLearned = sourceType == 'telegram_learning' || category == 'auto_learned';

    Color categoryColor = Colors.blueAccent;
    if (isAutoLearned) categoryColor = const Color(0xFF2AABEE);
    if (category == 'overstay') categoryColor = Colors.orangeAccent;
    if (category == 'pricing_and_payment') categoryColor = AppColors.accentGreen;
    if (category == 'routes_and_stops') categoryColor = Colors.cyanAccent;

    IconData sourceIcon = CupertinoIcons.doc_text_fill;
    if (sourceType == 'image') sourceIcon = CupertinoIcons.photo_fill;
    if (sourceType == 'link') sourceIcon = CupertinoIcons.link;
    if (isAutoLearned) sourceIcon = CupertinoIcons.chat_bubble_text_fill;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isAutoLearned ? const Color(0xFF2AABEE).withValues(alpha: 0.3) : AppColors.macosDivider,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: Category Badge + Source + Toggle + Delete
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: categoryColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  isAutoLearned ? "🤖 ИЗ TELEGRAM" : category.toUpperCase(),
                  style: TextStyle(color: categoryColor, fontSize: 10, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(width: 8),
              Icon(sourceIcon, size: 12, color: Colors.white54),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  sourceTitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white54, fontSize: 11),
                ),
              ),
              CupertinoSwitch(
                value: active,
                activeTrackColor: AppColors.accentGreen,
                onChanged: (val) => ContinuousKnowledgeService.toggleKnowledgeDoc(widget.venueId, docId, active),
              ),
              const SizedBox(width: 4),
              GestureDetector(
                onTap: () async {
                  final ok = await showCupertinoDialog<bool>(
                    context: context,
                    builder: (ctx) => CupertinoAlertDialog(
                      title: const Text("Удалить правило?"),
                      content: const Text("AI-консьерж больше не будет использовать это правило при ответах."),
                      actions: [
                        CupertinoDialogAction(child: const Text("Отмена"), onPressed: () => Navigator.pop(ctx, false)),
                        CupertinoDialogAction(
                          isDestructiveAction: true,
                          child: const Text("Удалить"),
                          onPressed: () => Navigator.pop(ctx, true),
                        ),
                      ],
                    ),
                  );
                  if (ok == true) {
                    await ContinuousKnowledgeService.deleteKnowledgeDoc(widget.venueId, docId);
                  }
                },
                child: const Icon(CupertinoIcons.trash, size: 16, color: Colors.white30),
              ),
            ],
          ),

          const SizedBox(height: 10),

          // Question
          Text(
            question,
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
          ),

          const SizedBox(height: 6),

          // Answer
          Text(
            answer,
            style: const TextStyle(color: Colors.white70, fontSize: 13, height: 1.35),
          ),

          // Critical note if present
          if (criticalNote != null && criticalNote.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.amber.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.amber.withValues(alpha: 0.15)),
              ),
              child: Row(
                children: [
                  const Icon(CupertinoIcons.exclamationmark_triangle_fill, color: Colors.amberAccent, size: 14),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      criticalNote,
                      style: const TextStyle(color: Colors.amberAccent, fontSize: 11, fontWeight: FontWeight.w500),
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
}
