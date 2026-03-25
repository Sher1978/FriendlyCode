import 'package:flutter/material.dart';

class AppColors {
  // --- BRAND PALETTE (iOS 26 OLED Dark Mode) ---
  static const Color background = Color(0xFF000000); // Deep OLED Black
  static const Color surface = Color(0x661C1C1E); // Frosted Glass / Backdrop Base
  static const Color title = Colors.white; // White Typography
  static const Color body = Color(0x99EBEBF5); // Light grey text

  static const Color accentOrange = Color(0xFFE68A00); // Friendly Orange
  static const Color accentGreen = Color(0xFF00FF41); // iOS 26 Neon Green
  static const Color accentTeal = Color(0xFF0D9488); 
  static const Color accentIndigo = Color(0xFF4F46E5); 
  
  // Premium Redesign Palette (Kept for compatibility, darkened)
  static const Color premiumSand = Color(0xFF1C1C1E); 
  static const Color premiumBurntOrange = Color(0xFFD35400); 
  static const Color premiumGold = Color(0xFFB7950B); 
  static const Color premiumCream = Color(0xFF111111); 
  
  // Status Badges (Neon Pastels for Dark Mode)
  static const Color statusActiveBg = Color(0x3300FF41);
  static const Color statusActiveText = Color(0xFF00FF41);
  
  static const Color statusBlockedBg = Color(0x33FF3B30);
  static const Color statusBlockedText = Color(0xFFFF3B30);
  
  static const Color statusWarningBg = Color(0x33FF9500);
  static const Color statusWarningText = Color(0xFFFF9500);

  // Shadow Opacity (Soft white glows instead of dark shadows)
  static List<BoxShadow> softShadow = [
    BoxShadow(
      color: Colors.white.withOpacity(0.02),
      blurRadius: 20,
      offset: const Offset(0, 10),
    ),
  ];

  // Legacy/Compatibility & Aliases
  static const Color backgroundCream = background;
  static const Color surfaceCream = surface;
  static const Color brandOrange = accentOrange;
  static const Color brandGreen = accentGreen;
  static const Color brandBrown = title;
  static const Color textSecondary = body;
  
  static const Color textPrimaryLight = title;
  static const Color textSecondaryLight = body;
  static const Color backgroundAltLight = Color(0xFF111111);
  
  static const Color backgroundDark = Color(0xFF000000);
  static const Color surfaceDark = Color(0x661C1C1E);
  static const Color backgroundLight = Color(0xFF000000);
  static const Color surfaceLight = Color(0x661C1C1E);
  static const Color textOnLime = Colors.black;

  // Specific Legacy Hits
  static const Color deepSeaBlue = Color(0xFF0A84FF); // iOS Blue Neon
  static const Color deepSeaBlueDark = Color(0xFF004080);
  static const Color deepSeaBlueLight = Color(0xFF409CFF);
  static const Color lime = Color(0xFF00FF41);
  static const Color limeDim = Color(0xFF00CC33);
}
