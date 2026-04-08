import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:provider/provider.dart';
import '../../../../core/auth/auth_service.dart';
import '../../../../core/auth/role_provider.dart';
import 'package:friendly_code/core/theme/colors.dart';
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
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          // Background Glow
          Positioned(
            top: -100,
            left: -100,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                color: AppColors.accentGreen.withOpacity(0.05),
                shape: BoxShape.circle,
              ),
            ),
          ),
          Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // 1. Branding (Premium Logo)
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.accentGreen.withOpacity(0.2)),
                    ),
                    child: const Icon(
                      FontAwesomeIcons.leaf,
                      size: 48,
                      color: AppColors.accentGreen,
                    ),
                  ),
                  const SizedBox(height: 32),
                  Text(
                    'FRIENDLY CODE',
                    style: Theme.of(context).textTheme.displayLarge?.copyWith(
                          color: AppColors.title,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 2,
                          fontSize: 40,
                        ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    l10n.b2bHeadline.toUpperCase(),
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          color: AppColors.body.withOpacity(0.6),
                          letterSpacing: 4,
                        ),
                  ),
                  const SizedBox(height: 64),
    
                  // 2. Login Section (Premium Card)
                  Container(
                    constraints: const BoxConstraints(maxWidth: 420),
                    padding: const EdgeInsets.all(40),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(32),
                      border: Border.all(color: Colors.white.withOpacity(0.05)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.4),
                          blurRadius: 40,
                          offset: const Offset(0, 20),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          l10n.loginTitle,
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: AppColors.title,
                              ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          "Access your control panel",
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: AppColors.body,
                              ),
                        ),
                        const SizedBox(height: 40),
                        
                        // Owner Dashboard Button
                        _buildLoginButton(
                          context: context,
                          label: l10n.ownerDashboard,
                          icon: FontAwesomeIcons.briefcase,
                          color: AppColors.accentGreen,
                          onPressed: () => _handleLogin(context, false),
                        ),
                        
                        const SizedBox(height: 16),
                        
                        // Admin Console Button
                        _buildLoginButton(
                          context: context,
                          label: 'Super Admin Console',
                          icon: FontAwesomeIcons.shieldHalved,
                          color: AppColors.premiumGold,
                          onPressed: () => _handleLogin(context, true),
                        ),
                      ],
                    ),
                  ),
    
                  const SizedBox(height: 64),
                  
                  // Footer Links
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _buildFooterLink(l10n.navPricing),
                      const SizedBox(width: 24),
                      _buildFooterLink("Terms"),
                      const SizedBox(width: 24),
                      _buildFooterLink("Support"),
                    ],
                  ),
                  
                  const SizedBox(height: 48),
                  Text(
                    '© 2026 Friendly Code Platform',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.tertiary,
                        ),
                  ),
                ],
              ),
            ),
          ),
          // Language Switcher (Top Right)
          Positioned(
            top: 16,
            right: 16,
            child: Consumer<LocaleProvider>(
              builder: (context, provider, child) {
                return TextButton(
                  onPressed: () => provider.toggleLocale(),
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.body,
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.language, size: 16),
                      const SizedBox(width: 8),
                      Text(provider.locale.languageCode.toUpperCase()),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLoginButton({
    required BuildContext context,
    required String label,
    required IconData icon,
    required Color color,
    required VoidCallback onPressed,
  }) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(0.15),
            blurRadius: 15,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ElevatedButton.icon(
        onPressed: onPressed,
        icon: Icon(icon, size: 18),
        label: Text(label),
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          foregroundColor: Colors.black,
          padding: const EdgeInsets.symmetric(vertical: 20),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          elevation: 0,
        ),
      ),
    );
  }

  Widget _buildFooterLink(String label) {
    return TextButton(
      onPressed: () {},
      child: Text(
        label,
        style: const TextStyle(color: AppColors.body, fontSize: 13),
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
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withOpacity(0.05)),
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

