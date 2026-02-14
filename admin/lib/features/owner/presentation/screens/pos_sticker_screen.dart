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
    // 350x700 is a reasonable ratio for a phone-sized sticker
    const double width = 350;
    const double height = 700;

    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: Colors.white, // Fallback color
        borderRadius: BorderRadius.circular(40),
        boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 20, offset: Offset(0, 10))],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(40),
        child: Stack(
          children: [
            // 1. Base Image Mockup
            Positioned.fill(
              child: Image.asset(
                'assets/images/pos_sticker_mockup.jpg',
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return Container(
                    color: Colors.grey[300],
                    child: const Center(
                      child: Text(
                        "Mockup Image Not Found\nCheck assets/images/pos_sticker_mockup.jpg",
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.red),
                      ),
                    ),
                  );
                },
              ),
            ),

            // 2. Dynamic QR Code Overlay
            // Adjust these values based on the physical location of the QR box in the image
            const Positioned(
              top: 220, // APPROXIMATE - needs calibration with actual image
              left: 75, // APPROXIMATE - centering 200px on 350px width -> (350-200)/2 = 75
              child: SizedBox(
                width: 200,
                height: 200,
                // We use a container to debug position if needed, or just QrImageView
                // color: Colors.red.withOpacity(0.3), 
              ),
            ),
            
            Positioned(
              top: 220, 
              left: 75, 
              child: QrImageView(
                data: 'https://www.friendlycode.fun/qr?id=${widget.venue.id}',
                version: QrVersions.auto,
                size: 200.0,
                backgroundColor: Colors.transparent, // Assuming image has white bg in QR area
                foregroundColor: Colors.black,
                padding: EdgeInsets.zero,
              ),
            ),

            // 3. Venue Name or Dynamic Text (Optional)
            // Positioned(
            //   top: 150,
            //   left: 0,
            //   right: 0,
            //   child: Text(
            //     widget.venue.name,
            //     textAlign: TextAlign.center,
            //     style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.black87),
            //   ),
            // ),
          ],
        ),
      ),
    );
  }
}
