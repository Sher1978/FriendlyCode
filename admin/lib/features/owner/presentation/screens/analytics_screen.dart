import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:friendly_code/core/theme/colors.dart';

class OwnerAnalyticsScreen extends StatelessWidget {
  const OwnerAnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("VENUE ANALYTICS", style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppColors.title)),
          const Text("Detailed performance of your loyalty program.", style: TextStyle(color: AppColors.body)),
          const SizedBox(height: 40),
          
          // KPI Grid
          GridView.count(
            crossAxisCount: 3,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 24,
            mainAxisSpacing: 24,
            childAspectRatio: 2.5,
            children: [
              _buildKPICard("TOTAL ACTIVATIONS", "1,248", Icons.bolt, AppColors.accentOrange),
              _buildKPICard("UNIQUE GUESTS", "856", Icons.people_outline, Colors.blue),
              _buildKPICard("RETENTION RATE", "18.5%", Icons.loop, Colors.green),
            ],
          ),
          const SizedBox(height: 32),
          
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                flex: 2,
                child: _buildChartCard(
                  "RETENTION TREND", 
                  "Average return time in hours.",
                  SizedBox(height: 250, child: LineChart(_retentionTrendData)),
                ),
              ),
              const SizedBox(width: 32),
              Expanded(
                child: _buildChartCard(
                  "REWARD USAGE", 
                  "Which tiers are most popular?",
                  SizedBox(height: 250, child: PieChart(_rewardDistributionData)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildKPICard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.title.withValues(alpha: 0.1)),
      ),
      child: Row(
        children: [
          CircleAvatar(backgroundColor: color.withValues(alpha: 0.1), child: Icon(icon, color: color)),
          const SizedBox(width: 20),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppColors.title)),
              Text(label, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.body, letterSpacing: 1.2)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildChartCard(String title, String subtitle, Widget chart) {
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.title.withValues(alpha: 0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppColors.title)),
          Text(subtitle, style: const TextStyle(fontSize: 12, color: AppColors.body)),
          const SizedBox(height: 32),
          chart,
        ],
      ),
    );
  }

  LineChartData get _retentionTrendData => LineChartData(
    gridData: FlGridData(show: false),
    titlesData: FlTitlesData(show: false),
    borderData: FlBorderData(show: false),
    lineBarsData: [
      LineChartBarData(
        spots: [const FlSpot(0, 10), const FlSpot(2, 40), const FlSpot(4, 30), const FlSpot(6, 70), const FlSpot(8, 60)],
        isCurved: true,
        color: AppColors.accentOrange,
        barWidth: 4,
        isStrokeCapRound: true,
        dotData: FlDotData(show: false),
        belowBarData: BarAreaData(show: true, color: AppColors.accentOrange.withValues(alpha: 0.1)),
      ),
    ],
  );

  PieChartData get _rewardDistributionData => PieChartData(
    sections: [
      PieChartSectionData(color: AppColors.accentOrange, value: 50, title: '20%', radius: 50, titleStyle: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      PieChartSectionData(color: Colors.blue, value: 30, title: '15%', radius: 45, titleStyle: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      PieChartSectionData(color: Colors.green, value: 20, title: '5%', radius: 40, titleStyle: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
    ],
  );
}
