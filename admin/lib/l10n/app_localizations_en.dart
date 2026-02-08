// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appName => 'Friendly Code';

  @override
  String get loginTitle => 'Welcome Back';

  @override
  String get ownerDashboard => 'Owner Dashboard';

  @override
  String get adminDashboard => 'Admin Dashboard';

  @override
  String get settings => 'Settings';

  @override
  String get language => 'Language';

  @override
  String get logout => 'Logout';
}
