import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:timezone/data/latest.dart' as tz;
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:friendly_code/l10n/app_localizations.dart';
import 'core/theme/app_theme.dart';
import 'core/navigation/dispatcher_screen.dart';
import 'features/owner/presentation/screens/owner_dashboard_screen.dart';
import 'features/admin/presentation/screens/super_admin_dashboard.dart';
import 'features/web/presentation/pages/b2b_landing_screen.dart';
import 'features/owner/presentation/screens/onboarding_wizard_screen.dart';
import 'package:provider/provider.dart';
import 'core/localization/locale_provider.dart';
import 'core/auth/role_provider.dart';
import 'features/web/presentation/layout/admin_shell.dart';
import 'firebase_options.dart';
import 'features/web/presentation/pages/b2c_home_screen.dart';
import 'features/web/presentation/pages/not_found_screen.dart';
import 'features/owner/presentation/screens/deposit_action_screen.dart';
import 'package:flutter_web_plugins/url_strategy.dart';
import 'guest_app.dart';
import 'features/web/presentation/pages/super_admin_login_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  tz.initializeTimeZones();
  usePathUrlStrategy();
  
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  
  // Initialize Push Notifications
  // Initialize Push Notifications (Non-blocking moved to Dispatcher/App)
  // await FCMService().initialize();

  // SPLIT ENTRY POINT
  // Inspect the URL path before mounting the app
  final uri = Uri.base;
  final path = uri.path; // e.g. "/qr"
  final fragment = uri.fragment; // e.g. "/qr?id=..." if using hash strategy by mistake
  
  // If the user is trying to access the QR page, we launch the GUEST APP
  // We check both the real path AND the fragment (cover both Path/Hash strategies)
  final bool isQrRoute = path.startsWith('/qr') || 
                         path.startsWith('/admin/qr') || 
                         fragment.startsWith('/qr') || 
                         fragment.startsWith('qr');

  // Check if user is opening Deposit Action Screen directly
  final String fullUri = Uri.base.toString();
  final bool isDepositRoute = fullUri.contains('deposit');

  if (isQrRoute) {
    runApp(const GuestApp());
  } else if (isDepositRoute) {
    Map<String, String> params = {};
    try {
      final uri = Uri.parse(fullUri);
      params.addAll(uri.queryParameters);
      if (uri.hasFragment && uri.fragment.contains('?')) {
        final queryStr = uri.fragment.split('?').last;
        final fragUri = Uri.parse('http://dummy.com/?$queryStr');
        params.addAll(fragUri.queryParameters);
      }
    } catch (_) {}

    final uid = params['uid'] ?? params['search'] ?? params['q'];
    final action = params['action'];
    runApp(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (context) => LocaleProvider()),
          ChangeNotifierProvider(create: (context) => RoleProvider()),
        ],
        child: MaterialApp(
          debugShowCheckedModeBanner: false,
          theme: AppTheme.lightTheme,
          home: DepositActionScreen(
            initialUserId: uid,
            initialAction: action,
          ),
        ),
      ),
    );
  } else {
    // Otherwise, launch the full Partner App
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
        Locale('vi'),
      ],
      // initialRoute: '/', // Removing to let Web URL drive navigation directly
      routes: {
        '/': (context) => const DispatcherScreen(),
        '/qr': (context) {
           final uri = Uri.base;
           final venueId = uri.queryParameters['id'];
           return B2CHomeScreen(venueId: venueId);
        },
        '/admin/qr': (context) {
           final uri = Uri.base;
           final venueId = uri.queryParameters['id'];
           return B2CHomeScreen(venueId: venueId);
        },
        '/onboarding': (context) => const OnboardingWizardScreen(),
        '/owner': (context) => Consumer<RoleProvider>(
          builder: (context, roleProvider, _) => AdminShell(
            role: UserRole.owner,
            child: const OwnerDashboardScreen(),
          ),
        ),
        '/superadmin': (context) => Consumer<RoleProvider>(
          builder: (context, roleProvider, _) => AdminShell(
            role: UserRole.superAdmin,
            child: const SuperAdminDashboard(),
          ),
        ),
        '/superadmin-login': (context) => const SuperAdminLoginScreen(),
        '/deposit': (context) => const DepositActionScreen(),
        '/partner': (context) => const B2BLandingScreen(),
      },
      onUnknownRoute: (settings) => MaterialPageRoute(
        builder: (context) => const NotFoundScreen(),
      ),
    );
  }
}
