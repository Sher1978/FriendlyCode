import 'dart:ui';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:friendly_code/l10n/app_localizations.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class RulesConfigScreen extends StatefulWidget {
  final String? venueId;
  const RulesConfigScreen({super.key, this.venueId});

  @override
  State<RulesConfigScreen> createState() => _RulesConfigScreenState();
}

class _RulesConfigScreenState extends State<RulesConfigScreen> {
  bool _isLoading = true;
  VenueModel? _venue;

  final _vipWindowCtrl = TextEditingController();
  final _degradationIntervalCtrl = TextEditingController();
  final _resetIntervalCtrl = TextEditingController();
  final _percBaseCtrl = TextEditingController();
  final _percVipCtrl = TextEditingController();
  final _percMediumCtrl = TextEditingController();
  final _mediumDaysCtrl = TextEditingController();
  final _percDepositCtrl = TextEditingController();
  final _depositThresholdCtrl = TextEditingController();
  final _googleReviewDaysCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadVenue();
  }

  @override
  void dispose() {
    _vipWindowCtrl.dispose();
    _degradationIntervalCtrl.dispose();
    _resetIntervalCtrl.dispose();
    _percBaseCtrl.dispose();
    _percVipCtrl.dispose();
    _percMediumCtrl.dispose();
    _mediumDaysCtrl.dispose();
    _percDepositCtrl.dispose();
    _depositThresholdCtrl.dispose();
    _googleReviewDaysCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadVenue() async {
    if (widget.venueId == null) {
      if (mounted) setState(() => _isLoading = false);
      return;
    }

    try {
      final doc = await FirebaseFirestore.instance.collection('venues').doc(widget.venueId).get();
      if (doc.exists) {
        _venue = VenueModel.fromMap(doc.id, doc.data()!);
        final config = _venue!.loyaltyConfig;
        
        _vipWindowCtrl.text = config.vipWindowDays.toString();
        _degradationIntervalCtrl.text = config.degradationIntervalDays.toString();
        _resetIntervalCtrl.text = config.resetIntervalDays.toString();
        _percBaseCtrl.text = config.percBase.toString();
        _percVipCtrl.text = config.percVip.toString();
        _percDepositCtrl.text = config.percDeposit.toString();
        _depositThresholdCtrl.text = config.depositThreshold.toStringAsFixed(0);
        _googleReviewDaysCtrl.text = config.googleReviewRewardDays.toString();

        final mediumStage = config.decayStages.isNotEmpty ? config.decayStages[0] : const LoyaltyDecayStage(days: 7, discount: 15);
        _percMediumCtrl.text = mediumStage.discount.toString();
        _mediumDaysCtrl.text = mediumStage.days.toString();
      }
    } catch (e) {
      debugPrint("Error loading rules: $e");
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _saveConfig() async {
    if (widget.venueId == null || _venue == null) return;
    
    final List<LoyaltyDecayStage> parsedStages = [
      LoyaltyDecayStage(
        days: int.tryParse(_mediumDaysCtrl.text) ?? 7,
        discount: int.tryParse(_percMediumCtrl.text) ?? 15,
      )
    ];

    final updatedConfig = LoyaltyConfig(
      vipWindowDays: int.tryParse(_vipWindowCtrl.text) ?? 1,
      degradationIntervalDays: int.tryParse(_degradationIntervalCtrl.text) ?? 7,
      resetIntervalDays: int.tryParse(_resetIntervalCtrl.text) ?? 30,
      percBase: int.tryParse(_percBaseCtrl.text) ?? 5,
      percVip: int.tryParse(_percVipCtrl.text) ?? 20,
      percDeposit: int.tryParse(_percDepositCtrl.text) ?? 25,
      depositThreshold: double.tryParse(_depositThresholdCtrl.text) ?? 1000000.0,
      googleReviewRewardDays: int.tryParse(_googleReviewDaysCtrl.text) ?? 7,
      decayStages: parsedStages,
    );

    try {
      final depositTiersSnap = await FirebaseFirestore.instance
          .collection('deposit_tiers')
          .where('venueId', isEqualTo: widget.venueId)
          .get();
      final existingLevels = depositTiersSnap.docs.map((doc) => doc.data()['tierLevel'] ?? doc.data()['tier_level']).toSet();

      final batch = FirebaseFirestore.instance.batch();

      // Update venue loyaltyConfig
      batch.update(FirebaseFirestore.instance.collection('venues').doc(widget.venueId), {
        'loyaltyConfig': updatedConfig.toMap(),
      });

      // Synchronize deposit_tiers automatically
      for (int level = 1; level <= 4; level++) {
        final docId = "${widget.venueId}_$level";
        final docRef = FirebaseFirestore.instance.collection('deposit_tiers').doc(docId);
        
        int discount = 5;
        double defaultThreshold = 0.0;
        if (level == 1) {
          discount = updatedConfig.percDeposit;
          defaultThreshold = updatedConfig.depositThreshold;
        } else if (level == 2) {
          discount = updatedConfig.percVip;
          defaultThreshold = 0.0;
        } else if (level == 3) {
          discount = updatedConfig.decayStages.isNotEmpty ? updatedConfig.decayStages[0].discount : 15;
          defaultThreshold = 0.0;
        } else if (level == 4) {
          discount = updatedConfig.percBase;
          defaultThreshold = 0.0;
        }

        if (existingLevels.contains(level)) {
          batch.update(docRef, {
            'discountPercentage': discount,
            'discount_percentage': discount,
            'minBalanceThreshold': defaultThreshold,
            'min_balance_threshold': defaultThreshold,
            'updatedAt': FieldValue.serverTimestamp(),
          });
        } else {
          batch.set(docRef, {
            'id': docId,
            'venueId': widget.venueId,
            'venue_id': widget.venueId,
            'tierLevel': level,
            'tier_level': level,
            'minBalanceThreshold': defaultThreshold,
            'min_balance_threshold': defaultThreshold,
            'discountPercentage': discount,
            'discount_percentage': discount,
            'updatedAt': FieldValue.serverTimestamp(),
          });
        }
      }

      await batch.commit();

      if (mounted) {
        showCupertinoDialog(
          context: context,
          builder: (context) => CupertinoAlertDialog(
            title: const Text("Успешно"),
            content: const Text("Правила лояльности и 4 типа скидок успешно обновлены."),
            actions: [
              CupertinoDialogAction(child: const Text("OK"), onPressed: () => Navigator.pop(context)),
            ],
          ),
        );
      }
    } catch (e) {
      debugPrint("Error saving rules: $e");
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) return const Center(child: CupertinoActivityIndicator(radius: 12));
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        leading: CupertinoButton(
          padding: EdgeInsets.zero,
          child: const Icon(CupertinoIcons.chevron_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 800),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  "Настройка 4 типов скидок",
                  style: TextStyle(
                    color: AppColors.macosTextPrimary,
                    fontSize: 34,
                    fontWeight: FontWeight.bold,
                    letterSpacing: -1.0,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  "Управляйте процентами и сроками действия для всех 4 ступеней программы лояльности.",
                  style: TextStyle(color: AppColors.macosTextSecondary.withOpacity(0.7), fontSize: 15),
                ),
                const SizedBox(height: 48),

                _buildGlassContainer(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // 1. МИНИМАЛЬНАЯ СКИДКА
                      const Text(
                        "1. МИНИМАЛЬНАЯ СКИДКА (БЕССРОЧНАЯ)",
                        style: TextStyle(color: AppColors.accentOrange, fontWeight: FontWeight.w800, fontSize: 11, letterSpacing: 1.2),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        "Выдается при первом визите или после истечения срока действия других скидок. Действует всегда.",
                        style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 12),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(child: _buildInput("Минимальная скидка %", _percBaseCtrl)),
                          const SizedBox(width: 20),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text("Срок действия", style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 13, fontWeight: FontWeight.w600)),
                                const SizedBox(height: 10),
                                Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.05),
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: AppColors.macosDivider),
                                  ),
                                  child: const Text("Бессрочно (преднастроено)", style: TextStyle(color: Colors.white70, fontSize: 14, fontWeight: FontWeight.bold)),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      
                      const SizedBox(height: 32),

                      // 2. СРЕДНЯЯ СКИДКА
                      const Text(
                        "2. СРЕДНЯЯ СКИДКА (ЗА ВИЗИТЫ)",
                        style: TextStyle(color: AppColors.accentOrange, fontWeight: FontWeight.w800, fontSize: 11, letterSpacing: 1.2),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        "Выдается если клиент не успел прийти на следующий день, но вернулся в течение указанного срока.",
                        style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 12),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(child: _buildInput("Средняя скидка %", _percMediumCtrl)),
                          const SizedBox(width: 20),
                          Expanded(child: _buildInput("Срок действия (Дней)", _mediumDaysCtrl)),
                        ],
                      ),

                      const SizedBox(height: 32),
                      
                      // 3. МАКСИМАЛЬНАЯ СКИДКА ЗА ВИЗИТ
                      const Text(
                        "3. МАКСИМАЛЬНАЯ СКИДКА (ЗА ВИЗИТ НА СЛЕДУЮЩИЙ ДЕНЬ)",
                        style: TextStyle(color: AppColors.accentOrange, fontWeight: FontWeight.w800, fontSize: 11, letterSpacing: 1.2),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        "Выдается гостю, если он возвращается на следующий день. Мотивирует совершать повторные визиты.",
                        style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 12),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(child: _buildInput("Максимальная скидка за визит %", _percVipCtrl)),
                          const SizedBox(width: 20),
                          Expanded(child: _buildInput("Окно возврата (Дней, по умолч. 1)", _vipWindowCtrl)),
                        ],
                      ),

                      const SizedBox(height: 32),

                      // 4. САМАЯ МАКСИМАЛЬНАЯ (ДЕПОЗИТНАЯ) СКИДКА
                      const Text(
                        "4. САМАЯ МАКСИМАЛЬНАЯ СКИДКА (ЗА ДЕПОЗИТ)",
                        style: TextStyle(color: AppColors.accentOrange, fontWeight: FontWeight.w800, fontSize: 11, letterSpacing: 1.2),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        "Выдается ТОЛЬКО за внесение указанной суммы депозита. Официант делает отметку и скидка закрепляется на неопределенный срок.",
                        style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 12),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(child: _buildInput("Самая макс. скидка %", _percDepositCtrl)),
                          const SizedBox(width: 20),
                          Expanded(child: _buildInput("Сумма депозита для закрепления", _depositThresholdCtrl)),
                        ],
                      ),

                      const SizedBox(height: 32),
                      
                      // GOOGLE MAPS MARKETING
                      const Text(
                        "GOOGLE MAPS MARKETING",
                        style: TextStyle(color: AppColors.accentOrange, fontWeight: FontWeight.w800, fontSize: 11, letterSpacing: 1.2),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(child: _buildInput("Google Review VIP Days", _googleReviewDaysCtrl)),
                          const SizedBox(width: 20),
                          const Spacer(),
                        ],
                      ),
                      
                      const SizedBox(height: 48),

                      SizedBox(
                        width: double.infinity,
                        child: CupertinoButton.filled(
                          onPressed: _saveConfig,
                          borderRadius: BorderRadius.circular(10),
                          child: const Text("СОХРАНИТЬ ИЗМЕНЕНИЯ", style: TextStyle(fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildGlassContainer({required Widget child}) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(AppColors.macosRadius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          padding: const EdgeInsets.all(32),
          decoration: BoxDecoration(
            color: AppColors.macosSurfaceBg,
            borderRadius: BorderRadius.circular(AppColors.macosRadius),
            border: Border.all(color: AppColors.macosDivider),
          ),
          child: child,
        ),
      ),
    );
  }

  Widget _buildInput(String label, TextEditingController controller) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: AppColors.macosTextSecondary, fontSize: 13, fontWeight: FontWeight.w600)),
        const SizedBox(height: 10),
        CupertinoTextField(
          controller: controller,
          keyboardType: TextInputType.number,
          style: const TextStyle(color: Colors.white, fontSize: 14),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.2),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.macosDivider),
          ),
        ),
      ],
    );
  }
}

