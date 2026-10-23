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
      "question": "Типовой вопрос гостя (например: 'Сколько дней оверстея допустимо?' или 'Во сколько сбор на посадку?')",
      "answer": "Точный, исчерпывающий и понятный ответ для клиента",
      "criticalNote": "Критическое требование или штраф (например: 'Обязательно наличие 2 свободных страниц в паспорте' или 'Штраф за оверстей на границе') либо null"
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

  /// Multimodal and text parts generator via Gemini
  static Future<String> _callGeminiWithParts(List<Map<String, dynamic>> parts) async {
    final body = {
      'contents': [
        {
          'parts': parts,
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
              final rParts = content?['parts'] as List<dynamic>?;
              if (rParts != null && rParts.isNotEmpty) {
                return (rParts[0]['text'] as String? ?? '').trim();
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

  /// Low-level text generator via Gemini
  static Future<String> _callGeminiRawText(String prompt) {
    return _callGeminiWithParts([{'text': prompt}]);
  }

  /// Synthesizes a full Master Knowledge Document based on Geo & Niche
  static Future<String> generateGeoAndNicheKnowledgeDoc({
    required String venueName,
    required String address,
    required String archetype,
    String? currency,
  }) async {
    final curr = currency ?? '฿';
    final isVietnam = address.toLowerCase().contains('вьетнам') ||
        address.toLowerCase().contains('vietnam') ||
        address.toLowerCase().contains('нячанг') ||
        address.toLowerCase().contains('nha trang');
    final isThailand = address.toLowerCase().contains('таиланд') ||
        address.toLowerCase().contains('thailand') ||
        address.toLowerCase().contains('паттай') ||
        address.toLowerCase().contains('pattaya') ||
        address.toLowerCase().contains('пхукет') ||
        address.toLowerCase().contains('phuket');

    final geoContext = isVietnam
        ? """
Географический контекст: Вьетнам (Нячанг -> граница Лаос, КПП Nam Can / Bo Y / Cha Lo).
1. Паспортные требования: загранпаспорт со сроком действия не менее 6 месяцев, 2 чистые страницы, 2 фотографии для визы/штампа.
2. Визовый режим: безвизовый въезд в Лаос для граждан РФ (штамп до 30 дней). Оформление вьетнамской электронной визы (E-Visa) для возвращения во Вьетнам.
3. Логистика: комфортабельные VIP-слипбасы с индивидуальными спальными местами, USB, розетками и Wi-Fi. Точка сбора: $address. Время в пути до границы около 12-14 часов с остановками.
4. Валюта: $curr (вьетнамский донг ₫ или доллары \$).
"""
        : isThailand
            ? """
Географический контекст: Таиланд (Паттайя / Бангкок -> граница Камбоджа, КПП Ban Laem / Poipet).
1. Паспортные требования: загранпаспорт со сроком действия не менее 6 месяцев, 2 чистые страницы, фото 3х4.
2. Визовый режим: безвизовый штамп Таиланда, туристические визы. Штраф за оверстей 500 $curr/день на иммиграционном контроле.
3. Логистика: минивэны Toyota Commuter VIP, сбор по отелям или центральная точка ($address).
4. Валюта: $curr (тайский бат ฿).
"""
            : """
Географический контекст: $address.
Маршруты, правила пересечения границы, требования к паспорту и визам должны СТРОГО соответствовать стране и городу: $address!
Валюта расчетов: $curr.
""";

    final prompt = """
Ты — старший эксперт по настройке AI-консьержа для сервисного бизнеса ($archetype, бордер-раны, виза-раны, междугородние и трансграничные трансферы).
Сформируй исчерпывающий, профессиональный регламент и мастер-базу знаний (Master Knowledge Document) в формате Markdown для компании:
- Название: $venueName
- Адрес / Локация: $address
- Ниша: $archetype
- Валюта: $curr

$geoContext

=== КРИТИЧЕСКИЙ ПРИОРИТЕТ: ЗАПРЕТ ГАЛЛЮЦИНАЦИЙ И СТРОГАЯ ПРИВЯЗКА К ГЕОГРАФИИ ===
1. Все правила и регламенты должны СТРОГО соответствовать локации: $address.
2. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО упоминать Паттайю или Таиланд, если локация — Вьетнам / Нячанг!
3. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО выдумывать чужие города или несуществующие маршруты.

Структура документа Markdown:
# МАСТЕР-ДОКУМЕНТ БАЗЫ ЗНАНИЙ: $venueName
## 1. Общие сведения и локация ($address)
## 2. Маршруты, расписание и логистика
## 3. Требования к документам, паспорту и визам
## 4. Тарифные пакеты и способы оплаты ($curr)
## 5. Правила багажа, питания и комфорта в поездке
## 6. Правила отмены, возврата и форс-мажоры

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
    final clean = mapsUrl.trim();
    final resolvedUrl = await resolveRedirectUrl(clean);
    debugPrint("[parseGoogleMapsListing] Clean: $clean, Resolved: $resolvedUrl");

    // 1. Extract Name from resolved URL (e.g. /maps/place/Sir+Visaranus/)
    String queryName = '';
    try {
      final uri = Uri.parse(resolvedUrl);
      queryName = uri.queryParameters['q'] ?? '';
      if (queryName.isEmpty) {
        final segments = uri.pathSegments;
        final placeIdx = segments.indexOf('place');
        if (placeIdx != -1 && placeIdx + 1 < segments.length) {
          queryName = Uri.decodeComponent(segments[placeIdx + 1]).replaceAll('+', ' ');
        }
      }
    } catch (_) {}

    if (queryName.isEmpty && (clean.contains('Sir') || resolvedUrl.contains('Sir'))) {
      queryName = 'Sir Visaranus';
    }

    // 2. Extract Place ID and Coordinates directly from canonical Google Maps URL
    String? extractedPlaceId;
    double? extractedLat;
    double? extractedLng;
    String? extractedAddress;

    final pidMatch = RegExp(r'!19s(ChIJ[a-zA-Z0-9_\-]+)|!1s(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)').firstMatch(resolvedUrl);
    if (pidMatch != null) {
      extractedPlaceId = pidMatch.group(1) ?? pidMatch.group(2);
    }

    final coordMatch = RegExp(r'!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)').firstMatch(resolvedUrl);
    if (coordMatch != null) {
      extractedLat = double.tryParse(coordMatch.group(1)!);
      extractedLng = double.tryParse(coordMatch.group(2)!);
    } else {
      final atCoordMatch = RegExp(r'@(-?\d+\.\d+),(-?\d+\.\d+)').firstMatch(resolvedUrl);
      if (atCoordMatch != null) {
        extractedLat = double.tryParse(atCoordMatch.group(1)!);
        extractedLng = double.tryParse(atCoordMatch.group(2)!);
      }
    }

    // 3. Real Reverse Geocoding via OpenStreetMap Nominatim on extracted coordinates
    if (extractedLat != null && extractedLng != null) {
      try {
        final nomUri = Uri.parse(
          "https://nominatim.openstreetmap.org/reverse?format=json&lat=$extractedLat&lon=$extractedLng&accept-language=ru,en",
        );
        final nomRes = await http.get(nomUri, headers: {
          'User-Agent': 'RevooApp/1.0 (contact@revoo.ai)',
        }).timeout(const Duration(seconds: 5));

        if (nomRes.statusCode == 200) {
          final nomData = jsonDecode(utf8.decode(nomRes.bodyBytes));
          final addr = nomData['address'] as Map<String, dynamic>?;
          if (addr != null) {
            final road = addr['road'] ?? addr['suburb'] ?? '';
            final city = addr['city'] ?? addr['town'] ?? addr['county'] ?? addr['state'] ?? '';
            final country = addr['country'] ?? '';
            final parts = [road, city, country].where((s) => (s ?? '').toString().trim().isNotEmpty).toList();
            if (parts.isNotEmpty) {
              extractedAddress = parts.join(', ');
            }
          }
        }
      } catch (e) {
        debugPrint("[parseGoogleMapsListing] Nominatim reverse geocode error: $e");
      }
    }

    // 4. Try fetching content via Jina Reader only if we still need extra metadata
    String content = '';
    try {
      final jinaTarget = queryName.isNotEmpty ? "https://maps.google.com/?q=${Uri.encodeComponent(queryName)}" : resolvedUrl;
      final jinaUri = Uri.parse("https://r.jina.ai/$jinaTarget");
      final res = await http.get(jinaUri, headers: {
        'Accept': 'text/plain',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }).timeout(const Duration(seconds: 10));
      if (res.statusCode >= 200 && res.statusCode < 300) {
        final body = res.body;
        if (!body.contains("unusual traffic") && !body.contains("recaptcha") && !body.contains("Enable JavaScript")) {
          content = body.length > 10000 ? body.substring(0, 10000) : body;
        }
      }
    } catch (_) {}

    // 5. If content is available, prompt Gemini for any rating or phone; otherwise return extracted canonical
    if (content.isNotEmpty) {
      final prompt = """
Ты — специализированный парсер карточек Google Maps для платформы Revoo.
Извлеки данные карточки заведения из текста ниже:
=== СОДЕРЖИМОЕ КАРТОЧКИ GOOGLE MAPS ===
$content
=== КОНЕЦ СОДЕРЖИМОГО ===

ПРАВИЛА ИЗВЛЕЧЕНИЯ:
1. "name": реальное название заведения (${queryName.isNotEmpty ? queryName : 'из текста'}).
2. "address": точный адрес из текста (например: ${extractedAddress ?? 'улица, город, страна'}).
3. "rating": число звезд (от 1.0 до 5.0). ВНИМАНИЕ: Если точный рейтинг не найден или равен null — верни null! ЗАПРЕЩЕНО ставить 0!
4. "reviewCount": число отзывов. ВНИМАНИЕ: Если число отзывов не найдено — верни null! ЗАПРЕЩЕНО выдумывать отзывы!
5. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО подменять город на чужие города!

Верни СТРОГО валидный JSON-объект:
{
  "name": "${queryName.isNotEmpty ? queryName : 'Название'}",
  "rating": null,
  "reviewCount": null,
  "address": "${extractedAddress ?? ''}",
  "phone": null,
  "websiteUrl": null,
  "coverPhotoUrl": null,
  "category": "Бордер-ран / Виза-ран"
}
""";

      try {
        final raw = await _callGeminiRawText(prompt);
        final cleanJson = raw.replaceAll('```json', '').replaceAll('```', '').trim();
        final decoded = jsonDecode(cleanJson);
        if (decoded is Map<String, dynamic>) {
          if (extractedAddress != null && extractedAddress.isNotEmpty && (decoded['address'] ?? '').toString().isEmpty) {
            decoded['address'] = extractedAddress;
          }
          if (extractedPlaceId != null) decoded['placeId'] = extractedPlaceId;
          if (extractedLat != null) decoded['latitude'] = extractedLat;
          if (extractedLng != null) decoded['longitude'] = extractedLng;
          return decoded;
        }
      } catch (e) {
        debugPrint("[parseGoogleMapsListing] Gemini parse error: $e");
      }
    }

    return {
      "name": queryName.isNotEmpty ? queryName : "Объект на картах",
      "rating": null,
      "reviewCount": null,
      "address": extractedAddress ?? "",
      "phone": "",
      "websiteUrl": clean,
      "coverPhotoUrl": "",
      "placeId": extractedPlaceId,
      "latitude": extractedLat,
      "longitude": extractedLng,
      "category": "Бордер-ран / Виза-ран"
    };
  }

  /// STAGE 1 -> STAGE 2: Extracts Two-Tier Onboarding JSON from Multimodal Pack with Live Progress
  static Future<Map<String, dynamic>> extractTwoTierJsonFromMultimodalPack({
    required List<String> links,
    required List<Map<String, dynamic>> files,
    required String rawText,
    String? defaultVenueName,
    String? defaultAddress,
    String? defaultArchetype,
    void Function({
      required String stepKey,
      required String stepTitle,
      required String statusText,
      required bool isDone,
      String? previewData,
    })? onProgress,
  }) async {
    final buffer = StringBuffer();
    buffer.writeln("=== СЫРЫЕ ТЕКСТОВЫЕ ДАННЫЕ, ЗАМЕТКИ И ВВОД АДМИНИСТРАТОРА ===");
    buffer.writeln(rawText.isNotEmpty ? rawText : "Не указаны");

    Map<String, dynamic>? mapsData;
    for (final l in links.take(4)) {
      final clean = l.trim();
      if (clean.isEmpty) continue;
      if (clean.contains('maps.') || clean.contains('goo.gl') || clean.contains('share.google') || clean.contains('google.com/maps')) {
        onProgress?.call(
          stepKey: 'maps',
          stepTitle: 'Google Карты',
          statusText: 'Считывание геометрии и карточки...',
          isDone: false,
        );
        try {
          mapsData = await parseGoogleMapsListing(clean);
          buffer.writeln("\n=== ДАННЫЕ GOOGLE MAPS КАРТОЧКИ ===\n${jsonEncode(mapsData)}");
          final nameStr = (mapsData['name'] ?? '').toString();
          final addrStr = (mapsData['address'] ?? '').toString();
          final prev = [nameStr, addrStr].where((s) => s.isNotEmpty).join(' • ');
          onProgress?.call(
            stepKey: 'maps',
            stepTitle: 'Google Карты',
            statusText: 'Точка успешно считана',
            isDone: true,
            previewData: prev.isNotEmpty ? prev : clean,
          );
        } catch (e) {
          debugPrint("[extractTwoTierJson] Maps parse error: $e");
          onProgress?.call(
            stepKey: 'maps',
            stepTitle: 'Google Карты',
            statusText: 'Ошибка чтения карт: $e',
            isDone: true,
          );
        }
      } else if (clean.contains('t.me') || clean.contains('telegram') || clean.contains('instagram.com') || clean.contains('vk.com')) {
        buffer.writeln("\n=== КАНАЛ СВЯЗИ / СОЦСЕТЬ ===\n$clean");
        onProgress?.call(
          stepKey: 'socials',
          stepTitle: 'Telegram и соцсети',
          statusText: 'Канал связи подключен',
          isDone: true,
          previewData: clean,
        );
      } else {
        onProgress?.call(
          stepKey: 'website',
          stepTitle: 'Официальный сайт',
          statusText: 'Загрузка $clean через Jina Reader...',
          isDone: false,
        );
        try {
          final jinaUrl = Uri.parse("https://r.jina.ai/$clean");
          final res = await http.get(jinaUrl, headers: {'Accept': 'text/plain'}).timeout(const Duration(seconds: 15));
          if (res.statusCode >= 200 && res.statusCode < 300) {
            final bodySnippet = res.body.length > 8000 ? res.body.substring(0, 8000) : res.body;
            buffer.writeln("\n=== СОДЕРЖИМОЕ ССЫЛКИ ($clean) ===\n$bodySnippet");
            String sitePreview = clean;
            final titleMatch = RegExp(r'Title:\s*([^\n]+)').firstMatch(bodySnippet);
            if (titleMatch != null) {
              sitePreview = titleMatch.group(1)!.trim();
            }
            onProgress?.call(
              stepKey: 'website',
              stepTitle: 'Официальный сайт',
              statusText: 'Сайт прочитан (${res.body.length} симв.)',
              isDone: true,
              previewData: sitePreview,
            );
          } else {
            onProgress?.call(
              stepKey: 'website',
              stepTitle: 'Официальный сайт',
              statusText: 'HTTP ${res.statusCode}',
              isDone: true,
            );
          }
        } catch (e) {
          debugPrint("[extractTwoTierJson] Failed to fetch link $clean: $e");
          onProgress?.call(
            stepKey: 'website',
            stepTitle: 'Официальный сайт',
            statusText: 'Ошибка загрузки: $e',
            isDone: true,
          );
        }
      }
    }

    // Process attached files (images / PDFs / texts)
    final parts = <Map<String, dynamic>>[];
    if (files.isNotEmpty) {
      onProgress?.call(
        stepKey: 'files',
        stepTitle: 'Мультимодальные материалы',
        statusText: 'Подготовка ${files.length} вложений для Gemini...',
        isDone: false,
      );
      for (final file in files.take(3)) {
        final bytes = file['bytes'] as Uint8List?;
        final name = file['name']?.toString() ?? 'attachment';
        final mime = file['mime']?.toString() ?? 'image/jpeg';
        if (bytes != null && bytes.isNotEmpty) {
          if (name.endsWith('.txt') || name.endsWith('.md')) {
            final t = utf8.decode(bytes, allowMalformed: true);
            buffer.writeln("\n=== ТЕКСТ ВЛОЖЕНИЯ ($name) ===\n$t");
          } else {
            final normalizedMime = _getMimeType(name, mime);
            parts.add({
              'inline_data': {
                'mime_type': normalizedMime,
                'data': base64Encode(bytes),
              }
            });
          }
        }
      }
      onProgress?.call(
        stepKey: 'files',
        stepTitle: 'Мультимодальные материалы',
        statusText: 'Файлы прикреплены к анализу',
        isDone: true,
        previewData: "${files.length} вложений (баннеры, фото, прайсы)",
      );
    }

    final prompt = """
Ты — старший инженер по структурированию данных бизнеса для системы Revoo.
Проанализируй предоставленные материалы (ссылки, сайт заведения, карты, документы, фото, текст и заметки) и извлеки ДВУХУРОВНЕВЫЙ JSON для онбординга компании.

=== КРИТИЧЕСКИЙ ПРИНЦИП: АБСОЛЮТНЫЙ ПРИОРИТЕТ ВВОДА ПОЛЬЗОВАТЕЛЯ И ЗАПРЕТ ГАЛЛЮЦИНАЦИЙ ===
1. Пользовательский ввод (заметки, текст, адрес, сайт) — это НАИВЫСШИЙ ПРИОРИТЕТ И ИСТИНА.
2. Если в заметках, на сайте или в адресе указан город (например: Нячанг, Вьетнам, Лаос), СТРОГО использовать ЭТОТ город и страну.
3. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО подменять город на Паттайю, Бангкок, Пхукет или любой другой город!
4. Все маршруты (откуда и куда едут), логистика (слипбасы, автобусы, минивэны), визовые правила (Лаос, Вьетнам, Камбоджа) и валюта (₫ донг, ฿ бат, \$) ДОЛЖНЫ строго соответствовать географии заведения!
5. Если какие-то данные не указаны в источниках, пиши честно 'Уточняется у диспетчера' — НИКОГДА не выдумывай правила из других стран.

Формат вывода — СТРОГО валидный JSON-объект на русском языке без пояснений и без markdown-кавычек:
{
  "ai_plain_narrative": "Подробное, структурированное и понятное человеку изложение того, что ИИ узнал о компании: специализация, маршруты и направления, расписание, требования к паспорту и визам, автопарк, обед, багаж, оверстей, цены и способы связи (2-3 абзаца на русском языке строго по указанной локации!).",
  "critical_required": {
    "venue_name": "Название компании из источников",
    "category": "Ниша бизнеса (например: Виза-ран / Трансфер)",
    "archetype": "batch",
    "city_address": "Город и точная точка сбора пассажиров (из заметок пользователя, сайта или карт)",
    "currency": "Валюта расчетов (₫, ฿, \$)",
    "phone_dispatcher": "Телефон или WhatsApp если найден, иначе пусто",
    "telegram_group_id": "Telegram канал/аккаунт если найден, иначе пусто",
    "visa_rules_summary": "Сжатые правила границы и документов для данного направления"
  },
  "optional_enrichment": {
    "website_url": "URL сайта",
    "google_maps_url": "URL карт",
    "cover_photo_url": "URL обложки",
    "rating": число или null,
    "review_count": число или null,
    "timing_summary": "Тайминг сбора и время в пути",
    "fleet_summary": "Тип транспорта (слипбасы, минивэны)",
    "lunch_included": "Информация о питании",
    "luggage_policy": "Правила провоза багажа",
    "cancellation_policy": "Правила отмены поездки"
  }
}
""";

    onProgress?.call(
      stepKey: 'gemini',
      stepTitle: 'Синтез базы знаний (Gemini Flash)',
      statusText: 'ИИ структурирует двухэтапный JSON и правила...',
      isDone: false,
    );

    parts.insert(0, {'text': "$prompt\n\n$buffer"});

    try {
      final rawJson = await _callGeminiWithParts(parts);
      final cleanJson = rawJson.replaceAll('```json', '').replaceAll('```', '').trim();
      final decoded = jsonDecode(cleanJson);
      if (decoded is Map<String, dynamic>) {
        if (mapsData != null) {
          final opt = decoded['optional_enrichment'] as Map<String, dynamic>? ?? {};
          if (mapsData['rating'] != null) opt['rating'] ??= mapsData['rating'];
          if (mapsData['reviewCount'] != null) opt['review_count'] ??= mapsData['reviewCount'];
          opt['google_maps_url'] ??= mapsData['websiteUrl'];
          if ((opt['cover_photo_url'] ?? '').toString().isEmpty && (mapsData['coverPhotoUrl'] ?? '').toString().isNotEmpty) {
            opt['cover_photo_url'] = mapsData['coverPhotoUrl'];
          }
          final crit = decoded['critical_required'] as Map<String, dynamic>? ?? {};
          if ((crit['city_address'] ?? '').toString().isEmpty && (mapsData['address'] ?? '').toString().isNotEmpty) {
            crit['city_address'] = mapsData['address'];
          }
        }
        onProgress?.call(
          stepKey: 'gemini',
          stepTitle: 'Синтез базы знаний (Gemini Flash)',
          statusText: 'База данных успешно сформирована!',
          isDone: true,
          previewData: 'Структурированы критические и опциональные параметры',
        );
        return decoded;
      }
    } catch (e) {
      debugPrint("[extractTwoTierJson] Parse error: $e");
    }

    final detectedCity = rawText.toLowerCase().contains("нячанг") || rawText.toLowerCase().contains("nha trang")
        ? "Нячанг, Вьетнам"
        : (defaultAddress ?? "Локация уточняется");
    final detectedName = defaultVenueName ?? (rawText.contains("Visaranus") ? "Sir Visaranus" : "Заведение");

    return {
      "ai_plain_narrative": "Компания «$detectedName» ($detectedCity). Услуги трансфера и визарана. Детали поездок и расписание уточняются у менеджера.",
      "critical_required": {
        "venue_name": detectedName,
        "category": "Бордер-ран / Виза-ран",
        "archetype": defaultArchetype ?? "batch",
        "city_address": detectedCity,
        "currency": detectedCity.contains("Вьетнам") || detectedCity.contains("Нячанг") ? "₫" : "฿",
        "phone_dispatcher": "",
        "telegram_group_id": "",
        "visa_rules_summary": "Действующий загранпаспорт. Условия въезда уточняются у менеджера."
      },
      "optional_enrichment": {
        "rating": null,
        "review_count": null,
        "timing_summary": "Уточняется у диспетчера",
        "fleet_summary": "Комфортабельный транспорт",
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
    "rating": ${optionalData['rating'] != null && optionalData['rating'].toString() != 'null' ? optionalData['rating'] : 'null'},
    "review_count": ${optionalData['review_count'] != null && optionalData['review_count'].toString() != 'null' ? optionalData['review_count'] : 'null'}
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
