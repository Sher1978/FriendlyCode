import 'package:flutter/material.dart';
import '../../../../core/theme/colors.dart';
import 'connect_screen.dart';
import '../../../../features/staff/presentation/screens/scanner_screen.dart';
import '../../../../features/owner/presentation/screens/owner_dashboard_screen.dart';
import '../../../../features/admin/presentation/screens/super_admin_dashboard.dart';
import '../../../../features/staff/presentation/screens/validator_screen.dart';
import 'discovery_screen.dart';

class LandingScreen extends StatelessWidget {
  const LandingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Cyberpunk Gradient Background
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              AppColors.deepSeaBlueDark,
              AppColors.deepSeaBlue,
            ],
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Spacer(),
                // Hero Text with "Glitch" vibe (simple implementation)
                ShaderMask(
                  shaderCallback: (bounds) => const LinearGradient(
                    colors: [AppColors.lime, Colors.white],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ).createShader(bounds),
                  child: Text(
                    "FRIENDLY\nCODE",
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.displayLarge?.copyWith(
                      fontSize: 48,
                      height: 0.9,
                      letterSpacing: -2,
                      fontWeight: FontWeight.w900, // Black weight
                      color: Colors.white, // Required for ShaderMask
                    ),
                  ),
                ),
                const SizedBox(height: 32),
                
                // Value Prop
                Text(
                  "Don't just be a customer.",
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    color: Colors.white70,
                    fontWeight: FontWeight.w300,
                  ),
                ),
                Text(
                  "Be a Guest.",
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    color: AppColors.lime,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                
                const Spacer(),

                // Pain/Solution Block (Subtle)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.deepSeaBlueDark.withValues(alpha: 0.5),
                    border: Border.all(color: AppColors.lime.withValues(alpha: 0.3)),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.no_cell, color: Colors.white54, size: 20),
                      SizedBox(width: 8),
                      Text(
                        "No Downloads. No App Store.",
                        style: TextStyle(color: Colors.white70, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // CTA Button
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (context) => const ConnectScreen()),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.lime,
                      foregroundColor: AppColors.deepSeaBlueDark,
                      elevation: 8,
                      shadowColor: AppColors.lime.withValues(alpha: 0.5),
                    ),
                    child: const Text("GET STATUS"),
                  ),
                ),
                const SizedBox(height: 32),
                
                // Mock Staff Entry for Development
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    TextButton(
                      onPressed: () {
                         Navigator.push(
                            context,
                            MaterialPageRoute(builder: (context) => const StaffScannerScreen()),
                          );
                      },
                      child: const Text("Staff (Dev)", style: TextStyle(color: Colors.white24)),
                    ),
                    TextButton(
                      onPressed: () {
                         Navigator.push(
                            context,
                            MaterialPageRoute(builder: (context) => const ValidatorScreen()),
                          );
                      },
                      child: const Text("Waiter (Dev)", style: TextStyle(color: Colors.white24)),
                    ),
                    TextButton(
                      onPressed: () {
                         Navigator.push(
                            context,
                            MaterialPageRoute(builder: (context) => const OwnerDashboardScreen()),
                          );
                      },
                      child: const Text("Owner (Dev)", style: TextStyle(color: Colors.white24)),
                    ),
                    TextButton(
                      onPressed: () {
                         Navigator.push(
                            context,
                            MaterialPageRoute(builder: (context) => const SuperAdminDashboard()),
                          );
                      },
                      child: const Text("Admin (Dev)", style: TextStyle(color: Colors.white24)),
                    ),
                    TextButton(
                      onPressed: () {
                         Navigator.push(
                            context,
                            MaterialPageRoute(builder: (context) => const DiscoveryScreen()),
                          );
                      },
                      child: const Text("Guest (Dev)", style: TextStyle(color: Colors.white24)),
                    ),
                  ],
                ),
                const SizedBox(height: 24), // Added extra padding at bottom
              ],
            ),
          ),
        ),
      ),
    );
  }
}
