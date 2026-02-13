import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:friendly_code/l10n/app_localizations.dart';
import 'core/theme/app_theme.dart';
import 'features/web/presentation/pages/b2c_home_screen.dart';
import 'features/web/presentation/pages/not_found_screen.dart';
import 'core/localization/locale_provider.dart';
import 'package:provider/provider.dart';

class GuestApp extends StatelessWidget {
  const GuestApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Basic provider for localization only
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (context) => LocaleProvider()),
      ],
      child: const _GuestAppContent(),
    );
  }
}

class _GuestAppContent extends StatelessWidget {
  const _GuestAppContent();

  @override
  Widget build(BuildContext context) {
    final localeProvider = Provider.of<LocaleProvider>(context);

    return MaterialApp(
      title: 'Friendly Code Guest',
      locale: localeProvider.locale,
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
      // STRICT ROUTING: Only knows about QR and 404
      onGenerateRoute: (settings) {
        final uri = Uri.parse(settings.name ?? '/');
        
        // Handle /qr path
        if (uri.path == '/qr' || uri.path == '/admin/qr') {
           final venueId = uri.queryParameters['id'];
           return MaterialPageRoute(
             builder: (context) => B2CHomeScreen(venueId: venueId),
             settings: settings,
           );
        }

        // Fallback for everything else in this isolated app
        return MaterialPageRoute(
          builder: (context) => const NotFoundScreen(),
          settings: settings,
        );
      },
    );
  }
}
