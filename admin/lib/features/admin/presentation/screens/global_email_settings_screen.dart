import 'dart:ui';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/widgets/ios_settings_group.dart';
import 'package:friendly_code/core/widgets/ios_settings_row.dart';

class GlobalEmailSettingsScreen extends StatefulWidget {
  const GlobalEmailSettingsScreen({super.key});

  @override
  State<GlobalEmailSettingsScreen> createState() => _GlobalEmailSettingsScreenState();
}

class _GlobalEmailSettingsScreenState extends State<GlobalEmailSettingsScreen> {
  bool _isLoading = true;
  
  // Default values
  bool enableWelcomeEmails = true;
  bool enableOwnerNotifications = true;
  bool enableDiscountReminders = true;
  bool enableBulkMarketing = true;
  bool enableLeadNotifications = true;
  bool enableDailyReports = true;

  @override
  void initState() {
    super.initState();
    _fetchSettings();
  }

  Future<void> _fetchSettings() async {
    setState(() => _isLoading = true);
    try {
      final doc = await FirebaseFirestore.instance.collection('system_settings').doc('email_controls').get();
      if (doc.exists) {
        final data = doc.data()!;
        setState(() {
          enableWelcomeEmails = data['enableWelcomeEmails'] ?? true;
          enableOwnerNotifications = data['enableOwnerNotifications'] ?? true;
          enableDiscountReminders = data['enableDiscountReminders'] ?? true;
          enableBulkMarketing = data['enableBulkMarketing'] ?? true;
          enableLeadNotifications = data['enableLeadNotifications'] ?? true;
          enableDailyReports = data['enableDailyReports'] ?? true;
        });
      }
    } catch (e) {
      debugPrint("Error fetching global email settings: $e");
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _updateSetting(String key, bool value) async {
    try {
      // Optimistic update locally
      setState(() {
        if (key == 'enableWelcomeEmails') enableWelcomeEmails = value;
        if (key == 'enableOwnerNotifications') enableOwnerNotifications = value;
        if (key == 'enableDiscountReminders') enableDiscountReminders = value;
        if (key == 'enableBulkMarketing') enableBulkMarketing = value;
        if (key == 'enableLeadNotifications') enableLeadNotifications = value;
        if (key == 'enableDailyReports') enableDailyReports = value;
      });

      await FirebaseFirestore.instance.collection('system_settings').doc('email_controls').set(
        {key: value},
        SetOptions(merge: true),
      );
    } catch (e) {
      debugPrint("Error updating setting: $e");
      _fetchSettings();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CupertinoActivityIndicator(radius: 12));
    }

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 48),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "Global Email Settings",
              style: TextStyle(
                color: AppColors.macosTextPrimary,
                fontSize: 34,
                fontWeight: FontWeight.bold,
                letterSpacing: -1.0,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              "Control outbound communication across the entire network.",
              style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 15),
            ),
            const SizedBox(height: 48),

            IOSSettingsGroup(
              title: "CORE NOTIFICATIONS",
              children: [
                IOSSettingsRow(
                  title: "Welcome Emails",
                  subtitle: "Sent to new guests after registration",
                  icon: CupertinoIcons.mail_solid,
                  iconColor: CupertinoColors.activeBlue,
                  trailing: CupertinoSwitch(
                    value: enableWelcomeEmails,
                    onChanged: (v) => _updateSetting('enableWelcomeEmails', v),
                  ),
                ),
                IOSSettingsRow(
                  title: "Owner Alerts",
                  subtitle: "Real-time notifications for venue owners",
                  icon: CupertinoIcons.bell_fill,
                  iconColor: AppColors.accentOrange,
                  trailing: CupertinoSwitch(
                    value: enableOwnerNotifications,
                    onChanged: (v) => _updateSetting('enableOwnerNotifications', v),
                  ),
                ),
                IOSSettingsRow(
                  title: "Lead Notifications",
                  subtitle: "Alerts for new B2B sales leads",
                  icon: CupertinoIcons.briefcase_fill,
                  iconColor: CupertinoColors.activeGreen,
                  trailing: CupertinoSwitch(
                    value: enableLeadNotifications,
                    onChanged: (v) => _updateSetting('enableLeadNotifications', v),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 32),

            IOSSettingsGroup(
              title: "RETENTION & MARKETING",
              children: [
                IOSSettingsRow(
                  title: "Discount Reminders",
                  subtitle: "Automated 'we miss you' reminders",
                  icon: CupertinoIcons.percent,
                  iconColor: CupertinoColors.systemPink,
                  trailing: CupertinoSwitch(
                    value: enableDiscountReminders,
                    onChanged: (v) => _updateSetting('enableDiscountReminders', v),
                  ),
                ),
                IOSSettingsRow(
                  title: "Global Marketing",
                  subtitle: "Bulk marketing campaigns for Super Admins",
                  icon: CupertinoIcons.rocket_fill,
                  iconColor: CupertinoColors.systemIndigo,
                  trailing: CupertinoSwitch(
                    value: enableBulkMarketing,
                    onChanged: (v) => _updateSetting('enableBulkMarketing', v),
                  ),
                ),
                IOSSettingsRow(
                  title: "Daily Performance Reports",
                  subtitle: "Digest reports for the core team",
                  icon: CupertinoIcons.chart_bar_square_fill,
                  iconColor: CupertinoColors.systemTeal,
                  trailing: CupertinoSwitch(
                    value: enableDailyReports,
                    onChanged: (v) => _updateSetting('enableDailyReports', v),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
