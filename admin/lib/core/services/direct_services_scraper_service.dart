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

  ScrapedServiceData({
    required this.venue,
    required this.services,
    required this.staff,
    required this.yieldRules,
    required this.aiKnowledge,
    required this.smartConfirmationQuestions,
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
    );
  }
}

class DirectServicesScraperService {
  static String get _primaryKey => utf8.decode(base64Decode("QVEuQWI4Uk42S1RuM2F1ZVZCRUpMRDhuT19sM1lxYVBQd0tZX1dJQjN5cnBQVV9WN2U0YlE="));
  static String get _fallbackKey => utf8.decode(base64Decode("QVEuQWI4Uk42THZOTlBwaWp3elpndXFTVVZIem1yekRmVl9rY0RWbFA2X0N2VU1qcWlrNkE="));

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
Твоя задача — проанализировать сайт, описание на Google Maps или текст компании из сферы услуг (например, компании по бордер-ранам / виза-ранам / трансферам, СПА, барбершопа, клиники, проката авто/байков и т.д.) и извлечь ПОЛНЫЙ цифровой паспорт для мгновенного запуска заведения и обучения 24/7 AI-Консьержа.

Исходная ссылка (если передана): $originalUrl

Верни СТРОГО валидный JSON-объект без пояснений и без markdown-разметки со следующей структурой:
{
  "venue": {
    "name": "Название компании (e.g. Pattaya Border Run VIP)",
    "category": "Категория бизнеса (e.g. Бордер-ран & Трансферы, Визаран, СПА & Массаж)",
    "description": "Привлекательное описание из 2-3 предложений для гостей",
    "phone": "Телефон / WhatsApp компании (e.g. +66 81 234 5678 или оставь пустым если нет)",
    "address": "Физический адрес или точка сбора (город, район, пикап)",
    "currency": "Валюта цен: ฿, \$, ₽, VND, € (если Таиланд - ฿, если Вьетнам - VND, если РФ - ₽)",
    "googleMapsUrl": "$originalUrl"
  },
  "services": [
    {
      "id": "srv_1",
      "title": "Название услуги/маршрута (e.g. Бордер-ран в Камбоджу (Базовый) / VIP всё включено)",
      "description": "Что входит: трансфер от отеля, визовые сборы, обед, страховка, сопровождение",
      "price": 2800,
      "durationMinutes": 600,
      "category": "Категория направления (e.g. Камбоджа, Малайзия, Регулярные)",
      "sortOrder": 1
    }
  ],
  "staff": [
    {
      "id": "master_1",
      "name": "VIP Минивэн Toyota Commuter #1 (или имя координатора/мастера)",
      "role": "Комфортный трансфер с кондиционером и питьевой водой",
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
      "name": "Горящее место за 12 часов",
      "discountType": "percentage",
      "discountValue": 15,
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

    final keys = [_primaryKey, _fallbackKey];
    final models = ["gemini-2.5-flash", "gemini-flash-latest"];

    Exception? lastError;

    for (final key in keys) {
      for (final model in models) {
        try {
          debugPrint("[ServicesScraper] Querying Gemini ($model)...");
          final uri = Uri.parse("https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent?key=$key");
          final res = await http.post(
            uri,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'contents': [
                {
                  'parts': [
                    {'text': "$prompt\n\n=== ИСХОДНЫЙ ТЕКСТ ===\n$truncatedText"}
                  ]
                }
              ]
            }),
          ).timeout(const Duration(seconds: 35));

          if (res.statusCode == 200) {
            final jsonResp = jsonDecode(res.body) as Map<String, dynamic>;
            final candidates = jsonResp['candidates'] as List<dynamic>?;
            if (candidates != null && candidates.isNotEmpty) {
              final content = candidates[0]['content'] as Map<String, dynamic>?;
              final parts = content?['parts'] as List<dynamic>?;
              if (parts != null && parts.isNotEmpty) {
                final textReply = parts[0]['text'] as String? ?? '';
                final clean = textReply
                    .replaceAll('```json', '')
                    .replaceAll('```', '')
                    .trim();

                final decoded = jsonDecode(clean);
                if (decoded is Map<String, dynamic>) {
                  debugPrint("[ServicesScraper] Successfully extracted ${decoded['services']?.length ?? 0} services & AI knowledge!");
                  return ScrapedServiceData.fromMap(decoded);
                }
              }
            }
          } else {
            debugPrint("[ServicesScraper] Gemini returned HTTP ${res.statusCode}: ${res.body}");
          }
        } catch (e) {
          debugPrint("[ServicesScraper] Error with model $model: $e");
          lastError = e is Exception ? e : Exception(e.toString());
        }
      }
    }

    throw lastError ?? Exception("Не удалось извлечь данные с помощью Gemini AI.");
  }
}
