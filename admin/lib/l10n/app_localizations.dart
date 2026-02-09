import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_ru.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('ru'),
  ];

  /// No description provided for @appName.
  ///
  /// In en, this message translates to:
  /// **'Friendly Code'**
  String get appName;

  /// No description provided for @loginTitle.
  ///
  /// In en, this message translates to:
  /// **'Welcome Back'**
  String get loginTitle;

  /// No description provided for @loginSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Sign in to manage your venue and view analytics.'**
  String get loginSubtitle;

  /// No description provided for @googleSignIn.
  ///
  /// In en, this message translates to:
  /// **'Sign in with Google'**
  String get googleSignIn;

  /// No description provided for @ownerDashboard.
  ///
  /// In en, this message translates to:
  /// **'Owner Dashboard'**
  String get ownerDashboard;

  /// No description provided for @adminDashboard.
  ///
  /// In en, this message translates to:
  /// **'Admin Dashboard'**
  String get adminDashboard;

  /// No description provided for @settings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get settings;

  /// No description provided for @language.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get language;

  /// No description provided for @logout.
  ///
  /// In en, this message translates to:
  /// **'Logout'**
  String get logout;

  /// No description provided for @metrics.
  ///
  /// In en, this message translates to:
  /// **'TODAY\'S METRICS'**
  String get metrics;

  /// No description provided for @totalCheckins.
  ///
  /// In en, this message translates to:
  /// **'Total Check-ins'**
  String get totalCheckins;

  /// No description provided for @avgReturn.
  ///
  /// In en, this message translates to:
  /// **'Avg Return'**
  String get avgReturn;

  /// No description provided for @discountDist.
  ///
  /// In en, this message translates to:
  /// **'DISCOUNT DISTRIBUTION'**
  String get discountDist;

  /// No description provided for @tier1.
  ///
  /// In en, this message translates to:
  /// **'Tier 1 (20%)'**
  String get tier1;

  /// No description provided for @tier2.
  ///
  /// In en, this message translates to:
  /// **'Tier 2 (15%)'**
  String get tier2;

  /// No description provided for @tier3.
  ///
  /// In en, this message translates to:
  /// **'Tier 3 (10%)'**
  String get tier3;

  /// No description provided for @expired.
  ///
  /// In en, this message translates to:
  /// **'Expired (5%)'**
  String get expired;

  /// No description provided for @management.
  ///
  /// In en, this message translates to:
  /// **'MANAGEMENT'**
  String get management;

  /// No description provided for @venueProfile.
  ///
  /// In en, this message translates to:
  /// **'Venue Profile'**
  String get venueProfile;

  /// No description provided for @venueProfileSub.
  ///
  /// In en, this message translates to:
  /// **'Name, Hours, Photos'**
  String get venueProfileSub;

  /// No description provided for @configRules.
  ///
  /// In en, this message translates to:
  /// **'Configure Time Rules'**
  String get configRules;

  /// No description provided for @configRulesSub.
  ///
  /// In en, this message translates to:
  /// **'Adjust decay limits and percentages'**
  String get configRulesSub;

  /// No description provided for @marketingBlast.
  ///
  /// In en, this message translates to:
  /// **'Send Marketing Blast'**
  String get marketingBlast;

  /// No description provided for @marketingBlastSub.
  ///
  /// In en, this message translates to:
  /// **'Re-engage lost customers'**
  String get marketingBlastSub;

  /// No description provided for @adminConsole.
  ///
  /// In en, this message translates to:
  /// **'SUPER ADMIN CONSOLE'**
  String get adminConsole;

  /// No description provided for @platformOverview.
  ///
  /// In en, this message translates to:
  /// **'Platform Overview'**
  String get platformOverview;

  /// No description provided for @totalVenues.
  ///
  /// In en, this message translates to:
  /// **'Total Venues'**
  String get totalVenues;

  /// No description provided for @totalGuests.
  ///
  /// In en, this message translates to:
  /// **'Total Guests'**
  String get totalGuests;

  /// No description provided for @pendingApproval.
  ///
  /// In en, this message translates to:
  /// **'Pending Approval'**
  String get pendingApproval;

  /// No description provided for @activeVenues.
  ///
  /// In en, this message translates to:
  /// **'Active Venues'**
  String get activeVenues;

  /// No description provided for @manage.
  ///
  /// In en, this message translates to:
  /// **'MANAGE'**
  String get manage;

  /// No description provided for @venues.
  ///
  /// In en, this message translates to:
  /// **'Venues'**
  String get venues;

  /// No description provided for @users.
  ///
  /// In en, this message translates to:
  /// **'Users'**
  String get users;

  /// No description provided for @systemStats.
  ///
  /// In en, this message translates to:
  /// **'System Stats'**
  String get systemStats;

  /// No description provided for @rewardLogicConfig.
  ///
  /// In en, this message translates to:
  /// **'Reward Logic Config'**
  String get rewardLogicConfig;

  /// No description provided for @configTierLimit.
  ///
  /// In en, this message translates to:
  /// **'Configure up to 5 Time Tiers.'**
  String get configTierLimit;

  /// No description provided for @addTier.
  ///
  /// In en, this message translates to:
  /// **'Add Tier'**
  String get addTier;

  /// No description provided for @retentionBase.
  ///
  /// In en, this message translates to:
  /// **'Retention Base (Expired)'**
  String get retentionBase;

  /// No description provided for @rewardPercent.
  ///
  /// In en, this message translates to:
  /// **'Reward %'**
  String get rewardPercent;

  /// No description provided for @tierHint.
  ///
  /// In en, this message translates to:
  /// **'Applied when user visits AFTER the last tier limit.'**
  String get tierHint;

  /// No description provided for @saveLogic.
  ///
  /// In en, this message translates to:
  /// **'SAVE LOGIC'**
  String get saveLogic;

  /// No description provided for @logicUpdated.
  ///
  /// In en, this message translates to:
  /// **'Reward Logic Updated!'**
  String get logicUpdated;

  /// No description provided for @visitWithinHrs.
  ///
  /// In en, this message translates to:
  /// **'Visit within (Hrs)'**
  String get visitWithinHrs;

  /// No description provided for @tierLabel.
  ///
  /// In en, this message translates to:
  /// **'Tier {index}'**
  String tierLabel(int index);

  /// No description provided for @marketingTitle.
  ///
  /// In en, this message translates to:
  /// **'Marketing Blast'**
  String get marketingTitle;

  /// No description provided for @marketingDesc.
  ///
  /// In en, this message translates to:
  /// **'Send a nudge to clients who haven\'t visited in a while.'**
  String get marketingDesc;

  /// No description provided for @sendBlast.
  ///
  /// In en, this message translates to:
  /// **'SEND BLAST'**
  String get sendBlast;

  /// No description provided for @blastSuccess.
  ///
  /// In en, this message translates to:
  /// **'Marketing Blast Sent!'**
  String get blastSuccess;

  /// No description provided for @editVenueProfile.
  ///
  /// In en, this message translates to:
  /// **'Edit Venue Profile'**
  String get editVenueProfile;

  /// No description provided for @venueName.
  ///
  /// In en, this message translates to:
  /// **'Venue Name'**
  String get venueName;

  /// No description provided for @description.
  ///
  /// In en, this message translates to:
  /// **'Description'**
  String get description;

  /// No description provided for @workingHours.
  ///
  /// In en, this message translates to:
  /// **'Working Hours'**
  String get workingHours;

  /// No description provided for @instagram.
  ///
  /// In en, this message translates to:
  /// **'Instagram'**
  String get instagram;

  /// No description provided for @saveChanges.
  ///
  /// In en, this message translates to:
  /// **'SAVE CHANGES'**
  String get saveChanges;

  /// No description provided for @profileUpdated.
  ///
  /// In en, this message translates to:
  /// **'Profile Updated Successfully'**
  String get profileUpdated;

  /// No description provided for @tapToChangeCover.
  ///
  /// In en, this message translates to:
  /// **'Tap to change Cover Photo'**
  String get tapToChangeCover;

  /// No description provided for @uploadPhoto.
  ///
  /// In en, this message translates to:
  /// **'Upload Photo Placeholder'**
  String get uploadPhoto;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'ru'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'ru':
      return AppLocalizationsRu();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
