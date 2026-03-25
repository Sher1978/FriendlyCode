import 'package:flutter/material.dart';
import '../../../core/theme/colors.dart';

class PulseCheckCard extends StatelessWidget {
  final String title;
  final String value;
  final String? trend;
  final bool isPositive;
  final IconData icon;

  const PulseCheckCard({
    super.key,
    required this.title,
    required this.value,
    this.trend,
    this.isPositive = true,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.premiumGold.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  icon,
                  color: AppColors.premiumGold,
                  size: 20,
                ),
              ),
              if (trend != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: (isPositive ? AppColors.accentGreen : AppColors.accentRed).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    trend!,
                    style: TextStyle(
                      color: isPositive ? AppColors.accentGreen : AppColors.accentRed,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 20),
          Text(
            title,
            style: Theme.of(context).textTheme.labelLarge,
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: Theme.of(context).textTheme.displayLarge?.copyWith(
                  fontSize: 28,
                  letterSpacing: -1.0,
                ),
          ),
        ],
      ),
    );
  }
}
