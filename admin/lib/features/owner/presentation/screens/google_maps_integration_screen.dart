import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'dart:math';

class GoogleMapsIntegrationScreen extends StatefulWidget {
  final String venueId;
  const GoogleMapsIntegrationScreen({super.key, required this.venueId});

  @override
  State<GoogleMapsIntegrationScreen> createState() => _GoogleMapsIntegrationScreenState();
}

class _GoogleMapsIntegrationScreenState extends State<GoogleMapsIntegrationScreen> {
  VenueModel? _venue;
  bool _isLoading = true;
  String _generatedUrl = '';

  @override
  void initState() {
    super.initState();
    _fetchVenue();
  }

  Future<void> _fetchVenue() async {
    try {
      final doc = await FirebaseFirestore.instance.collection('venues').doc(widget.venueId).get();
      if (doc.exists) {
        setState(() {
          _venue = VenueModel.fromMap(doc.id, doc.data()!);
          _generatedUrl = 'https://revoo.win/?v=${_venue!.id}&utm_source=google_maps';
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint("Error fetching venue: $e");
      setState(() => _isLoading = false);
    }
  }

  void _copyToClipboard() {
    Clipboard.setData(ClipboardData(text: _generatedUrl));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Ссылка скопирована в буфер обмена!'), backgroundColor: Colors.green),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(child: CupertinoActivityIndicator(radius: 16)),
      );
    }

    if (_venue == null) {
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(child: Text("Ошибка загрузки данных", style: TextStyle(color: Colors.white))),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(CupertinoIcons.back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          "Google Maps Интеграция",
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "ГЕНЕРАТОР ССЫЛОК",
              style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.2),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white.withOpacity(0.05)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    "Установите эту ссылку в профиле Google Мой Бизнес (Сайт, Меню, Бронирование). Трафик, переходящий по ней, получит 100% максимальную скидку на 24 часа и будет учтен в аналитике.",
                    style: TextStyle(color: Colors.white70, fontSize: 14, height: 1.5),
                  ),
                  const SizedBox(height: 20),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.3),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.accentGreen.withOpacity(0.3)),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            _generatedUrl,
                            style: const TextStyle(color: AppColors.accentGreen, fontSize: 13, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton.icon(
                      onPressed: _copyToClipboard,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.accentGreen,
                        foregroundColor: Colors.black,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 0,
                      ),
                      icon: const Icon(CupertinoIcons.doc_on_doc, size: 18),
                      label: const Text("СКОПИРОВАТЬ ССЫЛКУ", style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.0)),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),

            const Text(
              "АНАЛИТИКА ТРАФИКА (Google Maps)",
              style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.2),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _buildStatCard(
                  "НОВЫХ ГОСТЕЙ",
                  _venue!.stats.googleMapsNewGuestsCount.toString(),
                  AppColors.accentBlue,
                  "Уникальные регистрации",
                ),
                const SizedBox(width: 12),
                _buildStatCard(
                  "ПОВТОРНЫХ ВИЗИТОВ",
                  _venue!.stats.googleMapsReturningGuestsCount.toString(),
                  AppColors.premiumGold,
                  "Вернулись после Google",
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(String title, String value, Color color, String subtitle) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Column(
          children: [
            Text(title, textAlign: TextAlign.center, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 11)),
            const SizedBox(height: 12),
            Text(value, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: AppColors.title)),
            const SizedBox(height: 8),
            Text(subtitle, textAlign: TextAlign.center, style: TextStyle(fontSize: 10, color: AppColors.body.withOpacity(0.7))),
          ],
        ),
      ),
    );
  }
}
