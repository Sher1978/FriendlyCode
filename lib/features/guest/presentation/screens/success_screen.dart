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
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: Container(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),
              // Status Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: Theme.of(context).cardColor,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: AppColors.lime, width: 2),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.lime.withOpacity(0.2),
                      blurRadius: 20,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Text(
                      "YAY! REWARD UNLOCKED! 🎉",
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: AppColors.limeDim,
                        letterSpacing: 1.5,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      "$discountPercent%",
                      style: Theme.of(context).textTheme.displayLarge?.copyWith(
                        fontSize: 96,
                        height: 1,
                        color: Theme.of(context).colorScheme.primary, // Brand Color
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    Text(
                      "OFF TOTAL BILL",
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        color: Theme.of(context).textTheme.bodyMedium?.color,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 48),
              
              Text(
                "Enjoy your meal, $guestName! 🍽️",
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  fontSize: 22,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                "Show this to your waiter to claim your perk! ✨",
                style: Theme.of(context).textTheme.bodyLarge,
                textAlign: TextAlign.center,
              ),

              const Spacer(),
              
              // Timer or Animation placeholder
              const LinearProgressIndicator(
                color: AppColors.lime,
                backgroundColor: Colors.grey,
              ),
              const SizedBox(height: 8),
              Text(
                "Expires in 24h",
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}
