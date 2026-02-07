import 'package:flutter/material.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/logic/reward_calculator.dart';

class GuestProfileScreen extends StatelessWidget {
  final String guestName;
  final int lastVisitHours; // For mock/demo purposes

  const GuestProfileScreen({
    super.key,
    required this.guestName,
    required this.lastVisitHours,
  });

  @override
  Widget build(BuildContext context) {
    // Calculate Reward on the fly using our Logic Core
    // We simulate "now" vs "last visit" based on the passed hours
    final now = DateTime.now();
    final lastVisit = now.subtract(Duration(hours: lastVisitHours));
    final reward = RewardCalculator.calculate(lastVisit, now);

    return Scaffold(
      appBar: AppBar(title: const Text("Guest Profile")),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Profile Card
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.deepSeaBlueLight,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  const CircleAvatar(
                    radius: 40,
                    backgroundColor: AppColors.lime,
                    child: Icon(Icons.person, size: 40, color: AppColors.deepSeaBlue),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    guestName,
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    "Last Visit: $lastVisitHours hours ago",
                    style: const TextStyle(color: Colors.white70),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 32),

            // Reward Result
            Container(
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                border: Border.all(color: AppColors.lime, width: 2),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  const Text("APPLICABLE REWARD", style: TextStyle(color: AppColors.lime, letterSpacing: 1.5)),
                  Text(
                    "$reward%",
                    style: Theme.of(context).textTheme.displayLarge?.copyWith(
                      // fontSize: 80,
                      fontWeight: FontWeight.w900,
                      color: AppColors.lime,
                    ),
                  ),
                ],
              ),
            ),

            const Spacer(),

            // Action Button
            ElevatedButton(
              onPressed: () {
                // Confirm Visit Logic (Reset timer)
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("Visit Confirmed! Timer Reset.")),
                );
                // Return to Scanner
                Navigator.pop(context); 
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.lime,
                foregroundColor: AppColors.deepSeaBlueDark,
              ),
              child: const Text("CONFIRM VISIT"),
            ),
          ],
        ),
      ),
    );
  }
}
