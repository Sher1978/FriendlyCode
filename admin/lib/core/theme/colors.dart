import 'package:flutter/material.dart';

class AppColors {
  // --- ZERO GRAVITY UI PALETTE ---
  static const Color background = Color(0xFFF9FAFB); // Neutral 50 (SaaS BG)
  static const Color surface = Colors.white; // Card Background
  static const Color title = Color(0xFF111827); // Deep Slate for Titles
  static const Color body = Color(0xFF4B5563); // Mid Slate for Body Text
  
  static const Color accentTeal = Color(0xFF0D9488); // Primary Accent (Teal)
  static const Color accentIndigo = Color(0xFF4F46E5); // Secondary Accent (Indigo)
  
  // Status Badges (Pastels)
  static const Color statusActiveBg = Color(0xFFDCFCE7); // Light Green
  static const Color statusActiveText = Color(0xFF166534);
  
  static const Color statusBlockedBg = Color(0xFFFEE2E2); // Light Red
  static const Color statusBlockedText = Color(0xFF991B1B);
  
  static const Color statusWarningBg = Color(0xFFFEF9C3); // Light Yellow
  static const Color statusWarningText = Color(0xFF854D0E);

  // Shadow Opacity: 5-8%
  static List<BoxShadow> softShadow = [
    BoxShadow(
      color: Colors.black.withValues(alpha: 0.05),
      blurRadius: 10,
      offset: const Offset(0, 4),
    ),
  ];

  // --- LEGACY / COMPATIBILITY (Restoring to prevent breaks) ---
  static const Color brandOrange = Color(0xFFE68A00); 
  static const Color brandOrangeLight = Color(0xFFFFB74D);
  static const Color brandGreen = Color(0xFF81C784); 
  static const Color brandBrown = Color(0xFF4E342E); 
  static const Color lime = Color(0xFFC0FF00);
}
