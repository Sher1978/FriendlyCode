import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/services/venue_service.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/features/admin/presentation/screens/super_admin_venue_detail_screen.dart';
import 'package:friendly_code/features/admin/presentation/screens/venue_editor_screen.dart';

class SmartVenueOnboardingWizardDialog extends StatefulWidget {
  const SmartVenueOnboardingWizardDialog({super.key});

  @override
  State<SmartVenueOnboardingWizardDialog> createState() => _SmartVenueOnboardingWizardDialogState();
}

class _SmartVenueOnboardingWizardDialogState extends State<SmartVenueOnboardingWizardDialog> {
  final _venuesService = VenuesService();

  // Controllers
  final _nameCtrl = TextEditingController();
  final _cityCtrl = TextEditingController(text: 'Пхукет, Таиланд');
  final _ownerEmailCtrl = TextEditingController();
  final _ownerNameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();

  // Archetype & Settings
  String _archetype = 'batch'; // 'batch', 'horeca', 'personal_time'
  String _currency = '฿';
  bool _seedStarterPack = true;
  bool _isCreating = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _cityCtrl.dispose();
    _ownerEmailCtrl.dispose();
    _ownerNameCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _createAndProceed() async {
    final name = _nameCtrl.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Введите название заведения'), backgroundColor: Colors.red),
      );
      return;
    }

    setState(() => _isCreating = true);

    try {
      final ownerEmail = _ownerEmailCtrl.text.trim().toLowerCase();
      String? ownerUserId;

      // 1. Resolve or create Owner User in Firestore
      if (ownerEmail.isNotEmpty) {
        final usersSnap = await FirebaseFirestore.instance
            .collection('users')
            .where('email', isEqualTo: ownerEmail)
            .limit(1)
            .get();

        if (usersSnap.docs.isNotEmpty) {
          ownerUserId = usersSnap.docs.first.id;
        } else {
          final newDoc = FirebaseFirestore.instance.collection('users').doc();
          ownerUserId = newDoc.id;
          await newDoc.set({
            'email': ownerEmail,
            'displayName': _ownerNameCtrl.text.trim().isNotEmpty ? _ownerNameCtrl.text.trim() : ownerEmail.split('@').first,
            'name': _ownerNameCtrl.text.trim().isNotEmpty ? _ownerNameCtrl.text.trim() : ownerEmail.split('@').first,
            'role': 'owner',
            'createdAt': FieldValue.serverTimestamp(),
            'updatedAt': FieldValue.serverTimestamp(),
          });
        }
      }

      // 2. Determine category title
      String categoryTitle;
      String businessType;
      if (_archetype == 'batch') {
        categoryTitle = 'Трансферы & Визаран';
        businessType = 'services';
      } else if (_archetype == 'horeca') {
        categoryTitle = 'Ресторан & Доставка';
        businessType = 'horeca';
      } else {
        categoryTitle = 'Персональные услуги';
        businessType = 'services';
      }

      // 3. Create Venue Document (In SETUP / ONBOARDING Mode: isActive = false)
      final newVenue = VenueModel(
        id: '',
        name: name,
        address: _cityCtrl.text.trim(),
        ownerEmail: ownerEmail.isNotEmpty ? ownerEmail : null,
        ownerId: ownerUserId,
        category: categoryTitle,
        archetype: _archetype,
        currency: _currency,
        phone: _phoneCtrl.text.trim(),
        isActive: false, // ⚠️ Starts in setup/draft mode until launched!
        isManuallyBlocked: false,
        createdAt: DateTime.now(),
        gmConfig: GoogleMapsConfig(
          businessType: businessType,
          phone: _phoneCtrl.text.trim(),
        ),
      );

      final savedVenueId = await _venuesService.createVenue(newVenue);

      // 4. Link VenueId to Owner user
      if (ownerUserId != null && savedVenueId.isNotEmpty) {
        await FirebaseFirestore.instance.collection('users').doc(ownerUserId).set({
          'venueId': savedVenueId,
          'role': 'owner',
          'updatedAt': FieldValue.serverTimestamp(),
        }, SetOptions(merge: true));
      }

      // 5. Seed Starter Pack if requested
      if (_seedStarterPack && businessType == 'services') {
        await _venuesService.seedServicesStarterPack(
          savedVenueId,
          category: categoryTitle,
          currency: _currency,
        );
      }

      if (mounted) {
        Navigator.pop(context); // Close dialog

        // 6. Instantly open SuperAdminVenueDetailScreen to proceed with Step 3 (Information Filling)
        final createdVenue = newVenue.copyWith(id: savedVenueId);
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => SuperAdminVenueDetailScreen(venue: createdVenue),
          ),
        );

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Заведение "$name" успешно создано! Переход к наполнению данными.'),
            backgroundColor: AppColors.accentGreen,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Ошибка создания: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isCreating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: const Color(0xFF1C1C1E),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
        side: BorderSide(color: Colors.white.withOpacity(0.15)),
      ),
      child: Container(
        width: 620,
        constraints: const BoxConstraints(maxHeight: 750),
        padding: const EdgeInsets.all(28),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.accentTeal.withOpacity(0.18),
                      border: Border.all(color: AppColors.accentTeal.withOpacity(0.5)),
                    ),
                    child: const Icon(CupertinoIcons.building_2_fill, color: AppColors.accentTeal, size: 22),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          "Создание нового заведения",
                          style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          "Шаги 1 и 2: Регистрация карточки и привязка владельца",
                          style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(CupertinoIcons.xmark, color: Colors.white54, size: 20),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // ── ШАГ 1: БАЗОВЫЕ ДАННЫЕ ──
              _buildSectionHeader("1. ОСНОВНЫЕ ДАННЫЕ ЗАВЕДЕНИЯ"),
              const SizedBox(height: 10),

              const Text("Название заведения *", style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              CupertinoTextField(
                controller: _nameCtrl,
                placeholder: "e.g. SIR VISARANUS Transfers",
                style: const TextStyle(color: Colors.white, fontSize: 14),
                placeholderStyle: TextStyle(color: Colors.white.withOpacity(0.3)),
                padding: const EdgeInsets.all(12),
                decoration: _fieldDecoration(),
              ),
              const SizedBox(height: 16),

              // Archetype Selector Cards
              const Text("Тип / Архетип бизнеса *", style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: _buildArchetypeCard(
                      id: 'batch',
                      title: 'Трансферы & Визаран',
                      subtitle: 'Рейсы, автопарк, рассадка',
                      icon: CupertinoIcons.bus,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildArchetypeCard(
                      id: 'horeca',
                      title: 'Ресторан & Доставка',
                      subtitle: 'Меню блюд, курьеры',
                      icon: CupertinoIcons.cart_fill,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildArchetypeCard(
                      id: 'personal_time',
                      title: 'Услуги по времени',
                      subtitle: 'Мастера, слоты записи',
                      icon: CupertinoIcons.scissors,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Currency & City
              Row(
                children: [
                  Expanded(
                    flex: 1,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("Валюта", style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          decoration: _fieldDecoration(),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              value: _currency,
                              dropdownColor: const Color(0xFF2C2C2E),
                              isExpanded: true,
                              items: const [
                                DropdownMenuItem(value: '฿', child: Text('฿ Бат (THB)', style: TextStyle(color: Colors.white, fontSize: 13))),
                                DropdownMenuItem(value: '₫', child: Text('₫ Донг (VND)', style: TextStyle(color: Colors.white, fontSize: 13))),
                                DropdownMenuItem(value: '₽', child: Text('₽ Рубль (RUB)', style: TextStyle(color: Colors.white, fontSize: 13))),
                                DropdownMenuItem(value: '\$', child: Text('\$ Доллар (USD)', style: TextStyle(color: Colors.white, fontSize: 13))),
                              ],
                              onChanged: (val) {
                                if (val != null) setState(() => _currency = val);
                              },
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("Город / Локация", style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 6),
                        CupertinoTextField(
                          controller: _cityCtrl,
                          placeholder: "Пхукет, Таиланд",
                          style: const TextStyle(color: Colors.white, fontSize: 14),
                          placeholderStyle: TextStyle(color: Colors.white.withOpacity(0.3)),
                          padding: const EdgeInsets.all(12),
                          decoration: _fieldDecoration(),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // ── ШАГ 2: ВЛАДЕЛЕЦ ЗАВЕДЕНИЯ ──
              _buildSectionHeader("2. НАЗНАЧЕНИЕ ВЛАДЕЛЬЦА (OWNER)"),
              const SizedBox(height: 10),

              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("Email владельца", style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 6),
                        CupertinoTextField(
                          controller: _ownerEmailCtrl,
                          placeholder: "owner@company.com",
                          style: const TextStyle(color: Colors.white, fontSize: 14),
                          placeholderStyle: TextStyle(color: Colors.white.withOpacity(0.3)),
                          padding: const EdgeInsets.all(12),
                          decoration: _fieldDecoration(),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("Имя владельца", style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 6),
                        CupertinoTextField(
                          controller: _ownerNameCtrl,
                          placeholder: "Алексей Смирнов",
                          style: const TextStyle(color: Colors.white, fontSize: 14),
                          placeholderStyle: TextStyle(color: Colors.white.withOpacity(0.3)),
                          padding: const EdgeInsets.all(12),
                          decoration: _fieldDecoration(),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Starter Pack Checkbox
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white.withOpacity(0.08)),
                ),
                child: Row(
                  children: [
                    CupertinoSwitch(
                      value: _seedStarterPack,
                      activeColor: AppColors.accentTeal,
                      onChanged: (val) => setState(() => _seedStarterPack = val),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            "Загрузить стартовый шаблон данных",
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                          ),
                          Text(
                            "Базовые категории, правила скидок Yield и шаблоны под выбранный тип бизнеса",
                            style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 28),

              // Actions
              Row(
                children: [
                  TextButton(
                    onPressed: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const VenueEditorScreen()),
                      );
                    },
                    child: Text(
                      "Расширенный редактор",
                      style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 12),
                    ),
                  ),
                  const Spacer(),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.accentTeal,
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      elevation: 4,
                    ),
                    onPressed: _isCreating ? null : _createAndProceed,
                    icon: _isCreating
                        ? const CupertinoActivityIndicator(color: Colors.black)
                        : const Icon(CupertinoIcons.arrow_right, size: 16),
                    label: Text(
                      _isCreating ? "Создание..." : "СОЗДАТЬ И ПЕРЕЙТИ К НАПОЛНЕНИЮ ➔",
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: TextStyle(
        color: AppColors.accentTeal.withOpacity(0.85),
        fontSize: 11,
        fontWeight: FontWeight.w800,
        letterSpacing: 1.2,
      ),
    );
  }

  Widget _buildArchetypeCard({
    required String id,
    required String title,
    required String subtitle,
    required IconData icon,
  }) {
    final isSelected = _archetype == id;
    return InkWell(
      onTap: () => setState(() => _archetype = id),
      borderRadius: BorderRadius.circular(12),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.accentTeal.withOpacity(0.15) : Colors.black.withOpacity(0.25),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppColors.accentTeal : Colors.white.withOpacity(0.1),
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 20, color: isSelected ? AppColors.accentTeal : Colors.white54),
            const SizedBox(height: 8),
            Text(
              title,
              style: TextStyle(
                color: isSelected ? Colors.white : Colors.white70,
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 10),
            ),
          ],
        ),
      ),
    );
  }

  BoxDecoration _fieldDecoration() {
    return BoxDecoration(
      color: Colors.black.withOpacity(0.35),
      borderRadius: BorderRadius.circular(10),
      border: Border.all(color: Colors.white.withOpacity(0.15)),
    );
  }
}
