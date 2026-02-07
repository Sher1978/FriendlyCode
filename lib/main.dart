import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'core/theme/app_theme.dart';
import 'core/navigation/dispatcher_screen.dart';
import 'features/owner/presentation/screens/owner_dashboard_screen.dart';
import 'features/admin/presentation/screens/super_admin_dashboard.dart';
import 'features/web/presentation/pages/b2b_landing_screen.dart';
import 'firebase_options.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  
  runApp(const FriendlyCodeApp());
}

class FriendlyCodeApp extends StatelessWidget {
  const FriendlyCodeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Friendly Code',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      initialRoute: '/',
      routes: {
        '/': (context) => const DispatcherScreen(),
        '/owner': (context) => const OwnerDashboardScreen(),
        '/admin': (context) => const SuperAdminDashboard(),
        '/partner': (context) => const B2BLandingScreen(),
      },
    );
  }
}
