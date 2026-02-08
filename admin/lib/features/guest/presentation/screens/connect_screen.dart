import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:firebase_auth/firebase_auth.dart'; // Add this
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
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back, color: Theme.of(context).iconTheme.color),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                "Welcome!",
                style: Theme.of(context).textTheme.displayLarge?.copyWith(
                  fontSize: 32,
                  color: Theme.of(context).colorScheme.primary,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                "Let's enable your Guest Rewards. 👋",
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              const SizedBox(height: 48),

              // ... Google Button (Keep) ...

              // Name Input (Legacy/Manual)
              Row(
                children: [
                  Expanded(child: Divider(color: Theme.of(context).dividerColor)),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text("OR ENTER MANUALLY", style: Theme.of(context).textTheme.labelSmall),
                  ),
                  Expanded(child: Divider(color: Theme.of(context).dividerColor)),
                ],
              ),
              const SizedBox(height: 24),

              TextField(
                controller: _nameController,
                style: Theme.of(context).textTheme.bodyLarge,
                decoration: InputDecoration(
                  labelText: "Your Name",
                  labelStyle: TextStyle(color: Theme.of(context).colorScheme.secondary),
                  enabledBorder: OutlineInputBorder(
                    borderSide: BorderSide(color: Theme.of(context).colorScheme.outline ?? Colors.grey.shade400),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderSide: BorderSide(color: Theme.of(context).colorScheme.primary),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  filled: true,
                  fillColor: Theme.of(context).colorScheme.surface,
                ),
              ),
              const SizedBox(height: 32),
              
              // Messenger Selection / Connection
              Text(
                "CONNECT VIA MESSENGER",
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  color: Theme.of(context).colorScheme.primary,
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
                  // Style from Theme
                  child: _isLoading 
                    ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(color: Colors.white))
                    : const Text("CONTINUE AS GUEST"),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _signInWithGoogle() async {
      setState(() => _isLoading = true);
      try {
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
             // User cancelled
        }
      } catch (e) {
        if (mounted) {
           setState(() => _isLoading = false);
           ScaffoldMessenger.of(context).showSnackBar(
             SnackBar(
               content: Text("Google Sign-In Error: ${e.toString()}"),
               backgroundColor: Colors.red,
             ),
           );
        }
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
    User? user;
    try {
       user = await _authService.signInAnonymously();
    } catch (e) {
       if (mounted) {
           setState(() => _isLoading = false);
           ScaffoldMessenger.of(context).showSnackBar(
             SnackBar(
               content: Text("Login Error: ${e.toString()}"),
               backgroundColor: Colors.red,
             ),
           );
       }
       return;
    }

    if (user == null) {
      if (mounted) setState(() => _isLoading = false);
      return;
    }

    // 2. Sync
    await _userRepo.syncUser(user, displayName: name, messenger: _selectedMessenger);

    // 3. Launch Messenger (Deep Link)
    if (_selectedMessenger == 'telegram') {
        final Uri url = Uri.parse("${AppConfig.telegramBotUrl}?start=${user.uid}");
        if (await canLaunchUrl(url)) {
            await launchUrl(url, mode: LaunchMode.externalApplication);
        }
    } else if (_selectedMessenger == 'whatsapp') {
        // WhatsApp doesn't support 'start' param in same way without business API, 
        // but we launch the chat so they can say "Hi".
        final Uri url = Uri.parse(AppConfig.whatsappBotUrl);
        if (await canLaunchUrl(url)) {
             await launchUrl(url, mode: LaunchMode.externalApplication);
        }
    }

    // 4. Navigate
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
        onTap: () {
            setState(() => _selectedMessenger = id);
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            color: isSelected ? Theme.of(context).colorScheme.primary.withOpacity(0.1) : Theme.of(context).cardColor,
            border: Border.all(
              color: isSelected ? Theme.of(context).colorScheme.primary : Theme.of(context).dividerColor,
              width: 2,
            ),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            children: [
              FaIcon(icon, color: isSelected ? Theme.of(context).colorScheme.primary : Theme.of(context).iconTheme.color?.withOpacity(0.5), size: 32),
              const SizedBox(height: 8),
              Text(
                label,
                style: TextStyle(
                  color: isSelected ? Theme.of(context).colorScheme.primary : Theme.of(context).textTheme.bodyMedium?.color,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                ),
              ),
              const SizedBox(height: 4),
              Text("OPEN APP", style: TextStyle(fontSize: 10, color: Theme.of(context).colorScheme.secondary))
            ],
          ),
        ),
      ),
    );
  }
}
