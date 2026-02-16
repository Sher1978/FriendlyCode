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
  
  // Premium Redesign Palette
  static const Color premiumSand = Color(0xFFFDF6E3); // Soft Sand Background
  static const Color premiumBurntOrange = Color(0xFFD35400); // Deep Burnt Orange
  static const Color premiumGold = Color(0xFFB7950B); // Muted Gold
  static const Color premiumCream = Color(0xFFFFFBF0); // Lighter Cream
  
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
      color: const Color(0xFF4E342E).withOpacity(0.05),
      blurRadius: 15,
      offset: const Offset(0, 8),
    ),
  ];

  // Legacy/Compatibility & Aliases
  static const Color backgroundCream = background;
  static const Color surfaceCream = background;
  static const Color brandOrange = accentOrange;
  static const Color brandGreen = accentGreen;
  static const Color brandBrown = title;
  static const Color textSecondary = body;
  
  static const Color textPrimaryLight = title;
  static const Color textSecondaryLight = body;
  static const Color backgroundAltLight = Color(0xFFF0F3F4);
  
  static const Color backgroundDark = Color(0xFF111111);
  static const Color surfaceDark = Color(0xFF1E1E1E);
  static const Color backgroundLight = Colors.white;
  static const Color surfaceLight = Colors.white;
  static const Color textOnLime = title;

  // Specific Legacy Hits
  static const Color deepSeaBlue = Color(0xFF003B5C);
  static const Color deepSeaBlueDark = Color(0xFF002A42);
  static const Color deepSeaBlueLight = Color(0xFF005687);
  static const Color lime = Color(0xFFC0FF00);
  static const Color limeDim = Color(0xFF94C000);
}
