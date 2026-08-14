import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/auth/auth_service.dart';
import '../../../../core/auth/role_provider.dart';
import 'package:friendly_code/core/theme/colors.dart';
import '../../../../l10n/app_localizations.dart';

class SuperAdminLoginScreen extends StatefulWidget {
  const SuperAdminLoginScreen({super.key});

  @override
  State<SuperAdminLoginScreen> createState() => _SuperAdminLoginScreenState();
}

class _SuperAdminLoginScreenState extends State<SuperAdminLoginScreen> {
  bool _isLoggingIn = false;

  Future<void> _handleSuperAdminLogin(BuildContext context) async {
    setState(() => _isLoggingIn = true);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('active_portal_mode', 'superadmin');

      final authService = AuthService();
      final user = await authService.signInWithGoogle();

      if (user != null && context.mounted) {
        final roleProvider = Provider.of<RoleProvider>(context, listen: false);
        await roleProvider.refreshRole();

        if (roleProvider.currentRole == UserRole.superAdmin) {
          Navigator.pushReplacementNamed(context, '/superadmin');
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(AppLocalizations.of(context)!.accessDeniedAdmin),
              backgroundColor: Colors.red,
            ),
          );
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
    } finally {
      if (mounted) setState(() => _isLoggingIn = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          // Ambient Gold Background Glow
          Positioned(
            top: -100,
            left: -100,
            child: Container(
              width: 350,
              height: 350,
              decoration: BoxDecoration(
                color: AppColors.premiumGold.withOpacity(0.08),
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
                  // Logo
                  Image.asset(
                    'assets/images/logo.png',
                    height: 70,
                    fit: BoxFit.contain,
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'REVOO ECOSYSTEM',
                    style: TextStyle(
                      color: AppColors.premiumGold,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 3,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Super Admin Dedicated Card
                  Container(
                    constraints: const BoxConstraints(maxWidth: 420),
                    padding: const EdgeInsets.all(36),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(32),
                      border: Border.all(color: AppColors.premiumGold.withOpacity(0.3)),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.premiumGold.withOpacity(0.1),
                          blurRadius: 40,
                          offset: const Offset(0, 20),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const FaIcon(
                          FontAwesomeIcons.shieldHalved,
                          color: AppColors.premiumGold,
                          size: 40,
                        ),
                        const SizedBox(height: 20),
                        Text(
                          l10n.adminConsole,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                            fontSize: 22,
                            letterSpacing: 1,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Панель управления суперадминистратора',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.6),
                            fontSize: 13,
                          ),
                        ),
                        const SizedBox(height: 32),

                        // Login Button
                        ElevatedButton.icon(
                          onPressed: _isLoggingIn ? null : () => _handleSuperAdminLogin(context),
                          icon: _isLoggingIn
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2),
                                )
                              : const FaIcon(FontAwesomeIcons.google, size: 18),
                          label: Text(_isLoggingIn ? 'Авторизация...' : 'Вход для суперадмина'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.premiumGold,
                            foregroundColor: Colors.black,
                            padding: const EdgeInsets.symmetric(vertical: 18),
                            textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                            elevation: 0,
                          ),
                        ),
                        const SizedBox(height: 20),

                        // Back to Owner Login
                        TextButton(
                          onPressed: () async {
                            final prefs = await SharedPreferences.getInstance();
                            await prefs.setString('active_portal_mode', 'owner');
                            if (context.mounted) Navigator.pushReplacementNamed(context, '/');
                          },
                          child: Text(
                            '← Вернуться на вход для владельцев',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.5),
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
