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
      primaryColor: AppColors.deepSeaBlue, // Brand Color
      scaffoldBackgroundColor: AppColors.backgroundLight, // White
      
      colorScheme: const ColorScheme.light(
        primary: AppColors.textPrimaryLight, // "Stitch" Black for primary contrast
        onPrimary: Colors.white,
        secondary: AppColors.textSecondaryLight, // "Stitch" Slate
        onSecondary: Colors.white,
        surface: AppColors.surfaceLight, // White
        onSurface: AppColors.textPrimaryLight,
        outline: AppColors.backgroundAltLight, // Light Gray for borders
      ),

      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.backgroundLight,
        elevation: 0,
        centerTitle: true,
        iconTheme: IconThemeData(color: AppColors.textPrimaryLight),
        titleTextStyle: TextStyle(
          color: AppColors.textPrimaryLight,
          fontSize: 20,
          fontWeight: FontWeight.bold,
        ),
      ),

      textTheme: GoogleFonts.plusJakartaSansTextTheme(
        ThemeData.light().textTheme,
      ).apply(
        bodyColor: AppColors.textPrimaryLight,
        displayColor: AppColors.textPrimaryLight,
      ).copyWith(
        displayLarge: GoogleFonts.plusJakartaSans(fontSize: 32, fontWeight: FontWeight.bold, color: AppColors.textPrimaryLight),
        headlineMedium: GoogleFonts.plusJakartaSans(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.textPrimaryLight), // "Popular Resorts" size
        titleMedium: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w500, color: AppColors.textPrimaryLight),
        bodyLarge: GoogleFonts.plusJakartaSans(fontSize: 16, color: AppColors.textPrimaryLight),
        bodyMedium: GoogleFonts.plusJakartaSans(fontSize: 14, color: AppColors.textSecondaryLight), // "Iconic Matterhorn..."
      ),
      
      iconTheme: const IconThemeData(
        color: AppColors.textPrimaryLight,
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.backgroundAltLight, // #F0F3F4
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        hintStyle: GoogleFonts.plusJakartaSans(color: AppColors.textSecondaryLight, fontSize: 16),
        prefixIconColor: AppColors.textSecondaryLight,
      ),
    );
  }
}
