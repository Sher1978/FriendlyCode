import 'dart:ui';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:friendly_code/core/theme/colors.dart';

class DepositTiersSetupScreen extends StatefulWidget {
  final String venueId;
  const DepositTiersSetupScreen({super.key, required this.venueId});

  @override
  State<DepositTiersSetupScreen> createState() => _DepositTiersSetupScreenState();
}

class _DepositTiersSetupScreenState extends State<DepositTiersSetupScreen> {
  bool _isLoading = true;
  final _firestore = FirebaseFirestore.instance;

  final TextEditingController _minDepositCtrl = TextEditingController(text: "1000000");
  final TextEditingController _depositBonusPercentCtrl = TextEditingController(text: "10");

  @override
  void initState() {
    super.initState();
    _loadDepositSettings();
  }

  @override
  void dispose() {
    _minDepositCtrl.dispose();
    _depositBonusPercentCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadDepositSettings() async {
    try {
      final doc = await _firestore.collection('venues').doc(widget.venueId).get();
      if (doc.exists && doc.data() != null) {
        final data = doc.data()!;
        final depositConfig = data['depositConfig'] ?? {};
        if (depositConfig['minDeposit'] != null) {
          _minDepositCtrl.text = depositConfig['minDeposit'].toString();
        }
        if (depositConfig['bonusPercent'] != null) {
          _depositBonusPercentCtrl.text = depositConfig['bonusPercent'].toString();
        }
      }
    } catch (e) {
      debugPrint("Error loading deposit settings: $e");
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _saveDepositSettings() async {
    setState(() => _isLoading = true);

    try {
      final double minDeposit = double.tryParse(_minDepositCtrl.text.trim()) ?? 1000000;
      final int bonusPercent = int.tryParse(_depositBonusPercentCtrl.text.trim()) ?? 10;

      await _firestore.collection('venues').doc(widget.venueId).set({
        'depositConfig': {
          'minDeposit': minDeposit,
          'bonusPercent': bonusPercent,
          'updatedAt': FieldValue.serverTimestamp(),
        }
      }, SetOptions(merge: true));

      if (mounted) {
        showCupertinoDialog(
          context: context,
          builder: (context) => CupertinoAlertDialog(
            title: const Text("Успешно сохранено"),
            content: Text("Параметры депозита обновлены:\n• Мин. депозит: $minDeposit ₫\n• Процент бонуса: $bonusPercent%"),
            actions: [
              CupertinoDialogAction(
                child: const Text("ОК"),
                onPressed: () {
                  Navigator.pop(context);
                  Navigator.pop(context);
                },
              ),
            ],
          ),
        );
      }
    } catch (e) {
      debugPrint("Error saving deposit settings: $e");
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) return const Scaffold(backgroundColor: Colors.black, body: Center(child: CupertinoActivityIndicator(radius: 12)));

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
                  "Настройки Депозита",
                  style: TextStyle(
                    color: AppColors.macosTextPrimary,
                    fontSize: 34,
                    fontWeight: FontWeight.bold,
                    letterSpacing: -1.0,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  "Установка единого процента депозита и минимальной суммы взноса заведения.",
                  style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 15),
                ),
                const SizedBox(height: 48),

                _buildGlassContainer(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "ПРАВИЛА НАЧИСЛЕНИЯ ДЕПОЗИТА",
                        style: TextStyle(color: AppColors.accentOrange, fontWeight: FontWeight.w800, fontSize: 11, letterSpacing: 1.2),
                      ),
                      const SizedBox(height: 24),

                      const Text("Минимальная сумма взноса депозита (₫)", style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      CupertinoTextField(
                        controller: _minDepositCtrl,
                        keyboardType: TextInputType.number,
                        style: const TextStyle(color: Colors.white, fontSize: 15),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.macosDivider),
                        ),
                      ),

                      const SizedBox(height: 24),

                      const Text("Процент депозитной скидки заведения (%)", style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      CupertinoTextField(
                        controller: _depositBonusPercentCtrl,
                        keyboardType: TextInputType.number,
                        style: const TextStyle(color: Colors.white, fontSize: 15),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.macosDivider),
                        ),
                      ),

                      const SizedBox(height: 20),

                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.accentGreen.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: AppColors.accentGreen.withOpacity(0.3)),
                        ),
                        child: const Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "💡 Формула начисления депозита персоналом:",
                              style: TextStyle(color: AppColors.accentGreen, fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                            SizedBox(height: 6),
                            Text(
                              "• При внесении наличных или оплате картой официант указывает внесенную сумму (например 1 000 000 ₫).\n"
                              "• Система единоразово увеличивает баланс депозита клиента на выбранный процент (1 000 000 ₫ + 10% = 1 100 000 ₫ на счету).\n"
                              "• Баланс депозита считывается и списывается персоналом без временных ступеней.",
                              style: TextStyle(color: Colors.white70, fontSize: 12, height: 1.5),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 32),

                      SizedBox(
                        width: double.infinity,
                        child: CupertinoButton.filled(
                          onPressed: _saveDepositSettings,
                          borderRadius: BorderRadius.circular(10),
                          child: const Text("СОХРАНИТЬ НАСТРОЙКИ", style: TextStyle(fontWeight: FontWeight.bold)),
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
}
