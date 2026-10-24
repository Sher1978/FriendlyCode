import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class ScrapedServiceData {
  final Map<String, dynamic> venue;
  final List<Map<String, dynamic>> services;
  final List<Map<String, dynamic>> staff;
  final List<Map<String, dynamic>> yieldRules;
  final Map<String, dynamic> aiKnowledge;
  final List<Map<String, dynamic>> smartConfirmationQuestions;
  final String masterKnowledgeDoc;

  ScrapedServiceData({
    required this.venue,
    required this.services,
    required this.staff,
    required this.yieldRules,
    required this.aiKnowledge,
    required this.smartConfirmationQuestions,
    this.masterKnowledgeDoc = '',
  });

  factory ScrapedServiceData.fromMap(Map<String, dynamic> map) {
    return ScrapedServiceData(
      venue: Map<String, dynamic>.from(map['venue'] ?? {}),
      services: List<Map<String, dynamic>>.from(
        (map['services'] as List<dynamic>? ?? []).map((e) => Map<String, dynamic>.from(e)),
      ),
      staff: List<Map<String, dynamic>>.from(
        (map['staff'] as List<dynamic>? ?? []).map((e) => Map<String, dynamic>.from(e)),
      ),
      yieldRules: List<Map<String, dynamic>>.from(
        (map['yieldRules'] as List<dynamic>? ?? []).map((e) => Map<String, dynamic>.from(e)),
      ),
      aiKnowledge: Map<String, dynamic>.from(map['aiKnowledge'] ?? {}),
      smartConfirmationQuestions: List<Map<String, dynamic>>.from(
        (map['smartConfirmationQuestions'] as List<dynamic>? ?? []).map((e) => Map<String, dynamic>.from(e)),
      ),
      masterKnowledgeDoc: map['masterKnowledgeDoc']?.toString() ?? '',
    );
  }
}

class DirectServicesScraperService {
  static const List<String> _aiProxyEndpoints = [
    '/api/ai-proxy',
    'https://bot-lab-21910.web.app/api/ai-proxy',
    'https://friendly-code-489513.web.app/api/ai-proxy',
  ];

  /// Fetches raw text or markdown from a URL via Jina Reader.
  static Future<String> fetchRawContent(String targetUrl) async {
    final trimmed = targetUrl.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      // If user pasted raw text instead of a link
      return trimmed;
    }

    final jinaUrl = Uri.parse("https://r.jina.ai/$trimmed");
    debugPrint("[ServicesScraper] Fetching from Jina: $jinaUrl");

    final response = await http.get(jinaUrl, headers: {
      'Accept': 'text/plain',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }).timeout(const Duration(seconds: 25));

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final body = response.body;
      if (body.length > 150) {
        debugPrint("[ServicesScraper] Fetched ${body.length} characters from Jina");
        return body;
      }
    }
    throw Exception("Не удалось загрузить содержимое страницы (HTTP ${response.statusCode})");
  }

  /// Sends text to Gemini AI to extract full structured Services venue pack.
  static Future<ScrapedServiceData> extractServicesWithGemini(String rawOrMarkdownText, {String originalUrl = ''}) async {
    final truncatedText = rawOrMarkdownText.length > 28000
        ? rawOrMarkdownText.substring(0, 28000)
        : rawOrMarkdownText;

    final prompt = """
Ты — старший аналитик онбординга платформы Revoo Services.
Твоя задача — проанализировать сайт, описание на Google Maps или текст компании из сферы услуг (особенно компании по бордер-ранам / виза-ранам / пассажирским перевозкам, СПА, клиникам) и извлечь ПОЛНЫЙ цифровой паспорт для мгновенного запуска заведения и обучения 24/7 AI-Консьержа.

ВАЖНО:
1. Обязательно извлеки реальный рейтинг (rating, e.g. 4.9) и количество отзывов (reviewCount, e.g. 142) из текста страницы/карточки. Если точное число не указано, поставь консервативную оценку на основе текста.
2. Определи архетип: для визаранов, бордер-ранов, трансферов и продажи мест в транспорте ставь "archetype": "batch".
3. Сформируй "masterKnowledgeDoc" — единый связный Markdown-документ (не менее 800-1500 символов), объединяющий:
   - Общие сведения о заведении, локацию, точку сбора и время.
   - ПРЕДЗАПОЛНЕНИЕ ПО ГЕОЛОКАЦИИ И НИШЕ: если это бордер-ран/визаран из Таиланда в Камбоджу/Малайзию, предзаполни официальные пограничные правила (паспорт от 6 мес, 2 фото 3x4, безвизовый штамп 60 дней для РФ, VOA для СНГ, оверстей 500 ฿/день до 7 дней). Если из Вьетнама в Лаос — соответствующие правила КПП Lao Bao.
   - Описание тарифов и что входит (трансфер, визовые сборы, обед, вода).
   - Правила багажа, отмены и переноса поездки.

Исходная ссылка (если передана): $originalUrl

Верни СТРОГО валидный JSON-объект без пояснений и без markdown-разметки со следующей структурой:
{
  "venue": {
    "name": "Название компании (e.g. Sir Visaranus VIP)",
    "category": "Категория бизнеса (e.g. Визаран, Бордер-ран & Трансферы)",
    "archetype": "batch",
    "description": "Привлекательное описание из 2-3 предложений для гостей",
    "phone": "Телефон / WhatsApp компании (e.g. +66 81 234 5678 или оставь пустым если нет)",
    "address": "Физический адрес или точка сбора (город, район, пикап)",
    "currency": "฿",
    "rating": 4.9,
    "reviewCount": 142,
    "coverPhotoUrl": "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957",
    "websiteUrl": "$originalUrl",
    "googleMapsUrl": "$originalUrl"
  },
  "masterKnowledgeDoc": "# ЦИФРОВОЙ ПАСПОРТ И РЕГЛАМЕНТЫ ЗАВЕДЕНИЯ\\n\\n## 1. Локация и сбор...",
  "services": [
    {
      "id": "srv_1",
      "title": "Название услуги/маршрута (e.g. Бордер-ран в Камбоджу (Базовый) / VIP всё включено)",
      "description": "Что входит: трансфер от отеля, визовые сборы, обед, страховка, сопровождение",
      "price": 2900,
      "durationMinutes": 600,
      "category": "Камбоджа",
      "sortOrder": 1
    }
  ],
  "staff": [
    {
      "id": "vehicle_1",
      "name": "VIP Минивэн Toyota Commuter #1",
      "role": "Комфортный трансфер с кондиционером и питьевой водой (13 мест)",
      "workStartTime": "06:00",
      "workEndTime": "18:00",
      "workingDays": [1, 2, 3, 4, 5, 6, 7]
    }
  ],
  "yieldRules": [
    {
      "name": "Скидка на выезд среди недели",
      "discountType": "fixed",
      "discountValue": 300,
      "daysOfWeek": [2, 3]
    },
    {
      "name": "Горящее место за 24 часа",
      "discountType": "percentage",
      "discountValue": 20,
      "daysOfWeek": [1, 2, 3, 4, 5, 6, 7]
    }
  ],
  "aiKnowledge": {
    "toneOfVoice": "respectful_formal",
    "mainServices": "Краткий перечень главных услуг/рейсов",
    "parkingOrPickup": "Инструкция по точкам сбора (Pick-up points) или парковке",
    "rulesAndPolicies": "Требования к документам: загранпаспорт от 6 мес, чистые страницы, 2 фото 3x4, правила по оверстею",
    "specialInstructions": "Удобства в дороге, включенный обед, вода, кондиционер, правила отмены",
    "faq": [
      {
        "q": "Какие документы нужны для поездки?",
        "a": "Оригинал загранпаспорта сроком действия не менее 6 месяцев, 2 цветные фотографии 3x4 см и наличные."
      },
      {
        "q": "Откуда отправляется трансфер?",
        "a": "Бесплатный трансфер забирает пассажиров от кондоминиумов и отелей в центральных районах."
      }
    ]
  },
  "smartConfirmationQuestions": [
    {
      "id": "q_pickup",
      "question": "Точный вопрос владельцу для уточнения (e.g. Забираете ли вы пассажиров прямо из отелей или сбор на одной центральной локации?)",
      "suggestedAnswer": "Забираем от кондо/отеля в центральной зоне, окраины — по согласованию.",
      "context": "Уточнено для корректных инструкций AI-Консьержа пассажирам перед выездом"
    },
    {
      "id": "q_overstay",
      "question": "Берете ли вы в поездку клиентов с оверстеем больше 3 дней?",
      "suggestedAnswer": "Да, до 7 дней с доплатой штрафа на границе, более 7 дней — по предварительному согласованию.",
      "context": "Критично для избежания проблем на пограничном контроле"
    }
  ]
}
""";

    Exception? lastError;
    for (final endpoint in _aiProxyEndpoints) {
      try {
        debugPrint("[ServicesScraper] Querying AI Proxy ($endpoint)...");
        final res = await http
            .post(
              Uri.parse(endpoint),
              headers: {'Content-Type': 'application/json'},
              body: jsonEncode({
                'mode': 'groq',
                'prompt': "$prompt\n\n=== ИСХОДНЫЙ ТЕКСТ ===\n$truncatedText",
                'maxTokens': 3500,
              }),
            )
            .timeout(const Duration(seconds: 25));

        if (res.statusCode == 200) {
          final jsonResp = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
          final content = jsonResp['text']?.toString() ?? '';
          final clean = content
              .replaceAll('```json', '')
              .replaceAll('```', '')
              .trim();

          final decoded = jsonDecode(clean);
          if (decoded is Map<String, dynamic>) {
            debugPrint("[ServicesScraper] Successfully extracted services data via AI Proxy");
            return ScrapedServiceData.fromMap(decoded);
          }
        } else {
          debugPrint("[ServicesScraper] AI Proxy returned HTTP ${res.statusCode}: ${res.body}");
        }
      } catch (e) {
        debugPrint("[ServicesScraper] Error with endpoint $endpoint: $e");
        lastError = e is Exception ? e : Exception(e.toString());
      }
    }

    throw lastError ?? Exception("Не удалось извлечь данные с помощью AI-прокси.");
  }
}
