import 'package:flutter/material.dart';

class AppColors {
  // --- BRAND PALETTE (iOS 26 OLED Dark Mode) ---
  static const Color background = Color(0xFF000000); // Deep OLED Black
  static const Color surface = Color(0xFF1C1C1E); // Apple Standard Gray
  static const Color secondarySurface = Color(0xFF2C2C2E); // Lighter Surface for nesting
  
  static const Color premiumGold = Color(0xFFD4AF37); // Dubai Gold
  static const Color premiumGoldBright = Color(0xFFF3E5AB); // Light Gold Glow
  
  static const Color title = Colors.white; // White Typography
  static const Color body = Color(0x99EBEBF5); // Light grey text (Apple secondary)
  static const Color tertiary = Color(0x4DEBEBF5); // Apple tertiary text

  static const Color accentOrange = Color(0xFFFF9F0A); // iOS Orange
  static const Color accentGreen = Color(0xFF30D158); // iOS Green
  static const Color accentBlue = Color(0xFF0A84FF); // iOS Blue
  static const Color accentRed = Color(0xFFFF453A); // iOS Red
  static const Color accentYellow = Color(0xFFFFD60A); // iOS Yellow
  static const Color accentTeal = Color(0xFF64D2FF); // iOS Teal/Cyan
  static const Color accentIndigo = Color(0xFF5E5CE6); // iOS Indigo
  static const Color softShadow = Color(0x1A000000); // Soft Shadow for visibility
  
  // Premium Redesign Palette (Kept for compatibility, darkened)
  static const Color premiumSand = Color(0xFF1C1C1E); 
  static const Color premiumBurntOrange = Color(0xFFD35400); 
  static const Color premiumCream = Color(0xFF111111); 
  
  // Status Badges (Neon Pastels for Dark Mode)
  static const Color statusActiveBg = Color(0x3300FF41);
  static const Color statusActiveText = Color(0xFF00FF41);
  
  static const Color statusBlockedBg = Color(0x33FF3B30);
  static const Color statusBlockedText = Color(0xFFFF3B30);
  
  static const Color statusWarningBg = Color(0x33FF9500);
  static const Color statusWarningText = Color(0xFFFF9500);

  // Shadow/Glow (Soft white glows instead of dark shadows)
  static List<BoxShadow> softGlow = [
    BoxShadow(
      color: premiumGold.withOpacity(0.1),
      blurRadius: 30,
      offset: const Offset(0, 10),
    ),
  ];

  static List<BoxShadow> cardShadow = [
    BoxShadow(
      color: Colors.black.withOpacity(0.5),
      blurRadius: 40,
      offset: const Offset(0, 20),
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
