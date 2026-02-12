import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
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
  }

  Future<void> _checkToken() async {
    // Wait for Firebase Auth to initialize
    await Future.delayed(const Duration(seconds: 1)); 
    
    final user = FirebaseAuth.instance.currentUser;

    if (mounted) {
      if (user != null) {
        // User is logged in, check if they have a venue
        final userDoc = await FirebaseFirestore.instance.collection('users').doc(user.uid).get();
        
        if (userDoc.exists) {
           final venueId = userDoc.data()?['venueId'];
           if (venueId != null && (venueId as String).isNotEmpty) {
              // Assigned to a venue -> Dashboard
              _navigateToDashboard();
           } else {
             // Not assigned -> Welcome Screen (Join/Create)
             _navigateToWelcome();
           }
        } else {
           // User authenticated but no DB record (should be rare due to LoginScreen logic)
           // Send to Welcome Screen to handle init
           _navigateToWelcome();
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
     // For now, default to OwnerDashboard as it handles both or checks roles
     Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (context) => const OwnerDashboardScreen()),
    ); 
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
    if (_isLoading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (kIsWeb) {
      return const PlatformLandingScreen();
    }

    return const LandingScreen();
  }
}
