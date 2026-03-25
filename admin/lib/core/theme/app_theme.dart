import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'colors.dart';

class AppTheme {
  // We overwrite the "lightTheme" because the legacy app defaults to it,
  // effectively forcing the entire application into our new OLED Dark Mode.
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark, // Force Dark Brightness for text contrast
      primaryColor: AppColors.accentOrange,
      scaffoldBackgroundColor: Colors.black, // Ensure the base is always black
      
      colorScheme: const ColorScheme.dark(
        primary: AppColors.accentOrange,
        secondary: AppColors.accentOrange, 
        surface: AppColors.surface, // frosted glass color
        onSurface: AppColors.title, // White
        onPrimary: Colors.black, // Text on orange buttons
      ),

      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
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
        ThemeData.dark().textTheme,
      ).apply(
        bodyColor: AppColors.title, // White
        displayColor: AppColors.title,
      ).copyWith(
        displayLarge: GoogleFonts.inter(fontSize: 36, fontWeight: FontWeight.w900, color: AppColors.title, letterSpacing: -1.0),
        headlineMedium: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w800, color: AppColors.title, letterSpacing: -0.5),
        titleMedium: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.title),
        bodyLarge: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w500, color: AppColors.title),
        bodyMedium: GoogleFonts.inter(fontSize: 14, color: AppColors.title, fontWeight: FontWeight.w500),
      ),
      
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.white,
          foregroundColor: Colors.black, // Apple style buttons
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          textStyle: const TextStyle(fontWeight: FontWeight.w800, letterSpacing: 0.5),
        ),
      ),

      cardTheme: CardThemeData(
        color: AppColors.surface, // Semi-transparent grey
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(32),
          side: BorderSide(color: Colors.white.withOpacity(0.1)),
        ),
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Color(0x661C1C1E), // Frosted inputs
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(20),
          borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(20),
          borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(20),
          borderSide: const BorderSide(color: Colors.white, width: 2),
        ),
        labelStyle: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        hintStyle: GoogleFonts.inter(color: Colors.white.withOpacity(0.4), fontSize: 15),
        prefixIconColor: Colors.white.withOpacity(0.7),
      ),
    );
  }

  static ThemeData get darkTheme => lightTheme; // Ensure it behaves identically just in case
}
