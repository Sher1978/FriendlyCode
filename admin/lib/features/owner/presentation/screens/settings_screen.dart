import 'package:flutter/material.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:friendly_code/core/services/auth_service.dart';
import 'package:friendly_code/core/services/user_service.dart';
import 'package:friendly_code/core/data/venue_repository.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/features/admin/presentation/screens/venue_editor_screen.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:url_launcher/url_launcher.dart';

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
      final result = await FirebaseFunctions.instance.httpsCallable('generateTelegramLink').call();
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
              _buildSettingTile(Icons.person_outline, "Public Profile", _currentUser?.displayName ?? "Not Set", onTap: _updateName),
              _buildSettingTile(Icons.email_outlined, "Email Address", _currentUser?.email ?? "Not Set", onTap: _updateEmail),
              _buildSettingTile(
                Icons.store, 
                "Connected Venue", 
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
            "NOTIFICATIONS",
            [
              _buildSwitchTile(Icons.notifications_active_outlined, "Push Notifications", "Receive real-time visit alerts.", true),
              _buildSwitchTile(Icons.alternate_email, "Email Reports", "Weekly performance summaries.", false),
              ListTile(
                leading: const Icon(Icons.telegram, color: Colors.blue),
                title: const Text("Connect Telegram", style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.title)),
                subtitle: const Text("Receive instant alerts in Telegram bot.", style: TextStyle(fontSize: 12)),
                trailing: const Icon(Icons.arrow_forward_ios, size: 16, color: AppColors.accentOrange),
                onTap: _connectTelegram,
              ),
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
