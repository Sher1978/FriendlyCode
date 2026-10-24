import 'dart:ui';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/data/venue_repository.dart';
import 'package:friendly_code/core/theme/colors.dart';

class VenueRegionalSettingsScreen extends StatefulWidget {
  final String venueId;

  const VenueRegionalSettingsScreen({super.key, required this.venueId});

  @override
  State<VenueRegionalSettingsScreen> createState() => _VenueRegionalSettingsScreenState();
}

class _VenueRegionalSettingsScreenState extends State<VenueRegionalSettingsScreen> {
  final VenueRepository _venueRepo = VenueRepository();
  bool _isSaving = false;
  bool _isInitialized = false;

  // Regional Fields
  String _selectedLanguage = 'en';
  String _selectedCurrency = 'VND';
  String _currencyPosition = 'suffix';
  String _selectedTimezone = 'Asia/Ho_Chi_Minh';
  String _countryCode = 'VN';

  late TextEditingController _phoneCtrl;
  late TextEditingController _addressCtrl;
  late TextEditingController _googleMapsUrlCtrl;

  // Operating Hours State
  late Map<String, DaySchedule> _scheduleMap;

  final List<Map<String, String>> _availableLanguages = [
    {'code': 'ru', 'name': 'Русский (RU)', 'flag': '🇷🇺'},
    {'code': 'en', 'name': 'English (EN)', 'flag': '🇬🇧'},
    {'code': 'vi', 'name': 'Tiếng Việt (VI)', 'flag': '🇻🇳'},
    {'code': 'hi', 'name': 'हिन्दी (Hindi)', 'flag': '🇮🇳'},
    {'code': 'ar', 'name': 'العربية (Arabic)', 'flag': '🇦🇪'},
  ];

  final List<Map<String, String>> _availableCurrencies = [
    {'code': 'VND', 'symbol': '₫', 'name': 'Вьетнамский донг (₫)'},
    {'code': 'RUB', 'symbol': '₽', 'name': 'Российский рубль (₽)'},
    {'code': 'USD', 'symbol': '\$', 'name': 'Доллар США (\$)'},
    {'code': 'AED', 'symbol': 'د.إ', 'name': 'Дирхам ОАЭ (AED)'},
    {'code': 'INR', 'symbol': '₹', 'name': 'Индийская рупия (₹)'},
    {'code': 'EUR', 'symbol': '€', 'name': 'Евро (€)'},
    {'code': 'THB', 'symbol': '฿', 'name': 'Тайский бат (฿)'},
    {'code': 'IDR', 'symbol': 'Rp', 'name': 'Индонезийская рупия (Rp)'},
  ];

  final List<Map<String, String>> _availableTimezones = [
    {'id': 'Asia/Ho_Chi_Minh', 'name': 'Вьетнам / Таиланд (GMT+7)'},
    {'id': 'Asia/Dubai', 'name': 'ОАЭ / Дубай (GMT+4)'},
    {'id': 'Asia/Kolkata', 'name': 'Индия (GMT+5:30)'},
    {'id': 'Europe/Moscow', 'name': 'Москва (GMT+3)'},
    {'id': 'Asia/Bangkok', 'name': 'Бангкок (GMT+7)'},
    {'id': 'Asia/Bali', 'name': 'Бали / Индонезия (GMT+8)'},
    {'id': 'Europe/London', 'name': 'Лондон (GMT+0)'},
    {'id': 'America/New_York', 'name': 'Нью-Йорк (GMT-5)'},
  ];

  final List<String> _daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  final Map<String, String> _dayLabelsRu = {
    'monday': 'Понедельник',
    'tuesday': 'Вторник',
    'wednesday': 'Среда',
    'thursday': 'Четверг',
    'friday': 'Пятница',
    'saturday': 'Суббота',
    'sunday': 'Воскресенье',
  };

  @override
  void initState() {
    super.initState();
    _phoneCtrl = TextEditingController();
    _addressCtrl = TextEditingController();
    _googleMapsUrlCtrl = TextEditingController();

    _scheduleMap = {
      'monday': const DaySchedule(isOpen: true, openTime: "10:00", closeTime: "23:00"),
      'tuesday': const DaySchedule(isOpen: true, openTime: "10:00", closeTime: "23:00"),
      'wednesday': const DaySchedule(isOpen: true, openTime: "10:00", closeTime: "23:00"),
      'thursday': const DaySchedule(isOpen: true, openTime: "10:00", closeTime: "23:00"),
      'friday': const DaySchedule(isOpen: true, openTime: "10:00", closeTime: "23:00"),
      'saturday': const DaySchedule(isOpen: true, openTime: "10:00", closeTime: "23:00"),
      'sunday': const DaySchedule(isOpen: true, openTime: "10:00", closeTime: "23:00"),
    };
  }

  void _initFromVenue(VenueModel venue) {
    if (_isInitialized) return;
    _isInitialized = true;

    _selectedLanguage = venue.defaultLanguage.isNotEmpty ? venue.defaultLanguage : 'en';
    _selectedCurrency = venue.currency.isNotEmpty ? venue.currency : 'VND';
    _currencyPosition = venue.currencyPosition.isNotEmpty ? venue.currencyPosition : (_selectedCurrency == 'USD' || _selectedCurrency == 'INR' ? 'prefix' : 'suffix');
    _selectedTimezone = venue.timezone.isNotEmpty ? venue.timezone : 'Asia/Ho_Chi_Minh';
    _countryCode = venue.countryCode.isNotEmpty ? venue.countryCode : 'VN';

    _phoneCtrl.text = venue.phone.isNotEmpty ? venue.phone : (venue.gmConfig.phone);
    _addressCtrl.text = venue.address;
    _googleMapsUrlCtrl.text = venue.googleMapsUrl ?? '';

    final op = venue.operatingHours;
    _scheduleMap = {
      'monday': op.monday,
      'tuesday': op.tuesday,
      'wednesday': op.wednesday,
      'thursday': op.thursday,
      'friday': op.friday,
      'saturday': op.saturday,
      'sunday': op.sunday,
    };
  }

  @override
  void dispose() {
    _phoneCtrl.dispose();
    _addressCtrl.dispose();
    _googleMapsUrlCtrl.dispose();
    super.dispose();
  }

  void _applyPreset(String preset) {
    setState(() {
      if (preset == 'standard_10_23') {
        for (var day in _daysOrder) {
          _scheduleMap[day] = const DaySchedule(isOpen: true, openTime: "10:00", closeTime: "23:00");
        }
      } else if (preset == 'round_the_clock') {
        for (var day in _daysOrder) {
          _scheduleMap[day] = const DaySchedule(isOpen: true, openTime: "00:00", closeTime: "23:59");
        }
      } else if (preset == 'weekdays_weekends') {
        for (var day in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']) {
          _scheduleMap[day] = const DaySchedule(isOpen: true, openTime: "09:00", closeTime: "22:00");
        }
        for (var day in ['saturday', 'sunday']) {
          _scheduleMap[day] = const DaySchedule(isOpen: true, openTime: "10:00", closeTime: "00:00");
        }
      } else if (preset == 'night_club') {
        for (var day in _daysOrder) {
          _scheduleMap[day] = const DaySchedule(isOpen: true, openTime: "18:00", closeTime: "04:00");
        }
      }
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text("Шаблон расписания применен! Не забудьте сохранить."),
        backgroundColor: AppColors.accentOrange,
        duration: Duration(seconds: 2),
      ),
    );
  }

  Future<void> _saveSettings() async {
    if (widget.venueId.isEmpty) return;

    setState(() => _isSaving = true);
    try {
      final hours = VenueOperatingHours(
        monday: _scheduleMap['monday'] ?? const DaySchedule(),
        tuesday: _scheduleMap['tuesday'] ?? const DaySchedule(),
        wednesday: _scheduleMap['wednesday'] ?? const DaySchedule(),
        thursday: _scheduleMap['thursday'] ?? const DaySchedule(),
        friday: _scheduleMap['friday'] ?? const DaySchedule(),
        saturday: _scheduleMap['saturday'] ?? const DaySchedule(),
        sunday: _scheduleMap['sunday'] ?? const DaySchedule(),
      );

      final updateData = {
        'defaultLanguage': _selectedLanguage,
        'currency': _selectedCurrency,
        'currencyPosition': _currencyPosition,
        'timezone': _selectedTimezone,
        'countryCode': _countryCode,
        'phone': _phoneCtrl.text.trim(),
        'address': _addressCtrl.text.trim(),
        'googleMapsUrl': _googleMapsUrlCtrl.text.trim(),
        'operatingHours': hours.toMap(),
        'updatedAt': FieldValue.serverTimestamp(),
      };

      await _venueRepo.updateVenue(widget.venueId, updateData);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Row(
              children: [
                Icon(Icons.check_circle, color: Colors.white),
                SizedBox(width: 12),
                Text("Глобальные и региональные настройки успешно сохранены!", style: TextStyle(fontWeight: FontWeight.bold)),
              ],
            ),
            backgroundColor: AppColors.accentGreen,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Ошибка сохранения: $e"),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.venueId.isEmpty) {
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(
          child: Text("Выберите заведение для настройки", style: TextStyle(color: Colors.white70)),
        ),
      );
    }

    return StreamBuilder<VenueModel?>(
      stream: _venueRepo.getVenueStream(widget.venueId),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting && !_isInitialized) {
          return const Scaffold(
            backgroundColor: AppColors.background,
            body: Center(child: CupertinoActivityIndicator(color: AppColors.accentOrange)),
          );
        }

        final venue = snapshot.data;
        if (venue != null && !_isInitialized) {
          _initFromVenue(venue);
        }

        final currentHours = VenueOperatingHours(
          monday: _scheduleMap['monday'] ?? const DaySchedule(),
          tuesday: _scheduleMap['tuesday'] ?? const DaySchedule(),
          wednesday: _scheduleMap['wednesday'] ?? const DaySchedule(),
          thursday: _scheduleMap['thursday'] ?? const DaySchedule(),
          friday: _scheduleMap['friday'] ?? const DaySchedule(),
          saturday: _scheduleMap['saturday'] ?? const DaySchedule(),
          sunday: _scheduleMap['sunday'] ?? const DaySchedule(),
        );
        final bool isNowOpen = currentHours.isCurrentlyOpen();

        return Scaffold(
          backgroundColor: AppColors.background,
          body: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                _buildHeader(),
                const SizedBox(height: 28),

                // Live Status Banner
                _buildLiveStatusBanner(isNowOpen),
                const SizedBox(height: 28),

                // Section 1: Regional & Currency
                _buildRegionalParametersCard(),
                const SizedBox(height: 28),

                // Section 2: Operating Hours & Schedule
                _buildOperatingHoursCard(),
                const SizedBox(height: 28),

                // Section 3: Contact & Address
                _buildContactLocationCard(),
                const SizedBox(height: 32),

                // Bottom Save Action
                _buildBottomSaveBar(),
                const SizedBox(height: 50),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildBottomSaveBar() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.accentOrange.withOpacity(0.35)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "Сохранить региональные настройки",
                  style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                ),
                SizedBox(height: 4),
                Text(
                  "Выбранная валюта, язык, часовой пояс и график работы применятся для всех модулей и бота.",
                  style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 12),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.accentOrange,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              elevation: 4,
            ),
            icon: _isSaving 
                ? const SizedBox(width: 18, height: 18, child: CupertinoActivityIndicator(color: Colors.white))
                : const Icon(CupertinoIcons.checkmark_alt, size: 20, color: Colors.white),
            label: Text(
              _isSaving ? "СОХРАНЕНИЕ..." : "СОХРАНИТЬ",
              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, letterSpacing: 0.8),
            ),
            onPressed: _isSaving ? null : _saveSettings,
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return const Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          "РЕГИОНАЛЬНЫЕ НАСТРОЙКИ",
          style: TextStyle(
            color: Colors.white,
            fontSize: 24,
            fontWeight: FontWeight.w900,
            letterSpacing: -0.5,
          ),
        ),
        SizedBox(height: 6),
        Text(
          "Язык заведения, валюта, расписание и часы работы, часовой пояс и контакты.",
          style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 13),
        ),
      ],
    );
  }

  Widget _buildLiveStatusBanner(bool isNowOpen) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isNowOpen ? AppColors.accentGreen.withOpacity(0.12) : Colors.redAccent.withOpacity(0.12),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isNowOpen ? AppColors.accentGreen.withOpacity(0.4) : Colors.redAccent.withOpacity(0.4),
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isNowOpen ? AppColors.accentGreen.withOpacity(0.2) : Colors.redAccent.withOpacity(0.2),
            ),
            child: Icon(
              isNowOpen ? CupertinoIcons.check_mark_circled_solid : CupertinoIcons.xmark_circle_fill,
              color: isNowOpen ? AppColors.accentGreen : Colors.redAccent,
              size: 22,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isNowOpen ? "ЗАВЕДЕНИЕ СЕЙЧАС ОТКРЫТО" : "ЗАВЕДЕНИЕ СЕЙЧАС ЗАКРЫТО",
                  style: TextStyle(
                    color: isNowOpen ? AppColors.accentGreen : Colors.redAccent,
                    fontSize: 14,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  isNowOpen
                      ? "Гости видят активное меню, могут оформлять онлайн-доставку и посещать заведение."
                      : "В нерабочие часы гостям показывается предупреждение о закрытии и время открытия.",
                  style: const TextStyle(color: Colors.white70, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRegionalParametersCard() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0x331C1C1E),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(CupertinoIcons.globe, color: AppColors.accentOrange, size: 20),
              SizedBox(width: 10),
              Text(
                "ЯЗЫК, ВАЛЮТА И РЕГИОН",
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 15, letterSpacing: 0.5),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Grid for Language, Currency, Timezone
          LayoutBuilder(
            builder: (context, constraints) {
              final isNarrow = constraints.maxWidth < 650;
              return Wrap(
                spacing: 20,
                runSpacing: 18,
                children: [
                  // Language Dropdown
                  SizedBox(
                    width: isNarrow ? constraints.maxWidth : (constraints.maxWidth - 20) / 2,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("Основной язык заведения", style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.06),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.white.withOpacity(0.12)),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              value: _selectedLanguage,
                              dropdownColor: const Color(0xFF2C2C2E),
                              isExpanded: true,
                              items: _availableLanguages.map((lang) {
                                return DropdownMenuItem<String>(
                                  value: lang['code'],
                                  child: Text("${lang['flag']} ${lang['name']}", style: const TextStyle(color: Colors.white, fontSize: 13.5)),
                                );
                              }).toList(),
                              onChanged: (val) {
                                if (val != null) setState(() => _selectedLanguage = val);
                              },
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Currency Dropdown
                  SizedBox(
                    width: isNarrow ? constraints.maxWidth : (constraints.maxWidth - 20) / 2,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("Валюта заведения", style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.06),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.white.withOpacity(0.12)),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              value: _selectedCurrency,
                              dropdownColor: const Color(0xFF2C2C2E),
                              isExpanded: true,
                              items: _availableCurrencies.map((cur) {
                                return DropdownMenuItem<String>(
                                  value: cur['code'],
                                  child: Text("${cur['symbol']} — ${cur['name']}", style: const TextStyle(color: Colors.white, fontSize: 13.5)),
                                );
                              }).toList(),
                              onChanged: (val) {
                                if (val != null) {
                                  setState(() {
                                    _selectedCurrency = val;
                                    if (val == 'USD' || val == 'INR') {
                                      _currencyPosition = 'prefix';
                                    } else {
                                      _currencyPosition = 'suffix';
                                    }
                                  });
                                }
                              },
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Currency Position
                  SizedBox(
                    width: isNarrow ? constraints.maxWidth : (constraints.maxWidth - 20) / 2,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("Положение символа валюты", style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.06),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.white.withOpacity(0.12)),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: InkWell(
                                  onTap: () => setState(() => _currencyPosition = 'suffix'),
                                  borderRadius: BorderRadius.circular(10),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(vertical: 10),
                                    decoration: BoxDecoration(
                                      color: _currencyPosition == 'suffix' ? AppColors.accentOrange : Colors.transparent,
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: const Center(
                                      child: Text(
                                        "После суммы (150 000 ₫)",
                                        style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                              Expanded(
                                child: InkWell(
                                  onTap: () => setState(() => _currencyPosition = 'prefix'),
                                  borderRadius: BorderRadius.circular(10),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(vertical: 10),
                                    decoration: BoxDecoration(
                                      color: _currencyPosition == 'prefix' ? AppColors.accentOrange : Colors.transparent,
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: const Center(
                                      child: Text(
                                        "Перед суммой (\$150)",
                                        style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Timezone Dropdown
                  SizedBox(
                    width: isNarrow ? constraints.maxWidth : (constraints.maxWidth - 20) / 2,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("Часовой пояс (Timezone)", style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.06),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.white.withOpacity(0.12)),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              value: _selectedTimezone,
                              dropdownColor: const Color(0xFF2C2C2E),
                              isExpanded: true,
                              items: _availableTimezones.map((tz) {
                                return DropdownMenuItem<String>(
                                  value: tz['id'],
                                  child: Text(tz['name']!, style: const TextStyle(color: Colors.white, fontSize: 13.5)),
                                );
                              }).toList(),
                              onChanged: (val) {
                                if (val != null) setState(() => _selectedTimezone = val);
                              },
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildOperatingHoursCard() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0x331C1C1E),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(CupertinoIcons.time, color: AppColors.accentOrange, size: 20),
                  SizedBox(width: 10),
                  Text(
                    "ЧАСЫ РАБОТЫ И РАСПИСАНИЕ",
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 15, letterSpacing: 0.5),
                  ),
                ],
              ),
              PopupMenuButton<String>(
                tooltip: "Шаблоны расписания",
                color: const Color(0xFF2C2C2E),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                onSelected: _applyPreset,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.white.withOpacity(0.15)),
                  ),
                  child: const Row(
                    children: [
                      Icon(CupertinoIcons.sparkles, color: AppColors.accentOrange, size: 14),
                      SizedBox(width: 6),
                      Text("Быстрые шаблоны", style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                      SizedBox(width: 4),
                      Icon(CupertinoIcons.chevron_down, color: Colors.white70, size: 10),
                    ],
                  ),
                ),
                itemBuilder: (context) => const [
                  PopupMenuItem(value: 'standard_10_23', child: Text("Ежедневно 10:00 – 23:00")),
                  PopupMenuItem(value: 'round_the_clock', child: Text("Круглосуточно 24/7")),
                  PopupMenuItem(value: 'weekdays_weekends', child: Text("Будни 09:00 – 22:00, Выходные 10:00 – 00:00")),
                  PopupMenuItem(value: 'night_club', child: Text("Ночной клуб 18:00 – 04:00")),
                ],
              ),
            ],
          ),
          const SizedBox(height: 18),
          const Text(
            "Настройте график работы по дням недели. В нерабочие часы система доставки и меню отображают клиентам статус «Закрыто».",
            style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 12.5),
          ),
          const SizedBox(height: 20),

          // 7 Days List
          Column(
            children: _daysOrder.map((dayKey) {
              final schedule = _scheduleMap[dayKey] ?? const DaySchedule();
              final isRoundTheClock = schedule.isOpen &&
                  schedule.openTime == '00:00' &&
                  (schedule.closeTime == '23:59' || schedule.closeTime == '00:00');

              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(schedule.isOpen ? 0.04 : 0.02),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: schedule.isOpen ? Colors.white.withOpacity(0.08) : Colors.white.withOpacity(0.03)),
                ),
                child: Row(
                  children: [
                    // Day Name
                    SizedBox(
                      width: 140,
                      child: Text(
                        _dayLabelsRu[dayKey] ?? dayKey,
                        style: TextStyle(
                          color: schedule.isOpen ? Colors.white : Colors.white38,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                    ),

                    // Open / Closed Switch
                    CupertinoSwitch(
                      value: schedule.isOpen,
                      activeColor: AppColors.accentOrange,
                      onChanged: (val) {
                        setState(() {
                          _scheduleMap[dayKey] = schedule.copyWith(isOpen: val);
                        });
                      },
                    ),
                    const SizedBox(width: 16),

                    if (schedule.isOpen) ...[
                      const Text("с", style: TextStyle(color: Colors.white60, fontSize: 13)),
                      const SizedBox(width: 8),
                      _buildTimePickerDropdown(
                        value: schedule.openTime,
                        isCloseTime: false,
                        onChanged: (newTime) {
                          setState(() {
                            _scheduleMap[dayKey] = schedule.copyWith(openTime: newTime);
                          });
                        },
                      ),
                      const SizedBox(width: 12),
                      const Text("до", style: TextStyle(color: Colors.white60, fontSize: 13)),
                      const SizedBox(width: 8),
                      _buildTimePickerDropdown(
                        value: schedule.closeTime,
                        isCloseTime: true,
                        onChanged: (newTime) {
                          setState(() {
                            _scheduleMap[dayKey] = schedule.copyWith(closeTime: newTime);
                          });
                        },
                      ),
                      if (isRoundTheClock) ...[
                        const SizedBox(width: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFF34C759).withOpacity(0.15),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: const Color(0xFF34C759).withOpacity(0.4)),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(CupertinoIcons.sparkles, color: Color(0xFF34C759), size: 12),
                              SizedBox(width: 4),
                              Text(
                                "24/7",
                                style: TextStyle(
                                  color: Color(0xFF34C759),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                      const Spacer(),
                      IconButton(
                        icon: const Icon(CupertinoIcons.doc_on_doc, color: Colors.white38, size: 16),
                        tooltip: "Скопировать время на все дни",
                        onPressed: () {
                          setState(() {
                            for (var d in _daysOrder) {
                              _scheduleMap[d] = _scheduleMap[d]!.copyWith(
                                openTime: schedule.openTime,
                                closeTime: schedule.closeTime,
                              );
                            }
                          });
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text("Время скопировано на всю неделю!"), duration: Duration(seconds: 1)),
                          );
                        },
                      ),
                    ] else ...[
                      const Spacer(),
                      const Text("ВЫХОДНОЙ", style: TextStyle(color: Colors.white38, fontWeight: FontWeight.bold, fontSize: 12)),
                    ],
                  ],
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildTimePickerDropdown({
    required String value,
    required Function(String) onChanged,
    bool isCloseTime = false,
  }) {
    final List<String> times = [];
    for (int h = 0; h < 24; h++) {
      times.add("${h.toString().padLeft(2, '0')}:00");
      times.add("${h.toString().padLeft(2, '0')}:30");
    }

    // Always include canonical end-of-day 23:59 for round-the-clock and day closure
    if (!times.contains("23:59")) {
      times.add("23:59");
    }

    // If a custom or existing value is not in the list, preserve it
    if (value.isNotEmpty && !times.contains(value)) {
      times.add(value);
      times.sort();
    }

    final String effectiveVal = times.contains(value)
        ? value
        : (isCloseTime ? "23:59" : "10:00");

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.08),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.white.withOpacity(0.15)),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: effectiveVal,
          dropdownColor: const Color(0xFF2C2C2E),
          isDense: true,
          items: times.map((t) {
            final String label = (t == "23:59") ? "23:59 (24ч)" : t;
            return DropdownMenuItem<String>(
              value: t,
              child: Text(
                label,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
            );
          }).toList(),
          onChanged: (val) {
            if (val != null) onChanged(val);
          },
        ),
      ),
    );
  }

  Widget _buildContactLocationCard() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0x331C1C1E),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(CupertinoIcons.phone, color: AppColors.accentOrange, size: 20),
              SizedBox(width: 10),
              Text(
                "КОНТАКТЫ И АДРЕС",
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 15, letterSpacing: 0.5),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Phone / WhatsApp
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text("Контактный телефон / WhatsApp (для заказов и гостей)", style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              TextField(
                controller: _phoneCtrl,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  hintText: "+84 90 123 4567 или +7 999 000 0000",
                  hintStyle: TextStyle(color: Colors.white.withOpacity(0.3)),
                  filled: true,
                  fillColor: Colors.white.withOpacity(0.06),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.white.withOpacity(0.12))),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.white.withOpacity(0.12))),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.accentOrange)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),

          // Physical Address
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text("Точный физический адрес заведения", style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              TextField(
                controller: _addressCtrl,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  hintText: "ул. Примерная, 10, Дананг, Вьетнам",
                  hintStyle: TextStyle(color: Colors.white.withOpacity(0.3)),
                  filled: true,
                  fillColor: Colors.white.withOpacity(0.06),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.white.withOpacity(0.12))),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.white.withOpacity(0.12))),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.accentOrange)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),

          // Google Maps Card URL
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text("Ссылка на точку в Google Maps", style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              TextField(
                controller: _googleMapsUrlCtrl,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  hintText: "https://maps.google.com/?cid=...",
                  hintStyle: TextStyle(color: Colors.white.withOpacity(0.3)),
                  filled: true,
                  fillColor: Colors.white.withOpacity(0.06),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.white.withOpacity(0.12))),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.white.withOpacity(0.12))),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.accentOrange)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
