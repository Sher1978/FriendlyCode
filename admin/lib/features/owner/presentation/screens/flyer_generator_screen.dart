import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/utils/downloader.dart';
import 'package:friendly_code/l10n/app_localizations.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'dart:ui' as ui;
import 'dart:math' as math;

class FlyerGeneratorScreen extends StatefulWidget {
  const FlyerGeneratorScreen({super.key});

  @override
  State<FlyerGeneratorScreen> createState() => _FlyerGeneratorScreenState();
}

class _FlyerGeneratorScreenState extends State<FlyerGeneratorScreen> {
  final GlobalKey _globalKey = GlobalKey();
  bool _isSaving = false;

  Future<void> _captureAndSave() async {
    setState(() => _isSaving = true);
    await Future.delayed(const Duration(milliseconds: 100)); // Ensure UI updates
    try {
      RenderRepaintBoundary boundary = _globalKey.currentContext!.findRenderObject() as RenderRepaintBoundary;
      // High resolution capture (300 DPI equivalent for print)
      // 100mm width ~ 1181 pixels at 300 DPI. 
      // Screen width is 400 logical px. Ratio ~3.0.
      ui.Image image = await boundary.toImage(pixelRatio: 4.0);
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData != null) {
        final buffer = byteData.buffer.asUint8List();
        final locale = Localizations.localeOf(context).languageCode;
        await FileDownloader.downloadFile(buffer, "friendly_code_flyer_euro_$locale.png");
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Flyer downloaded!")));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error saving: $e")));
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Determine locale for content
    final l10n = AppLocalizations.of(context);
    final isRu = Localizations.localeOf(context).languageCode == 'ru';

    return Scaffold(
      backgroundColor: Colors.grey[200],
      appBar: AppBar(
        title: const Text("B2B Euro Flyer Generator"),
        actions: [
          IconButton(
            icon: const Icon(Icons.download_rounded),
            onPressed: _isSaving ? null : _captureAndSave,
          ),
        ],
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
               RepaintBoundary(
                key: _globalKey,
                child: Container(
                  // Euro Flyer Size: 100mm x 210mm
                  // Aspect Ratio: 1 : 2.1
                  // Logical width: 400 -> Height: 840
                  width: 400,
                  height: 840,
                  decoration: const BoxDecoration(
                    color: AppColors.backgroundCream,
                  ),
                  child: Stack(
                    children: [
                      // Content
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            // 1. Header / Branding
                            const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.energy_savings_leaf, color: AppColors.brandGreen, size: 24),
                                SizedBox(width: 8),
                                Text(
                                  "Friendly Code",
                                  style: TextStyle(
                                    fontFamily: 'Inter',
                                    fontWeight: FontWeight.bold,
                                    fontSize: 18,
                                    color: AppColors.brandBrown,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 32),

                            // 2. Hook (Pain/Gain)
                            RichText(
                              textAlign: TextAlign.center,
                              text: TextSpan(
                                style: const TextStyle(
                                  fontFamily: 'Inter',
                                  fontSize: 28, // Large readable text
                                  fontWeight: FontWeight.w900,
                                  color: AppColors.brandBrown,
                                  height: 1.1,
                                ),
                                children: [
                                  TextSpan(text: isRu ? 'Привлечь гостя — дорого.\nУдержать — ' : 'Attract a guest — expensive.\nRetain — '),
                                  TextSpan(
                                    text: isRu ? 'бесценно' : 'priceless',
                                    style: const TextStyle(
                                      color: AppColors.brandOrange,
                                      fontStyle: FontStyle.italic,
                                    ),
                                  ),
                                  const TextSpan(text: '.'),
                                ],
                              ),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              isRu 
                                ? "Реклама — это казино. Вы платите за шанс. Мы предлагаем платить за результат."
                                : "Advertising is a Casino. You pay for a chance. We offer you to pay for results.",
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 14,
                                color: AppColors.brandBrown.withOpacity(0.8),
                                height: 1.4,
                              ),
                            ),
                            
                            const SizedBox(height: 32),

                            // 3. Solution (The Graph)
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(16),
                                boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 10, offset: Offset(0, 4))],
                              ),
                              child: Column(
                                children: [
                                  Text(
                                    isRu ? "Честная Игра" : "The Fair Game",
                                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.brandOrange, letterSpacing: 1.0),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    isRu ? "Скидка за Возврат" : "Discount for Return",
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppColors.brandBrown),
                                  ),
                                  const SizedBox(height: 24),
                                  // Graph Layout
                                  const Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      _FlyerBar(height: 40, label: 'Today', value: '5%'),
                                      _FlyerBar(height: 80, label: 'Tmrw', value: '20%', isActive: true),
                                      _FlyerBar(height: 60, label: '3 Days', value: '15%'),
                                      _FlyerBar(height: 50, label: '7 Days', value: '10%'),
                                    ],
                                  ),
                                ],
                              ),
                            ),

                            const SizedBox(height: 32),

                            // 4. Bullets (Zero Friction)
                            _buildBullet(isRu, Icons.no_cell, isRu ? "Не нужно скачивать приложение" : "No App Download Required"),
                            const SizedBox(height: 12),
                            _buildBullet(isRu, Icons.auto_graph, isRu ? "Автоматическая CRM и Аналитика" : "Automatic CRM & Analytics"),
                            const SizedBox(height: 12),
                            _buildBullet(isRu, Icons.bolt, isRu ? "Запуск за 5 минут" : "Launch in 5 minutes"),

                            const Spacer(),

                            // 5. Action / CTA
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                border: Border.all(color: AppColors.brandOrange, width: 2),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Row(
                                children: [
                                  QrImageView(
                                    data: 'https://www.friendlycode.fun', // B2B Landing
                                    version: QrVersions.auto,
                                    size: 80.0,
                                    backgroundColor: Colors.white,
                                    foregroundColor: Colors.black,
                                    padding: EdgeInsets.zero,
                                  ),
                                  const SizedBox(width: 16),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          isRu ? "Попробуйте Бесплатно" : "Try for Free",
                                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.brandBrown),
                                        ),
                                        Text(
                                          isRu ? "14 дней полного доступа.\nСканируйте, чтобы начать." : "14 days full access.\nScan to start.",
                                          style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 8),
                            const Center(
                              child: Text(
                                "friendlycode.fun",
                                style: TextStyle(fontSize: 12, color: AppColors.textSecondary, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 32),
              ElevatedButton.icon(
                onPressed: _isSaving ? null : _captureAndSave,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.brandOrange,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                ),
                icon: _isSaving 
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Icon(Icons.download),
                label: const Text("Download Print-Ready PNG"),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBullet(bool isRu, IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, color: AppColors.brandBrown, size: 20),
        const SizedBox(width: 12),
         Expanded(
           child: Text(
            text,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.brandBrown),
          ),
         ),
      ],
    );
  }
}

class _FlyerBar extends StatelessWidget {
  final double height;
  final String label;
  final String value;
  final bool isActive;

  const _FlyerBar({required this.height, required this.label, required this.value, this.isActive = false});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        Text(value, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: isActive ? AppColors.brandOrange : AppColors.brandBrown)),
        const SizedBox(height: 4),
        Container(
          width: 24, // Thinner bars for flyer
          height: height,
          decoration: BoxDecoration(
            color: isActive ? AppColors.brandOrange : AppColors.brandOrange.withOpacity(0.3),
            borderRadius: BorderRadius.circular(4),
          ),
        ),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textSecondary)),
      ],
    );
  }
}
