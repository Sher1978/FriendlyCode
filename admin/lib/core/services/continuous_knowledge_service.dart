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
