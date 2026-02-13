import 'dart:typed_data';
import 'package:flutter/foundation.dart';
// Conditional imports to handle web vs mobile IO if needed, 
// but for this simple task, we can use a universal shim or just focus on web 
// if we assume web build. Since 'dart:html' is web-only, let's use a conditional export 
// or a simple dynamic check if we want to be pure.
// For now, simpler approach: use 'universal_html' if added, or just 'dart:html' if web target is primary.
// Given strict lints, let's try a safe implementation.

import 'dart:html' as html;

class FileDownloader {
  static Future<void> downloadFile(Uint8List bytes, String fileName) async {
    if (kIsWeb) {
      final blob = html.Blob([bytes]);
      final url = html.Url.createObjectUrlFromBlob(blob);
      final anchor = html.AnchorElement(href: url);
      anchor.download = fileName;
      anchor.click();
      html.Url.revokeObjectUrl(url);
    } else {
      // Implement mobile file saving if needed (e.g. path_provider + share_plus)
      // For now, print warning
      debugPrint("File saving not implemented for non-web platforms in this helper.");
    }
  }
}
