import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/utils/downloader.dart';
import 'package:friendly_code/l10n/app_localizations.dart';
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
    // Slight delay to ensure UI updates before capture if needed
    await Future.delayed(const Duration(milliseconds: 100));
    try {
      RenderRepaintBoundary boundary = _globalKey.currentContext!.findRenderObject() as RenderRepaintBoundary;
      // High resolution capture (3.0 pixel ratio for print quality)
      ui.Image image = await boundary.toImage(pixelRatio: 4.0);
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData != null) {
        final buffer = byteData.buffer.asUint8List();
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
      backgroundColor: Colors.grey[200],
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
    // Specific beige color from sample
    final bgColor = const Color(0xFFFBF4E6); 
    
    return Container(
      width: 340, // Slightly wider for better proportion
      height: 680,
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(48), // Match rounded corners
        border: Border.all(color: const Color(0xFF2C2C2C), width: 12), // Dark grey bezel stroke
        boxShadow: const [
          BoxShadow(color: Colors.black12, blurRadius: 20, offset: Offset(0, 10)),
          // White outline effect mimicking the sticker cut
          BoxShadow(color: Colors.white, spreadRadius: 10, blurRadius: 0),
          BoxShadow(color: Colors.black12, spreadRadius: 10, blurRadius: 10, offset: Offset(0, 4)),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(36),
        child: Stack(
          children: [
            // Notch
            Align(
              alignment: Alignment.topCenter,
              child: Container(
                width: 140,
                height: 28,
                decoration: const BoxDecoration(
                  color: Color(0xFF2C2C2C),
                  borderRadius: BorderRadius.vertical(bottom: Radius.circular(18)),
                ),
                child: const Center(
                  // Speaker grill / Camera dots
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      SizedBox(width: 32, height: 4, child: DecoratedBox(decoration: BoxDecoration(color: Colors.black, borderRadius: BorderRadius.all(Radius.circular(2))))),
                      SizedBox(width: 8),
                      CircleAvatar(radius: 2, backgroundColor: Color(0xFF111111)),
                    ],
                  ),
                ),
              ),
            ),

            Padding(
              padding: const EdgeInsets.fromLTRB(28, 50, 28, 28), // Add top padding for notch
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // 1. Logo Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Custom F+C Leaf Logo
                      CustomPaint(
                        size: const Size(42, 42),
                        painter: _LeafLogoPainter(),
                      ),
                      const SizedBox(width: 12),
                      const Text(
                        "Friendly Code", 
                        style: TextStyle(
                          fontFamily: 'Inter', 
                          fontSize: 26, 
                          fontWeight: FontWeight.w600, 
                          color: Color(0xFF4A4A4A), // Dark grey text
                          letterSpacing: -0.5,
                        )
                      ),
                      // Floating leaf accent on top right of text
                      Transform.translate(
                         offset: const Offset(-2, -12),
                         child: const Icon(Icons.energy_savings_leaf, color: Colors.green, size: 20), 
                      )
                    ],
                  ),
                  
                  const SizedBox(height: 24),

                  // 2. Main Copy
                  Text(
                    l10n.stickerInstantDiscount, // "Мгновенная скидка."
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 24, 
                      fontWeight: FontWeight.w800, // Heavy weight
                      color: Color(0xFF222222),
                      height: 1.1,
                      letterSpacing: 0.2
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    l10n.stickerNoApps, // "Без приложений и анкет."
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 17, 
                      fontWeight: FontWeight.w500, 
                      color: Color(0xFF555555),
                    ),
                  ),

                  const Spacer(flex: 1),

                  // 3. QR Code with clean white border
                  Container(
                    padding: const EdgeInsets.all(12), // White padding
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12), // Slight rounded
                      // No shadow as per flat design reference, or very subtle
                    ),
                    child: QrImageView(
                      data: 'https://www.friendlycode.fun/qr?id=${widget.venue.id}',
                      version: QrVersions.auto,
                      size: 190.0,
                      backgroundColor: Colors.white,
                      foregroundColor: Colors.black,
                      padding: EdgeInsets.zero,
                    ),
                  ),

                  const Spacer(flex: 1),

                  // 4. Gauge with Legend
                  _SpeedometerWidget(percentage: 5, l10n: l10n),

                  const Spacer(flex: 2),

                  // 5. Button
                  Container(
                    width: double.infinity,
                    height: 56,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFFF28B44), Color(0xFFF4A261)], // Matching orange gradient
                        begin: Alignment.centerLeft,
                        end: Alignment.centerRight,
                      ),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFFF28B44).withValues(alpha: 0.3),
                          blurRadius: 12,
                          offset: const Offset(0, 6)
                        )
                      ],
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.rocket_launch_rounded, color: Colors.white, size: 22),
                        SizedBox(width: 10),
                        Text(
                          "GET MY DISCOUNT", 
                          style: TextStyle(
                            color: Colors.white, 
                            fontWeight: FontWeight.w700, 
                            fontSize: 16,
                            letterSpacing: 0.5
                          )
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LeafLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paintOrange = Paint()..color = const Color(0xFFF28B44)..style = PaintingStyle.fill;
    
    // Draw "F" stylized as a leaf block
    final pathF = Path();
    pathF.moveTo(size.width * 0.2, size.height * 0.1);
    pathF.lineTo(size.width * 0.7, size.height * 0.1);
    pathF.cubicTo(size.width * 0.9, size.height * 0.1, size.width * 0.9, size.height * 0.4, size.width * 0.7, size.height * 0.4);
    pathF.lineTo(size.width * 0.4, size.height * 0.4);
    pathF.lineTo(size.width * 0.4, size.height * 0.5);
    pathF.lineTo(size.width * 0.6, size.height * 0.5);
    pathF.lineTo(size.width * 0.6, size.height * 0.7);
    pathF.lineTo(size.width * 0.4, size.height * 0.7);
    pathF.lineTo(size.width * 0.4, size.height * 0.9);
    pathF.lineTo(size.width * 0.2, size.height * 0.9);
    pathF.close();

    // Round corners for leaf effect
    canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(0, 0, size.width, size.height), const Radius.circular(12)), paintOrange);
    
    // White lines to form "F"
    final paintWhite = Paint()..color = Colors.white..style = PaintingStyle.stroke..strokeWidth = 3..strokeCap = StrokeCap.round;
    // Main vertical
    canvas.drawLine(Offset(size.width * 0.3, size.height * 0.2), Offset(size.width * 0.3, size.height * 0.8), paintWhite);
    // Top bar
    canvas.drawLine(Offset(size.width * 0.3, size.height * 0.25), Offset(size.width * 0.7, size.height * 0.25), paintWhite);
    // Mid bar
    canvas.drawLine(Offset(size.width * 0.3, size.height * 0.5), Offset(size.width * 0.6, size.height * 0.5), paintWhite);

    // Leaf contour overlay (subtle)
    final paintContour = Paint()..color = Colors.white.withOpacity(0.2)..style = PaintingStyle.stroke..strokeWidth = 2;
    canvas.drawArc(Rect.fromCircle(center: Offset(size.width, 0), radius: size.width), math.pi / 2, math.pi / 2, false, paintContour);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
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
          width: 180, // Wider Gauge
          height: 90,
          child: CustomPaint(
            painter: _GaugePainter(),
          ),
        ),
        const SizedBox(height: 16),
        // Legend
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
             // Left Ticker (5%)
             const Text("5%", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.black87)),
             // Spacer
             const SizedBox(width: 80),
             // Right Ticker (20%)
             const Text("20%", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.black87)),
          ],
        ),
        
        const SizedBox(height: 16),

        Column(
          children: [
            _buildCheckRow(l10n.stickerToday(percentage)),
            const SizedBox(height: 6),
            _buildCheckRow(l10n.stickerTomorrow(20)),
          ],
        )
      ],
    );
  }

  Widget _buildCheckRow(String text) {
    // Splits "Today: 5%" into lighter "Today:" and bold "5%"
    final parts = text.split(':');
    final label = parts.isNotEmpty ? "${parts[0]}:" : text;
    final value = parts.length > 1 ? parts[1] : "";

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Icon(Icons.check_rounded, color: Color(0xFFF28B44), size: 22), // Orange Check
        const SizedBox(width: 8),
        RichText(
          text: TextSpan(
            style: const TextStyle(fontSize: 18, color: Color(0xFF333333), fontFamily: 'Inter'),
            children: [
              TextSpan(text: label),
              TextSpan(text: value, style: const TextStyle(fontWeight: FontWeight.w900, color: Colors.black)),
            ],
          ),
        )
      ],
    );
  }
}

class _GaugePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height);
    final radius = size.width / 2;
    const strokeWidth = 24.0; // Thicker arc

    // 1. Draw Ticks (Background)
    final tickPaint = Paint()
      ..color = Colors.grey[300]!
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    const tickCount = 10;
    // 1. (Optional) Draw Ticks (Background) - Removed as they are handled by separators

    // 2. Gradient Arc (Orange -> Light Orange)
    final rect = Rect.fromCircle(center: center, radius: radius - strokeWidth / 2);
    final gradient = const SweepGradient(
      colors: [Color(0xFFF28B44), Color(0xFFF4A261)],
      startAngle: math.pi,
      endAngle: 2 * math.pi,
      transform: GradientRotation(0), // Doesn't rotate start, but maps properly
    ).createShader(Rect.fromCircle(center: center, radius: radius));

    final arcPaint = Paint()
      ..shader = gradient
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.butt; // Butt cap for clean segments

    canvas.drawArc(rect, math.pi, math.pi, false, arcPaint);

    // 3. White Separators (Ticks on top of arc)
    final sepPaint = Paint()
      ..color = const Color(0xFFFBF4E6) // Match background color
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    for (int i = 1; i < tickCount; i++) {
        final angle = math.pi + (math.pi * (i / tickCount));
        final p1 = Offset(
          center.dx + (radius - strokeWidth) * math.cos(angle),
          center.dy + (radius - strokeWidth) * math.sin(angle),
        );
        final p2 = Offset(
          center.dx + radius * math.cos(angle),
          center.dy + radius * math.sin(angle),
        );
        canvas.drawLine(p1, p2, sepPaint);
    }
    
    // 4. Center Text "5%"
    const textSpan = TextSpan(
      text: "5%",
      style: TextStyle(color: Colors.black87, fontSize: 32, fontWeight: FontWeight.w900),
    );
    final textPainter = TextPainter(
      text: textSpan,
      textDirection: TextDirection.ltr,
    );
    textPainter.layout();
    textPainter.paint(canvas, Offset(center.dx - textPainter.width / 2, center.dy - radius + 45));

    // 5. Realistic Needle
    final needleAngle = math.pi + (math.pi * 0.15); // Pointing to ~5-10%
    final needleLen = radius - 15;
    
    final needlePaint = Paint()
      ..color = const Color(0xFF333333)
      ..style = PaintingStyle.fill;

    // Draw needle as a thin triangle/path
    final path = Path();
    path.moveTo(center.dx, center.dy);
    // Tip
    final tip = Offset(
       center.dx + needleLen * math.cos(needleAngle),
       center.dy + needleLen * math.sin(needleAngle),
    );
    // Base width (perpendicular)
    final baseAngleLeft = needleAngle - math.pi / 2;
    final baseAngleRight = needleAngle + math.pi / 2;
    final baseW = 4.0;
    
    final pLeft = Offset(
      center.dx + baseW * math.cos(baseAngleLeft),
      center.dy + baseW * math.sin(baseAngleLeft),
    );
    final pRight = Offset(
      center.dx + baseW * math.cos(baseAngleRight),
      center.dy + baseW * math.sin(baseAngleRight),
    );
    
    path.lineTo(pLeft.dx, pLeft.dy);
    path.lineTo(tip.dx, tip.dy);
    path.lineTo(pRight.dx, pRight.dy);
    path.close();
    
    // Shadow for depth
    canvas.drawShadow(path, Colors.black, 4, true);
    canvas.drawPath(path, needlePaint);
    
    // Pivot Circle
    canvas.drawCircle(center, 8, needlePaint);
    canvas.drawCircle(center, 4, Paint()..color = Colors.grey[600]!);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
