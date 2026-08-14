import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/l10n/app_localizations.dart';

class NotFoundScreen extends StatelessWidget {
  const NotFoundScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      backgroundColor: AppColors.backgroundCream,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(40.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const FaIcon(FontAwesomeIcons.magnifyingGlass, size: 80, color: AppColors.brandOrange),
              const SizedBox(height: 32),
              const Text(
                "404",
                style: TextStyle(
                  fontSize: 100,
                  fontWeight: FontWeight.w900,
                  color: AppColors.brandBrown,
                  letterSpacing: -5,
                ),
              ),
              Text(
                l10n.pageNotFound,
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  color: AppColors.brandBrown,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                l10n.pageNotFoundSub,
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.brandBrown, fontSize: 16),
              ),
              const SizedBox(height: 48),
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: () => Navigator.of(context).pushReplacementNamed('/'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.brandBrown,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: Text(l10n.goToHome.toUpperCase(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
