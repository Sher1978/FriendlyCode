
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:friendly_code/core/theme/colors.dart';

class TierDonutChart extends StatelessWidget {
  const TierDonutChart({super.key});

  @override
  Widget build(BuildContext context) {
    return PieChart(
      PieChartData(
        sectionsSpace: 2,
        centerSpaceRadius: 40,
        sections: [
          PieChartSectionData(
            color: AppColors.premiumBurntOrange,
            value: 35,
            title: '35%',
            radius: 25,
            titleStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          PieChartSectionData(
            color: AppColors.premiumGold,
            value: 45,
            title: '45%',
            radius: 30, // Slightly larger to highlight Max Tier?
            titleStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          PieChartSectionData(
            color: Colors.grey.withOpacity(0.2),
            value: 20,
            title: '20%',
            radius: 20,
            titleStyle: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.body),
          ),
        ],
      ),
    );
  }
}
