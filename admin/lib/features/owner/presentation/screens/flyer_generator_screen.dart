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
                  // Euro Flyer Landscape: 210mm x 100mm
                  // Aspect Ratio: 2.1 : 1
                  // Logical width: 840 -> Height: 400
                  width: 840,
                  height: 400,
                  decoration: const BoxDecoration(
                    color: AppColors.backgroundCream,
                  ),
                  child: Stack(
                    children: [
                      // Watermark / Background accents
                      Positioned(top: -50, right: -50, child: Icon(Icons.energy_savings_leaf, size: 300, color: AppColors.brandGreen.withOpacity(0.03))),
                      
                      Padding(
                        padding: const EdgeInsets.all(24),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            // --- COLUMN 1: Hook & Brand ---
                            Expanded(
                              flex: 3,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Brand
                                  const Row(
                                    children: [
                                      Icon(Icons.energy_savings_leaf, color: AppColors.brandGreen, size: 24),
                                      SizedBox(width: 8),
                                      Text("Friendly Code", style: TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.brandBrown)),
                                    ],
                                  ),
                                  const Spacer(),
                                  // Hook
                                  RichText(
                                    text: TextSpan(
                                      style: const TextStyle(fontFamily: 'Inter', fontSize: 26, fontWeight: FontWeight.bold, color: AppColors.brandBrown, height: 1.1),
                                      children: [
                                        TextSpan(text: isRu ? 'Привлечь гостя — дорого.\nУдержать — ' : 'Attract a guest — expensive.\nRetain — '),
                                        TextSpan(text: isRu ? 'бесценно' : 'priceless', style: const TextStyle(color: AppColors.brandOrange, fontStyle: FontStyle.italic)),
                                        const TextSpan(text: '.'),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  Text(
                                    isRu 
                                      ? "Реклама — это казино. Вы платите за шанс. Мы предлагаем платить за результат."
                                      : "Advertising is a Casino. You pay for a chance. We offer you to pay for results.",
                                    style: TextStyle(fontSize: 12, color: AppColors.brandBrown.withOpacity(0.8), height: 1.3),
                                  ),
                                  const Spacer(),
                                  // Hero Image (Cropped/Fit)
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(12),
                                    child: Image.asset(
                                      'assets/images/paying_with_iphone_v3.png',
                                      height: 100,
                                      width: double.infinity,
                                      fit: BoxFit.cover,
                                      alignment: Alignment.topCenter,
                                      errorBuilder: (c, e, s) => Container(
                                        height: 100, 
                                        color: AppColors.brandOrange.withOpacity(0.1), 
                                        child: const Center(child: Icon(Icons.image, color: AppColors.brandOrange)),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            
                            const SizedBox(width: 24),
                            // Vertical Divider
                            Container(width: 1, color: AppColors.brandBrown.withOpacity(0.1)),
                            const SizedBox(width: 24),

                            // --- COLUMN 2: The Solution (Graph) ---
                            Expanded(
                              flex: 3,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    isRu ? "ЧЕСТНАЯ ИГРА" : "THE FAIR GAME",
                                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.brandOrange, letterSpacing: 1.5),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    isRu ? "Скидка за Возврат" : "Discount for Return",
                                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppColors.brandBrown),
                                  ),
                                  const Spacer(),
                                  // Graph Layout
                                  Container(
                                    padding: const EdgeInsets.all(16),
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(16),
                                      boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 10, offset: Offset(0, 4))],
                                    ),
                                    child: const Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        _FlyerBar(height: 30, label: 'Today', value: '5%'),
                                        _FlyerBar(height: 60, label: 'Tmrw', value: '20%', isActive: true),
                                        _FlyerBar(height: 45, label: '3 Days', value: '15%'),
                                        _FlyerBar(height: 35, label: '7 Days', value: '10%'),
                                      ],
                                    ),
                                  ),
                                  const Spacer(),
                                  _buildBullet(isRu, Icons.no_cell, isRu ? "Не нужно скачивать приложение" : "No App Download Required"),
                                  if (!isRu) ...[
                                    const SizedBox(height: 4),
                                    Text(
                                      "Guests scan QR -> Get Discount. 100% Conversion.",
                                      style: TextStyle(fontSize: 10, color: AppColors.brandBrown.withOpacity(0.6), height: 1.2),
                                    )
                                  ]
                                ],
                              ),
                            ),

                            const SizedBox(width: 24),
                            // Vertical Divider
                            Container(width: 1, color: AppColors.brandBrown.withOpacity(0.1)),
                            const SizedBox(width: 24),

                            // --- COLUMN 3: Features & Call to Action ---
                            Expanded(
                              flex: 2,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                 Text(isRu ? "ВЫ ПОЛУЧАЕТЕ:" : "YOU GET:", style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.brandOrange, letterSpacing: 1.0)),
                                 const SizedBox(height: 12),
                                 _buildCompactFeature(isRu, Icons.insights, isRu ? "Статистика в реальном времени" : "Real-time Guest Analytics"),
                                 const SizedBox(height: 8),
                                 _buildCompactFeature(isRu, Icons.mark_chat_read, isRu ? "Умная CRM и Рассылки" : "Smart CRM & Communications"),
                                 const SizedBox(height: 8),
                                 _buildCompactFeature(isRu, Icons.rocket_launch, isRu ? "Запуск за 5 минут" : "Launch in 5 minutes"),
                                 
                                 const Spacer(),
                                 
                                 // CTA Box
                                 Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      border: Border.all(color: AppColors.brandOrange, width: 2),
                                      borderRadius: BorderRadius.circular(12),
                                      color: Colors.white,
                                    ),
                                    child: Column(
                                      children: [
                                        QrImageView(
                                          data: 'https://www.friendlycode.fun',
                                          version: QrVersions.auto,
                                          size: 80.0,
                                          backgroundColor: Colors.white,
                                          foregroundColor: Colors.black,
                                          padding: EdgeInsets.zero,
                                        ),
                                        const SizedBox(height: 8),
                                        Text(
                                          isRu ? "Попробуйте Бесплатно" : "Try 14 Days Free",
                                          textAlign: TextAlign.center,
                                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.brandBrown),
                                        ),
                                      ],
                                    ),
                                 ),
                                 const SizedBox(height: 4),
                                 const Center(child: Text("friendlycode.fun", style: TextStyle(fontSize: 10, color: AppColors.textSecondary))),
                                ],
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
        Icon(icon, color: AppColors.brandBrown, size: 16),
        const SizedBox(width: 8),
         Expanded(
           child: Text(
            text,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.brandBrown),
          ),
         ),
      ],
    );
  }

  Widget _buildCompactFeature(bool isRu, IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, color: AppColors.brandGreen, size: 14),
        const SizedBox(width: 6),
        Expanded(child: Text(text, style: const TextStyle(fontSize: 11, color: AppColors.brandBrown))),
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
