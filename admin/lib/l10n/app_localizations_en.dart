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
  String get expired => 'Expired (5%)';

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
}
