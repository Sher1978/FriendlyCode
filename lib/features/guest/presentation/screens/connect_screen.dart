import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/auth/auth_service.dart';
import '../../../../core/data/user_repository.dart'; // Import Repo
import '../../../../core/theme/colors.dart';
import '../../../../core/config/app_config.dart';
import 'package:url_launcher/url_launcher.dart';
import 'success_screen.dart';

class ConnectScreen extends StatefulWidget {
  const ConnectScreen({super.key});

  @override
  State<ConnectScreen> createState() => _ConnectScreenState();
}

class _ConnectScreenState extends State<ConnectScreen> {
  final TextEditingController _nameController = TextEditingController();
  final AuthService _authService = AuthService();
  final UserRepository _userRepo = UserRepository(); // Init Repo
  String _selectedMessenger = 'whatsapp';
  bool _isLoading = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      extendBodyBehindAppBar: true,
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [AppColors.deepSeaBlueDark, AppColors.deepSeaBlue],
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "Identify Yourself.",
                  style: Theme.of(context).textTheme.displayLarge?.copyWith(
                    color: Colors.white,
                    fontSize: 32,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  "To receive your Guest Status.",
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
                const SizedBox(height: 48),

                // Google Sign In Button
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton.icon(
                    onPressed: _isLoading ? null : _signInWithGoogle,
                    icon: const FaIcon(FontAwesomeIcons.google, color: Colors.white),
                    label: const Text("SIGN IN WITH GOOGLE", style: TextStyle(fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white.withValues(alpha: 0.1),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: const BorderSide(color: Colors.white30),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 32),

                // Name Input (Legacy/Manual)
                Row(
                  children: [
                    const Expanded(child: Divider(color: Colors.white24)),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Text("OR ENTER MANUALLY", style: Theme.of(context).textTheme.labelSmall?.copyWith(color: Colors.white54)),
                    ),
                    const Expanded(child: Divider(color: Colors.white24)),
                  ],
                ),
                const SizedBox(height: 24),

                TextField(
                  controller: _nameController,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    labelText: "YOUR NAME",
                    labelStyle: const TextStyle(color: Colors.white70),
                    enabledBorder: OutlineInputBorder(
                      borderSide: const BorderSide(color: Colors.white24),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderSide: BorderSide(color: AppColors.lime),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    filled: true,
                    fillColor: Colors.white.withValues(alpha: 0.05),
                  ),
                ),
                const SizedBox(height: 32),
                
                // Messenger Selection / Connection
                Text(
                  "CONNECT VIA MESSENGER",
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    color: AppColors.lime,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    _buildMessengerButton('whatsapp', FontAwesomeIcons.whatsapp, "WhatsApp", AppConfig.whatsappBotUrl),
                    const SizedBox(width: 16),
                    _buildMessengerButton('telegram', FontAwesomeIcons.telegram, "Telegram", AppConfig.telegramBotUrl),
                  ],
                ),

                const Spacer(),

                // Submit Button (Manual)
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _onConnectManual,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.lime,
                      foregroundColor: AppColors.deepSeaBlueDark,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: _isLoading 
                      ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(color: AppColors.deepSeaBlueDark))
                      : const Text("CONTINUE AS GUEST", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _signInWithGoogle() async {
      setState(() => _isLoading = true);
      final user = await _authService.signInWithGoogle();
      
      if (user != null) {
          // Sync existing or new user
          await _userRepo.syncUser(user, displayName: user.displayName, messenger: 'google');
          
          if (mounted) {
              Navigator.pushReplacement(
                context, 
                MaterialPageRoute(builder: (context) => SuccessScreen(guestName: user.displayName ?? "Guest"))
              );
          }
      } else {
           if (mounted) setState(() => _isLoading = false);
           // Error handled in service or cancelled
      }
  }

  Future<void> _onConnectManual() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Please tell us your name")),
      );
      return;
    }

    setState(() => _isLoading = true);
    
    // 1. Authenticate Anonymously
    final user = await _authService.signInAnonymously();

    if (user == null) {
      if (mounted) setState(() => _isLoading = false);
      return;
    }

    // 2. Sync
    await _userRepo.syncUser(user, displayName: name, messenger: _selectedMessenger);

    // 3. Navigate
    if (mounted) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => SuccessScreen(guestName: name)),
      );
    }
  }


  Widget _buildMessengerButton(String id, IconData icon, String label, String botUrl) {
    bool isSelected = _selectedMessenger == id;
    
    return Expanded(
      child: GestureDetector(
        onTap: () async {
            setState(() => _selectedMessenger = id);
            final Uri url = Uri.parse(botUrl);
            if (await canLaunchUrl(url)) {
                await launchUrl(url, mode: LaunchMode.externalApplication);
            }
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.lime.withValues(alpha: 0.1) : Colors.white.withValues(alpha: 0.05),
            border: Border.all(
              color: isSelected ? AppColors.lime : Colors.transparent,
              width: 2,
            ),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            children: [
              FaIcon(icon, color: isSelected ? AppColors.lime : Colors.white54, size: 32),
              const SizedBox(height: 8),
              Text(
                label,
                style: TextStyle(
                  color: isSelected ? Colors.white : Colors.white54,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                ),
              ),
              const SizedBox(height: 4),
              Text("OPEN APP", style: TextStyle(fontSize: 10, color: AppColors.lime))
            ],
          ),
        ),
      ),
    );
  }
}
