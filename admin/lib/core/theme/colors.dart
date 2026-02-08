import 'package:flutter/material.dart';

class AppColors {

  // Friendly Brand Colors (Warm & Energetic)
  static const Color brandOrange = Color(0xFFE68A00); // Main CTA & Highlight
  static const Color brandOrangeLight = Color(0xFFFFB74D);
  static const Color brandGreen = Color(0xFF81C784); // Success & High Discount
  static const Color brandBrown = Color(0xFF4E342E); // Primary Text (Coffee)
  
  // Backgrounds
  static const Color backgroundCream = Color(0xFFFFF8E1); // Warm Page Background
  static const Color surfaceCream = Color(0xFFFFFFFF); // Card Backgrounds
  static const Color backgroundAlt = Color(0xFFFFF3E0); 

  // Legacy / Compatibility (Restoring to prevent breaks)
  static const Color deepSeaBlueDark = Color(0xFF002A42);
  static const Color deepSeaBlueLight = Color(0xFF005380);
  
  static const Color backgroundDark = Color(0xFF001F33); 
  static const Color surfaceDark = Color(0xFF002A42); 

  static const Color backgroundLight = Color(0xFFFFFFFF); 
  static const Color surfaceLight = Color(0xFFFFFFFF); 
  static const Color backgroundAltLight = Color(0xFFF0F3F4); 

  // Text
  static const Color textPrimary = Color(0xFF4E342E); // Dark Brown (New Default)
  static const Color textPrimaryDark = Colors.white; // For Dark Mode (Old textPrimary)
  static const Color textSecondary = Color(0xFF795548); // Light Brown
  static const Color textOnPrimary = Colors.white; 

  static const Color textPrimaryLight = Color(0xFF111518); 
  static const Color textSecondaryLight = Color(0xFF637C88); 
  static const Color textOnLime = Color(0xFF111518); 

  // Legacy/Deep Sea 
  static const Color deepSeaBlue = Color(0xFF003B5C);
  static const Color lime = Color(0xFFC0FF00);
  static const Color limeDim = Color(0xFFA6DB00);
}
