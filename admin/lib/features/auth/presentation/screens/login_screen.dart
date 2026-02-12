import 'package:flutter/material.dart';
import 'package:friendly_code/l10n/app_localizations.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/services/auth_service.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    
    return Scaffold(
      backgroundColor: AppColors.backgroundCream,
      body: Center(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 400),
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Logo
              ShaderMask(
                shaderCallback: (bounds) => const LinearGradient(
                  colors: [AppColors.deepSeaBlue, AppColors.lime],
                ).createShader(bounds),
                child: const Text(
                  "FRIENDLY\nCODE",
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 48,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                    height: 0.9,
                  ),
                ),
              ),
              const SizedBox(height: 48),
              
              Text(
                l10n.loginTitle,
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  color: AppColors.deepSeaBlue,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                l10n.loginSubtitle,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.black54,
                ),
              ),
              const SizedBox(height: 48),
              
              // Google Sign In Button
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton.icon(
                  onPressed: () async {
                    // Logic for Google Auth
                    try {
                      final authService = AuthService();
                      final user = await authService.signInWithGoogle();
                      
                      if (user != null && context.mounted) {
                        // Check if user is authorized in Firestore
                        final doc = await FirebaseFirestore.instance.collection('users').doc(user.uid).get();
                        
                        if (!doc.exists) {
                          // Unrecognized user
                          await authService.signOut();
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text("Access denied. Please contact friendlycode@gmail.com for authorization."),
                                backgroundColor: Colors.redAccent,
                                duration: Duration(seconds: 10),
                              ),
                            );
                          }
                          return;
                        }

                        // Navigate to Owner Dashboard on success
                        Navigator.pushReplacementNamed(context, '/owner');
                      }
                    } catch (e) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text("Login Failed: $e")),
                        );
                      }
                    }
                  },
                  icon: const FaIcon(FontAwesomeIcons.google, size: 20),
                  label: Text(l10n.googleSignIn),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: Colors.black87,
                    elevation: 1,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: const BorderSide(color: Colors.black12),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              TextButton(
                onPressed: () => Navigator.pushReplacementNamed(context, '/'),
                child: Text(
                  "Return to Selection Portal",
                  style: TextStyle(
                    color: AppColors.deepSeaBlue.withOpacity(0.6),
                    fontWeight: FontWeight.bold,
                    decoration: TextDecoration.underline,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
