import 'package:flutter/material.dart';
import '../../../../core/theme/colors.dart';
import 'connect_screen.dart';
import '../../../../features/guest/presentation/screens/discovery_screen.dart';
import '../../../../features/owner/presentation/screens/owner_dashboard_screen.dart';
import '../../../../features/admin/presentation/screens/super_admin_dashboard.dart';

class LandingScreen extends StatelessWidget {
  const LandingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Dynamic Theme Background
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),
              // Hero Text
              ShaderMask(
                shaderCallback: (bounds) => LinearGradient(
                  colors: [Theme.of(context).colorScheme.primary, Theme.of(context).colorScheme.secondary],
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
                    fontWeight: FontWeight.w900,
                    color: Colors.white, // Required for ShaderMask, but masked by gradient
                  ),
                ),
              ),
              const SizedBox(height: 32),
              
              // Value Prop
              Text(
                "Don't just be a customer.",
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                   fontWeight: FontWeight.w300,
                   // Color inherited from Theme
                ),
              ),
              Text(
                "Be a Guest.",
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  color: Theme.of(context).colorScheme.primary, // Brand Color
                  fontWeight: FontWeight.bold,
                ),
              ),
              
              const Spacer(),

              // Pain/Solution Block (Subtle)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  border: Border.all(color: Theme.of(context).colorScheme.primary.withOpacity(0.1)),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    )
                  ],
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.no_cell, color: Theme.of(context).colorScheme.secondary, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      "No Downloads. No App Store.",
                      style: Theme.of(context).textTheme.bodyMedium,
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
                  // Style inherited from Theme
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
    );
  }
}
