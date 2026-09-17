import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/theme/colors.dart';

class GiftxSetupScreen extends StatefulWidget {
  final VenueModel venue;
  const GiftxSetupScreen({super.key, required this.venue});

  @override
  State<GiftxSetupScreen> createState() => _GiftxSetupScreenState();
}

class _GiftxSetupScreenState extends State<GiftxSetupScreen> {
  late TextEditingController _urlController;
  late bool _isHybridEnabled;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _urlController = TextEditingController(text: widget.venue.giftxUrl ?? '');
    _isHybridEnabled = widget.venue.isHybridEnabled;
  }

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }

  Future<void> _saveSettings() async {
    final url = _urlController.text.trim();
    setState(() => _isSaving = true);

    try {
      await FirebaseFirestore.instance.collection('venues').doc(widget.venue.id).update({
        'giftxUrl': url,
        'isHybridEnabled': _isHybridEnabled,
        'updatedAt': FieldValue.serverTimestamp(),
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Настройки GiftX успешно сохранены!"),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context, true);
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
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text(
          "Настройка GiftX Гибрид",
          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
        ),
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Container(
            width: 480,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppColors.macosSurfaceBg,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.white.withOpacity(0.08)),
              boxShadow: const [
                BoxShadow(
                  color: Colors.black45,
                  blurRadius: 20,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Header Badge Icon
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFF2A85).withOpacity(0.15),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFFF2A85).withOpacity(0.4)),
                      ),
                      child: const Text('🎁', style: TextStyle(fontSize: 28)),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            "Страница GiftX",
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w900,
                              fontSize: 18,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            widget.venue.name,
                            style: TextStyle(
                              color: AppColors.accentYellow,
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 24),
                const Divider(color: Colors.white10, height: 1),
                const SizedBox(height: 24),

                // Enable/Disable Hybrid Switch
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            "Гибридный экран выбора",
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _isHybridEnabled
                                ? "ВКЛЮЧЁН — гость видит выбор REVO + GIFTX"
                                : "ОТКЛЮЧЁН — прямо на REVOO",
                            style: TextStyle(
                              color: _isHybridEnabled ? AppColors.accentGreen : Colors.white38,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Switch(
                      value: _isHybridEnabled,
                      activeTrackColor: AppColors.accentGreen,
                      onChanged: (val) => setState(() => _isHybridEnabled = val),
                    ),
                  ],
                ),

                const SizedBox(height: 24),

                // URL Input Field
                const Text(
                  "Ссылка на страницу GiftX заведения:",
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _urlController,
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                  decoration: InputDecoration(
                    hintText: "https://giftx.app/v/your_venue_id",
                    hintStyle: const TextStyle(color: Colors.white24, fontSize: 13),
                    filled: true,
                    fillColor: Colors.black45,
                    prefixIcon: const Icon(Icons.link_rounded, color: Color(0xFFFF2A85), size: 20),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: Colors.white.withOpacity(0.15)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: Colors.white.withOpacity(0.15)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: Color(0xFFFF2A85), width: 1.5),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                const Text(
                  "Нажатие на кнопку GIFTX на гибридных экранах перенаправит гостя по этой ссылке.",
                  style: TextStyle(color: Colors.white54, fontSize: 11, height: 1.4),
                ),

                const SizedBox(height: 32),

                // Save Action Button
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton.icon(
                    onPressed: _isSaving ? null : _saveSettings,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFFF2A85),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: 4,
                    ),
                    icon: _isSaving
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                          )
                        : const Icon(Icons.save_rounded, color: Colors.white),
                    label: Text(
                      _isSaving ? "Сохранение..." : "СОХРАНИТЬ ССЫЛКУ ГИФТЕКС",
                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 0.5),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
