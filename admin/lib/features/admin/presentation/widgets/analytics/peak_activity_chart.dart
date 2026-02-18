
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:friendly_code/core/theme/colors.dart';

class PeakActivityChart extends StatelessWidget {
  const PeakActivityChart({super.key});

  @override
  Widget build(BuildContext context) {
    return LineChart(
      LineChartData(
        gridData: FlGridData(show: false),
        titlesData: FlTitlesData(
          show: true,
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              interval: 6,
              getTitlesWidget: (value, meta) {
                return Text("${value.toInt()}h", style: const TextStyle(fontSize: 10));
              }
            ),
          ),
          leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        ),
        borderData: FlBorderData(show: false),
        minX: 0,
        maxX: 24,
        minY: 0,
        maxY: 100,
        lineBarsData: [
          LineChartBarData(
            spots: const [
              FlSpot(0, 5), FlSpot(6, 10), FlSpot(8, 40),
              FlSpot(12, 80), FlSpot(14, 60), FlSpot(18, 90),
              FlSpot(22, 30), FlSpot(24, 10),
            ],
            isCurved: true,
            color: AppColors.accentGreen,
            barWidth: 3,
            isStrokeCapRound: true,
            dotData: const FlDotData(show: false),
            belowBarData: BarAreaData(
              show: true, 
              color: AppColors.accentGreen.withOpacity(0.2)
            ),
          ),
        ],
      ),
    );
  }
}
