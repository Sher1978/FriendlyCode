import 'package:flutter/material.dart';
import '../../../../core/theme/colors.dart';

class SuccessScreen extends StatelessWidget {
  final String guestName;
  final int discountPercent;

  const SuccessScreen({
    super.key,
    required this.guestName,
    this.discountPercent = 20, // Default mock value
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [AppColors.deepSeaBlueDark, AppColors.deepSeaBlue],
          ),
        ),
        child: SafeArea(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),
              // Status Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.05),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: AppColors.lime, width: 2),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.lime.withValues(alpha: 0.2),
                      blurRadius: 20,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Text(
                      "STATUS ACTIVATED",
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: AppColors.lime,
                        letterSpacing: 2,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      "$discountPercent%",
                      style: Theme.of(context).textTheme.displayLarge?.copyWith(
                        fontSize: 96,
                        height: 1,
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    Text(
                      "OFF",
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        color: Colors.white54,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 48),
              
              Text(
                "Welcome, $guestName.",
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                "Show this screen to your waiter.",
                style: TextStyle(color: Colors.white54),
              ),

              const Spacer(),
              
              // Timer or Animation placeholder
              const LinearProgressIndicator(
                color: AppColors.lime,
                backgroundColor: Colors.white10,
              ),
              const SizedBox(height: 8),
              const Text(
                "Expires in 24h",
                style: TextStyle(color: Colors.white38, fontSize: 10),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}
