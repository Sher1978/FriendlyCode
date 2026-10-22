import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:friendly_code/core/services/direct_services_scraper_service.dart';
import 'package:friendly_code/core/theme/colors.dart';

class SmartServicesOnboardingDialog extends StatefulWidget {
  final Function(ScrapedServiceData data) onApply;

  const SmartServicesOnboardingDialog({
    super.key,
    required this.onApply,
  });

  @override
  State<SmartServicesOnboardingDialog> createState() => _SmartServicesOnboardingDialogState();
}

class _SmartServicesOnboardingDialogState extends State<SmartServicesOnboardingDialog> {
  final TextEditingController _urlCtrl = TextEditingController();
  final Map<String, TextEditingController> _questionControllers = {};

  bool _isLoading = false;
  String _loadingStatus = '';
  String? _errorMessage;
  ScrapedServiceData? _scrapedData;

  @override
  void dispose() {
    _urlCtrl.dispose();
    for (var ctrl in _questionControllers.values) {
      ctrl.dispose();
    }
    super.dispose();
  }

  void _loadDemoData() {
    _urlCtrl.text = "https://pattaya-borderrun.example.com";
    final demoText = """
Pattaya VIP Border Run & Visa Services
Комфортабельные ежедневные бордер-раны и виза-раны из Паттайи в Камбоджу (КПП Ban Laem / Poipet) и Малайзию (Пенанг).
Тел / WhatsApp: +66 82 123 4567
Адрес сбора: Паттайя, Central Festival & бесплатный пикап из отелей в центре.
Цены и маршруты:
1. Бордер-ран в Камбоджу (Базовый пакет) — 2 900 ฿ (выезд в 06:00, включен трансфер, пограничные сборы, вип-коридор без очередей, обед).
2. Бордер-ран в Камбоджу (VIP Экстра) — 3 800 ฿ (забор от кондо, индивидуальное прохождение, напитки и штамп на 60 дней).
3. Виза-ран в Пенанг (Малайзия) 2 дня / 1 ночь — 7 500 ฿ (отель 4*, сопровождение в консульство, питание).
Требования к документам:
Загранпаспорт со сроком действия от 6 месяцев, минимум 2 чистые страницы, 2 цветных фото 3x4 см. Лица с оверстеем до 7 дней оплачивают официальный штраф 500 бат/день на границе.
Удобства: Новые минивэны Toyota Commuter с кондиционером, питьевой водой и Wi-Fi.
    """;
    _runAnalysisWithText(demoText, originalUrl: _urlCtrl.text);
  }

  Future<void> _startScrape() async {
    final input = _urlCtrl.text.trim();
    if (input.isEmpty) {
      setState(() => _errorMessage = "Введите ссылку или текст для анализа");
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _loadingStatus = "1. Загрузка контента страницы...";
    });

    try {
      String rawText = input;
      if (input.startsWith('http://') || input.startsWith('https://')) {
        rawText = await DirectServicesScraperService.fetchRawContent(input);
      }

      await _runAnalysisWithText(rawText, originalUrl: input);
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = "Ошибка анализа: $e";
      });
    }
  }

  Future<void> _runAnalysisWithText(String rawText, {String originalUrl = ''}) async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _loadingStatus = "2. Gemini AI извлекает маршруты, цены, правила и FAQ...";
    });

    try {
      final data = await DirectServicesScraperService.extractServicesWithGemini(rawText, originalUrl: originalUrl);

      // Initialize question controllers with suggested answers
      _questionControllers.clear();
      for (final q in data.smartConfirmationQuestions) {
        final id = q['id']?.toString() ?? 'q';
        final suggested = q['suggestedAnswer']?.toString() ?? '';
        _questionControllers[id] = TextEditingController(text: suggested);
      }

      setState(() {
        _scrapedData = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = "Ошибка извлечения Gemini: $e";
      });
    }
  }

  void _applyResult() {
    if (_scrapedData == null) return;

    // Merge owner's confirmed answers into AI Knowledge
    final updatedAiKnowledge = Map<String, dynamic>.from(_scrapedData!.aiKnowledge);
    for (final entry in _questionControllers.entries) {
      final qId = entry.key;
      final answer = entry.value.text.trim();
      if (qId.contains('pickup')) {
        updatedAiKnowledge['parkingOrPickup'] = answer;
      } else if (qId.contains('overstay') || qId.contains('rules')) {
        updatedAiKnowledge['rulesAndPolicies'] = "${updatedAiKnowledge['rulesAndPolicies'] ?? ''}\n$answer";
      }
    }

    final finalData = ScrapedServiceData(
      venue: _scrapedData!.venue,
      services: _scrapedData!.services,
      staff: _scrapedData!.staff,
      yieldRules: _scrapedData!.yieldRules,
      aiKnowledge: updatedAiKnowledge,
      smartConfirmationQuestions: _scrapedData!.smartConfirmationQuestions,
    );

    widget.onApply(finalData);
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: AppColors.surface,
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
        side: const BorderSide(color: AppColors.accentTeal, width: 1.5),
      ),
      child: Container(
        width: 720,
        constraints: const BoxConstraints(maxHeight: 780),
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.accentTeal.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(CupertinoIcons.sparkles, color: AppColors.accentTeal, size: 24),
                ),
                const SizedBox(width: 14),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Умный AI-онбординг сервисного заведения",
                        style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      SizedBox(height: 2),
                      Text(
                        "Автоматический сбор данных с Google Maps или сайта и обучение AI-Консьержа",
                        style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(CupertinoIcons.xmark, color: Colors.white54, size: 20),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const SizedBox(height: 18),
            const Divider(color: AppColors.macosDivider, height: 1),
            const SizedBox(height: 18),

            // Main Body
            Expanded(
              child: _isLoading
                  ? _buildLoadingState()
                  : _scrapedData != null
                      ? _buildResultAndInterviewState()
                      : _buildInputState(),
            ),

            const SizedBox(height: 16),

            // Footer Actions
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                CupertinoButton(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: const Text("Отмена", style: TextStyle(color: Colors.white54, fontSize: 14)),
                  onPressed: () => Navigator.of(context).pop(),
                ),
                const SizedBox(width: 10),
                if (_scrapedData != null && !_isLoading)
                  CupertinoButton.filled(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    onPressed: _applyResult,
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(CupertinoIcons.checkmark_alt, size: 18),
                        SizedBox(width: 8),
                        Text("Применить и заполнить карточку", style: TextStyle(fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInputState() {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "Вставьте ссылку на Google Maps, сайт или описание",
            style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 6),
          const Text(
            "AI загрузит страницу, найдет все направления/услуги, цены, расписание и требования к клиентам.",
            style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 12),
          ),
          const SizedBox(height: 12),
          CupertinoTextField(
            controller: _urlCtrl,
            placeholder: "https://maps.app.goo.gl/... или https://my-borderrun.com",
            placeholderStyle: TextStyle(color: Colors.white.withValues(alpha: 0.25), fontSize: 13),
            style: const TextStyle(color: Colors.white, fontSize: 13),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.macosDivider),
            ),
          ),
          const SizedBox(height: 12),

          // Quick Presets
          Row(
            children: [
              const Text("Быстрый пример:", style: TextStyle(color: Colors.white38, fontSize: 11)),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: _loadDemoData,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.accentTeal.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.accentTeal.withValues(alpha: 0.3)),
                  ),
                  child: const Text("🇹🇭 Тест: Бордер-ран Паттайя (VIP)", style: TextStyle(color: AppColors.accentTeal, fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),

          if (_errorMessage != null) ...[
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.redAccent.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.redAccent.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  const Icon(CupertinoIcons.exclamationmark_triangle_fill, color: Colors.redAccent, size: 16),
                  const SizedBox(width: 8),
                  Expanded(child: Text(_errorMessage!, style: const TextStyle(color: Colors.redAccent, fontSize: 12))),
                ],
              ),
            ),
          ],

          const SizedBox(height: 24),

          Center(
            child: CupertinoButton(
              color: AppColors.accentTeal,
              padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
              onPressed: _startScrape,
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(CupertinoIcons.bolt_fill, color: Colors.black, size: 18),
                  SizedBox(width: 8),
                  Text("Проанализировать и обучить ИИ", style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 14)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLoadingState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CupertinoActivityIndicator(color: AppColors.accentTeal, radius: 18),
          const SizedBox(height: 20),
          Text(
            _loadingStatus,
            style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          const Text(
            "Gemini синтезирует цифровой паспорт и формирует точечный опрос для владельца...",
            style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 12),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildResultAndInterviewState() {
    final v = _scrapedData!.venue;
    final services = _scrapedData!.services;
    final questions = _scrapedData!.smartConfirmationQuestions;

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Success Banner
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.accentGreen.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.accentGreen.withValues(alpha: 0.3)),
            ),
            child: Row(
              children: [
                const Icon(CupertinoIcons.checkmark_seal_fill, color: AppColors.accentGreen, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    "ИИ успешно извлек профиль заведения, ${services.length} направлений/услуг и сформировал базу знаний!",
                    style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // 2. Extracted Identity
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.macosDivider),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        v['name'] ?? 'Без названия',
                        style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.accentTeal.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        v['category'] ?? 'Услуги',
                        style: const TextStyle(color: AppColors.accentTeal, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  v['description'] ?? '',
                  style: const TextStyle(color: AppColors.macosTextSecondary, fontSize: 12, height: 1.3),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    if (v['currency'] != null) ...[
                      const Icon(CupertinoIcons.money_dollar_circle, color: AppColors.accentOrange, size: 14),
                      const SizedBox(width: 4),
                      Text("Валюта: ${v['currency']}", style: const TextStyle(color: Colors.white70, fontSize: 11)),
                      const SizedBox(width: 16),
                    ],
                    if (v['phone'] != null && v['phone'].toString().isNotEmpty) ...[
                      const Icon(CupertinoIcons.phone, color: AppColors.accentGreen, size: 14),
                      const SizedBox(width: 4),
                      Text(v['phone'], style: const TextStyle(color: Colors.white70, fontSize: 11)),
                    ],
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // 3. Extracted Services / Routes
          const Text("Найденные услуги и направления:", style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          ...services.map((s) => Container(
                margin: const EdgeInsets.only(bottom: 6),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.04),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
                ),
                child: Row(
                  children: [
                    const Icon(CupertinoIcons.arrow_right_circle_fill, color: AppColors.accentTeal, size: 14),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        s['title'] ?? '',
                        style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                    ),
                    Text(
                      "${s['price']} ${v['currency'] ?? ''}",
                      style: const TextStyle(color: AppColors.accentOrange, fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              )),

          const SizedBox(height: 20),

          // 4. Smart Blitz Interview Section
          if (questions.isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.accentTeal.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.accentTeal.withValues(alpha: 0.25)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(CupertinoIcons.chat_bubble_2_fill, color: AppColors.accentTeal, size: 16),
                      SizedBox(width: 8),
                      Text(
                        "Умный блиц-опрос: подтверждение нюансов",
                        style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    "ИИ изучил информацию и сформулировал вопросы на подтверждение деталей, которых не было на сайте.",
                    style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 11),
                  ),
                  const SizedBox(height: 14),
                  ...questions.map((q) {
                    final id = q['id']?.toString() ?? '';
                    final ctrl = _questionControllers[id];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            q['question'] ?? '',
                            style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                          ),
                          if (q['context'] != null) ...[
                            const SizedBox(height: 2),
                            Text(
                              q['context'],
                              style: const TextStyle(color: AppColors.accentTeal, fontSize: 10),
                            ),
                          ],
                          const SizedBox(height: 6),
                          if (ctrl != null)
                            CupertinoTextField(
                              controller: ctrl,
                              style: const TextStyle(color: Colors.white, fontSize: 12),
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: Colors.black.withValues(alpha: 0.4),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: AppColors.macosDivider),
                              ),
                            ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
