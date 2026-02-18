
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:friendly_code/core/theme/colors.dart';

class VenueLeaderboard extends StatelessWidget {
  const VenueLeaderboard({super.key});

  @override
  Widget build(BuildContext context) {
    return BarChart(
      BarChartData(
        alignment: BarChartAlignment.spaceAround,
        maxY: 1500,
        barTouchData: BarTouchData(enabled: true),
        titlesData: FlTitlesData(
          show: true,
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (value, meta) {
                switch(value.toInt()) {
                  case 0: return const Text('Dubai Mall', style: TextStyle(fontSize: 10));
                  case 1: return const Text('Marina', style: TextStyle(fontSize: 10));
                  case 2: return const Text('JBR', style: TextStyle(fontSize: 10));
                  case 3: return const Text('Palm', style: TextStyle(fontSize: 10));
                }
                return const SizedBox();
              },
            ),
          ),
          leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        ),
        gridData: FlGridData(show: false),
        borderData: FlBorderData(show: false),
        barGroups: [
          BarChartGroupData(x: 0, barRods: [BarChartRodData(toY: 1200, color: AppColors.premiumBurntOrange, width: 16, borderRadius: BorderRadius.circular(4))]),
          BarChartGroupData(x: 1, barRods: [BarChartRodData(toY: 950, color: AppColors.premiumGold, width: 16, borderRadius: BorderRadius.circular(4))]),
          BarChartGroupData(x: 2, barRods: [BarChartRodData(toY: 800, color: Colors.grey, width: 16, borderRadius: BorderRadius.circular(4))]),
          BarChartGroupData(x: 3, barRods: [BarChartRodData(toY: 1100, color: Colors.blueGrey, width: 16, borderRadius: BorderRadius.circular(4))]),
        ],
      ),
    );
  }
}
