import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/cupertino.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/utils/downloader.dart';
import 'package:friendly_code/l10n/app_localizations.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'dart:ui' as ui;

class PosStickerScreen extends StatefulWidget {
  final VenueModel venue;
  const PosStickerScreen({super.key, required this.venue});

  @override
  State<PosStickerScreen> createState() => _PosStickerScreenState();
}

class _PosStickerScreenState extends State<PosStickerScreen> {
  final GlobalKey _globalKey = GlobalKey();
  bool _isSaving = false;
  bool _useVenueQr = true; // Default to venue-specific QR
  String _selectedLanguage = 'ru'; // 'ru' or 'en'
  String _selectedDesign = 'hybrid'; // 'classic' or 'hybrid'

  @override
  void initState() {
    super.initState();
    final defLang = (widget.venue.defaultLanguage ?? 'en').toLowerCase();
    if (defLang != 'ru') {
      _selectedLanguage = 'en';
    } else {
      _selectedLanguage = 'ru';
    }
  }

  Future<void> _captureAndSave() async {
    setState(() => _isSaving = true);
    await Future.delayed(const Duration(milliseconds: 150));
    try {
      final boundary =
          _globalKey.currentContext?.findRenderObject() as RenderRepaintBoundary?;
      if (boundary == null) return;
      // High resolution capture (pixelRatio: 4.0)
      ui.Image image = await boundary.toImage(pixelRatio: 4.0);
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData != null) {
        final buffer = byteData.buffer.asUint8List();
        final qrType = _useVenueQr ? "venue" : "landing";
        final designName = _selectedDesign.toUpperCase();
        final fileName =
            "REVOO_Flyer_${widget.venue.name.replaceAll(' ', '_')}_${designName}_${_selectedLanguage}_$qrType.png";
        await FileDownloader.downloadFile(buffer, fileName);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text("Промо-флаер успешно скачан в высоком разрешении!"),
              backgroundColor: Colors.green,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Ошибка сохранения: $e"), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: Text(
          l10n.posStickerGenerator,
          style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.download_rounded, color: AppColors.accentYellow),
            tooltip: l10n.downloadHighRes,
            onPressed: _isSaving ? null : _captureAndSave,
          ),
        ],
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // ── CONTROL PANEL CARDS ──
              Container(
                width: 360,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.macosSurfaceBg,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white.withOpacity(0.08)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Design Selector Segmented Control
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Дизайн флаера:',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                        CupertinoSegmentedControl<String>(
                          groupValue: _selectedDesign,
                          selectedColor: AppColors.accentYellow,
                          unselectedColor: Colors.black45,
                          borderColor: AppColors.accentYellow.withOpacity(0.5),
                          pressedColor: AppColors.accentYellow.withOpacity(0.3),
                          padding: EdgeInsets.zero,
                          children: const {
                            'hybrid': Padding(
                              padding: EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              child: Text('🌟 HYBRID', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                            ),
                            'classic': Padding(
                              padding: EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              child: Text('CLASSIC', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                            ),
                          },
                          onValueChanged: (val) => setState(() => _selectedDesign = val),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    const Divider(color: Colors.white10, height: 1),
                    const SizedBox(height: 14),
                    // Language Selector Segmented Control
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Язык флаера:',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                        CupertinoSegmentedControl<String>(
                          groupValue: _selectedLanguage,
                          selectedColor: AppColors.accentYellow,
                          unselectedColor: Colors.black45,
                          borderColor: AppColors.accentYellow.withOpacity(0.5),
                          pressedColor: AppColors.accentYellow.withOpacity(0.3),
                          padding: EdgeInsets.zero,
                          children: const {
                            'ru': Padding(
                              padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              child: Text('🇷🇺 РУ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                            ),
                            'en': Padding(
                              padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              child: Text('🇬🇧 EN', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                            ),
                          },
                          onValueChanged: (val) => setState(() => _selectedLanguage = val),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    const Divider(color: Colors.white10, height: 1),
                    const SizedBox(height: 14),
                    // QR Type Switch
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                "Персональный QR заведения",
                                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                _useVenueQr
                                    ? "Сразу привязывает к ${widget.venue.name}"
                                    : "Переходит на общую страницу",
                                style: const TextStyle(color: Colors.white54, fontSize: 11),
                              ),
                            ],
                          ),
                        ),
                        Switch(
                          value: _useVenueQr,
                          activeTrackColor: AppColors.accentYellow,
                          onChanged: (val) => setState(() => _useVenueQr = val),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // ── THE FLYER MOCKUP PREVIEW (To Capture) ──
              RepaintBoundary(
                key: _globalKey,
                child: _selectedDesign == 'hybrid'
                    ? _buildHybridStickerContent(context)
                    : _buildClassicStickerContent(context),
              ),

              const SizedBox(height: 28),

              // Download High-Res Button
              ElevatedButton.icon(
                onPressed: _isSaving ? null : _captureAndSave,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.accentYellow,
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(horizontal: 36, vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  elevation: 6,
                ),
                icon: _isSaving
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2.5),
                      )
                    : const Icon(Icons.file_download_rounded, color: Colors.black),
                label: Text(
                  _isSaving
                      ? "Генерация PNG..."
                      : "СКАЧАТЬ ${_selectedDesign.toUpperCase()} МАКЕТ (PNG)",
                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 0.5),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── 1. HYBRID DESIGN (New phone mockup layout) ──
  Widget _buildHybridStickerContent(BuildContext context) {
    const double width = 360;
    const double height = 538; // Proportional to original 686x1024

    final qrData = _useVenueQr
        ? 'https://bot-lab-21910.web.app/qr?id=${widget.venue.id}'
        : 'https://bot-lab-21910.web.app';

    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.circular(32),
        boxShadow: const [
          BoxShadow(
            color: Colors.black54,
            blurRadius: 20,
            spreadRadius: 2,
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(32),
        child: Stack(
          children: [
            // 1. Hybrid Background Image
            Positioned.fill(
              child: Image.asset(
                _selectedLanguage == 'en'
                    ? 'assets/images/pos_sticker_hybrid_en.jpg'
                    : 'assets/images/pos_sticker_hybrid.jpg',
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return Container(
                    color: const Color(0xFF0A0A0C),
                    child: const Center(
                      child: Text(
                        "Ошибка загрузки макета HYBRID",
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.redAccent),
                      ),
                    ),
                  );
                },
              ),
            ),

            // 2. Dynamic Venue Name Overlay at Top Header
            Positioned(
              top: 56.5,
              left: 63.0,
              right: 63.0,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFF0C0C0E), // Solid background masking stock name
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  widget.venue.name.toUpperCase(),
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xFFFFE680), // Neon Gold Glow
                    fontWeight: FontWeight.w900,
                    fontSize: 12.5,
                    letterSpacing: 0.5,
                    shadows: [
                      Shadow(
                        color: Color(0xFFFFB700),
                        blurRadius: 6,
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // 3. Dynamic QR Code Overlay — anchored to bottom, 10% smaller
            Positioned(
              bottom: 44.0,
              left: (width - 101.0) / 2,
              child: Container(
                width: 101.0,
                height: 101.0,
                decoration: BoxDecoration(
                  color: Colors.black,
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: const [
                    BoxShadow(
                      color: Colors.black87,
                      blurRadius: 8,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                padding: const EdgeInsets.all(6),
                child: QrImageView(
                  data: qrData,
                  version: QrVersions.auto,
                  backgroundColor: Colors.black,
                  eyeStyle: const QrEyeStyle(
                    eyeShape: QrEyeShape.square,
                    color: Color(0xFFD4AF37),
                  ),
                  dataModuleStyle: const QrDataModuleStyle(
                    dataModuleShape: QrDataModuleShape.square,
                    color: Color(0xFFD4AF37),
                  ),
                  padding: EdgeInsets.zero,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── 2. CLASSIC DESIGN ──
  Widget _buildClassicStickerContent(BuildContext context) {
    const double width = 360;
    const double height = 640;

    final imageAsset = _selectedLanguage == 'ru'
        ? 'assets/images/pos_sticker_ru.png'
        : 'assets/images/pos_sticker_en.png';

    final qrData = _useVenueQr
        ? 'https://bot-lab-21910.web.app/qr?id=${widget.venue.id}'
        : 'https://bot-lab-21910.web.app';

    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.circular(32),
        boxShadow: const [
          BoxShadow(
            color: Colors.black54,
            blurRadius: 20,
            spreadRadius: 2,
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(32),
        child: Stack(
          children: [
            Positioned.fill(
              child: Image.asset(
                imageAsset,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return Container(
                    color: const Color(0xFF0A0A0C),
                    child: Center(
                      child: Text(
                        "Ошибка загрузки макета:\n$imageAsset",
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.redAccent),
                      ),
                    ),
                  );
                },
              ),
            ),
            Positioned(
              top: 288.8,
              left: (width - 194.4) / 2,
              child: Container(
                width: 194.4,
                height: 194.4,
                decoration: BoxDecoration(
                  color: Colors.black,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: const [
                    BoxShadow(
                      color: Colors.black87,
                      blurRadius: 12,
                      spreadRadius: 3,
                    ),
                  ],
                ),
                padding: const EdgeInsets.all(12),
                child: QrImageView(
                  data: qrData,
                  version: QrVersions.auto,
                  backgroundColor: Colors.black,
                  eyeStyle: const QrEyeStyle(
                    eyeShape: QrEyeShape.square,
                    color: Color(0xFFD4AF37),
                  ),
                  dataModuleStyle: const QrDataModuleStyle(
                    dataModuleShape: QrDataModuleShape.square,
                    color: Color(0xFFD4AF37),
                  ),
                  padding: EdgeInsets.zero,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

