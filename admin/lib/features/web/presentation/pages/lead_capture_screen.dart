import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:friendly_code/l10n/app_localizations.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/features/web/presentation/pages/thank_you_screen.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class LeadCaptureScreen extends StatefulWidget {
  final String? venueId;
  final int currentDiscount;
  final List<VenueTier> tiers;
  final LoyaltyConfig config;
  final String timezone;

  const LeadCaptureScreen({
    super.key,
    required this.venueId,
    required this.currentDiscount,
    required this.tiers,
    required this.config,
    this.timezone = 'Etc/GMT-3', // Default if not passed, but should be passed
  });

  @override
  State<LeadCaptureScreen> createState() => _LeadCaptureScreenState();
}

class _LeadCaptureScreenState extends State<LeadCaptureScreen> {
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  
  bool get _isValid => _nameController.text.trim().isNotEmpty && _emailController.text.trim().isNotEmpty;

  Future<void> _submit() async {
    final name = _nameController.text.trim().isNotEmpty ? _nameController.text.trim() : 'Guest';
    var email = _emailController.text.trim().toLowerCase();
    if (email.isEmpty) {
      email = 'guest_${DateTime.now().millisecondsSinceEpoch}@friendlycode.fun';
    }

    // Save locally
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('guestName', name);
    await prefs.setString('guestEmail', email);
    
    // SAVE TO FIRESTORE & AUTH
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user != null) {
        // 1. Update Auth Profile
        await user.updateDisplayName(name);
        
        // 2. Save to 'users' collection
        await FirebaseFirestore.instance.collection('users').doc(user.uid).set({
          'email': email,
          'name': name,
          'role': 'guest',
          'isAnonymous': true,
          'lastSeen': FieldValue.serverTimestamp(),
          'createdAt': FieldValue.serverTimestamp(),
        }, SetOptions(merge: true));
      }
    } catch (e) {
      debugPrint("Error saving guest data: $e");
    }

    if (mounted) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => ThankYouScreen(
            venueId: widget.venueId,
            currentDiscount: widget.currentDiscount,
            guestName: name,
            tiers: widget.tiers,
            config: widget.config,
            timezone: widget.timezone,
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background, // Cream
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Back Button
              GestureDetector(
                onTap: () => Navigator.pop(context),
                child: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.title.withOpacity(0.05)),
                    boxShadow: AppColors.softShadow,
                  ),
                  child: const Center(child: FaIcon(FontAwesomeIcons.arrowLeft, size: 16, color: AppColors.title)),
                ),
              ),

              const SizedBox(height: 48),

              // Headlines
              Text(
                AppLocalizations.of(context)!.almostThere,
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  color: AppColors.title,
                  fontWeight: FontWeight.w900,
                  fontSize: 32,
                  height: 1.1,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                AppLocalizations.of(context)!.introduceYourself,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: AppColors.title.withOpacity(0.7),
                  fontSize: 18,
                ),
              ),

              const SizedBox(height: 48),

              // Name Input
              _buildLabel(AppLocalizations.of(context)!.yourName),
              const SizedBox(height: 8),
              _buildInput(
                controller: _nameController,
                icon: FontAwesomeIcons.user,
                hint: AppLocalizations.of(context)!.nameHint,
              ),

              const SizedBox(height: 24),

              // Email Input
              _buildLabel(AppLocalizations.of(context)!.yourEmail),
              const SizedBox(height: 8),
              _buildInput(
                controller: _emailController,
                icon: FontAwesomeIcons.envelope,
                hint: AppLocalizations.of(context)!.emailHint,
                keyboardType: TextInputType.text,
              ),

              const Spacer(),

              // Submit Button - ALWAYS ENABLED FOR ANDROID & ALL DEVICES
              SizedBox(
                width: double.infinity,
                height: 64,
                child: ElevatedButton(
                  onPressed: _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.accentOrange,
                    foregroundColor: Colors.white,
                    elevation: 8,
                    shadowColor: AppColors.accentOrange.withOpacity(0.3),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(24),
                    ),
                  ),
                  child: Text(
                    AppLocalizations.of(context)!.getReward, 
                    style: const TextStyle(
                      fontSize: 20, 
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.0,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Text(
      text,
      style: TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w900,
        letterSpacing: 1.5,
        color: AppColors.title.withOpacity(0.4),
      ),
    );
  }

  Widget _buildInput({
    required TextEditingController controller,
    required FaIconData icon,
    required String hint,
    TextInputType? keyboardType,
  }) {
    return Container(
      decoration: const BoxDecoration(
        boxShadow: [
           BoxShadow(color: Colors.black12, blurRadius: 10, offset: Offset(0, 4))
        ]
      ),
      child: TextField(
        controller: controller,
        keyboardType: keyboardType,
        style: const TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.bold,
          color: AppColors.title,
        ),
        decoration: InputDecoration(
          filled: true,
          fillColor: AppColors.secondarySurface,
          hintText: hint,
          hintStyle: TextStyle(color: AppColors.title.withOpacity(0.3)),
          prefixIcon: FaIcon(icon, color: AppColors.accentOrange, size: 20),
          prefixIconConstraints: const BoxConstraints(minWidth: 60),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(24),
            borderSide: BorderSide.none,
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(24),
            borderSide: const BorderSide(color: AppColors.accentOrange, width: 2),
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
        ),
      ),
    );
  }
}
