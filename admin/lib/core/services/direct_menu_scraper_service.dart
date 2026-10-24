import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:friendly_code/core/models/venue_model.dart';

class DirectMenuScraperService {
  static const List<String> _aiProxyEndpoints = [
    '/api/ai-proxy',
    'https://bot-lab-21910.web.app/api/ai-proxy',
    'https://friendly-code-489513.web.app/api/ai-proxy',
  ];

  /// Resolves mobile Grab short links (e.g. r.grab.com/g/6-...-5-C8CXRJNGHFDHR2)
  static String resolveTargetUrl(String inputUrl) {
    final trimmed = inputUrl.trim();
    if (trimmed.contains('r.grab.com')) {
      final match = RegExp(r'(5-[A-Za-z0-9]+)').firstMatch(trimmed);
      if (match != null) {
        final restaurantId = match.group(1);
        final resolved = "https://food.grab.com/vn/en/restaurant/online-delivery/$restaurantId";
        debugPrint("[DirectMenuScraper] Resolved short Grab URL $trimmed -> $resolved");
        return resolved;
      }
    }
    return trimmed;
  }

  /// Fetches raw markdown page text via Jina Reader (with CORS support)
  static Future<String> fetchRawContent(String targetUrl) async {
    final jinaUrl = Uri.parse("https://r.jina.ai/$targetUrl");
    debugPrint("[DirectMenuScraper] Fetching from Jina: $jinaUrl");

    final response = await http.get(jinaUrl, headers: {
      'Accept': 'text/plain',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }).timeout(const Duration(seconds: 25));

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final body = response.body;
      if (body.length > 300) {
        debugPrint("[DirectMenuScraper] Fetched ${body.length} characters from Jina");
        return body;
      }
    }
    throw Exception("Failed to fetch menu content from URL (HTTP ${response.statusCode})");
  }

  /// Sends text to AI via server-side /api/ai-proxy to extract structured menu items
  static Future<List<GmMenuItem>> extractDishesWithGemini(String markdownText) async {
    final truncatedText = markdownText.length > 25000 ? markdownText.substring(0, 25000) : markdownText;

    const prompt = "Extract all food and drink menu items from this raw text as a valid JSON array of objects. "
        "Each object must have these exact keys:\n"
        "- name: string (dish title in original language)\n"
        "- description: string (ingredients or brief description, or empty)\n"
        "- price: number (numeric price without currency symbols)\n"
        "- category: string (section or category name)\n"
        "- imageUrl: string (valid http/https image URL from markdown or empty)\n\n"
        "Return ONLY the raw JSON array without any markdown backticks or commentary.";

    Exception? lastError;
    for (final endpoint in _aiProxyEndpoints) {
      try {
        debugPrint("[DirectMenuScraper] Querying AI Proxy ($endpoint)...");
        final res = await http
            .post(
              Uri.parse(endpoint),
              headers: {'Content-Type': 'application/json'},
              body: jsonEncode({
                'mode': 'groq',
                'prompt': "$prompt\n\n=== MENU CONTENT ===\n$truncatedText",
                'maxTokens': 3500,
              }),
            )
            .timeout(const Duration(seconds: 25));

        if (res.statusCode == 200) {
          final jsonResp = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
          final content = jsonResp['text']?.toString() ?? '';
          final clean = content.replaceAll('```json', '').replaceAll('```', '').trim();
          final decoded = jsonDecode(clean);
          if (decoded is List) {
            final items = <GmMenuItem>[];
            for (int i = 0; i < decoded.length; i++) {
              final map = decoded[i] as Map<String, dynamic>;
              final name = map['name']?.toString() ?? 'Блюдо';
              final desc = map['description']?.toString() ?? '';
              final priceVal = map['price'];
              final priceStr = priceVal != null ? priceVal.toString() : '0';
              final category = map['category']?.toString() ?? 'General';
              final imageUrl = map['imageUrl']?.toString() ?? '';

              items.add(GmMenuItem(
                id: "item_${DateTime.now().millisecondsSinceEpoch}_$i",
                name: name,
                description: desc,
                price: priceStr,
                aggregatorPrice: priceStr,
                category: category,
                imageUrl: imageUrl,
                isPublished: false,
              ));
            }
            if (items.isNotEmpty) {
              debugPrint("[DirectMenuScraper] Successfully extracted ${items.length} items via AI Proxy");
              return items;
            }
          }
        } else {
          debugPrint("[DirectMenuScraper] AI Proxy returned HTTP ${res.statusCode}: ${res.body}");
        }
      } catch (e) {
        debugPrint("[DirectMenuScraper] Error with endpoint $endpoint: $e");
        lastError = e is Exception ? e : Exception(e.toString());
      }
    }

    throw lastError ?? Exception("Could not extract menu items with AI Proxy");
  }

  /// Full end-to-end scraper pipeline directly in browser
  static Future<List<GmMenuItem>> scrapeMenu(String inputUrl) async {
    final targetUrl = resolveTargetUrl(inputUrl);
    final rawText = await fetchRawContent(targetUrl);
    return await extractDishesWithGemini(rawText);
  }
}
