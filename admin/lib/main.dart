import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:friendly_code/l10n/app_localizations.dart';
import 'core/theme/app_theme.dart';
import 'core/navigation/dispatcher_screen.dart';
import 'features/owner/presentation/screens/owner_dashboard_screen.dart';
import 'features/admin/presentation/screens/super_admin_dashboard.dart';
import 'features/web/presentation/pages/b2b_landing_screen.dart';
import 'features/auth/presentation/screens/login_screen.dart';
import 'features/owner/presentation/screens/onboarding_wizard_screen.dart';
import 'package:provider/provider.dart';
import 'core/localization/locale_provider.dart';
import 'core/auth/role_provider.dart';
import 'features/web/presentation/layout/admin_shell.dart';
import 'firebase_options.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (context) => LocaleProvider()),
        ChangeNotifierProvider(create: (context) => RoleProvider()),
      ],
      child: const FriendlyCodeApp(),
    ),
  );
}

class FriendlyCodeApp extends StatelessWidget {
  const FriendlyCodeApp({super.key});

  @override
  Widget build(BuildContext context) {
    final localeProvider = Provider.of<LocaleProvider>(context);

    return MaterialApp(
      locale: localeProvider.locale,
      onGenerateTitle: (context) => AppLocalizations.of(context)!.appName,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('en'),
        Locale('ru'),
      ],
      initialRoute: '/',
      routes: {
        '/': (context) => const DispatcherScreen(),
        '/login': (context) => const LoginScreen(),
        '/onboarding': (context) => const OnboardingWizardScreen(),
        '/owner': (context) => Consumer<RoleProvider>(
          builder: (context, roleProvider, _) => AdminShell(
            role: UserRole.owner,
            child: const OwnerDashboardScreen(),
          ),
        ),
        '/admin': (context) => Consumer<RoleProvider>(
          builder: (context, roleProvider, _) => AdminShell(
            role: UserRole.superAdmin,
            child: const SuperAdminDashboard(),
          ),
        ),
        '/Superadmin': (context) => Consumer<RoleProvider>(
          builder: (context, roleProvider, _) => AdminShell(
            role: UserRole.superAdmin,
            child: const SuperAdminDashboard(),
          ),
        ),
        '/partner': (context) => const B2BLandingScreen(),
      },
    );
  }
}
