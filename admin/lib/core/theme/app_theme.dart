import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'colors.dart';

class AppTheme {
  // We overwrite the "lightTheme" because the legacy app defaults to it,
  // effectively forcing the entire application into our new OLED Dark Mode.
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      primaryColor: AppColors.accentGreen,
      scaffoldBackgroundColor: AppColors.background,
      
      colorScheme: const ColorScheme.dark(
        primary: AppColors.accentGreen,
        secondary: AppColors.accentGreen, 
        surface: AppColors.surface,
        onSurface: AppColors.title,
        onPrimary: Colors.black,
      ),

      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: AppColors.title),
        titleTextStyle: TextStyle(
          color: AppColors.title,
          fontSize: 24,
          fontWeight: FontWeight.w900,
          letterSpacing: -1.0,
        ),
      ),

      textTheme: GoogleFonts.interTextTheme(
        ThemeData.dark().textTheme,
      ).apply(
        bodyColor: AppColors.title,
        displayColor: AppColors.title,
      ).copyWith(
        displayLarge: GoogleFonts.inter(fontSize: 34, fontWeight: FontWeight.w900, color: AppColors.title, letterSpacing: -1.0),
        headlineMedium: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.title, letterSpacing: -0.5),
        titleMedium: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.title, letterSpacing: -0.2),
        bodyLarge: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.w400, color: AppColors.title),
        bodyMedium: GoogleFonts.inter(fontSize: 15, color: AppColors.body, fontWeight: FontWeight.w400),
        labelLarge: GoogleFonts.inter(fontSize: 13, color: AppColors.tertiary, fontWeight: FontWeight.w600, letterSpacing: 0.5),
      ),
      
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.accentGreen,
          foregroundColor: Colors.black,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(fontWeight: FontWeight.w900, letterSpacing: 0.5, fontSize: 13),
        ),
      ),

      cardTheme: CardThemeData(
        color: AppColors.surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.secondarySurface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.premiumGold, width: 1.5),
        ),
        labelStyle: const TextStyle(color: AppColors.body, fontWeight: FontWeight.w600),
        hintStyle: GoogleFonts.inter(color: AppColors.tertiary, fontSize: 16),
        prefixIconColor: AppColors.body,
      ),
    );
  }

  static ThemeData get darkTheme => lightTheme; // Ensure it behaves identically just in case
}
