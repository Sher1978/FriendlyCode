import 'venue_model.dart';

class CriticalFieldCheck {
  final String key;
  final String label;
  final bool isFilled;
  final String? value;
  final String hint;

  CriticalFieldCheck({
    required this.key,
    required this.label,
    required this.isFilled,
    this.value,
    required this.hint,
  });
}

class VenueOnboardingValidationResult {
  final bool isValid;
  final int completedCount;
  final int totalCriticalCount;
  final List<CriticalFieldCheck> checks;
  final List<String> missingLabels;

  VenueOnboardingValidationResult({
    required this.isValid,
    required this.completedCount,
    required this.totalCriticalCount,
    required this.checks,
    required this.missingLabels,
  });

  double get progress => totalCriticalCount > 0 ? completedCount / totalCriticalCount : 0.0;
}

class VenueOnboardingSchema {
  /// Evaluates venue data against Tier-1 Mandatory Critical Fields (SoT: Venue_Onboarding_JSON_Schema_SoT.md).
  static VenueOnboardingValidationResult validateVenue(VenueModel venue) {
    final checks = <CriticalFieldCheck>[
      CriticalFieldCheck(
        key: 'venue_name',
        label: 'Название заведения',
        isFilled: venue.name.trim().isNotEmpty && venue.name.trim() != 'Sir Visaranus (демо)',
        value: venue.name,
        hint: 'Официальное имя компании для гостей и билетов',
      ),
      CriticalFieldCheck(
        key: 'category',
        label: 'Ниша / Категория бизнеса',
        isFilled: venue.category.trim().isNotEmpty && venue.category != 'General',
        value: venue.category,
        hint: 'Бордер-ран, Визаран, Трансферы',
      ),
      CriticalFieldCheck(
        key: 'city_address',
        label: 'Город и точка сбора (Адрес)',
        isFilled: venue.address.trim().isNotEmpty && venue.address.length >= 5,
        value: venue.address,
        hint: 'Точка сбора пассажиров (например, ТЦ Central Festival, Паттайя)',
      ),
      CriticalFieldCheck(
        key: 'currency',
        label: 'Валюта расчетов',
        isFilled: venue.currency.trim().isNotEmpty,
        value: venue.currency,
        hint: '฿ (баты), \$ (доллары), AED (дирхамы), ₽ (рубли)',
      ),
      CriticalFieldCheck(
        key: 'phone_dispatcher',
        label: 'Телефон / WhatsApp диспетчера',
        isFilled: venue.phone.trim().isNotEmpty && venue.phone.length >= 8,
        value: venue.phone,
        hint: 'Номер для экстренной связи с гостями',
      ),
      CriticalFieldCheck(
        key: 'telegram_group_id',
        label: 'Telegram Staff Group ID',
        isFilled: venue.telegramStaffChatId.trim().isNotEmpty,
        value: venue.telegramStaffChatId,
        hint: 'ID служебной группы для подтверждения броней и дообучения /learn',
      ),
      CriticalFieldCheck(
        key: 'master_knowledge',
        label: 'База знаний и регламенты границы',
        isFilled: (venue.masterKnowledgeDoc ?? '').trim().length >= 100,
        value: "${(venue.masterKnowledgeDoc ?? '').length} символов",
        hint: 'Правила границы, оверстей, паспорта, включенный обед',
      ),
    ];

    final completed = checks.where((c) => c.isFilled).length;
    final missing = checks.where((c) => !c.isFilled).map((c) => c.label).toList();

    return VenueOnboardingValidationResult(
      isValid: completed == checks.length,
      completedCount: completed,
      totalCriticalCount: checks.length,
      checks: checks,
      missingLabels: missing,
    );
  }

  /// Generates canonical JSON matching `Bible_SoT/Venue_Onboarding_JSON_Schema_SoT.md`.
  static Map<String, dynamic> toCanonicalJson(VenueModel venue, {Map<String, dynamic>? extra}) {
    return {
      "\$schema": "https://revoo.win/schemas/venue_onboarding_v1.json",
      "version": "1.0",
      "archetype": venue.archetype,
      "critical_required": {
        "venue_name": venue.name,
        "category": venue.category,
        "country_code": venue.countryCode,
        "city": venue.address.split(',').first.trim(),
        "currency": venue.currency,
        "timezone": venue.timezone,
        "phone_dispatcher": venue.phone,
        "telegram_group_id": venue.telegramStaffChatId,
        "primary_pickup_location": {
          "address": venue.address,
        },
        "border_passport_minimum_months": 6,
      },
      "optional_enrichment": {
        "website_url": venue.websiteUrl,
        "cover_photo_url": venue.coverPhotoUrl,
        "rating": venue.rating,
        "review_count": venue.reviewCount,
        "google_maps_url": venue.googleMapsUrl,
        "master_knowledge_markdown": venue.masterKnowledgeDoc,
        ...?extra,
      }
    };
  }

  /// Generates prompt for Gemini to ask only for missing critical fields.
  static String buildMissingPrompt(List<String> missingFields) {
    if (missingFields.isEmpty) return "";
    final listStr = missingFields.map((f) => "• $f").join("\n");
    return """
Внимание! Для боевого запуска заведения необходимо обязательное уточнение критических данных:
$listStr
Пожалуйста, ответьте на эти пункты или скорректируйте их в форме, чтобы выпустить AI-Консьержа в эфир.
""";
  }
}
