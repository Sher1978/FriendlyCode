import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
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
  bool _useVenueQr = false; // Toggle state

  Future<void> _captureAndSave() async {
    setState(() => _isSaving = true);
    await Future.delayed(const Duration(milliseconds: 100)); // Ensure UI updates
    try {
      RenderRepaintBoundary boundary = _globalKey.currentContext!.findRenderObject() as RenderRepaintBoundary;
      // High resolution capture
      ui.Image image = await boundary.toImage(pixelRatio: 4.0);
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData != null) {
        final buffer = byteData.buffer.asUint8List();
        // Determine filename suffix based on locale and QR type
        final locale = Localizations.localeOf(context).languageCode;
        final qrType = _useVenueQr ? "venue" : "landing";
        await FileDownloader.downloadFile(buffer, "friendly_code_pos_${widget.venue.id}_${locale}_$qrType.png");
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
              const SizedBox(height: 16),
              
              // QR Toggle Switch
              Container(
                width: 350,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 8, offset: Offset(0, 2))],
                ),
                child: SwitchListTile(
                  title: const Text("Use Venue Specific QR", style: TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Text(_useVenueQr ? "Scans to this venue" : "Scans to Landing Page"),
                  value: _useVenueQr,
                  activeColor: AppColors.premiumBurntOrange,
                  onChanged: (val) => setState(() => _useVenueQr = val),
                ),
              ),

              const SizedBox(height: 24),
              // The Sticker Widget to Capture
              RepaintBoundary(
                key: _globalKey,
                child: _buildStickerContent(context),
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

  Widget _buildStickerContent(BuildContext context) {
    // 350x700 is a reasonable ratio for a phone-sized sticker
    const double width = 350;
    const double height = 700;

    // Determine correct image asset based on locale
    final locale = Localizations.localeOf(context).languageCode;
    final imageAsset = locale == 'ru' 
        ? 'assets/images/pos_sticker_ru.png' 
        : 'assets/images/pos_sticker_en.png';
    
    // Determine QR Data
    final qrData = _useVenueQr 
        ? 'https://www.friendlycode.fun/qr?id=${widget.venue.id}'
        : 'https://www.friendlycode.fun';

    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: Colors.transparent, // Allow transparency
        borderRadius: BorderRadius.circular(40),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(40),
        child: Stack(
          children: [
            // 1. Base Image Mockup (Localized)
            Positioned.fill(
              child: Image.asset(
                imageAsset,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return Container(
                    color: Colors.grey[300],
                    child: Center(
                      child: Text(
                        "Mockup Image Not Found\nCheck $imageAsset",
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.red),
                      ),
                    ),
                  );
                },
              ),
            ),

            // 2. Dynamic QR Code Overlay
            Positioned(
              top: 190, 
              left: 89.5, 
              child: QrImageView(
                data: qrData,
                version: QrVersions.auto,
                size: 171.0, 
                backgroundColor: const Color(0xFFFBF4E6), // Restore beige background
                foregroundColor: Colors.black,
                padding: const EdgeInsets.all(8),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
