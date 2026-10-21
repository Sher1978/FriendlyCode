import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:friendly_code/core/models/services/index.dart';
import 'package:friendly_code/core/theme/colors.dart';

class AiConciergeConfigScreen extends StatefulWidget {
  final String venueId;
  const AiConciergeConfigScreen({super.key, required this.venueId});

  @override
  State<AiConciergeConfigScreen> createState() => _AiConciergeConfigScreenState();
}

class _AiConciergeConfigScreenState extends State<AiConciergeConfigScreen> {
  bool _isLoading = true;
  bool _isSaving = false;

  final _parkingCtrl = TextEditingController();
  final _petPolicyCtrl = TextEditingController();
  final _specialCtrl = TextEditingController();
  String _toneOfVoice = 'respectful_formal';

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  @override
  void dispose() {
    _parkingCtrl.dispose();
    _petPolicyCtrl.dispose();
    _specialCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadProfile() async {
    setState(() => _isLoading = true);
    try {
      final doc = await FirebaseFirestore.instance
          .collection('venues')
          .doc(widget.venueId)
          .collection('ai_knowledge')
          .doc('profile')
          .get();

      if (doc.exists && doc.data() != null) {
        final p = AiKnowledgeProfile.fromMap(doc.data()!, doc.id);
        setState(() {
          _parkingCtrl.text = p.parkingInstructions;
          _petPolicyCtrl.text = p.petPolicy;
          _specialCtrl.text = p.specialInstructions;
          _toneOfVoice = p.toneOfVoice;
          _isLoading = false;
        });
      } else {
        setState(() => _isLoading = false);
      }
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _saveProfile() async {
    setState(() => _isSaving = true);
    try {
      await FirebaseFirestore.instance
          .collection('venues')
          .doc(widget.venueId)
          .collection('ai_knowledge')
          .doc('profile')
          .set({
        'venueId': widget.venueId,
        'toneOfVoice': _toneOfVoice,
        'parkingInstructions': _parkingCtrl.text.trim(),
        'petPolicy': _petPolicyCtrl.text.trim(),
        'specialInstructions': _specialCtrl.text.trim(),
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Цифровой паспорт сохранен!"), backgroundColor: AppColors.accentGreen),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Ошибка сохранения: $e"), backgroundColor: Colors.redAccent),
      );
    } finally {
      setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CupertinoNavigationBar(
        backgroundColor: AppColors.surface.withOpacity(0.9),
        middle: const Text("AI-Консьерж & Цифровой паспорт", style: TextStyle(color: Colors.white, fontSize: 16)),
        trailing: CupertinoButton(
          padding: EdgeInsets.zero,
          onPressed: _isSaving ? null : _saveProfile,
          child: _isSaving 
            ? const CupertinoActivityIndicator(color: AppColors.accentGreen)
            : const Text("Сохранить", style: TextStyle(color: AppColors.accentGreen, fontWeight: FontWeight.bold)),
        ),
      ),
      body: _isLoading
          ? const Center(child: CupertinoActivityIndicator(color: AppColors.accentGreen))
          : ListView(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
              children: [
                // Status Card
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.accentGreen.withOpacity(0.3)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: AppColors.accentGreen.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: const Icon(CupertinoIcons.chat_bubble_2_fill, color: AppColors.accentGreen, size: 24),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              "AI-Консьерж активен 24/7",
                              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              "Отвечает гостям в WhatsApp, картах и на сайте",
                              style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        width: 10,
                        height: 10,
                        decoration: const BoxDecoration(
                          color: AppColors.accentGreen,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // Section 1: Tone of Voice
                const Text("Тон общения с клиентами", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                const SizedBox(height: 8),
                CupertinoSegmentedControl<String>(
                  children: const {
                    'respectful_formal': Padding(padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8), child: Text("На «вы» (уважительно)")),
                    'friendly_informal': Padding(padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8), child: Text("На «ты» (по-дружески)")),
                  },
                  groupValue: _toneOfVoice,
                  onValueChanged: (val) => setState(() => _toneOfVoice = val),
                ),

                const SizedBox(height: 24),

                // Section 2: Parking
                const Text("Инструкция по парковке", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                const SizedBox(height: 4),
                Text("AI будет отвечать это гостям, спрашивающим про парковку", style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 11)),
                const SizedBox(height: 8),
                CupertinoTextField(
                  controller: _parkingCtrl,
                  maxLines: 2,
                  placeholder: "Например: Во дворе под шлагбаум, наберите нас при подъезде...",
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white12),
                  ),
                ),

                const SizedBox(height: 20),

                // Section 3: Pet policy & Rules
                const Text("Правила для питомцев и опозданий", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                const SizedBox(height: 8),
                CupertinoTextField(
                  controller: _petPolicyCtrl,
                  maxLines: 2,
                  placeholder: "Например: С небольшими собаками можно. Опоздание больше 15 мин — перенос.",
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white12),
                  ),
                ),

                const SizedBox(height: 20),

                // Section 4: Special notes & Hospitality
                const Text("Сервис, напитки и косметика", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                const SizedBox(height: 8),
                CupertinoTextField(
                  controller: _specialCtrl,
                  maxLines: 2,
                  placeholder: "Например: Кофе с корицей, работаем на премиум косметике Davines...",
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white12),
                  ),
                ),
              ],
            ),
    );
  }
}
