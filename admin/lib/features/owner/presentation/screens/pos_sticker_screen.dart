import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/utils/downloader.dart';
import 'package:friendly_code/l10n/app_localizations.dart'; // Added Import
import 'package:qr_flutter/qr_flutter.dart';
import 'dart:ui' as ui;
import 'dart:math' as math;

class PosStickerScreen extends StatefulWidget {
  final VenueModel venue;
  const PosStickerScreen({super.key, required this.venue});

  @override
  State<PosStickerScreen> createState() => _PosStickerScreenState();
}

class _PosStickerScreenState extends State<PosStickerScreen> {
  final GlobalKey _globalKey = GlobalKey();
  bool _isSaving = false;

  Future<void> _captureAndSave() async {
    setState(() => _isSaving = true);
    try {
      RenderRepaintBoundary boundary = _globalKey.currentContext!.findRenderObject() as RenderRepaintBoundary;
      // High resolution capture (3.0 pixel ratio for print quality)
      ui.Image image = await boundary.toImage(pixelRatio: 3.0);
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData != null) {
        final buffer = byteData.buffer.asUint8List();
        // Use a downloader utility that works on Web
        await FileDownloader.downloadFile(buffer, "friendly_code_pos_${widget.venue.id}.png");
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Sticker downloaded!")));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error saving: $e")));
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      backgroundColor: Colors.grey[200], // Background to contrast with sticker
      appBar: AppBar(
        title: Text(l10n.posStickerGenerator),
        actions: [
          IconButton(
            icon: const Icon(Icons.download_rounded),
            tooltip: l10n.downloadHighRes,
            onPressed: _isSaving ? null : _captureAndSave,
          ),
        ],
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                l10n.posStickerSub, 
                style: const TextStyle(color: AppColors.body, fontSize: 16),
              ),
              const SizedBox(height: 24),
              // The Sticker Widget to Capture
              RepaintBoundary(
                key: _globalKey,
                child: _buildStickerContent(l10n),
              ),
              const SizedBox(height: 32),
              ElevatedButton.icon(
                onPressed: _isSaving ? null : _captureAndSave,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.premiumBurntOrange,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                ),
                icon: _isSaving 
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Icon(Icons.download),
                label: Text(_isSaving ? "..." : l10n.downloadHighRes),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStickerContent(AppLocalizations l10n) {
    // Mimic the "Phone" shape
    return Container(
      width: 320, // Standard phone width approximation
      height: 640,
      decoration: BoxDecoration(
        color: const Color(0xFFFDF6E3), // Premium Sand Background
        borderRadius: BorderRadius.circular(40), // Phone rounded corners
        border: Border.all(color: Colors.black, width: 8), // Phone Bezel
        boxShadow: const [
          BoxShadow(color: Colors.black26, blurRadius: 20, offset: Offset(0, 10)),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(32),
        child: Stack(
          children: [
            // Top Notch (Visual only)
            Align(
              alignment: Alignment.topCenter,
              child: Container(
                margin: const EdgeInsets.only(top: 0),
                width: 150,
                height: 24,
                decoration: const BoxDecoration(
                  color: Colors.black,
                  borderRadius: BorderRadius.vertical(bottom: Radius.circular(16)),
                ),
              ),
            ),
            
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  // Header Logo
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.eco, color: Colors.green, size: 28), // Leaf icon placeholder
                      const SizedBox(width: 8),
                      Text("Friendly Code", style: TextStyle(fontFamily: 'Serif', fontSize: 24, fontWeight: FontWeight.bold, color: Colors.brown[800])),
                    ],
                  ),
                  
                  // Copy Text
                  Column(
                    children: [
                      Text(
                        l10n.stickerInstantDiscount, 
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Colors.black87),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        l10n.stickerNoApps, 
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.normal, color: Colors.black54),
                      ),
                    ],
                  ),

                  // QR Code
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10)],
                    ),
                    child: QrImageView(
                      data: 'https://www.friendlycode.fun/qr?id=${widget.venue.id}',
                      version: QrVersions.auto,
                      size: 180.0,
                      backgroundColor: Colors.white,
                      foregroundColor: Colors.black,
                    ),
                  ),

                  // Gauge / Speedometer Visual
                  _SpeedometerWidget(percentage: 5, l10n: l10n), // Hardcoded 5% as per design/default

                  // "Get Discount" Button Visual
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [AppColors.premiumBurntOrange, AppColors.premiumGold]),
                      borderRadius: BorderRadius.circular(30),
                      boxShadow: [BoxShadow(color: AppColors.premiumBurntOrange.withValues(alpha: 0.4), blurRadius: 10, offset: const Offset(0, 4))],
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.rocket_launch, color: Colors.white, size: 20),
                        SizedBox(width: 8),
                        Text("GET MY DISCOUNT", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SpeedometerWidget extends StatelessWidget {
  final int percentage;
  final AppLocalizations l10n;
  const _SpeedometerWidget({required this.percentage, required this.l10n});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: 120,
          height: 60,
          child: CustomPaint(
            painter: _GaugePainter(),
          ),
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.check, color: AppColors.premiumBurntOrange, size: 16),
            const SizedBox(width: 4),
            Text(l10n.stickerToday(percentage), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          ],
        ),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.check, color: AppColors.premiumBurntOrange, size: 16),
            const SizedBox(width: 4),
            Text(l10n.stickerTomorrow(20), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)), // Example next tier
          ],
        ),
      ],
    );
  }
}

class _GaugePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height);
    final radius = size.width / 2;
    const strokeWidth = 12.0;

    // Background Arc (Active Orange)
    final paintBg = Paint()
      ..color = AppColors.premiumBurntOrange.withValues(alpha: 0.3)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    // Active Arc (Orange)
    final paintActive = Paint()
      ..color = AppColors.premiumBurntOrange
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    // Draw full arc background
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius - strokeWidth / 2),
      math.pi, // Start at 180 deg (left)
      math.pi, // Sweep 180 deg
      false,
      paintBg,
    );
    
    // Draw active segment (First 20% visual)
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius - strokeWidth / 2),
      math.pi, 
      math.pi * 0.25, // Just a visual chunk
      false,
      paintActive,
    );

    // Draw Needle
    final needlePaint = Paint()
      ..color = Colors.black87
      ..strokeWidth = 3
      ..style = PaintingStyle.fill;
    
    // Needle pointing roughly at 25% mark
    final needleAngle = math.pi + (math.pi * 0.125); // Slightly up
    final needleEnd = Offset(
      center.dx + (radius - 15) * math.cos(needleAngle),
      center.dy + (radius - 15) * math.sin(needleAngle),
    );
    
    canvas.drawLine(center, needleEnd, needlePaint);
    canvas.drawCircle(center, 4, needlePaint);

    // Text "5%" inside
    const textSpan = TextSpan(
      text: "5%",
      style: TextStyle(color: Colors.black87, fontSize: 20, fontWeight: FontWeight.bold),
    );
    final textPainter = TextPainter(
      text: textSpan,
      textDirection: TextDirection.ltr,
    );
    textPainter.layout();
    textPainter.paint(canvas, Offset(center.dx - textPainter.width / 2, center.dy - radius + 20));
    
    // Text "20%" at the end
    const textEndSpan = TextSpan(
      text: "20%",
      style: TextStyle(color: Colors.black54, fontSize: 12, fontWeight: FontWeight.bold),
    );
    final textEndPainter = TextPainter(
      text: textEndSpan,
      textDirection: TextDirection.ltr,
    );
    textEndPainter.layout();
    textEndPainter.paint(canvas, Offset(center.dx + radius - 10, center.dy - 10));
    
     // Text "5%" at the start
    const textStartSpan = TextSpan(
      text: "5%",
      style: TextStyle(color: Colors.black54, fontSize: 12, fontWeight: FontWeight.bold),
    );
    final textStartPainter = TextPainter(
      text: textStartSpan,
      textDirection: TextDirection.ltr,
    );
    textStartPainter.layout();
    textStartPainter.paint(canvas, Offset(center.dx - radius - 10, center.dy - 10));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
