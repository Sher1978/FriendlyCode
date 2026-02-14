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
  String get loginSubtitle =>
      'Sign in to manage your venue and view analytics.';

  @override
  String get googleSignIn => 'Sign in with Google';

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

  @override
  String get metrics => 'TODAY\'S METRICS';

  @override
  String get totalCheckins => 'Total Check-ins';

  @override
  String get avgReturn => 'Avg Return';

  @override
  String get discountDist => 'DISCOUNT DISTRIBUTION';

  @override
  String get tier1 => 'Tier 1 (20%)';

  @override
  String get tier2 => 'Tier 2 (15%)';

  @override
  String get tier3 => 'Tier 3 (10%)';

  @override
  String get expired => 'EXPIRED';

  @override
  String get management => 'MANAGEMENT';

  @override
  String get venueProfile => 'Venue Profile';

  @override
  String get venueProfileSub => 'Name, Hours, Photos';

  @override
  String get configRules => 'Configure Time Rules';

  @override
  String get configRulesSub => 'Adjust decay limits and percentages';

  @override
  String get marketingBlast => 'Send Marketing Blast';

  @override
  String get marketingBlastSub => 'Re-engage lost customers';

  @override
  String get adminConsole => 'SUPER ADMIN CONSOLE';

  @override
  String get platformOverview => 'Platform Overview';

  @override
  String get totalVenues => 'Total Venues';

  @override
  String get totalGuests => 'Total Guests';

  @override
  String get pendingApproval => 'Pending Approval';

  @override
  String get activeVenues => 'Active Venues';

  @override
  String get manage => 'MANAGE';

  @override
  String get venues => 'Venues';

  @override
  String get users => 'Users';

  @override
  String get systemStats => 'System Stats';

  @override
  String get rewardLogicConfig => 'Reward Logic Config';

  @override
  String get configTierLimit => 'Configure up to 5 Time Tiers.';

  @override
  String get addTier => 'Add Tier';

  @override
  String get retentionBase => 'Retention Base (Expired)';

  @override
  String get rewardPercent => 'Reward %';

  @override
  String get tierHint => 'Applied when user visits AFTER the last tier limit.';

  @override
  String get saveLogic => 'SAVE LOGIC';

  @override
  String get logicUpdated => 'Reward Logic Updated!';

  @override
  String get visitWithinHrs => 'Visit within (Hrs)';

  @override
  String tierLabel(int index) {
    return 'Tier $index';
  }

  @override
  String get marketingTitle => 'Marketing Blast';

  @override
  String get marketingDesc =>
      'Send a nudge to clients who haven\'t visited in a while.';

  @override
  String get sendBlast => 'SEND BLAST';

  @override
  String get blastSuccess => 'Marketing Blast Sent!';

  @override
  String get editVenueProfile => 'Edit Venue Profile';

  @override
  String get venueName => 'Venue Name';

  @override
  String get description => 'Description';

  @override
  String get workingHours => 'Working Hours';

  @override
  String get instagram => 'Instagram';

  @override
  String get saveChanges => 'SAVE CHANGES';

  @override
  String get profileUpdated => 'Profile Updated Successfully';

  @override
  String get tapToChangeCover => 'Tap to change Cover Photo';

  @override
  String get uploadPhoto => 'Upload Photo Placeholder';

  @override
  String get posStickerGenerator => 'POS Sticker Generator';

  @override
  String get posStickerSub => 'Print table stickers';

  @override
  String get guestDatabase => 'GUEST DATABASE';

  @override
  String get guestDatabaseSub =>
      'List of guests who have interacted with your venue.';

  @override
  String get staffManagement => 'Staff Management';

  @override
  String get staffManagementSub => 'Manage your personnel';

  @override
  String get downloadHighRes => 'DOWNLOAD HIGH-RES IMAGE';

  @override
  String get stickerInstantDiscount => 'Instant discount.';

  @override
  String get stickerNoApps => 'No apps, no forms.';

  @override
  String stickerToday(int percent) {
    return 'Today: $percent%';
  }

  @override
  String stickerTomorrow(int percent) {
    return 'Tomorrow: $percent%';
  }

  @override
  String get shareToClients => 'SHARE TO CLIENTS';

  @override
  String get downloadQr => 'DOWNLOAD QR';

  @override
  String get myDashboard => 'MY DASHBOARD';

  @override
  String switchVenue(int count) {
    return 'SWITCH VENUE ($count)';
  }

  @override
  String welcomeBackHeadline(int percent) {
    return 'Welcome Back! 🌟\nYour Reward TODAY: $percent%';
  }

  @override
  String get welcomeBackSubhead =>
      'The sooner you return, the bigger the reward.';

  @override
  String rewardTodayHeadline(int percent) {
    return 'Your Reward\nTODAY: $percent%';
  }

  @override
  String get rewardTodaySubhead => 'Want 20%? Come back tomorrow!';

  @override
  String get getReward => 'GET REWARD';

  @override
  String get venueNotFound => 'Venue Not Found';

  @override
  String get venueNotFoundSub =>
      'The link you followed seems to be broken or the venue is no longer active.';

  @override
  String get goToHome => 'GO TO HOME';

  @override
  String get b2bHeroH1 => 'Attract a guest — expensive. Retain — priceless.';

  @override
  String get b2bHeroSub =>
      'The only \"smart\" loyalty system that increases venue profit by 25%. We turn passers-by into Super VIP clients in 24 hours. No app development. No plastic. No effort.';

  @override
  String get b2bHeadline => 'Zero Friction Loyalty';

  @override
  String get getTheApp => 'Get the Friendly Code App';

  @override
  String get downloadOn => 'Download on';

  @override
  String get accessDeniedAdmin =>
      'Access Denied: You are not authorized as an Admin.';

  @override
  String loginFailed(String error) {
    return 'Login Failed: $error';
  }

  @override
  String timelineItem(String time, int percent) {
    return '$time: $percent%';
  }

  @override
  String get timelineToday => 'Today';

  @override
  String get timelineTomorrow => 'Tomorrow';

  @override
  String timelineInDays(int count) {
    return 'In $count Days';
  }

  @override
  String get almostThere => 'Almost there!';

  @override
  String get introduceYourself =>
      'Please introduce yourself to claim your reward.';

  @override
  String get yourName => 'YOUR NAME';

  @override
  String get nameHint => 'e.g., Alex';

  @override
  String get yourEmail => 'YOUR EMAIL';

  @override
  String get emailHint => 'name@example.com';

  @override
  String thanksForVisiting(String name) {
    return 'Thanks for visiting,\n$name!';
  }

  @override
  String get specialTreat => 'Here is your special treat.';

  @override
  String get currentDiscount => 'CURRENT DISCOUNT';

  @override
  String get offTotalBill => 'OFF TOTAL BILL';

  @override
  String get getMyGift => 'GET MY GIFT';

  @override
  String get showStaff =>
      'Show this screen to the staff\nwhen paying to apply your discount.';

  @override
  String get tapWhenReady => 'Tap the button above when\nyou are ready to pay.';

  @override
  String get marketingAudience => 'Audience Selection';

  @override
  String get marketingAudienceSub => 'Choose who will receive your message.';

  @override
  String get marketingMessage => 'Message Content';

  @override
  String get marketingMessageSub =>
      'Write a compelling reason for them to return.';

  @override
  String get campaignTitle => 'Campaign Title';

  @override
  String get campaignTitleHint => 'Weekend Brunch 20% Off!';

  @override
  String get messageBody => 'Message Body';

  @override
  String get messageBodyHint =>
      'Hey! We miss you. Show this message for a free coffee with your next meal! ☕';

  @override
  String get campaignImage => 'CAMPAIGN IMAGE (OPTIONAL)';

  @override
  String get actionLink => 'Action Link (Optional)';

  @override
  String get actionLinkHint => 'https://menu.link/specials';

  @override
  String get frequencyWarning =>
      'Campaigns are limited to 1 per week to ensure high deliverability.';

  @override
  String get preparing => 'PREPARING...';

  @override
  String get sendCampaignNow => 'SEND CAMPAIGN NOW';

  @override
  String get campaignPerformance => 'CAMPAIGN PERFORMANCE';

  @override
  String get reachableGuests => 'REACHABLE GUESTS';

  @override
  String get avgOpenRate => 'AVG. OPEN RATE';

  @override
  String get conversion => 'CONVERSION';

  @override
  String get recentHistory => 'RECENT HISTORY';

  @override
  String get yourLoyalGuests => 'YOUR LOYAL GUESTS';

  @override
  String get noGuestsFound => 'No guests found yet';

  @override
  String get noGuestsSub =>
      'Guests will appear here once they scan your QR code.';

  @override
  String get guestNameCol => 'GUEST NAME';

  @override
  String get contactInfoCol => 'CONTACT info';

  @override
  String get statusCol => 'STATUS';

  @override
  String get joinedDateCol => 'JOINED DATE';

  @override
  String get settingsTitle => 'SETTINGS';

  @override
  String get settingsSub => 'Manage your account and platform preferences.';

  @override
  String get accountProfile => 'ACCOUNT PROFILE';

  @override
  String get publicProfile => 'Public Profile';

  @override
  String get emailAddress => 'Email Address';

  @override
  String get connectedVenue => 'Connected Venue';

  @override
  String get notifications => 'NOTIFICATIONS';

  @override
  String get pushNotifications => 'Push Notifications';

  @override
  String get pushNotificationsSub => 'Receive real-time visit alerts.';

  @override
  String get emailReports => 'Email Reports';

  @override
  String get emailReportsSub => 'Weekly performance summaries.';

  @override
  String get connectTelegram => 'Connect Telegram';

  @override
  String get connectTelegramSub => 'Receive instant alerts in Telegram bot.';

  @override
  String get localizationLabel => 'LOCALIZATION';

  @override
  String get languageLabel => 'Language';

  @override
  String get timezoneLabel => 'Timezone';

  @override
  String get deleteAccount => 'DELETE ACCOUNT';

  @override
  String get venueAnalytics => 'VENUE ANALYTICS';

  @override
  String get venueAnalyticsSub =>
      'Detailed performance of your loyalty program.';

  @override
  String get totalActivations => 'TOTAL ACTIVATIONS';

  @override
  String get uniqueGuests => 'UNIQUE GUESTS';

  @override
  String get retentionRate => 'RETENTION RATE';

  @override
  String get retentionTrend => 'RETENTION TREND';

  @override
  String get retentionTrendSub => 'Average return time in hours.';

  @override
  String get rewardUsage => 'REWARD USAGE';

  @override
  String get rewardUsageSub => 'Which tiers are most popular?';

  @override
  String get billingTitle => 'BILLING & SUBSCRIPTION';

  @override
  String get billingSub => 'Manage your payments and plan details.';

  @override
  String get currentPlan => 'CURRENT PLAN';

  @override
  String get proPlan => 'PRO PLAN';

  @override
  String nextBillingDate(String date) {
    return 'Next billing date: $date';
  }

  @override
  String get unlimitedVenues => 'Unlimited Venues';

  @override
  String get prioritySupport => 'Priority SMS/Email Support';

  @override
  String get advancedCrm => 'Advanced CRM Tools';

  @override
  String get rawDataExport => 'Raw Data Export';

  @override
  String get paymentMethod => 'PAYMENT METHOD';

  @override
  String visaEnding(String last4) {
    return 'Visa ending in $last4';
  }

  @override
  String expires(String date) {
    return 'Expires $date';
  }

  @override
  String get editBtn => 'EDIT';

  @override
  String get billingHistory => 'BILLING HISTORY';

  @override
  String get newGuests => 'New Guests';

  @override
  String get loyalGuests => 'Loyal Guests';

  @override
  String get lostGuests => 'Lost Guests';
}
