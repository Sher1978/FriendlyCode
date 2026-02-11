import 'package:flutter/material.dart';
import 'package:friendly_code/core/theme/colors.dart';

class GeneralSettingsScreen extends StatelessWidget {
  const GeneralSettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("SETTINGS", style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppColors.title)),
          const Text("Manage your account and platform preferences.", style: TextStyle(color: AppColors.body)),
          const SizedBox(height: 48),

          _buildSettingsSection(
            "ACCOUNT PROFILE",
            [
              _buildSettingTile(Icons.person_outline, "Public Profile", "Manage your display name and avatar."),
              _buildSettingTile(Icons.email_outlined, "Email Address", "alex@safari-lounge.com"),
              _buildSettingTile(Icons.lock_outline, "Password & Security", "Change your password or enable 2FA."),
            ],
          ),
          const SizedBox(height: 40),
          _buildSettingsSection(
            "NOTIFICATIONS",
            [
              _buildSwitchTile(Icons.notifications_active_outlined, "Push Notifications", "Receive real-time visit alerts.", true),
              _buildSwitchTile(Icons.alternate_email, "Email Reports", "Weekly performance summaries.", false),
            ],
          ),
          const SizedBox(height: 40),
          _buildSettingsSection(
            "LOCALIZATION",
            [
              _buildSettingTile(Icons.translate, "Language", "English (US)"),
              _buildSettingTile(Icons.schedule, "Timezone", "Dubai (GMT+4)"),
            ],
          ),
          const SizedBox(height: 40),
          
          SizedBox(
            width: 200,
            child: OutlinedButton(
              onPressed: () {},
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.redAccent,
                side: const BorderSide(color: Colors.redAccent),
              ),
              child: const Text("DELETE ACCOUNT"),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSettingsSection(String title, List<Widget> items) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: AppColors.accentOrange, letterSpacing: 1.5)),
        const SizedBox(height: 24),
        Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: AppColors.title.withValues(alpha: 0.1)),
          ),
          child: Column(
            children: items,
          ),
        ),
      ],
    );
  }

  Widget _buildSettingTile(IconData icon, String title, String value) {
    return ListTile(
      leading: Icon(icon, color: AppColors.body),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.title)),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(value, style: const TextStyle(color: AppColors.body)),
          const SizedBox(width: 8),
          const Icon(Icons.chevron_right, size: 20, color: AppColors.body),
        ],
      ),
      onTap: () {},
    );
  }

  Widget _buildSwitchTile(IconData icon, String title, String sub, bool val) {
    return SwitchListTile(
      secondary: Icon(icon, color: AppColors.body),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.title)),
      subtitle: Text(sub, style: const TextStyle(fontSize: 12)),
      value: val,
      activeColor: AppColors.accentOrange,
      onChanged: (v) {},
    );
  }
}
