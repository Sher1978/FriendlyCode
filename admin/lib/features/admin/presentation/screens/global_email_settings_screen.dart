import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:friendly_code/core/theme/colors.dart';

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
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Setting updated successfully"),
          backgroundColor: AppColors.brandOrange,
          duration: Duration(seconds: 2),
        )
      );
    } catch (e) {
      debugPrint("Error updating setting: $e");
      // Revert if failed (simple fetch)
      _fetchSettings();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: AppColors.brandOrange));
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "Global Email Configuration",
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w900,
              color: AppColors.title,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            "SuperAdmin master switches to enable or disable different types of emails across the entire platform.",
            style: TextStyle(fontSize: 16, color: AppColors.body),
          ),
          const SizedBox(height: 32),
          
          _buildSettingsSection(
            title: "Guest Communications",
            children: [
              _buildSwitchTile(
                title: "Welcome Emails",
                subtitle: "Sent to guests the first time they scan a QR code.",
                value: enableWelcomeEmails,
                onChanged: (val) => _updateSetting('enableWelcomeEmails', val),
              ),
              _buildSwitchTile(
                title: "Discount Drop Reminders",
                subtitle: "Daily warnings to guests right before their active discount tier expires.",
                value: enableDiscountReminders,
                onChanged: (val) => _updateSetting('enableDiscountReminders', val),
              ),
            ],
          ),

          _buildSettingsSection(
            title: "Venue & Owner Notifications",
            children: [
              _buildSwitchTile(
                title: "Instant Owner Notifications",
                subtitle: "Emails sent to owners immediately after a guest check-in.",
                value: enableOwnerNotifications,
                onChanged: (val) => _updateSetting('enableOwnerNotifications', val),
              ),
              _buildSwitchTile(
                title: "Daily Stats Reports",
                subtitle: "Daily email summaries sent to owners with their venue's statistics.",
                value: enableDailyReports,
                onChanged: (val) => _updateSetting('enableDailyReports', val),
              ),
            ],
          ),

          _buildSettingsSection(
            title: "Marketing & Platform Operations",
            children: [
              _buildSwitchTile(
                title: "Mass Marketing Tool",
                subtitle: "Allows venue owners to send bulk emails to their visitors.",
                value: enableBulkMarketing,
                onChanged: (val) => _updateSetting('enableBulkMarketing', val),
              ),
              _buildSwitchTile(
                title: "B2B Lead Notifications",
                subtitle: "Emails sent to support when a new Venue signs up.",
                value: enableLeadNotifications,
                onChanged: (val) => _updateSetting('enableLeadNotifications', val),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSettingsSection({required String title, required List<Widget> children}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.title.withOpacity(0.05)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: AppColors.title,
            ),
          ),
          const SizedBox(height: 16),
          ...children,
        ],
      ),
    );
  }

  Widget _buildSwitchTile({
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Material( // Using Material for smooth switch state
        color: Colors.transparent,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.title)),
                    const SizedBox(height: 4),
                    Text(subtitle, style: const TextStyle(fontSize: 13, color: AppColors.body)),
                  ],
                ),
              ),
              Switch(
                value: value,
                onChanged: onChanged,
                activeColor: AppColors.brandOrange,
                activeTrackColor: AppColors.brandOrange.withOpacity(0.3),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
