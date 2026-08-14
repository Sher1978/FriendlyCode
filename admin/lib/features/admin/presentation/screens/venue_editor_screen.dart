import 'dart:async';
import 'dart:ui';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/services/venue_service.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/auth/auth_service.dart';
import 'package:friendly_code/core/auth/role_provider.dart';
import 'package:provider/provider.dart';
import 'package:friendly_code/l10n/app_localizations.dart';

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

  String _selectedLanguage = 'en';
  bool _isSaving = false;
  bool _hasCaptiveWifi = false;
  bool _isHybridEnabled = false;
  StreamSubscription? _venueSyncSub; // Real-time sync with header toggle
  late TextEditingController _wifiSsidCtrl;
  late TextEditingController _latCtrl;
  late TextEditingController _lngCtrl;
  late TextEditingController _wifiSpeedCtrl;
  late TextEditingController _giftxUrlCtrl;

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
    _categoryCtrl = TextEditingController(text: widget.venue?.category ?? 'General');
    _addressCtrl = TextEditingController(text: widget.venue?.address ?? '');
    _descCtrl = TextEditingController(text: widget.venue?.description ?? '');
    _googleMapsUrlCtrl = TextEditingController(text: widget.venue?.googleMapsUrl ?? '');
    _wifiSsidCtrl = TextEditingController(text: widget.venue?.wifiSsid ?? '');
    _hasCaptiveWifi = widget.venue?.hasCaptiveWifi ?? false;
    _isHybridEnabled = widget.venue?.isHybridEnabled ?? false;
    _giftxUrlCtrl = TextEditingController(text: widget.venue?.giftxUrl ?? '');
    _selectedLanguage = widget.venue?.defaultLanguage ?? 'en';
    _latCtrl = TextEditingController(text: widget.venue?.latitude?.toString() ?? '');
    _lngCtrl = TextEditingController(text: widget.venue?.longitude?.toString() ?? '');
    _wifiSpeedCtrl = TextEditingController(text: widget.venue?.wifiSpeedMbps?.toString() ?? '100');

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

    // ── Real-time sync: keep isHybridEnabled in sync with Firestore ──
    // If the header button toggles it, this screen reflects the change immediately.
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
        // Only update if changed externally (avoid overriding user's unsaved input)
        if (remoteHybrid != _isHybridEnabled) {
          setState(() => _isHybridEnabled = remoteHybrid);
        }
        // Sync giftxUrl only if field is empty (user hasn't typed anything)
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
        name: _nameCtrl.text,
        ownerEmail: _ownerEmailCtrl.text,
        category: _categoryCtrl.text,
        address: _addressCtrl.text,
        description: _descCtrl.text,
        googleMapsUrl: _googleMapsUrlCtrl.text,
        hasCaptiveWifi: _hasCaptiveWifi,
        wifiSsid: _wifiSsidCtrl.text,
        latitude: double.tryParse(_latCtrl.text),
        longitude: double.tryParse(_lngCtrl.text),
        wifiSpeedMbps: int.tryParse(_wifiSpeedCtrl.text) ?? 100,
        defaultLanguage: _selectedLanguage,
        isHybridEnabled: _isHybridEnabled,
        giftxUrl: _giftxUrlCtrl.text.trim(),
      );

      if (widget.venue == null) {
        await _venuesService.createVenue(updatedVenue);
      } else {
        await _venuesService.updateVenue(updatedVenue);
      }

      if (mounted) {
        showCupertinoDialog(
          context: context,
          builder: (ctx) => CupertinoAlertDialog(
            title: const Text("Success"),
            content: const Text("Venue details saved successfully."),
            actions: [
              CupertinoDialogAction(
                child: const Text("OK"), 
                onPressed: () {
                  Navigator.pop(ctx);
                  Navigator.pop(context);
                }
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
                    widget.venue == null ? "Register Venue" : "Edit Venue",
                    style: const TextStyle(
                      color: AppColors.macosTextPrimary,
                      fontSize: 34,
                      fontWeight: FontWeight.bold,
                      letterSpacing: -1.0,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    "Provide basic information about your establishment.",
                    style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 16),
                  ),
                  const SizedBox(height: 48),

                  _buildGlassSection(
                    title: "IDENTITY",
                    children: [
                      _buildCupertinoField("Venue Name", _nameCtrl, placeholder: "e.g. Skyline Lounge"),
                      _buildCupertinoField("Owner Email", _ownerEmailCtrl, placeholder: "owner@example.com"),
                      _buildCupertinoField("Category", _categoryCtrl, placeholder: "e.g. Bar, Cafe, Restaurant"),
                    ],
                  ),

                  const SizedBox(height: 32),

                  _buildGlassSection(
                    title: "PORTAL DEFAULT LANGUAGE / ЯЗЫК ПО УМОЛЧАНИЮ",
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            "Default language for guest portal & C2C landing pages",
                            style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 13, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 10),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(0.2),
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
                                  DropdownMenuItem(value: 'en', child: Text("English")),
                                  DropdownMenuItem(value: 'ru', child: Text("Русский")),
                                  DropdownMenuItem(value: 'vi', child: Text("Tiếng Việt")),
                                  DropdownMenuItem(value: 'ar', child: Text("العربية")),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),

                  const SizedBox(height: 32),

                  _buildGlassSection(
                    title: "LOCATION & DETAILS",
                    children: [
                      _buildCupertinoField("Physical Address", _addressCtrl, placeholder: "Street, City, Country"),
                      _buildCupertinoField("Google Maps Link", _googleMapsUrlCtrl, placeholder: "https://maps.google.com/..."),
                      Row(
                        children: [
                          Expanded(
                            child: _buildCupertinoField("Latitude (Широта)", _latCtrl, placeholder: "e.g. 12.238791"),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: _buildCupertinoField("Longitude (Долгота)", _lngCtrl, placeholder: "e.g. 109.196749"),
                          ),
                        ],
                      ),
                      _buildCupertinoField("Description", _descCtrl, placeholder: "Briefly describe your venue", maxLines: 3),
                    ],
                  ),

                  const SizedBox(height: 32),

                  _buildGlassSection(
                    title: "НАСТРОЙКИ CAPTIVE WI-FI И КАРТЫ ПИНОВ",
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Expanded(
                            child: Text(
                              "Активировать модуль Captive Wi-Fi (Revo Box)",
                              style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600),
                            ),
                          ),
                          CupertinoSwitch(
                            value: _hasCaptiveWifi,
                            activeColor: AppColors.accentOrange,
                            onChanged: (bool val) {
                              setState(() {
                                _hasCaptiveWifi = val;
                              });
                            },
                          ),
                        ],
                      ),
                      if (_hasCaptiveWifi) ...[
                        const SizedBox(height: 20),
                        _buildCupertinoField(
                          "Скорость сети Wi-Fi (Мбит/с)",
                          _wifiSpeedCtrl,
                          placeholder: "100",
                        ),
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.05),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.white.withOpacity(0.1)),
                          ),
                          child: const Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                "⚡ Автоматическая настройка точки:",
                                style: TextStyle(color: AppColors.accentOrange, fontSize: 12, fontWeight: FontWeight.bold),
                              ),
                              SizedBox(height: 6),
                              Text(
                                "• Локация и пин на карте извлекаются автоматически из ссылки Google Maps.\n"
                                "• Размер скидки при подключении генерируется автоматически из лояльности заведения.",
                                style: TextStyle(color: Colors.white70, fontSize: 12, height: 1.4),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),

                  const SizedBox(height: 32),

                  _buildGlassSection(
                    title: "НАСТРОЙКИ ГИБРИДНОЙ СТРАНИЦЫ (REVOO + GIFTX)",
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  "Активировать гибридный выбор перед сканированием",
                                  style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600),
                                ),
                                SizedBox(height: 2),
                                Text(
                                  "Показывает страницу выбора между REVOO и GiftX при сканировании QR-кода",
                                  style: TextStyle(color: Colors.white54, fontSize: 12),
                                ),
                              ],
                            ),
                          ),
                          CupertinoSwitch(
                            value: _isHybridEnabled,
                            activeColor: AppColors.accentYellow,
                            onChanged: (bool val) {
                              setState(() {
                                _isHybridEnabled = val;
                              });
                            },
                          ),
                        ],
                      ),
                      if (_isHybridEnabled) ...[
                        const SizedBox(height: 20),
                        _buildCupertinoField(
                          "Прямая ссылка GiftX для данного заведения",
                          _giftxUrlCtrl,
                          placeholder: "https://giftx.app/v/your_venue_id",
                        ),
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.05),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.white.withOpacity(0.1)),
                          ),
                          child: const Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                "🎁 Логика работы страницы выбора:",
                                style: TextStyle(color: AppColors.accentYellow, fontSize: 12, fontWeight: FontWeight.bold),
                              ),
                              SizedBox(height: 6),
                              Text(
                                "• Единый гибридный QR-код ведет гостя на страницу презентации обеих систем.\n"
                                "• Нажатие на кнопку REVOO ведет гостя на вашу страницу лояльности.\n"
                                "• Нажатие на кнопку GiftX перенаправляет гостя по указанной выше прямой ссылке GiftX.",
                                style: TextStyle(color: Colors.white70, fontSize: 12, height: 1.4),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),

                  const SizedBox(height: 48),

                  SizedBox(
                    width: double.infinity,
                    child: CupertinoButton.filled(
                      onPressed: _save,
                      borderRadius: BorderRadius.circular(10),
                      child: const Text("SUBMIT DETAILS", style: TextStyle(fontWeight: FontWeight.bold)),
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

  Widget _buildGlassSection({required String title, required List<Widget> children}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 12, bottom: 12),
          child: Text(
            title,
            style: const TextStyle(color: AppColors.accentOrange, fontWeight: FontWeight.w800, fontSize: 11, letterSpacing: 1.2),
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
            placeholderStyle: TextStyle(color: Colors.white.withOpacity(0.2), fontSize: 14),
            style: const TextStyle(color: Colors.white, fontSize: 14),
            padding: const EdgeInsets.all(16),
            maxLines: maxLines,
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.2),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.macosDivider),
            ),
          ),
        ],
      ),
    );
  }
}
