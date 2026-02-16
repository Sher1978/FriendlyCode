import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:friendly_code/core/services/auth_service.dart';
import 'package:friendly_code/core/services/user_service.dart';
import 'package:friendly_code/core/data/venue_repository.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/features/admin/presentation/screens/venue_editor_screen.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:friendly_code/l10n/app_localizations.dart';
import 'package:friendly_code/core/localization/locale_provider.dart';
import 'package:provider/provider.dart';

class GeneralSettingsScreen extends StatefulWidget {
  const GeneralSettingsScreen({super.key});

  @override
  State<GeneralSettingsScreen> createState() => _GeneralSettingsScreenState();
}

class _GeneralSettingsScreenState extends State<GeneralSettingsScreen> {
  final AuthService _auth = AuthService();
  final UserService _userService = UserService();
  final VenueRepository _venueRepo = VenueRepository();
  
  User? _currentUser;
  VenueModel? _venue;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    setState(() => _isLoading = true);
    _currentUser = _auth.currentUser;
    
    if (_currentUser?.email != null) {
      final userDoc = await _userService.getUserByEmail(_currentUser!.email!);
      if (userDoc != null && userDoc['venueId'] != null) {
        final venue = await _venueRepo.getVenueById(userDoc['venueId']);
        _venue = venue;
      }
    }
    
    if (mounted) setState(() => _isLoading = false);
  }

  Future<void> _updateName() async {
    final controller = TextEditingController(text: _currentUser?.displayName);
    final shouldUpdate = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Update Display Name"),
        content: TextField(controller: controller, decoration: const InputDecoration(labelText: "Full Name")),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text("CANCEL")),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text("SAVE")),
        ],
      ),
    );

    if (shouldUpdate == true && controller.text.isNotEmpty) {
      await _auth.updateProfile(name: controller.text.trim());
      // Also update Firestore to keep it in sync
      final userDoc = await _userService.getUserByEmail(_currentUser!.email!);
      if (userDoc != null) {
        await _userService.updateUser(userDoc['uid'], {'name': controller.text.trim()});
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Name Updated")));
        _loadProfile();
      }
    }
  }

  Future<void> _updateEmail() async {
    final controller = TextEditingController();
    await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Update Email"),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text("We will send a verification email to the new address. You must verify it before the change takes effect."),
            const SizedBox(height: 16),
            TextField(controller: controller, decoration: const InputDecoration(labelText: "New Email Address")),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text("CANCEL")),
          TextButton(
            onPressed: () async {
              if (controller.text.isEmpty) return;
               Navigator.pop(context);
              try {
                await _auth.updateProfile(email: controller.text.trim());
                if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Verification email sent!")));
              } catch (e) {
                if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
              }
            }, 
            child: const Text("SEND VERIFICATION"),
          ),
        ],
      ),
    );
  }

  Future<void> _connectTelegram() async {
    try {
      setState(() => _isLoading = true);
      // SPECIFY REGION: asia-south1
      final result = await FirebaseFunctions.instanceFor(region: 'asia-south1')
          .httpsCallable('generateTelegramLink')
          .call();
      final url = result.data['url'];
      if (url != null) {
        final uri = Uri.parse(url);
        if (await canLaunchUrl(uri)) {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
        } else {
          throw "Could not launch $url";
        }
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) return const Center(child: CircularProgressIndicator());

    final l10n = AppLocalizations.of(context)!;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(l10n.settingsTitle, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppColors.title)),
          Text(l10n.settingsSub, style: const TextStyle(color: AppColors.body)),
          const SizedBox(height: 48),

          _buildSettingsSection(
            l10n.accountProfile,
            [
              _buildSettingTile(Icons.person_outline, l10n.publicProfile, _currentUser?.displayName ?? "Not Set", onTap: _updateName),
              _buildSettingTile(Icons.email_outlined, l10n.emailAddress, _currentUser?.email ?? "Not Set", onTap: _updateEmail),
              _buildSettingTile(
                Icons.store, 
                l10n.connectedVenue, 
                _venue?.name ?? "None Assigned",
                onTap: _venue != null ? () {
                  // Navigate to Venue Editor
                   Navigator.push(context, MaterialPageRoute(builder: (_) => VenueEditorScreen(venue: _venue!)));
                } : null,
              ),
            ],
          ),
          const SizedBox(height: 40),
          _buildSettingsSection(
            l10n.notifications,
            [
              _buildSwitchTile(Icons.notifications_active_outlined, l10n.pushNotifications, l10n.pushNotificationsSub, true),
              _buildSwitchTile(Icons.alternate_email, l10n.emailReports, l10n.emailReportsSub, false),
              ListTile(
                leading: const Icon(Icons.telegram, color: Colors.blue),
                title: Text(l10n.connectTelegram, style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.title)),
                subtitle: Text(l10n.connectTelegramSub, style: const TextStyle(fontSize: 12)),
                trailing: const Icon(Icons.arrow_forward_ios, size: 16, color: AppColors.accentOrange),
                onTap: _connectTelegram,
              ),
            ],
          ),
          const SizedBox(height: 40),
          _buildSettingsSection(
            l10n.localizationLabel,
            [
              Consumer<LocaleProvider>(
                builder: (context, provider, child) {
                  final isEn = provider.locale.languageCode == 'en';
                  return _buildSettingTile(
                    Icons.translate, 
                    l10n.languageLabel, 
                    isEn ? "English" : "Русский",
                    onTap: () => provider.toggleLocale(),
                  );
                },
              ),
              _buildSettingTile(Icons.schedule, l10n.timezoneLabel, "Dubai (GMT+4)"),
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
              child: Text(l10n.deleteAccount),
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
            border: Border.all(color: AppColors.title.withOpacity(0.1)),
          ),
          child: Column(
            children: items,
          ),
        ),
      ],
    );
  }

  Widget _buildSettingTile(IconData icon, String title, String value, {VoidCallback? onTap}) {
    return ListTile(
      leading: Icon(icon, color: AppColors.body),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.title)),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(value, style: const TextStyle(color: AppColors.body)),
          const SizedBox(width: 8),
          if (onTap != null) const Icon(Icons.edit, size: 16, color: AppColors.accentOrange),
        ],
      ),
      onTap: onTap,
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
