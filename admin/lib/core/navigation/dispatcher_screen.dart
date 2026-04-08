import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:provider/provider.dart';
import '../../core/auth/role_provider.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../core/services/fcm_service.dart';
import '../../features/owner/presentation/screens/owner_dashboard_screen.dart';
import '../../features/guest/presentation/screens/landing_screen.dart';
import '../../features/web/presentation/pages/b2c_home_screen.dart';
import '../../features/web/presentation/pages/platform_landing_screen.dart';
import '../../features/guest/presentation/screens/success_screen.dart';
import '../../features/onboarding/presentation/screens/welcome_screen.dart';

class DispatcherScreen extends StatefulWidget {
  const DispatcherScreen({super.key});

  @override
  State<DispatcherScreen> createState() => _DispatcherScreenState();
}

class _DispatcherScreenState extends State<DispatcherScreen> {
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _checkToken();
    
    // Initialize FCM without blocking UI
    FCMService().initialize();
    
    // Fail-safe: Force loading to false after 8 seconds if nothing else happens
    Future.delayed(const Duration(seconds: 8), () {
      if (mounted && _isLoading) {
        debugPrint("Dispatcher timed out - forcing limits");
        setState(() {
          _isLoading = false;
        });
      }
    });
  }

  Future<void> _checkToken() async {
    // Wait for Firebase Auth to initialize
    await Future.delayed(const Duration(seconds: 1)); 
    
    final user = FirebaseAuth.instance.currentUser;

    if (mounted) {
      if (user != null) {
        try {
          // 1. Refresh global role & venue list
          await Provider.of<RoleProvider>(context, listen: false).refreshRole();
          
          // 2. Navigate based on assigned data or just go to dashboard
          _navigateToDashboard();
        } catch (e) {
          debugPrint("Dispatcher error: $e");
          // On error, fall back to landing page to allow re-login if needed
          setState(() {
            _isLoading = false;
          });
        }
      } else {
         // Not logged in
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void _navigateToWelcome() {
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (context) => const WelcomeScreen()),
    );
  }

  void _navigateToDashboard() {
    final roleProvider = Provider.of<RoleProvider>(context, listen: false);
    
    if (roleProvider.isSuperAdmin) {
      Navigator.pushReplacementNamed(context, '/admin');
    } else {
      Navigator.pushReplacementNamed(context, '/owner');
    }
  }

  Future<void> _navigateToSuccess() async {
    final prefs = await SharedPreferences.getInstance();
    final name = prefs.getString('user_name') ?? 'Guest';
    
    if (mounted) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => SuccessScreen(guestName: name)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    // WEB: Allow loading to check for token/session
    // Removed immediate PlatformLandingScreen return

    if (_isLoading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    return const PlatformLandingScreen();
  }
}
