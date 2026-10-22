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
