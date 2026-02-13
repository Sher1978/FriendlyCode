import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:provider/provider.dart';
import '../../../../core/auth/auth_service.dart';
import '../../../../core/auth/role_provider.dart';
import '../../../../core/theme/colors.dart';
import '../../../../l10n/app_localizations.dart';
import '../../../../core/localization/locale_provider.dart';
import '../layout/admin_shell.dart';

class PlatformLandingScreen extends StatelessWidget {
  const PlatformLandingScreen({super.key});

  Future<void> _handleLogin(BuildContext context, bool requireAdmin) async {
    try {
      final authService = AuthService();
      final user = await authService.signInWithGoogle();

      if (user != null && context.mounted) {
        final roleProvider = Provider.of<RoleProvider>(context, listen: false);
        await roleProvider.refreshRole();

        if (requireAdmin) {
          if (roleProvider.currentRole == UserRole.superAdmin) {
            Navigator.pushReplacementNamed(context, '/admin');
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(AppLocalizations.of(context)!.accessDeniedAdmin),
                backgroundColor: Colors.red,
              ),
            );
          }
        } else {
          // Owner Dashboard Access
          Navigator.pushReplacementNamed(context, '/owner');
        }
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(AppLocalizations.of(context)!.loginFailed(e.toString())),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      backgroundColor: AppColors.backgroundCream,
      body: Stack(
        children: [
          Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // 1. Branding
                  const Icon(
                    FontAwesomeIcons.leaf,
                    size: 64,
                    color: AppColors.brandGreen,
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'FRIENDLY CODE',
                    style: Theme.of(context).textTheme.displayLarge?.copyWith(
                          color: AppColors.brandBrown,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.2,
                        ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    l10n.b2bHeadline,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          color: AppColors.brandBrown.withOpacity(0.7),
                        ),
                  ),
                  const SizedBox(height: 64),
    
                  // 2. Login Section
                  Container(
                    constraints: const BoxConstraints(maxWidth: 400),
                    padding: const EdgeInsets.all(32),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.05),
                          blurRadius: 20,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          l10n.welcome,
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: AppColors.brandBrown,
                              ),
                        ),
                        const SizedBox(height: 24),
                        ElevatedButton.icon(
                          onPressed: () => _handleLogin(context, false),
                          icon: const Icon(FontAwesomeIcons.google),
                          label: Text(l10n.ownerDashboard),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.brandOrange,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 20),
                            textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        OutlinedButton.icon(
                          onPressed: () => _handleLogin(context, true),
                          icon: const Icon(FontAwesomeIcons.userShield, size: 18),
                          label: const Text('Super Admin Console'), // Keep Admin Console in English for now or rename to Admin
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.brandBrown,
                            padding: const EdgeInsets.symmetric(vertical: 20),
                            side: BorderSide(color: AppColors.brandBrown.withOpacity(0.2)),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
    
                  const SizedBox(height: 64),
    
                  // 3. Download Section
                  Text(
                    l10n.getTheApp,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: AppColors.textSecondary,
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _StoreButton(
                        icon: FontAwesomeIcons.apple,
                        label: 'App Store',
                        onTap: () {},
                      ),
                      const SizedBox(width: 24),
                      _StoreButton(
                        icon: FontAwesomeIcons.googlePlay,
                        label: 'Google Play',
                        onTap: () {},
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 48),
                  Text(
                    '© 2026 Friendly Code',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.black26,
                        ),
                  ),
                ],
              ),
            ),
          ),
          Positioned(
            top: 16,
            right: 16,
            child: Consumer<LocaleProvider>(
              builder: (context, provider, child) {
                final isEn = provider.locale.languageCode == 'en';
                return TextButton(
                  onPressed: () => provider.toggleLocale(),
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.brandBrown,
                    textStyle: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  child: Text(isEn ? "RU" : "EN"),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _StoreButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _StoreButton({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.black,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(icon, color: Colors.white, size: 24),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  AppLocalizations.of(context)!.downloadOn,
                  style: const TextStyle(color: Colors.white70, fontSize: 10),
                ),
                Text(
                  label,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
