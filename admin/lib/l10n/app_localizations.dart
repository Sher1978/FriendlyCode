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
  /// **'EXPIRED'**
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

  /// No description provided for @venueEditor.
  ///
  /// In en, this message translates to:
  /// **'Venue Editor'**
  String get venueEditor;

  /// No description provided for @guestPortalLanguage.
  ///
  /// In en, this message translates to:
  /// **'Guest Portal Language'**
  String get guestPortalLanguage;

  /// No description provided for @guestPortalLanguageDescription.
  ///
  /// In en, this message translates to:
  /// **'Select the default language that your guests will see when they scan your QR code.'**
  String get guestPortalLanguageDescription;

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

  /// No description provided for @posStickerGenerator.
  ///
  /// In en, this message translates to:
  /// **'POS Sticker Generator'**
  String get posStickerGenerator;

  /// No description provided for @posStickerSub.
  ///
  /// In en, this message translates to:
  /// **'Print table stickers'**
  String get posStickerSub;

  /// No description provided for @guestDatabase.
  ///
  /// In en, this message translates to:
  /// **'GUEST DATABASE'**
  String get guestDatabase;

  /// No description provided for @guestDatabaseSub.
  ///
  /// In en, this message translates to:
  /// **'List of guests who have interacted with your venue.'**
  String get guestDatabaseSub;

  /// No description provided for @staffManagement.
  ///
  /// In en, this message translates to:
  /// **'Staff Management'**
  String get staffManagement;

  /// No description provided for @staffManagementSub.
  ///
  /// In en, this message translates to:
  /// **'Manage your personnel'**
  String get staffManagementSub;

  /// No description provided for @downloadHighRes.
  ///
  /// In en, this message translates to:
  /// **'DOWNLOAD HIGH-RES IMAGE'**
  String get downloadHighRes;

  /// No description provided for @stickerInstantDiscount.
  ///
  /// In en, this message translates to:
  /// **'Instant discount.'**
  String get stickerInstantDiscount;

  /// No description provided for @stickerNoApps.
  ///
  /// In en, this message translates to:
  /// **'No apps, no forms.'**
  String get stickerNoApps;

  /// No description provided for @stickerToday.
  ///
  /// In en, this message translates to:
  /// **'Today: {percent}%'**
  String stickerToday(int percent);

  /// No description provided for @stickerTomorrow.
  ///
  /// In en, this message translates to:
  /// **'Tomorrow: {percent}%'**
  String stickerTomorrow(int percent);

  /// No description provided for @shareToClients.
  ///
  /// In en, this message translates to:
  /// **'SHARE TO CLIENTS'**
  String get shareToClients;

  /// No description provided for @downloadQr.
  ///
  /// In en, this message translates to:
  /// **'DOWNLOAD QR'**
  String get downloadQr;

  /// No description provided for @myDashboard.
  ///
  /// In en, this message translates to:
  /// **'MY DASHBOARD'**
  String get myDashboard;

  /// No description provided for @switchVenue.
  ///
  /// In en, this message translates to:
  /// **'SWITCH VENUE ({count})'**
  String switchVenue(int count);

  /// No description provided for @welcomeBackHeadline.
  ///
  /// In en, this message translates to:
  /// **'Welcome Back! 🌟\nYour Reward TODAY: {percent}%'**
  String welcomeBackHeadline(int percent);

  /// No description provided for @welcomeBackSubhead.
  ///
  /// In en, this message translates to:
  /// **'The sooner you return, the bigger the reward.'**
  String get welcomeBackSubhead;

  /// No description provided for @rewardTodayHeadline.
  ///
  /// In en, this message translates to:
  /// **'Your Reward\nTODAY: {percent}%'**
  String rewardTodayHeadline(int percent);

  /// No description provided for @rewardTodaySubhead.
  ///
  /// In en, this message translates to:
  /// **'Want 20%? Come back tomorrow!'**
  String get rewardTodaySubhead;

  /// No description provided for @getReward.
  ///
  /// In en, this message translates to:
  /// **'GET REWARD'**
  String get getReward;

  /// No description provided for @venueNotFound.
  ///
  /// In en, this message translates to:
  /// **'Venue Not Found'**
  String get venueNotFound;

  /// No description provided for @venueNotFoundSub.
  ///
  /// In en, this message translates to:
  /// **'The link you followed seems to be broken or the venue is no longer active.'**
  String get venueNotFoundSub;

  /// No description provided for @goToHome.
  ///
  /// In en, this message translates to:
  /// **'GO TO HOME'**
  String get goToHome;

  /// No description provided for @b2bHeroH1.
  ///
  /// In en, this message translates to:
  /// **'Attract a guest — expensive. Retain — priceless.'**
  String get b2bHeroH1;

  /// No description provided for @b2bHeroSub.
  ///
  /// In en, this message translates to:
  /// **'The only \"smart\" loyalty system that increases venue profit by 25%. We turn passers-by into Super VIP clients in 24 hours. No app development. No plastic. No effort.'**
  String get b2bHeroSub;

  /// No description provided for @b2bHeadline.
  ///
  /// In en, this message translates to:
  /// **'Zero Friction Loyalty'**
  String get b2bHeadline;

  /// No description provided for @getTheApp.
  ///
  /// In en, this message translates to:
  /// **'Get the Friendly Code App'**
  String get getTheApp;

  /// No description provided for @downloadOn.
  ///
  /// In en, this message translates to:
  /// **'Download on'**
  String get downloadOn;

  /// No description provided for @accessDeniedAdmin.
  ///
  /// In en, this message translates to:
  /// **'Access Denied: You are not authorized as an Admin.'**
  String get accessDeniedAdmin;

  /// No description provided for @loginFailed.
  ///
  /// In en, this message translates to:
  /// **'Login Failed: {error}'**
  String loginFailed(String error);

  /// No description provided for @timelineItem.
  ///
  /// In en, this message translates to:
  /// **'{time}: {percent}%'**
  String timelineItem(String time, int percent);

  /// No description provided for @timelineToday.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get timelineToday;

  /// No description provided for @timelineTomorrow.
  ///
  /// In en, this message translates to:
  /// **'Tomorrow'**
  String get timelineTomorrow;

  /// No description provided for @timelineInDays.
  ///
  /// In en, this message translates to:
  /// **'In {count} Days'**
  String timelineInDays(int count);

  /// No description provided for @almostThere.
  ///
  /// In en, this message translates to:
  /// **'Almost there!'**
  String get almostThere;

  /// No description provided for @introduceYourself.
  ///
  /// In en, this message translates to:
  /// **'Please introduce yourself to claim your reward.'**
  String get introduceYourself;

  /// No description provided for @yourName.
  ///
  /// In en, this message translates to:
  /// **'YOUR NAME'**
  String get yourName;

  /// No description provided for @nameHint.
  ///
  /// In en, this message translates to:
  /// **'e.g., Alex'**
  String get nameHint;

  /// No description provided for @yourEmail.
  ///
  /// In en, this message translates to:
  /// **'YOUR EMAIL'**
  String get yourEmail;

  /// No description provided for @emailHint.
  ///
  /// In en, this message translates to:
  /// **'name@example.com'**
  String get emailHint;

  /// No description provided for @thanksForVisiting.
  ///
  /// In en, this message translates to:
  /// **'Thanks for visiting,\n{name}!'**
  String thanksForVisiting(String name);

  /// No description provided for @specialTreat.
  ///
  /// In en, this message translates to:
  /// **'Here is your special treat.'**
  String get specialTreat;

  /// No description provided for @currentDiscount.
  ///
  /// In en, this message translates to:
  /// **'CURRENT DISCOUNT'**
  String get currentDiscount;

  /// No description provided for @offTotalBill.
  ///
  /// In en, this message translates to:
  /// **'OFF TOTAL BILL'**
  String get offTotalBill;

  /// No description provided for @getMyGift.
  ///
  /// In en, this message translates to:
  /// **'GET MY GIFT'**
  String get getMyGift;

  /// No description provided for @showStaff.
  ///
  /// In en, this message translates to:
  /// **'Show this screen to the staff\nwhen paying to apply your discount.'**
  String get showStaff;

  /// No description provided for @tapWhenReady.
  ///
  /// In en, this message translates to:
  /// **'Tap the button above when\nyou are ready to pay.'**
  String get tapWhenReady;

  /// No description provided for @marketingAudience.
  ///
  /// In en, this message translates to:
  /// **'Audience Selection'**
  String get marketingAudience;

  /// No description provided for @marketingAudienceSub.
  ///
  /// In en, this message translates to:
  /// **'Choose who will receive your message.'**
  String get marketingAudienceSub;

  /// No description provided for @marketingMessage.
  ///
  /// In en, this message translates to:
  /// **'Message Content'**
  String get marketingMessage;

  /// No description provided for @marketingMessageSub.
  ///
  /// In en, this message translates to:
  /// **'Write a compelling reason for them to return.'**
  String get marketingMessageSub;

  /// No description provided for @campaignTitle.
  ///
  /// In en, this message translates to:
  /// **'Campaign Title'**
  String get campaignTitle;

  /// No description provided for @campaignTitleHint.
  ///
  /// In en, this message translates to:
  /// **'Weekend Brunch 20% Off!'**
  String get campaignTitleHint;

  /// No description provided for @messageBody.
  ///
  /// In en, this message translates to:
  /// **'Message Body'**
  String get messageBody;

  /// No description provided for @messageBodyHint.
  ///
  /// In en, this message translates to:
  /// **'Hey! We miss you. Show this message for a free coffee with your next meal! ☕'**
  String get messageBodyHint;

  /// No description provided for @campaignImage.
  ///
  /// In en, this message translates to:
  /// **'CAMPAIGN IMAGE (OPTIONAL)'**
  String get campaignImage;

  /// No description provided for @actionLink.
  ///
  /// In en, this message translates to:
  /// **'Action Link (Optional)'**
  String get actionLink;

  /// No description provided for @actionLinkHint.
  ///
  /// In en, this message translates to:
  /// **'https://menu.link/specials'**
  String get actionLinkHint;

  /// No description provided for @frequencyWarning.
  ///
  /// In en, this message translates to:
  /// **'Campaigns are limited to 1 per week to ensure high deliverability.'**
  String get frequencyWarning;

  /// No description provided for @preparing.
  ///
  /// In en, this message translates to:
  /// **'PREPARING...'**
  String get preparing;

  /// No description provided for @sendCampaignNow.
  ///
  /// In en, this message translates to:
  /// **'SEND CAMPAIGN NOW'**
  String get sendCampaignNow;

  /// No description provided for @campaignPerformance.
  ///
  /// In en, this message translates to:
  /// **'CAMPAIGN PERFORMANCE'**
  String get campaignPerformance;

  /// No description provided for @reachableGuests.
  ///
  /// In en, this message translates to:
  /// **'REACHABLE GUESTS'**
  String get reachableGuests;

  /// No description provided for @avgOpenRate.
  ///
  /// In en, this message translates to:
  /// **'AVG. OPEN RATE'**
  String get avgOpenRate;

  /// No description provided for @conversion.
  ///
  /// In en, this message translates to:
  /// **'CONVERSION'**
  String get conversion;

  /// No description provided for @recentHistory.
  ///
  /// In en, this message translates to:
  /// **'RECENT HISTORY'**
  String get recentHistory;

  /// No description provided for @yourLoyalGuests.
  ///
  /// In en, this message translates to:
  /// **'YOUR LOYAL GUESTS'**
  String get yourLoyalGuests;

  /// No description provided for @noGuestsFound.
  ///
  /// In en, this message translates to:
  /// **'No guests found yet'**
  String get noGuestsFound;

  /// No description provided for @noGuestsSub.
  ///
  /// In en, this message translates to:
  /// **'Guests will appear here once they scan your QR code.'**
  String get noGuestsSub;

  /// No description provided for @guestNameCol.
  ///
  /// In en, this message translates to:
  /// **'GUEST NAME'**
  String get guestNameCol;

  /// No description provided for @contactInfoCol.
  ///
  /// In en, this message translates to:
  /// **'CONTACT info'**
  String get contactInfoCol;

  /// No description provided for @statusCol.
  ///
  /// In en, this message translates to:
  /// **'STATUS'**
  String get statusCol;

  /// No description provided for @joinedDateCol.
  ///
  /// In en, this message translates to:
  /// **'JOINED DATE'**
  String get joinedDateCol;

  /// No description provided for @settingsTitle.
  ///
  /// In en, this message translates to:
  /// **'SETTINGS'**
  String get settingsTitle;

  /// No description provided for @settingsSub.
  ///
  /// In en, this message translates to:
  /// **'Manage your account and platform preferences.'**
  String get settingsSub;

  /// No description provided for @accountProfile.
  ///
  /// In en, this message translates to:
  /// **'ACCOUNT PROFILE'**
  String get accountProfile;

  /// No description provided for @publicProfile.
  ///
  /// In en, this message translates to:
  /// **'Public Profile'**
  String get publicProfile;

  /// No description provided for @emailAddress.
  ///
  /// In en, this message translates to:
  /// **'Email Address'**
  String get emailAddress;

  /// No description provided for @connectedVenue.
  ///
  /// In en, this message translates to:
  /// **'Connected Venue'**
  String get connectedVenue;

  /// No description provided for @notifications.
  ///
  /// In en, this message translates to:
  /// **'NOTIFICATIONS'**
  String get notifications;

  /// No description provided for @pushNotifications.
  ///
  /// In en, this message translates to:
  /// **'Push Notifications'**
  String get pushNotifications;

  /// No description provided for @pushNotificationsSub.
  ///
  /// In en, this message translates to:
  /// **'Receive real-time visit alerts.'**
  String get pushNotificationsSub;

  /// No description provided for @emailReports.
  ///
  /// In en, this message translates to:
  /// **'Email Reports'**
  String get emailReports;

  /// No description provided for @emailReportsSub.
  ///
  /// In en, this message translates to:
  /// **'Weekly performance summaries.'**
  String get emailReportsSub;

  /// No description provided for @connectTelegram.
  ///
  /// In en, this message translates to:
  /// **'Connect Telegram'**
  String get connectTelegram;

  /// No description provided for @connectTelegramSub.
  ///
  /// In en, this message translates to:
  /// **'Receive instant alerts in Telegram bot.'**
  String get connectTelegramSub;

  /// No description provided for @localizationLabel.
  ///
  /// In en, this message translates to:
  /// **'LOCALIZATION'**
  String get localizationLabel;

  /// No description provided for @languageLabel.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get languageLabel;

  /// No description provided for @timezoneLabel.
  ///
  /// In en, this message translates to:
  /// **'Timezone'**
  String get timezoneLabel;

  /// No description provided for @deleteAccount.
  ///
  /// In en, this message translates to:
  /// **'DELETE ACCOUNT'**
  String get deleteAccount;

  /// No description provided for @venueAnalytics.
  ///
  /// In en, this message translates to:
  /// **'VENUE ANALYTICS'**
  String get venueAnalytics;

  /// No description provided for @venueAnalyticsSub.
  ///
  /// In en, this message translates to:
  /// **'Detailed performance of your loyalty program.'**
  String get venueAnalyticsSub;

  /// No description provided for @totalActivations.
  ///
  /// In en, this message translates to:
  /// **'TOTAL ACTIVATIONS'**
  String get totalActivations;

  /// No description provided for @uniqueGuests.
  ///
  /// In en, this message translates to:
  /// **'UNIQUE GUESTS'**
  String get uniqueGuests;

  /// No description provided for @retentionRate.
  ///
  /// In en, this message translates to:
  /// **'RETENTION RATE'**
  String get retentionRate;

  /// No description provided for @retentionTrend.
  ///
  /// In en, this message translates to:
  /// **'RETENTION TREND'**
  String get retentionTrend;

  /// No description provided for @retentionTrendSub.
  ///
  /// In en, this message translates to:
  /// **'Average return time in hours.'**
  String get retentionTrendSub;

  /// No description provided for @rewardUsage.
  ///
  /// In en, this message translates to:
  /// **'REWARD USAGE'**
  String get rewardUsage;

  /// No description provided for @rewardUsageSub.
  ///
  /// In en, this message translates to:
  /// **'Which tiers are most popular?'**
  String get rewardUsageSub;

  /// No description provided for @billingTitle.
  ///
  /// In en, this message translates to:
  /// **'BILLING & SUBSCRIPTION'**
  String get billingTitle;

  /// No description provided for @billingSub.
  ///
  /// In en, this message translates to:
  /// **'Manage your payments and plan details.'**
  String get billingSub;

  /// No description provided for @currentPlan.
  ///
  /// In en, this message translates to:
  /// **'CURRENT PLAN'**
  String get currentPlan;

  /// No description provided for @proPlan.
  ///
  /// In en, this message translates to:
  /// **'PRO PLAN'**
  String get proPlan;

  /// No description provided for @nextBillingDate.
  ///
  /// In en, this message translates to:
  /// **'Next billing date: {date}'**
  String nextBillingDate(String date);

  /// No description provided for @unlimitedVenues.
  ///
  /// In en, this message translates to:
  /// **'Unlimited Venues'**
  String get unlimitedVenues;

  /// No description provided for @prioritySupport.
  ///
  /// In en, this message translates to:
  /// **'Priority SMS/Email Support'**
  String get prioritySupport;

  /// No description provided for @advancedCrm.
  ///
  /// In en, this message translates to:
  /// **'Advanced CRM Tools'**
  String get advancedCrm;

  /// No description provided for @rawDataExport.
  ///
  /// In en, this message translates to:
  /// **'Raw Data Export'**
  String get rawDataExport;

  /// No description provided for @paymentMethod.
  ///
  /// In en, this message translates to:
  /// **'PAYMENT METHOD'**
  String get paymentMethod;

  /// No description provided for @visaEnding.
  ///
  /// In en, this message translates to:
  /// **'Visa ending in {last4}'**
  String visaEnding(String last4);

  /// No description provided for @expires.
  ///
  /// In en, this message translates to:
  /// **'Expires {date}'**
  String expires(String date);

  /// No description provided for @editBtn.
  ///
  /// In en, this message translates to:
  /// **'EDIT'**
  String get editBtn;

  /// No description provided for @billingHistory.
  ///
  /// In en, this message translates to:
  /// **'BILLING HISTORY'**
  String get billingHistory;

  /// No description provided for @newGuests.
  ///
  /// In en, this message translates to:
  /// **'New Guests'**
  String get newGuests;

  /// No description provided for @loyalGuests.
  ///
  /// In en, this message translates to:
  /// **'Loyal Guests'**
  String get loyalGuests;

  /// No description provided for @lostGuests.
  ///
  /// In en, this message translates to:
  /// **'Lost Guests'**
  String get lostGuests;
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
