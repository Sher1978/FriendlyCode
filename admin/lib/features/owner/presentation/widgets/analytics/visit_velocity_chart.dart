
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:friendly_code/core/theme/colors.dart';

class VisitVelocityChart extends StatelessWidget {
  const VisitVelocityChart({super.key});

  @override
  Widget build(BuildContext context) {
    return LineChart(
      LineChartData(
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          horizontalInterval: 5,
          getDrawingHorizontalLine: (value) => FlLine(color: Colors.grey.withOpacity(0.1), strokeWidth: 1),
        ),
        titlesData: FlTitlesData(
          show: true,
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 30,
              interval: 1,
              getTitlesWidget: (value, meta) {
                switch (value.toInt()) {
                  case 0: return const Text('W1', style: TextStyle(color: Colors.grey, fontSize: 10));
                  case 2: return const Text('W3', style: TextStyle(color: Colors.grey, fontSize: 10));
                  case 4: return const Text('W5', style: TextStyle(color: Colors.grey, fontSize: 10));
                }
                return const Text('');
              },
            ),
          ),
        ),
        borderData: FlBorderData(show: false),
        minX: 0,
        maxX: 4,
        minY: 0,
        maxY: 20,
        lineBarsData: [
          // Current Month (Solid)
          LineChartBarData(
            spots: const [
              FlSpot(0, 12),
              FlSpot(1, 8),
              FlSpot(2, 7),
              FlSpot(3, 6),
              FlSpot(4, 5.5),
            ],
            isCurved: true,
            gradient: const LinearGradient(colors: [AppColors.premiumBurntOrange, AppColors.premiumGold]),
            barWidth: 4,
            isStrokeCapRound: true,
            dotData: const FlDotData(show: false),
            belowBarData: BarAreaData(
              show: true,
              gradient: LinearGradient(
                colors: [AppColors.premiumBurntOrange.withOpacity(0.3), AppColors.premiumGold.withOpacity(0.0)],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
          ),
          // Previous Month (Dashed usually, but here just lighter/different color for contrast)
          LineChartBarData(
            spots: const [
              FlSpot(0, 15),
              FlSpot(1, 14),
              FlSpot(2, 13),
              FlSpot(3, 12),
              FlSpot(4, 11),
            ],
            isCurved: true,
            color: Colors.grey.withOpacity(0.3),
            barWidth: 2,
            dashArray: [5, 5],
            isStrokeCapRound: true,
            dotData: const FlDotData(show: false),
          ),
        ],
      ),
    );
  }
}
