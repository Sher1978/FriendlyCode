
import 'package:flutter/material.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/l10n/app_localizations.dart';
import 'package:friendly_code/features/owner/presentation/widgets/analytics/visit_velocity_chart.dart';
import 'package:friendly_code/features/owner/presentation/widgets/analytics/tier_donut_chart.dart';
import 'package:friendly_code/features/owner/presentation/widgets/analytics/retention_heatmap.dart';

class OwnerAnalyticsScreen extends StatelessWidget {
  const OwnerAnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Basic L10n mocking if not available, or standard usage
    final l10n = AppLocalizations.of(context); // nullable if not found in test
    final String title = l10n?.venueAnalytics ?? "Venue Analytics";
    final String subtitle = l10n?.venueAnalyticsSub ?? "Track your performance and growth.";

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Text(title, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppColors.title)),
          Text(subtitle, style: const TextStyle(color: AppColors.body)),
          const SizedBox(height: 32),

          // 1. Visit Velocity (Strategic)
          _buildChartSection(
            title: "Visit Velocity",
            subtitle: "Avg. days between active visits (Month over Month)",
            child: const SizedBox(height: 250, child: VisitVelocityChart()),
          ),
          
          const SizedBox(height: 24),

          // 2. Retention Heatmap
          _buildChartSection(
            title: "Retention Cohorts",
            subtitle: "% of new users returning in subsequent months",
            child: const RetentionHeatmap(),
          ),

          const SizedBox(height: 24),

          // 3. Tier Adoption
          _buildChartSection(
            title: "Tier Adoption",
            subtitle: "Distribution of loyal customers vs. beginners",
            child: const SizedBox(height: 200, child: TierDonutChart()),
          ),
        ],
      ),
    );
  }

  Widget _buildChartSection({required String title, required String subtitle, required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.title.withOpacity(0.05)),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.title)),
          Text(subtitle, style: const TextStyle(fontSize: 12, color: AppColors.body)),
          const SizedBox(height: 24),
          child,
        ],
      ),
    );
  }
}
