import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'colors.dart';

class AppTheme {
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      primaryColor: AppColors.deepSeaBlue,
      scaffoldBackgroundColor: AppColors.backgroundDark,
      
      colorScheme: const ColorScheme.dark(
        primary: AppColors.deepSeaBlue,
        secondary: AppColors.lime,
        onSecondary: AppColors.textOnLime,
        surface: AppColors.surfaceDark,
      ),

      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.deepSeaBlue,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: TextStyle(
          fontFamily: 'Inter',
          fontSize: 20,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
      ),
      
      // ... keep existing dark theme buttons if needed, or update similarly
    );
  }

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      primaryColor: AppColors.accentOrange,
      scaffoldBackgroundColor: AppColors.background, // Cream
      
      colorScheme: const ColorScheme.light(
        primary: AppColors.accentOrange,
        secondary: AppColors.accentGreen,
        surface: AppColors.surface,
        onSurface: AppColors.title,
        onPrimary: Colors.white,
      ),

      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.background,
        elevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: AppColors.title),
        titleTextStyle: TextStyle(
          color: AppColors.title,
          fontSize: 20,
          fontWeight: FontWeight.w900,
          letterSpacing: -0.5,
        ),
      ),

      textTheme: GoogleFonts.interTextTheme(
        ThemeData.light().textTheme,
      ).apply(
        bodyColor: AppColors.body,
        displayColor: AppColors.title,
      ).copyWith(
        displayLarge: GoogleFonts.inter(fontSize: 36, fontWeight: FontWeight.w900, color: AppColors.title, letterSpacing: -1.0),
        headlineMedium: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w800, color: AppColors.title, letterSpacing: -0.5),
        titleMedium: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.title),
        bodyLarge: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w500, color: AppColors.title),
        bodyMedium: GoogleFonts.inter(fontSize: 14, color: AppColors.body, fontWeight: FontWeight.w500),
      ),
      
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.accentOrange,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          textStyle: const TextStyle(fontWeight: FontWeight.w800, letterSpacing: 0.5),
        ),
      ),

      cardTheme: CardThemeData(
        color: AppColors.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: BorderSide(color: AppColors.title.withValues(alpha: 0.05)),
        ),
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: AppColors.title.withValues(alpha: 0.1)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: AppColors.title.withValues(alpha: 0.1)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.accentOrange, width: 2),
        ),
        hintStyle: GoogleFonts.inter(color: AppColors.body.withValues(alpha: 0.5), fontSize: 15),
        prefixIconColor: AppColors.accentOrange,
      ),
    );
  }
}
