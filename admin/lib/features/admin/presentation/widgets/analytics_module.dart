import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../../../core/theme/colors.dart';

class AnalyticsModule extends StatelessWidget {
  const AnalyticsModule({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("Performance Analytics", style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppColors.title)),
          const SizedBox(height: 32),
          
          // Row 1: Traffic Chart
          _buildChartCard(
            "Daily Traffic (Scans vs Activations)",
            SizedBox(
              height: 300,
              child: LineChart(_trafficData),
            ),
          ),
          const SizedBox(height: 32),
          
          Row(
            children: [
              // Row 2: Pie Chart (Loyalty)
              Expanded(
                flex: 2,
                child: _buildChartCard(
                  "Loyalty Distribution",
                  SizedBox(
                    height: 250,
                    child: PieChart(_loyaltyData),
                  ),
                ),
              ),
              const SizedBox(width: 32),
              // Row 2: Bar Chart (Retention)
              Expanded(
                flex: 3,
                child: _buildChartCard(
                  "Guest Retention (Visits)",
                  SizedBox(
                    height: 250,
                    child: BarChart(_retentionData),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildChartCard(String title, Widget chart) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: AppColors.softShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.title)),
          const SizedBox(height: 24),
          chart,
        ],
      ),
    );
  }

  // --- MOCK DATA ---

  LineChartData get _trafficData => LineChartData(
    gridData: FlGridData(show: false),
    titlesData: FlTitlesData(show: true, leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: false))),
    borderData: FlBorderData(show: false),
    lineBarsData: [
      LineChartBarData(
        spots: [const FlSpot(0, 3), const FlSpot(2, 5), const FlSpot(4, 4), const FlSpot(6, 8), const FlSpot(8, 7)],
        isCurved: true,
        color: AppColors.accentTeal,
        barWidth: 4,
        dotData: FlDotData(show: false),
      ),
      LineChartBarData(
        spots: [const FlSpot(0, 1), const FlSpot(2, 2.5), const FlSpot(4, 3), const FlSpot(6, 5), const FlSpot(8, 4)],
        isCurved: true,
        color: AppColors.accentIndigo,
        barWidth: 4,
        dotData: FlDotData(show: false),
      ),
    ],
  );

  PieChartData get _loyaltyData => PieChartData(
    sections: [
      PieChartSectionData(color: AppColors.statusActiveBg, value: 40, title: 'Welcome', radius: 60, titleStyle: const TextStyle(fontWeight: FontWeight.bold)),
      PieChartSectionData(color: AppColors.statusWarningBg, value: 35, title: 'Mid', radius: 50, titleStyle: const TextStyle(fontWeight: FontWeight.bold)),
      PieChartSectionData(color: AppColors.accentTeal.withOpacity(0.3), value: 25, title: 'Max', radius: 40, titleStyle: const TextStyle(fontWeight: FontWeight.bold)),
    ],
  );

  BarChartData get _retentionData => BarChartData(
    gridData: FlGridData(show: false),
    titlesData: FlTitlesData(show: true, leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: false))),
    borderData: FlBorderData(show: false),
    barGroups: [
      BarChartGroupData(x: 0, barRods: [BarChartRodData(toY: 60, color: AppColors.accentIndigo, width: 20)]),
      BarChartGroupData(x: 1, barRods: [BarChartRodData(toY: 30, color: AppColors.accentIndigo, width: 20)]),
      BarChartGroupData(x: 2, barRods: [BarChartRodData(toY: 15, color: AppColors.accentIndigo, width: 20)]),
      BarChartGroupData(x: 3, barRods: [BarChartRodData(toY: 5, color: AppColors.accentIndigo, width: 20)]),
    ],
  );
}
