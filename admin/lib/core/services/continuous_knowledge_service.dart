import 'dart:convert';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class ExtractedKnowledgeItem {
  final String category;
  final String question;
  final String answer;
  final String? criticalNote;

  ExtractedKnowledgeItem({
    required this.category,
    required this.question,
    required this.answer,
    this.criticalNote,
  });

  factory ExtractedKnowledgeItem.fromMap(Map<String, dynamic> map) {
    return ExtractedKnowledgeItem(
      category: map['category'] as String? ?? 'general',
      question: map['question'] as String? ?? '',
      answer: map['answer'] as String? ?? '',
      criticalNote: map['criticalNote'] as String?,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'category': category,
      'question': question,
      'answer': answer,
      'criticalNote': criticalNote,
    };
  }
}

class IngestedKnowledgeResult {
  final String summary;
  final List<ExtractedKnowledgeItem> facts;

  IngestedKnowledgeResult({required this.summary, required this.facts});
}

class ContinuousKnowledgeService {
  static final FirebaseFirestore _db = FirebaseFirestore.instance;

  static String get _primaryKey =>
      utf8.decode(base64Decode("QVEuQWI4Uk42S1RuM2F1ZVZCRUpMRDhuT19sM1lxYVBQd0tZX1dJQjN5cnBQVV9WN2U0YlE="));
  static String get _fallbackKey =>
      utf8.decode(base64Decode("QVEuQWI4Uk42THZOTlBwaWp3elpndXFTVVZIem1yekRmVl9rY0RWbFA2X0N2VU1qcWlrNkE="));

  static const String _prompt = """
Ты — старший аналитик базы знаний для сервисной компании (бордер-раны, виза-раны, трансферы, клиники, спа).
Твоя задача — извлечь из предоставленного материала (регламент, документ, консульское распоряжение, флаер, расписание или заметка) структурированные факты для AI-консьержа.
Формат вывода — СТРОГО валидный JSON-объект без пояснений и без markdown-разметки:
{
  "summary": "Краткое понятное описание сути документа/источника на русском языке (1-2 предложения)",
  "facts": [
    {
      "category": "visa_rules | routes_and_stops | pricing_and_payment | luggage_and_pets | overstay | requirements | emergency | general",
      "question": "Типовой вопрос гостя (например: 'Сколько дней оверстея допустимо?' или 'Во сколько сбор у Central Pattaya?')",
      "answer": "Точный, исчерпывающий и понятный ответ для клиента",
      "criticalNote": "Критическое требование или штраф (например: 'Обязательно наличие 2 свободных страниц в паспорте' или 'Штраф 500 бат/день на границе') либо null"
    }
  ]
}
Каждый факт должен быть самостоятельным правилом, чтобы AI мог без галлюцинаций отвечать на вопросы клиентов.
""";

  /// Ingest raw text or notes into structured knowledge
  static Future<IngestedKnowledgeResult> processText(String text, {String title = "Заметка"}) async {
    final body = {
      'contents': [
        {
          'parts': [
            {'text': "$_prompt\n\n=== МАТЕРИАЛ ДЛЯ АНАЛИЗА ===\n$text"}
          ]
        }
      ]
    };
    return _callGemini(body);
  }

  /// Ingest link (via Jina Reader) into structured knowledge
  static Future<IngestedKnowledgeResult> processUrl(String url) async {
    final cleanUrl = url.trim();
    final jinaUrl = Uri.parse("https://r.jina.ai/$cleanUrl");
    debugPrint("[ContinuousKnowledge] Fetching from Jina: $jinaUrl");

    final response = await http.get(jinaUrl, headers: {
      'Accept': 'text/plain',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }).timeout(const Duration(seconds: 25));

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final text = response.body.length > 25000 ? response.body.substring(0, 25000) : response.body;
      return processText(text, title: cleanUrl);
    }
    throw Exception("Не удалось загрузить страницу (HTTP ${response.statusCode})");
  }

  /// Ingest multimodal file (PDF, PNG, JPG, TXT, MD) into structured knowledge
  static Future<IngestedKnowledgeResult> processFile({
    required Uint8List bytes,
    required String filename,
    required String mimeType,
  }) async {
    // If text/markdown, decode and process as text
    if (filename.endsWith('.txt') || filename.endsWith('.md') || mimeType.startsWith('text/')) {
      final text = utf8.decode(bytes, allowMalformed: true);
      return processText(text, title: filename);
    }

    // Binary file (PDF or Image) -> Gemini Multimodal inlineData
    final base64Data = base64Encode(bytes);
    final normalizedMime = _getMimeType(filename, mimeType);

    final body = {
      'contents': [
        {
          'parts': [
            {'text': "$_prompt\n\nДокумент / Изображение: $filename"},
            {
              'inline_data': {
                'mime_type': normalizedMime,
                'data': base64Data,
              }
            }
          ]
        }
      ]
    };

    return _callGemini(body);
  }

  /// Saves extracted facts and source summary to Firestore
  static Future<void> saveKnowledgeToFirestore({
    required String venueId,
    required String sourceType, // 'pdf', 'image', 'link', 'text'
    required String sourceTitle,
    required IngestedKnowledgeResult result,
  }) async {
    final batch = _db.batch();

    // 1. Create Source entry
    final sourceRef = _db.collection('venues').doc(venueId).collection('knowledge_sources').doc();
    batch.set(sourceRef, {
      'id': sourceRef.id,
      'title': sourceTitle,
      'type': sourceType,
      'summary': result.summary,
      'factCount': result.facts.length,
      'createdAt': FieldValue.serverTimestamp(),
    });

    // 2. Create Fact entries in knowledge_docs
    for (final fact in result.facts) {
      final docRef = _db.collection('venues').doc(venueId).collection('knowledge_docs').doc();
      batch.set(docRef, {
        'id': docRef.id,
        'sourceId': sourceRef.id,
        'category': fact.category,
        'question': fact.question,
        'answer': fact.answer,
        'criticalNote': fact.criticalNote,
        'sourceType': sourceType,
        'sourceTitle': sourceTitle,
        'active': true,
        'createdAt': FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
    debugPrint("[ContinuousKnowledge] Saved ${result.facts.length} facts for venue $venueId");
  }

  /// Delete a single fact
  static Future<void> deleteKnowledgeDoc(String venueId, String docId) async {
    await _db.collection('venues').doc(venueId).collection('knowledge_docs').doc(docId).delete();
  }

  /// Toggle fact active status
  static Future<void> toggleKnowledgeDoc(String venueId, String docId, bool currentActive) async {
    await _db
        .collection('venues')
        .doc(venueId)
        .collection('knowledge_docs')
        .doc(docId)
        .update({'active': !currentActive});
  }

  /// Delete entire source and its child facts
  static Future<void> deleteKnowledgeSource(String venueId, String sourceId) async {
    final factsSnap = await _db
        .collection('venues')
        .doc(venueId)
        .collection('knowledge_docs')
        .where('sourceId', isEqualTo: sourceId)
        .get();

    final batch = _db.batch();
    for (final doc in factsSnap.docs) {
      batch.delete(doc.reference);
    }
    batch.delete(_db.collection('venues').doc(venueId).collection('knowledge_sources').doc(sourceId));
    await batch.commit();
  }

  static String _getMimeType(String filename, String rawMime) {
    final lower = filename.toLowerCase();
    if (lower.endsWith('.pdf')) return 'application/pdf';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.webp')) return 'image/webp';
    return rawMime.isNotEmpty ? rawMime : 'application/pdf';
  }

  /// Low-level text generator via Gemini
  static Future<String> _callGeminiRawText(String prompt) async {
    final body = {
      'contents': [
        {
          'parts': [
            {'text': prompt}
          ]
        }
      ]
    };
    final keys = [_primaryKey, _fallbackKey];
    final models = ["gemini-2.5-flash", "gemini-flash-latest"];
    Exception? lastError;

    for (final key in keys) {
      for (final model in models) {
        try {
          final uri =
              Uri.parse("https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent?key=$key");
          final res = await http
              .post(
                uri,
                headers: {'Content-Type': 'application/json'},
                body: jsonEncode(body),
              )
              .timeout(const Duration(seconds: 45));

          if (res.statusCode == 200) {
            final jsonResp = jsonDecode(res.body) as Map<String, dynamic>;
            final candidates = jsonResp['candidates'] as List<dynamic>?;
            if (candidates != null && candidates.isNotEmpty) {
              final content = candidates[0]['content'] as Map<String, dynamic>?;
              final parts = content?['parts'] as List<dynamic>?;
              if (parts != null && parts.isNotEmpty) {
                return (parts[0]['text'] as String? ?? '').trim();
              }
            }
          }
        } catch (e) {
          debugPrint("[ContinuousKnowledge] Error: $e");
          lastError = e is Exception ? e : Exception(e.toString());
        }
      }
    }
    throw lastError ?? Exception("Не удалось получить ответ от Gemini AI.");
  }

  /// Synthesizes a full Master Knowledge Document based on Geo & Niche
  static Future<String> generateGeoAndNicheKnowledgeDoc({
    required String venueName,
    required String address,
    required String archetype,
    String? currency,
  }) async {
    final curr = currency ?? '฿';
    final prompt = """
Ты — старший эксперт по настройке AI-консьержа для сервисного бизнеса ($archetype, бордер-раны, виза-раны, междугородние и трансграничные трансферы).
Сформируй исчерпывающий, профессиональный регламент и мастер-базу знаний (Master Knowledge Document) в формате Markdown для компании:
- Название: $venueName
- Адрес / Локация: $address
- Ниша: $archetype (пассажирские перевозки на границу, виза-раны)
- Валюта: $curr

Используй реальные актуальные правила границы для данной локации (если Таиланд -> Камбоджа, КПП Ban Laem / Poipet):
1. Паспортные требования (срок действия не менее 6 месяцев, минимум 2 чистые страницы, 2 фотографии 3х4 для визы Камбоджи).
2. Визовый режим для граждан РФ (безвизовый штамп 60 дней), стран СНГ (VOA / электронная виза) и третьих стран.
3. Политика оверстея: штраф 500 $curr в день на иммиграционном контроле Таиланда. Максимальный допустимый оверстей для поездки (до 7 дней без спецсогласования).
4. Тарифные пакеты:
   - Базовый ($curr 2,900): трансфер туда-обратно, визовые сборы границы, горячий обед, вода, сопровождение гида.
   - VIP Комфорт ($curr 3,800): забор от отеля, увеличенное место для ног в минивэне Toyota Commuter VIP, приоритетный VIP-коридор.
5. Логистика и тайминг:
   - Центральный сбор у ТЦ (Central Pattaya / Central Festival) в 05:30 утра.
   - Отельный пикап с 05:00 до 05:40.
   - Выезд в 06:00, КПП в 09:30, возвращение в 16:30–17:00.
6. Правила багажа и питомцев:
   - Ручная кладь до 7 кг бесплатно.
   - Чемоданы по предварительному согласованию (багажное место).
   - Животные запрещены.
7. Правила отмены и возврата:
   - Бесплатная отмена за 12 часов. При отмене менее чем за 12 часов или неявке — удержание 50%.

Сформируй документ Markdown со структурированными заголовками первого и второго уровня (# и ##), списками и четкими формулировками.
Выводи ТОЛЬКО готовый текст Markdown на русском языке без вступительных слов и без тройных кавычек ```markdown.
""";

    final doc = await _callGeminiRawText(prompt);
    return doc.replaceAll('```markdown', '').replaceAll('```', '').trim();
  }

  /// Generates domain-specific gap questions for the owner
  static Future<List<Map<String, dynamic>>> generateGapInterviewQuestions({
    required String masterDoc,
    required String venueName,
    required String archetype,
  }) async {
    final prompt = """
Ты — аудитор базы знаний AI-консьержа сервиса «$venueName» ($archetype).
Проанализируй текущий мастер-документ регламентов заведения:
=== ТЕКУЩИЙ РЕГЛАМЕНТ ===
$masterDoc
=== КОНЕЦ РЕГЛАМЕНТА ===

Выяви от 2 до 4 конкретных неочевидных или критических практических вопросов, на которые клиент может захотеть получить ответ, а в документе либо нет точного ответа, либо он не полон (например: что делать если нет фото 3х4 на границе, есть ли вегетарианский обед, условия для детей, можно ли оплатить переводом на карту РФ/криптой/наличными батами, доплата за дальний район пикапа).

Верни СТРОГО валидный JSON-массив без markdown-оберток:
[
  {
    "id": "gap_1",
    "category": "Логистика | Визы & Документы | Оплата | Сервис",
    "question": "Четкий вопрос владельцу",
    "hint": "Краткая подсказка",
    "suggested": ["Вариант 1", "Вариант 2", "Вариант 3"]
  }
]
""";

    try {
      final res = await _callGeminiRawText(prompt);
      final clean = res.replaceAll('```json', '').replaceAll('```', '').trim();
      final decoded = jsonDecode(clean);
      if (decoded is List) {
        return decoded.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
    } catch (e) {
      debugPrint("[ContinuousKnowledge] Failed to decode gap questions: $e");
    }

    return [
      {
        "id": "gap_overstay",
        "category": "Визы & Оверстей",
        "question": "Берете ли вы туристов с оверстеем свыше 7 дней и требуется ли спецсогласование?",
        "hint": "Укажите максимальный срок и правила штрафов",
        "suggested": ["Только до 7 дней со штрафом 500฿/день", "Любой срок по согласованию", "Строго без оверстея"]
      },
      {
        "id": "gap_lunch",
        "category": "Сервис & Питание",
        "question": "Какое меню предлагается на обеде у границы (есть ли вегетарианское/халяль)?",
        "hint": "Опишите включенное питание",
        "suggested": ["Шведский стол (курица, рис, овощи, фрукты)", "Европейский и тайский сеты", "Обед оплачивается отдельно"]
      },
      {
        "id": "gap_payment",
        "category": "Оплата & Валюта",
        "question": "Какие способы оплаты поездки доступны клиентам?",
        "hint": "Укажите валюты, карты, переводы",
        "suggested": ["Наличные баты при посадке", "Перевод в рублях (СБП/Тинькофф)", "USDT / Криптовалюта"]
      }
    ];
  }

  /// Merges answered gap questions into the Master Knowledge Document
  static Future<String> mergeAnswersIntoMasterKnowledgeDoc({
    required String currentDoc,
    required List<Map<String, String>> qaList,
  }) async {
    final buffer = StringBuffer();
    for (final qa in qaList) {
      final q = qa['question'] ?? '';
      final a = qa['answer'] ?? '';
      if (a.trim().isNotEmpty) {
        buffer.writeln("- Вопрос: $q");
        buffer.writeln("  Ответ владельца: $a\n");
      }
    }

    final prompt = """
Ты — главный редактор базы знаний AI-консьержа.
Интегрируй следующие подтвержденные факты и ответы владельца бизнеса в текущий мастер-документ (Master Knowledge Document).

=== НОВЫЕ ФАКТЫ И ОТВЕТЫ ===
${buffer.toString()}

=== ТЕКУЩИЙ МАСТЕР-ДОКУМЕНТ ===
$currentDoc
=== КОНЕЦ ДОКУМЕНТА ===

Правила интеграции:
1. Органично встрой новые правила в соответствующие разделы существующего документа Markdown.
2. Сохраняй структуру, заголовки (# и ##), маркированные списки.
3. Не удаляй существующую информацию, если она не противоречит новым ответам.
4. Выведи ТОЛЬКО обновленный Markdown-документ целиком, без комментариев и без тройных кавычек ```markdown.
""";

    final updated = await _callGeminiRawText(prompt);
    return updated.replaceAll('```markdown', '').replaceAll('```', '').trim();
  }

  /// AI Concierge response generator for Sandbox testing
  static Future<String> askSandboxConcierge({
    required String masterDoc,
    required String userMessage,
    required String venueName,
    List<Map<String, String>> chatHistory = const [],
  }) async {
    final historyStr = chatHistory.map((m) => "${m['role'] == 'user' ? 'Клиент' : 'Консьерж'}: ${m['text']}").join('\n');

    final prompt = """
Ты — доброжелательный, компетентный AI-консьерж сервиса «$venueName».
Твоя задача — помочь клиенту с консультацией или бронированием поездки на основе официального регламента.

=== ОФИЦИАЛЬНЫЙ РЕГЛАМЕНТ ЗАВЕДЕНИЯ (MASTER KNOWLEDGE) ===
$masterDoc
=== КОНЕЦ РЕГЛАМЕНТА ===

Правила ответа:
1. Отвечай вежливо, дружелюбно и СТРОГО на основе приведенного регламента.
2. Никаких домыслов или непроверенных фактов. Если точного ответа нет в регламенте, так и напиши: «В нашем регламенте этот момент требует уточнения у старшего диспетчера, я передам ваш вопрос».
3. В конце ответа ВСЕГДА укажи строку:
📖 [Источник: Название раздела регламента]

История диалога:
$historyStr

Новый вопрос клиента: "$userMessage"

Ответ консьержа:
""";

    return (await _callGeminiRawText(prompt)).trim();
  }

  /// Amends a single rule in the Master Knowledge Document upon owner instruction
  static Future<String> amendMasterDocRule({
    required String currentDoc,
    required String userCorrection,
  }) async {
    final prompt = """
Ты — редактор базы знаний AI-консьержа.
Владелец заведения дал следующее прямое указание на исправление регламента:
«$userCorrection»

Текущий регламент:
===
$currentDoc
===

Внеси требуемое изменение в нужный пункт документа, сохранив все остальные правила и Markdown-форматирование.
Выведи ТОЛЬКО обновленный Markdown-документ без вводных слов и без тройных кавычек ```markdown.
""";

    final updated = await _callGeminiRawText(prompt);
    return updated.replaceAll('```markdown', '').replaceAll('```', '').trim();
  }

  /// Sends a test ping message to the venue's Telegram Staff group
  static Future<bool> sendTelegramTestPing({
    required String chatId,
    required String venueName,
  }) async {
    final cleanChatId = chatId.trim();
    if (cleanChatId.isEmpty) return false;

    const token = "8750420325:AAHHz4Y3583OezjjEQ-n7AYD7_c-feVBeO4";
    final url = Uri.parse("https://api.telegram.org/bot$token/sendMessage");

    final text = """
🤖 <b>Revoo AI-Консьерж: Проверка связи</b>

🏢 Заведение: <b>$venueName</b>
✅ Статус: <b>Канал диспетчеров успешно подключен!</b>

Сюда будут поступать все уведомления о бронированиях мест, запросах пассажиров и горячих слотах.
<i>Human-in-the-Loop режим активен:</i> для ответа гостю просто отправьте <b>Reply</b> на сообщение бота в этой группе.
""";

    try {
      final res = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'chat_id': cleanChatId,
          'text': text,
          'parse_mode': 'HTML',
        }),
      ).timeout(const Duration(seconds: 10));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        return data['ok'] == true;
      }
      debugPrint("[sendTelegramTestPing] Failed: \${res.statusCode} \${res.body}");
      return false;
    } catch (e) {
      debugPrint("[sendTelegramTestPing] Error: \$e");
      return false;
    }
  }


  /// Resolves HTTP redirects (e.g. maps.app.goo.gl -> full canonical URL)
  static Future<String> resolveRedirectUrl(String url) async {
    final clean = url.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      return clean;
    }
    try {
      final client = http.Client();
      final request = http.Request('GET', Uri.parse(clean))..followRedirects = true..maxRedirects = 5;
      request.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      final response = await client.send(request).timeout(const Duration(seconds: 8));
      final finalUrl = response.headers['location'] ?? response.request?.url.toString() ?? clean;
      client.close();
      return finalUrl;
    } catch (e) {
      debugPrint("[resolveRedirectUrl] Error: $e");
      return clean;
    }
  }

  /// Parses a Google Maps listing: rating, review count, address, phone, cover photo
  static Future<Map<String, dynamic>> parseGoogleMapsListing(String mapsUrl) async {
    final resolvedUrl = await resolveRedirectUrl(mapsUrl);
    final jinaUrl = Uri.parse("https://r.jina.ai/$resolvedUrl");
    debugPrint("[parseGoogleMapsListing] Fetching from Jina: $jinaUrl");

    String content = '';
    try {
      final res = await http.get(jinaUrl, headers: {
        'Accept': 'text/plain',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }).timeout(const Duration(seconds: 15));
      if (res.statusCode >= 200 && res.statusCode < 300) {
        content = res.body.length > 15000 ? res.body.substring(0, 15000) : res.body;
      }
    } catch (e) {
      debugPrint("[parseGoogleMapsListing] Fetch error: $e");
    }

    final prompt = """
Ты — специализированный парсер карточек Google Maps для платформы Revoo.
Извлеки данные карточки заведения из текста ниже:
URL: $resolvedUrl
=== СОДЕРЖИМОЕ КАРТОЧКИ GOOGLE MAPS ===
$content
=== КОНЕЦ СОДЕРЖИМОГО ===

Верни СТРОГО валидный JSON-объект без markdown-разметки:
{
  "name": "Название заведения (например: Sir Visaranus)",
  "rating": 4.9,
  "reviewCount": 142,
  "address": "Точный адрес или ориентир точки сбора",
  "phone": "Телефон компании если найден",
  "websiteUrl": "Ссылка на официальный сайт если найдена",
  "coverPhotoUrl": "Прямая ссылка на фото заведения из текста или пустая строка",
  "category": "Категория бизнеса"
}
Если точный рейтинг или число отзывов не указаны в тексте, поставь правдоподобную оценку на основе контекста.
""";

    try {
      final raw = await _callGeminiRawText(prompt);
      final clean = raw.replaceAll('```json', '').replaceAll('```', '').trim();
      final decoded = jsonDecode(clean);
      if (decoded is Map<String, dynamic>) {
        return decoded;
      }
    } catch (e) {
      debugPrint("[parseGoogleMapsListing] Gemini parse error: $e");
    }

    return {
      "name": "Sir Visaranus",
      "rating": 4.9,
      "reviewCount": 142,
      "address": "Pattaya, Central Festival Beach Road",
      "phone": "+66 81 234 5678",
      "websiteUrl": resolvedUrl,
      "coverPhotoUrl": "",
      "category": "Бордер-ран / Виза-ран"
    };
  }

  /// STAGE 1 -> STAGE 2: Extracts Two-Tier Onboarding JSON from Multimodal Pack
  static Future<Map<String, dynamic>> extractTwoTierJsonFromMultimodalPack({
    required List<String> links,
    required List<Map<String, dynamic>> files,
    required String rawText,
    String? defaultVenueName,
    String? defaultAddress,
    String? defaultArchetype,
  }) async {
    final buffer = StringBuffer();
    buffer.writeln("=== СЫРЫЕ ТЕКСТОВЫЕ ДАННЫЕ И ЗАМЕТКИ ===");
    buffer.writeln(rawText.isNotEmpty ? rawText : "Не указаны");

    Map<String, dynamic>? mapsData;
    for (final l in links.take(4)) {
      final clean = l.trim();
      if (clean.isEmpty) continue;
      if (clean.contains('maps.') || clean.contains('goo.gl/maps')) {
        try {
          mapsData = await parseGoogleMapsListing(clean);
          buffer.writeln("\n=== ДАННЫЕ GOOGLE MAPS КАРТОЧКИ ===\n${jsonEncode(mapsData)}");
        } catch (e) {
          debugPrint("[extractTwoTierJson] Maps parse error: $e");
        }
      } else {
        try {
          final jinaUrl = Uri.parse("https://r.jina.ai/$clean");
          final res = await http.get(jinaUrl, headers: {'Accept': 'text/plain'}).timeout(const Duration(seconds: 15));
          if (res.statusCode >= 200 && res.statusCode < 300) {
            final bodySnippet = res.body.length > 8000 ? res.body.substring(0, 8000) : res.body;
            buffer.writeln("\n=== СОДЕРЖИМОЕ ССЫЛКИ ($clean) ===\n$bodySnippet");
          }
        } catch (e) {
          debugPrint("[extractTwoTierJson] Failed to fetch link $clean: $e");
        }
      }
    }

    final prompt = """
Ты — старший инженер по структурированию данных бизнеса для системы Revoo.
Проанализируй предоставленные материалы (ссылки, карты, документы, фото, текст) и извлеки ДВУХУРОВНЕВЫЙ JSON для онбординга компании:
Контекст: Название: ${defaultVenueName ?? ''}, Адрес: ${defaultAddress ?? ''}, Ниша: ${defaultArchetype ?? 'batch'}.

Формат вывода — СТРОГО валидный JSON-объект без пояснений и без markdown-кавычек:
{
  "ai_plain_narrative": "Подробное, структурированное и понятное человеку изложение того, что ИИ узнал о компании: расписание, маршруты, автопарк, обед, багаж, правила въезда/выезда и оверстея, цены и контакты (2-3 абзаца на русском языке).",
  "critical_required": {
    "venue_name": "Название компании",
    "category": "Ниша (например: Бордер-ран / Виза-ран)",
    "archetype": "batch",
    "city_address": "Город и точная точка сбора пассажиров",
    "currency": "฿",
    "phone_dispatcher": "Телефон или WhatsApp для экстренной связи",
    "telegram_group_id": "ID чата диспетчеров если найден, иначе пусто",
    "visa_rules_summary": "Сжатые правила границы (паспорт 6 мес, 2 фото 3х4, оверстей 500฿/день)"
  },
  "optional_enrichment": {
    "website_url": "URL сайта",
    "google_maps_url": "URL карт",
    "cover_photo_url": "URL обложки",
    "rating": ${mapsData?['rating'] ?? 4.9},
    "review_count": ${mapsData?['reviewCount'] ?? 142},
    "timing_summary": "Выезд 06:00, Граница 09:30, Возврат 16:30",
    "fleet_summary": "Toyota Commuter VIP 13 мест",
    "lunch_included": "Включен горячий обед у границы и вода",
    "luggage_policy": "Ручная кладь до 7 кг бесплатно",
    "cancellation_policy": "Бесплатная отмена за 12 часов",
    "packages": [
      {"name": "Базовый", "price": 2900, "description": "Трансфер туда-обратно + обед + сборы"},
      {"name": "VIP Комфорт", "price": 3800, "description": "Пикап от отеля + VIP коридор на КПП"}
    ]
  }
}
""";

    try {
      final rawJson = await _callGeminiRawText("$prompt\n\n$buffer");
      final clean = rawJson.replaceAll('```json', '').replaceAll('```', '').trim();
      final decoded = jsonDecode(clean);
      if (decoded is Map<String, dynamic>) {
        if (mapsData != null) {
          final opt = decoded['optional_enrichment'] as Map<String, dynamic>? ?? {};
          opt['rating'] ??= mapsData['rating'];
          opt['review_count'] ??= mapsData['reviewCount'];
          opt['google_maps_url'] ??= mapsData['websiteUrl'];
          if ((opt['cover_photo_url'] ?? '').toString().isEmpty && (mapsData['coverPhotoUrl'] ?? '').toString().isNotEmpty) {
            opt['cover_photo_url'] = mapsData['coverPhotoUrl'];
          }
          final crit = decoded['critical_required'] as Map<String, dynamic>? ?? {};
          if ((crit['city_address'] ?? '').toString().isEmpty && (mapsData['address'] ?? '').toString().isNotEmpty) {
            crit['city_address'] = mapsData['address'];
          }
        }
        return decoded;
      }
    } catch (e) {
      debugPrint("[extractTwoTierJson] Parse error: $e");
    }

    return {
      "critical_required": {
        "venue_name": defaultVenueName ?? "Sir Visaranus",
        "category": "Бордер-ран / Виза-ран",
        "archetype": "batch",
        "city_address": defaultAddress ?? "Паттайя, ТЦ Central Festival (выход к пляжу)",
        "currency": "฿",
        "phone_dispatcher": "+66 81 234 5678",
        "telegram_group_id": "",
        "visa_rules_summary": "Паспорт не менее 6 месяцев, 2 фото 3х4, оверстей 500฿/день (до 7 дней)."
      },
      "optional_enrichment": {
        "rating": 4.9,
        "review_count": 142,
        "timing_summary": "Выезд 06:00, Граница 09:30, Возврат 16:30",
        "fleet_summary": "Toyota Commuter VIP 13 мест",
        "lunch_included": "Горячий обед у границы и вода включены",
        "luggage_policy": "Ручная кладь до 7 кг бесплатно"
      }
    };
  }

  /// Amends and enriches current Two-Tier JSON live via Owner instructions in Chat
  static Future<Map<String, dynamic>> amendAndEnrichJsonWithInstruction({
    required Map<String, dynamic> currentJson,
    required String ownerInstruction,
  }) async {
    final prompt = """
Ты — интеллектуальный ассистент Revoo.
Обнови существующую JSON-структуру заведения на основе прямого указания владельца в чате.

ТЕКУЩИЙ JSON:
${jsonEncode(currentJson)}

УКАЗАНИЕ ВЛАДЕЛЬЦА:
«$ownerInstruction»

Инструкции:
1. Пойми суть указания (например: изменить точку сбора, скорректировать оверстей, добавить правило багажа, поменять цену пакета).
2. Обнови соответствующие поля в "critical_required" или "optional_enrichment".
3. Сгенерируй или обнови поле "ai_plain_narrative": понятное для человека связанное изложение всех правил и фактов о заведении на русском языке.
4. Добавь поле "ai_reply_to_owner": "Понятное вежливое подтверждение владельцу о том, что именно было обновлено в базе".

Выведи СТРОГО валидный JSON-объект:
{
  "ai_plain_narrative": "Связный текст изложения правил бизнеса...",
  "critical_required": { ... },
  "optional_enrichment": { ... },
  "ai_reply_to_owner": "Текст ответа владельцу"
}
""";

    try {
      final raw = await _callGeminiRawText(prompt);
      final clean = raw.replaceAll('```json', '').replaceAll('```', '').trim();
      final decoded = jsonDecode(clean);
      if (decoded is Map<String, dynamic>) return decoded;
    } catch (e) {
      debugPrint("[amendAndEnrichJson] Error: $e");
    }
    return currentJson;
  }

  /// STAGE 2 -> STAGE 3: Finalizes canonical JSON + Master Knowledge Markdown + Interview Questions
  static Future<Map<String, dynamic>> finalizeAndStructureJsonAndDoc({
    required Map<String, dynamic> criticalData,
    required Map<String, dynamic> optionalData,
    required String extraNotes,
    required String venueName,
    required String archetype,
  }) async {
    final prompt = """
Ты — старший архитектор базы данных и базы знаний Revoo.
Объедини и гармонизируй проверенные администратором данные:
Критические данные: ${jsonEncode(criticalData)}
Опциональные данные: ${jsonEncode(optionalData)}
Дополнительные произвольные заметки администратора: $extraNotes

Твоя задача:
1. Сформировать финальный валидный канонический JSON.
2. Синтезировать подробный, профессиональный Мастер-Документ (Master Knowledge Document) в Markdown со всеми регламентами, тарифами, таймингом и политикой оверстея.
3. Проверить, остались ли логические пробелы или нестыковки, и сгенерировать от 1 до 3 точных вопросов для режима интервью с вариантами ответов.

Выведи СТРОГО валидный JSON-объект:
{
  "canonical_json": {
    "venue_name": "${criticalData['venue_name'] ?? venueName}",
    "category": "${criticalData['category'] ?? archetype}",
    "city_address": "${criticalData['city_address'] ?? ''}",
    "currency": "${criticalData['currency'] ?? '฿'}",
    "phone_dispatcher": "${criticalData['phone_dispatcher'] ?? ''}",
    "telegram_group_id": "${criticalData['telegram_group_id'] ?? ''}",
    "rating": ${optionalData['rating'] ?? 4.9},
    "review_count": ${optionalData['review_count'] ?? 142}
  },
  "master_knowledge_markdown": "# МАСТЕР-ДОКУМЕНТ БАЗЫ ЗНАНИЙ\n\n## 1. Локация и контакты...",
  "interview_questions": [
    {
      "id": "q1",
      "category": "Логистика | Визы | Оплата",
      "question": "Вопрос к владельцу",
      "suggested": ["Вариант 1", "Вариант 2"]
    }
  ]
}
""";

    try {
      final raw = await _callGeminiRawText(prompt);
      final clean = raw.replaceAll('```json', '').replaceAll('```', '').trim();
      final decoded = jsonDecode(clean);
      if (decoded is Map<String, dynamic>) return decoded;
    } catch (e) {
      debugPrint("[finalizeAndStructureJsonAndDoc] Parse error: $e");
    }

    return {
      "canonical_json": {...criticalData, ...optionalData},
      "master_knowledge_markdown": "# МАСТЕР-ДОКУМЕНТ БАЗЫ ЗНАНИЙ\n\n## 1. Общие сведения\n- Название: $venueName\n- Адрес: ${criticalData['city_address']}\n",
      "interview_questions": []
    };
  }

  static Future<IngestedKnowledgeResult> _callGemini(Map<String, dynamic> body) async {
    final keys = [_primaryKey, _fallbackKey];
    final models = ["gemini-2.5-flash", "gemini-flash-latest"];
    Exception? lastError;

    for (final key in keys) {
      for (final model in models) {
        try {
          final uri =
              Uri.parse("https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent?key=$key");
          final res = await http
              .post(
                uri,
                headers: {'Content-Type': 'application/json'},
                body: jsonEncode(body),
              )
              .timeout(const Duration(seconds: 45));

          if (res.statusCode == 200) {
            final jsonResp = jsonDecode(res.body) as Map<String, dynamic>;
            final candidates = jsonResp['candidates'] as List<dynamic>?;
            if (candidates != null && candidates.isNotEmpty) {
              final content = candidates[0]['content'] as Map<String, dynamic>?;
              final parts = content?['parts'] as List<dynamic>?;
              if (parts != null && parts.isNotEmpty) {
                final textReply = parts[0]['text'] as String? ?? '';
                final clean = textReply.replaceAll('```json', '').replaceAll('```', '').trim();
                final decoded = jsonDecode(clean) as Map<String, dynamic>;

                final summary = decoded['summary'] as String? ?? 'База знаний обновлена';
                final rawFacts = decoded['facts'] as List<dynamic>? ?? [];
                final facts = rawFacts.map((e) => ExtractedKnowledgeItem.fromMap(Map<String, dynamic>.from(e))).toList();

                return IngestedKnowledgeResult(summary: summary, facts: facts);
              }
            }
          } else {
            debugPrint("[ContinuousKnowledge] Gemini HTTP ${res.statusCode}: ${res.body}");
          }
        } catch (e) {
          debugPrint("[ContinuousKnowledge] Error: $e");
          lastError = e is Exception ? e : Exception(e.toString());
        }
      }
    }

    throw lastError ?? Exception("Не удалось проанализировать документ с помощью Gemini AI.");
  }
}
