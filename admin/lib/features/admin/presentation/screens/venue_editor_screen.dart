import 'dart:async';
import 'dart:ui';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/services/venue_service.dart';
import 'package:friendly_code/core/services/direct_services_scraper_service.dart';
import 'package:friendly_code/features/services/presentation/widgets/smart_services_onboarding_dialog.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/auth/auth_service.dart';
import 'package:friendly_code/core/auth/role_provider.dart';
import 'package:provider/provider.dart';

class VenueEditorScreen extends StatefulWidget {
  final VenueModel? venue;
  const VenueEditorScreen({super.key, this.venue});

  @override
  State<VenueEditorScreen> createState() => _VenueEditorScreenState();
}

class _VenueEditorScreenState extends State<VenueEditorScreen> {
  final _formKey = GlobalKey<FormState>();
  final VenuesService _venuesService = VenuesService();

  late TextEditingController _nameCtrl;
  late TextEditingController _ownerEmailCtrl;
  late TextEditingController _categoryCtrl;
  late TextEditingController _addressCtrl;
  late TextEditingController _descCtrl;
  late TextEditingController _googleMapsUrlCtrl;
  late TextEditingController _phoneCtrl;
  late TextEditingController _placeIdCtrl;
  late TextEditingController _googleReviewUrlCtrl;
  late TextEditingController _currencyCtrl;

  String _businessType = 'services';
  bool _seedStarterPack = true;
  ScrapedServiceData? _scrapedServiceData;
  String _selectedLanguage = 'ru';
  bool _isSaving = false;
  bool _hasCaptiveWifi = false;
  bool _isHybridEnabled = false;
  StreamSubscription? _venueSyncSub;
  late TextEditingController _wifiSsidCtrl;
  late TextEditingController _latCtrl;
  late TextEditingController _lngCtrl;
  late TextEditingController _wifiSpeedCtrl;
  late TextEditingController _giftxUrlCtrl;
  
  // Superadmin fields
  bool _isActive = true;
  bool _isManuallyBlocked = false;
  bool _isPaid = false;
  DateTime? _subscriptionExpiry;

  @override
  void initState() {
    super.initState();
    final roleProvider = Provider.of<RoleProvider>(context, listen: false);
    final isSuperAdmin = roleProvider.currentRole == UserRole.superAdmin;
    final currentUser = AuthService().currentUser;

    _nameCtrl = TextEditingController(text: widget.venue?.name ?? '');
    
    String ownerEmail = widget.venue?.ownerEmail ?? '';
    if (widget.venue == null && !isSuperAdmin && currentUser != null) {
      ownerEmail = currentUser.email ?? '';
    }

    _ownerEmailCtrl = TextEditingController(text: ownerEmail);
    _businessType = widget.venue?.gmConfig.businessType ?? 'services';
    _categoryCtrl = TextEditingController(
      text: widget.venue?.category ?? (_businessType == 'services' ? 'Барбершоп' : 'Ресторан')
    );
    _addressCtrl = TextEditingController(text: widget.venue?.address ?? '');
    _descCtrl = TextEditingController(text: widget.venue?.description ?? '');
    _googleMapsUrlCtrl = TextEditingController(text: widget.venue?.googleMapsUrl ?? '');
    _phoneCtrl = TextEditingController(text: widget.venue?.phone ?? '');
    _placeIdCtrl = TextEditingController(text: widget.venue?.placeId ?? '');
    _googleReviewUrlCtrl = TextEditingController(text: widget.venue?.googleReviewUrl ?? '');
    _currencyCtrl = TextEditingController(text: widget.venue?.currency ?? '₽');
    _seedStarterPack = widget.venue == null;

    _wifiSsidCtrl = TextEditingController(text: widget.venue?.wifiSsid ?? '');
    _hasCaptiveWifi = widget.venue?.hasCaptiveWifi ?? false;
    _isHybridEnabled = widget.venue?.isHybridEnabled ?? false;
    _giftxUrlCtrl = TextEditingController(text: widget.venue?.giftxUrl ?? '');
    _selectedLanguage = widget.venue?.defaultLanguage ?? 'ru';
    _latCtrl = TextEditingController(text: widget.venue?.latitude?.toString() ?? '');
    _lngCtrl = TextEditingController(text: widget.venue?.longitude?.toString() ?? '');
    _wifiSpeedCtrl = TextEditingController(text: widget.venue?.wifiSpeedMbps.toString() ?? '100');

    _isActive = widget.venue?.isActive ?? true;
    _isManuallyBlocked = widget.venue?.isManuallyBlocked ?? false;
    _isPaid = widget.venue?.subscription.isPaid ?? false;
    _subscriptionExpiry = widget.venue?.subscription.expiryDate;

    // Auto-parse location coordinates from Google Maps URL input
    _googleMapsUrlCtrl.addListener(() {
      final url = _googleMapsUrlCtrl.text.trim();
      if (url.contains('@')) {
        try {
          final parts = url.split('@')[1].split(',');
          if (parts.length >= 2) {
            final parsedLat = double.tryParse(parts[0]);
            final parsedLng = double.tryParse(parts[1]);
            if (parsedLat != null && parsedLng != null) {
              _latCtrl.text = parsedLat.toString();
              _lngCtrl.text = parsedLng.toString();
            }
          }
        } catch (e) {
          debugPrint("Error parsing Google Maps coords: $e");
        }
      }
    });

    // Auto-generate Google Review URL from placeId
    _placeIdCtrl.addListener(() {
      final pid = _placeIdCtrl.text.trim();
      if (pid.isNotEmpty && (_googleReviewUrlCtrl.text.isEmpty || _googleReviewUrlCtrl.text.contains('writereview'))) {
        _googleReviewUrlCtrl.text = 'https://search.google.com/local/writereview?placeid=$pid';
      }
    });

    // Real-time sync for existing venues
    final venueId = widget.venue?.id;
    if (venueId != null && venueId.isNotEmpty) {
      _venueSyncSub = FirebaseFirestore.instance
          .collection('venues')
          .doc(venueId)
          .snapshots()
          .listen((snap) {
        if (!mounted) return;
        final data = snap.data();
        if (data == null) return;
        final remoteHybrid = data['isHybridEnabled'] as bool? ?? false;
        final remoteGiftxUrl = data['giftxUrl'] as String? ?? '';
        if (remoteHybrid != _isHybridEnabled) {
          setState(() => _isHybridEnabled = remoteHybrid);
        }
        if (_giftxUrlCtrl.text.isEmpty && remoteGiftxUrl.isNotEmpty) {
          _giftxUrlCtrl.text = remoteGiftxUrl;
        }
      });
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _ownerEmailCtrl.dispose();
    _categoryCtrl.dispose();
    _addressCtrl.dispose();
    _descCtrl.dispose();
    _googleMapsUrlCtrl.dispose();
    _phoneCtrl.dispose();
    _placeIdCtrl.dispose();
    _googleReviewUrlCtrl.dispose();
    _currencyCtrl.dispose();
    _wifiSsidCtrl.dispose();
    _latCtrl.dispose();
    _lngCtrl.dispose();
    _wifiSpeedCtrl.dispose();
    _giftxUrlCtrl.dispose();
    _venueSyncSub?.cancel();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSaving = true);

    try {
      final updatedVenue = (widget.venue ?? VenueModel(
        id: '',
        name: '',
        ownerId: AuthService().currentUser?.uid ?? '',
        ownerEmail: '',
        address: '',
        description: '',
        category: '',
        isActive: false,
        createdAt: DateTime.now(),
      )).copyWith(
        name: _nameCtrl.text.trim(),
        ownerEmail: _ownerEmailCtrl.text.trim(),
        category: _categoryCtrl.text.trim(),
        address: _addressCtrl.text.trim(),
        description: _descCtrl.text.trim(),
        googleMapsUrl: _googleMapsUrlCtrl.text.trim(),
        phone: _phoneCtrl.text.trim(),
        placeId: _placeIdCtrl.text.trim().isNotEmpty ? _placeIdCtrl.text.trim() : null,
        googleReviewUrl: _googleReviewUrlCtrl.text.trim().isNotEmpty ? _googleReviewUrlCtrl.text.trim() : null,
        currency: _currencyCtrl.text.trim(),
        hasCaptiveWifi: _hasCaptiveWifi,
        wifiSsid: _wifiSsidCtrl.text,
        latitude: double.tryParse(_latCtrl.text),
        longitude: double.tryParse(_lngCtrl.text),
        wifiSpeedMbps: int.tryParse(_wifiSpeedCtrl.text) ?? 100,
        defaultLanguage: _selectedLanguage,
        isHybridEnabled: _isHybridEnabled,
        giftxUrl: _giftxUrlCtrl.text.trim(),
        isActive: _isActive,
        isManuallyBlocked: _isManuallyBlocked,
        gmConfig: (widget.venue?.gmConfig ?? GoogleMapsConfig()).copyWith(
          businessType: _businessType,
          phone: _phoneCtrl.text.trim(),
        ),
        subscription: VenueSubscription(
          plan: widget.venue?.subscription.plan ?? 'free',
          isPaid: _isPaid,
          startDate: widget.venue?.subscription.startDate,
          expiryDate: _subscriptionExpiry,
        ),
      );

      String savedVenueId = widget.venue?.id ?? '';
      if (widget.venue == null || widget.venue!.id.isEmpty) {
        savedVenueId = await _venuesService.createVenue(updatedVenue);
      } else {
        await _venuesService.updateVenue(updatedVenue);
      }

      // Seed scraped data or starter pack for new Services venue
      if (_scrapedServiceData != null) {
        await _venuesService.seedScrapedServicesData(savedVenueId, _scrapedServiceData!);
      } else if (_seedStarterPack && (widget.venue == null || widget.venue!.id.isEmpty) && _businessType == 'services') {
        await _venuesService.seedServicesStarterPack(
          savedVenueId,
          category: _categoryCtrl.text.trim(),
          currency: _currencyCtrl.text.trim(),
        );
      }

      if (mounted) {
        final origin = Uri.base.origin;
        final pwaUrl = "$origin/?v=$savedVenueId&source=google_maps";

        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            backgroundColor: AppColors.surface,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: const BorderSide(color: AppColors.accentTeal, width: 1.5),
            ),
            title: Row(
              children: [
                const Icon(CupertinoIcons.checkmark_seal_fill, color: AppColors.accentTeal, size: 28),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    widget.venue == null ? "Заведение успешно запущено! 🚀" : "Настройки сохранены",
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
                  ),
                ),
              ],
            ),
            content: SizedBox(
              width: 520,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _businessType == 'services'
                        ? "Профиль: Revoo Services & AI-Консьерж\n${_seedStarterPack && widget.venue == null ? '⚡ Стартовый пакет мастеров, услуг, правил скидок и профиль AI загружен.' : ''}"
                        : "Профиль: HoReCa & Меню доставки",
                    style: const TextStyle(color: AppColors.macosTextSecondary, fontSize: 13, height: 1.4),
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.macosDivider),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(CupertinoIcons.link, color: AppColors.accentTeal, size: 14),
                            SizedBox(width: 6),
                            Text(
                              "Ссылка на PWA-витрину Google Maps:",
                              style: TextStyle(color: AppColors.tertiary, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        SelectableText(
                          pwaUrl,
                          style: const TextStyle(color: AppColors.accentTeal, fontSize: 13, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton.icon(
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: pwaUrl));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text("Ссылка на витрину скопирована в буфер обмена!"),
                      backgroundColor: AppColors.accentTeal,
                    ),
                  );
                },
                icon: const Icon(CupertinoIcons.doc_on_clipboard, size: 16),
                label: const Text("Копировать ссылку"),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.accentTeal,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: () {
                  Navigator.pop(ctx);
                  Navigator.pop(context);
                },
                child: const Text("Готово"),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      debugPrint("Error saving venue: $e");
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isSaving) return const Center(child: CupertinoActivityIndicator(radius: 12));

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: CupertinoButton(
          padding: EdgeInsets.zero,
          child: const Icon(CupertinoIcons.chevron_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 800),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.venue == null ? "Регистрация заведения" : "Редактирование заведения",
                    style: const TextStyle(
                      color: AppColors.macosTextPrimary,
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      letterSpacing: -1.0,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    "Заполните первичные данные карточки партнера и запустите заведение.",
                    style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 15),
                  ),
                  const SizedBox(height: 28),

                  // ── AI SMART ONBOARDING BANNER ──
                  if (widget.venue == null)
                    _buildAiOnboardingBanner(),

                  // ── 1. BUSINESS PROFILE SELECTION ──
                  _buildGlassSection(
                    title: "ПРОФИЛЬ БИЗНЕСА (BUSINESS PROFILE)",
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: _buildProfileCard(
                              title: "Revoo Services",
                              subtitle: "Барбершопы, салоны красоты, СПА, клиники, детейлинг. Запись к мастерам, AI-Консьерж 24/7 и Yield-скидки.",
                              icon: CupertinoIcons.sparkles,
                              isSelected: _businessType == 'services',
                              onTap: () => setState(() {
                                _businessType = 'services';
                                if (_categoryCtrl.text.isEmpty || _categoryCtrl.text == 'Ресторан') {
                                  _categoryCtrl.text = 'Барбершоп';
                                }
                              }),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: _buildProfileCard(
                              title: "HoReCa & Еда",
                              subtitle: "Рестораны, бары, кофейни. Меню блюд, прямая доставка, QR-столики и оплата VietQR.",
                              icon: CupertinoIcons.cart_fill,
                              isSelected: _businessType == 'horeca',
                              onTap: () => setState(() {
                                _businessType = 'horeca';
                                if (_categoryCtrl.text == 'Барбершоп') {
                                  _categoryCtrl.text = 'Ресторан';
                                }
                              }),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),

                  const SizedBox(height: 32),

                  // ── 2. IDENTITY ──
                  _buildGlassSection(
                    title: "ОСНОВНАЯ ИНФОРМАЦИЯ (IDENTITY)",
                    children: [
                      _buildCupertinoField("Название заведения", _nameCtrl, placeholder: "e.g. Top Gun Barbershop"),
                      _buildCupertinoField("Email владельца", _ownerEmailCtrl, placeholder: "owner@example.com"),
                      
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text("Категория", style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 13, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 8),
                          _buildCategoryPills(),
                          CupertinoTextField(
                            controller: _categoryCtrl,
                            placeholder: "e.g. Барбершоп, Салон красоты, СПА",
                            placeholderStyle: TextStyle(color: Colors.white.withValues(alpha: 0.2), fontSize: 14),
                            style: const TextStyle(color: Colors.white, fontSize: 14),
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppColors.macosDivider),
                            ),
                          ),
                          const SizedBox(height: 20),
                        ],
                      ),

                      Row(
                        children: [
                          Expanded(
                            flex: 2,
                            child: _buildCupertinoField(
                              "Телефон / WhatsApp управляющего",
                              _phoneCtrl,
                              placeholder: "+7 999 123-45-67",
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            flex: 1,
                            child: _buildCupertinoField("Валюта", _currencyCtrl, placeholder: "₽ или \$"),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.accentTeal.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.accentTeal.withValues(alpha: 0.2)),
                        ),
                        child: const Row(
                          children: [
                            Icon(CupertinoIcons.info_circle_fill, color: AppColors.accentTeal, size: 16),
                            SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                "На этот номер AI-Консьерж присылает уведомления и принимает команды управляющего по смене расписания и цен.",
                                style: TextStyle(color: Colors.white70, fontSize: 11, height: 1.3),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 32),

                  // ── 3. LOCATION & GOOGLE MAPS ──
                  _buildGlassSection(
                    title: "ЛОКАЦИЯ И ПРИВЯЗКА К GOOGLE MAPS",
                    children: [
                      _buildCupertinoField("Физический адрес", _addressCtrl, placeholder: "ул. Ленина, д. 15, Москва"),
                      _buildCupertinoField("Ссылка на Google Карты (Google Maps Link)", _googleMapsUrlCtrl, placeholder: "https://maps.google.com/?cid=..."),
                      Row(
                        children: [
                          Expanded(
                            child: _buildCupertinoField("Google Place ID", _placeIdCtrl, placeholder: "ChIJN1t_tDeuEmsRUsoyG83frY4"),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: _buildCupertinoField("Прямая ссылка для отзывов Google", _googleReviewUrlCtrl, placeholder: "https://search.google.com/local/writereview?..."),
                          ),
                        ],
                      ),
                      Row(
                        children: [
                          Expanded(
                            child: _buildCupertinoField("Широта (Latitude)", _latCtrl, placeholder: "e.g. 55.7558"),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: _buildCupertinoField("Долгота (Longitude)", _lngCtrl, placeholder: "e.g. 37.6173"),
                          ),
                        ],
                      ),
                      _buildCupertinoField("Краткое описание", _descCtrl, placeholder: "Премиальный барбершоп в центре города...", maxLines: 2),
                    ],
                  ),

                  // ── 4. QUICK-START STARTER PACK FOR SERVICES ──
                  if (_businessType == 'services' && widget.venue == null) ...[
                    const SizedBox(height: 32),
                    _buildGlassSection(
                      title: "СТАРТОВЫЙ ПАКЕТ REVOO SERVICES (QUICK START)",
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    "Загрузить готовый стартовый пакет данных",
                                    style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                                  ),
                                  SizedBox(height: 4),
                                  Text(
                                    "Автоматически создаст 3 услуги (стрижка, борода, комплекс), 1 топ-мастера, 2 правила Yield-скидок и базу знаний AI FAQ. Карточка будет сразу готова к тестам!",
                                    style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 12),
                                  ),
                                ],
                              ),
                            ),
                            CupertinoSwitch(
                              value: _seedStarterPack,
                              activeColor: AppColors.accentTeal,
                              onChanged: (val) => setState(() => _seedStarterPack = val),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],

                  const SizedBox(height: 32),

                  // ── 5. LANGUAGE ──
                  _buildGlassSection(
                    title: "ЯЗЫК ПО УМОЛЧАНИЮ",
                    children: [
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.macosDivider),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: _selectedLanguage,
                            dropdownColor: AppColors.macosSurfaceBg,
                            style: const TextStyle(color: Colors.white, fontSize: 14),
                            icon: const Icon(CupertinoIcons.chevron_down, color: AppColors.macosTextSecondary, size: 14),
                            onChanged: (val) {
                              if (val != null) setState(() => _selectedLanguage = val);
                            },
                            items: const [
                              DropdownMenuItem(value: 'ru', child: Text("Русский")),
                              DropdownMenuItem(value: 'en', child: Text("English")),
                              DropdownMenuItem(value: 'vi', child: Text("Tiếng Việt")),
                              DropdownMenuItem(value: 'ar', child: Text("العربية")),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),

                  // ── 6. SUPERADMIN CONTROLS ──
                  const SizedBox(height: 32),
                  _buildGlassSection(
                    title: "СТАТУС И ПОДПИСКА (SUPERADMIN)",
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text("Активно (видимо гостям)", style: TextStyle(color: Colors.white, fontSize: 14)),
                          CupertinoSwitch(
                            value: _isActive,
                            activeColor: AppColors.accentTeal,
                            onChanged: (val) => setState(() => _isActive = val),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text("Блокировка заведения", style: TextStyle(color: Colors.white, fontSize: 14)),
                          CupertinoSwitch(
                            value: _isManuallyBlocked,
                            activeColor: Colors.red,
                            onChanged: (val) => setState(() => _isManuallyBlocked = val),
                          ),
                        ],
                      ),
                      const Divider(color: AppColors.macosDivider, height: 32),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text("Оплачено (Paid Subscription)", style: TextStyle(color: Colors.white, fontSize: 14)),
                          CupertinoSwitch(
                            value: _isPaid,
                            activeColor: AppColors.accentTeal,
                            onChanged: (val) => setState(() => _isPaid = val),
                          ),
                        ],
                      ),
                    ],
                  ),

                  const SizedBox(height: 48),

                  SizedBox(
                    width: double.infinity,
                    height: 54,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.accentTeal,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        elevation: 4,
                      ),
                      onPressed: _save,
                      child: Text(
                        widget.venue == null ? "🚀 ЗАПУСТИТЬ ЗАВЕДЕНИЕ" : "СОХРАНИТЬ ИЗМЕНЕНИЯ",
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, letterSpacing: 0.5),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildProfileCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.accentTeal.withValues(alpha: 0.15) : Colors.black.withValues(alpha: 0.2),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? AppColors.accentTeal : AppColors.macosDivider,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: isSelected ? AppColors.accentTeal : Colors.white70, size: 24),
                const SizedBox(width: 10),
                Text(
                  title,
                  style: TextStyle(
                    color: isSelected ? Colors.white : Colors.white70,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                const Spacer(),
                if (isSelected)
                  const Icon(CupertinoIcons.checkmark_circle_fill, color: AppColors.accentTeal, size: 20),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              style: const TextStyle(color: AppColors.macosTextSecondary, fontSize: 12, height: 1.3),
            ),
          ],
        ),
      ),
    );
  }

  void _openSmartOnboarding() {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => SmartServicesOnboardingDialog(
        onApply: (data) {
          setState(() {
            _scrapedServiceData = data;
            final v = data.venue;
            if (v['name'] != null && v['name'].toString().isNotEmpty) {
              _nameCtrl.text = v['name'].toString();
            }
            if (v['category'] != null && v['category'].toString().isNotEmpty) {
              _categoryCtrl.text = v['category'].toString();
            }
            if (v['description'] != null && v['description'].toString().isNotEmpty) {
              _descCtrl.text = v['description'].toString();
            }
            if (v['phone'] != null && v['phone'].toString().isNotEmpty) {
              _phoneCtrl.text = v['phone'].toString();
            }
            if (v['address'] != null && v['address'].toString().isNotEmpty) {
              _addressCtrl.text = v['address'].toString();
            }
            if (v['currency'] != null && v['currency'].toString().isNotEmpty) {
              _currencyCtrl.text = v['currency'].toString();
            }
            if (v['googleMapsUrl'] != null && v['googleMapsUrl'].toString().isNotEmpty) {
              _googleMapsUrlCtrl.text = v['googleMapsUrl'].toString();
            }
            _businessType = 'services';
            _seedStarterPack = false;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text("✨ Карточка заведения и база знаний AI успешно заполнены!"),
              backgroundColor: AppColors.accentTeal,
            ),
          );
        },
      ),
    );
  }

  Widget _buildAiOnboardingBanner() {
    final hasData = _scrapedServiceData != null;
    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: hasData ? AppColors.accentGreen.withValues(alpha: 0.08) : AppColors.accentTeal.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: hasData ? AppColors.accentGreen : AppColors.accentTeal.withValues(alpha: 0.4),
          width: 1.5,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: (hasData ? AppColors.accentGreen : AppColors.accentTeal).withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              hasData ? CupertinoIcons.checkmark_seal_fill : CupertinoIcons.sparkles,
              color: hasData ? AppColors.accentGreen : AppColors.accentTeal,
              size: 22,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  hasData 
                    ? "✨ Данные заведения успешно сформированы через AI"
                    : "🤖 Умный AI-онбординг из ссылки (Google Maps / Сайт)",
                  style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 3),
                Text(
                  hasData
                    ? "Извлечено ${_scrapedServiceData!.services.length} услуг/рейсов, сформирован цифровой паспорт AI и ответы на вопросы."
                    : "Вставьте ссылку на Google Maps, сайт или описание — Gemini сам создаст направления, цены, правила и обучит AI-консьержа.",
                  style: const TextStyle(color: AppColors.macosTextSecondary, fontSize: 12),
                ),
              ],
            ),
          ),
          const SizedBox(width: 14),
          CupertinoButton(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
            color: hasData ? Colors.white.withValues(alpha: 0.1) : AppColors.accentTeal,
            onPressed: _openSmartOnboarding,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  hasData ? CupertinoIcons.arrow_2_circlepath : CupertinoIcons.bolt_fill,
                  color: hasData ? Colors.white : Colors.black,
                  size: 16,
                ),
                const SizedBox(width: 6),
                Text(
                  hasData ? "Изменить / Заново" : "Запустить AI-анализ",
                  style: TextStyle(
                    color: hasData ? Colors.white : Colors.black,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryPills() {
    final suggestions = _businessType == 'services'
        ? ['Бордер-ран', 'Визаран', 'Трансфер', 'СПА & Массаж', 'Барбершоп', 'Салон красоты', 'Детейлинг']
        : ['Ресторан', 'Кафе', 'Бар', 'Кофейня', 'Пиццерия'];

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: suggestions.map((cat) {
          final isCurrent = _categoryCtrl.text.trim().toLowerCase() == cat.toLowerCase();
          return GestureDetector(
            onTap: () => setState(() => _categoryCtrl.text = cat),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: isCurrent ? AppColors.accentTeal.withValues(alpha: 0.2) : Colors.white.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: isCurrent ? AppColors.accentTeal : AppColors.macosDivider,
                ),
              ),
              child: Text(
                cat,
                style: TextStyle(
                  color: isCurrent ? AppColors.accentTeal : Colors.white70,
                  fontSize: 12,
                  fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildGlassSection({required String title, required List<Widget> children}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 12, bottom: 12),
          child: Text(
            title,
            style: const TextStyle(color: AppColors.accentTeal, fontWeight: FontWeight.w800, fontSize: 11, letterSpacing: 1.2),
          ),
        ),
        ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.macosSurfaceBg,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.macosDivider),
              ),
              child: Column(children: children),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCupertinoField(String label, TextEditingController controller, {String? placeholder, int maxLines = 1}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: AppColors.macosTextSecondary, fontSize: 13, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          CupertinoTextField(
            controller: controller,
            placeholder: placeholder,
            placeholderStyle: TextStyle(color: Colors.white.withValues(alpha: 0.2), fontSize: 14),
            style: const TextStyle(color: Colors.white, fontSize: 14),
            padding: const EdgeInsets.all(16),
            maxLines: maxLines,
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.macosDivider),
            ),
          ),
        ],
      ),
    );
  }
}
