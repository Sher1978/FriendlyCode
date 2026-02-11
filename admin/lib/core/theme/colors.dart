import 'package:flutter/material.dart';

class AppColors {
  // --- BRAND PALETTE (Dubai Premium) ---
  static const Color background = Color(0xFFFFF8E1); // Cream
  static const Color surface = Colors.white; 
  static const Color title = Color(0xFF4E342E); // Deep Brown
  static const Color body = Color(0xFF795548); // Mid Brown/Slate
  
  static const Color accentOrange = Color(0xFFE68A00); // Friendly Orange
  static const Color accentGreen = Color(0xFF81C784); // Soft Green
  static const Color accentTeal = Color(0xFF0D9488); // Maintain for UI
  static const Color accentIndigo = Color(0xFF4F46E5); // Maintain for UI
  
  // Status Badges (Pastels)
  static const Color statusActiveBg = Color(0xFFDCFCE7);
  static const Color statusActiveText = Color(0xFF166534);
  
  static const Color statusBlockedBg = Color(0xFFFEE2E2);
  static const Color statusBlockedText = Color(0xFF991B1B);
  
  static const Color statusWarningBg = Color(0xFFFEF9C3);
  static const Color statusWarningText = Color(0xFF854D0E);

  // Shadow Opacity
  static List<BoxShadow> softShadow = [
    BoxShadow(
      color: const Color(0xFF4E342E).withValues(alpha: 0.05),
      blurRadius: 15,
      offset: const Offset(0, 8),
    ),
  ];

  // Legacy/Compatibility
  static const Color deepSeaBlue = Color(0xFF003B5C);
  static const Color deepSeaBlueDark = Color(0xFF002A42);
  static const Color lime = Color(0xFFC0FF00);
}
