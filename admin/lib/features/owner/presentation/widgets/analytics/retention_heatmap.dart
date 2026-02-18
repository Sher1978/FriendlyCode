
import 'package:flutter/material.dart';
import 'package:friendly_code/core/theme/colors.dart';

class RetentionHeatmap extends StatelessWidget {
  const RetentionHeatmap({super.key});

  @override
  Widget build(BuildContext context) {
    // Mock Data: Cohorts
    final cohorts = [
      {'month': 'Jan', 'm1': 100, 'm2': 40, 'm3': 30, 'm4': 25},
      {'month': 'Feb', 'm1': 100, 'm2': 45, 'm3': 35, 'm4': null},
      {'month': 'Mar', 'm1': 100, 'm2': 48, 'm3': null, 'm4': null},
      {'month': 'Apr', 'm1': 100, 'm2': null, 'm3': null, 'm4': null},
    ];

    return Column(
      children: [
        // Header
        const Row(
          children: [
            Expanded(flex: 2, child: Text("Cohort", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 10, color: AppColors.body))),
            Expanded(child: Center(child: Text("M1", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 10, color: AppColors.body)))),
            Expanded(child: Center(child: Text("M2", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 10, color: AppColors.body)))),
            Expanded(child: Center(child: Text("M3", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 10, color: AppColors.body)))),
            Expanded(child: Center(child: Text("M4", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 10, color: AppColors.body)))),
          ],
        ),
        const SizedBox(height: 8),
        ...cohorts.map((c) => _buildRow(c)).toList(),
      ],
    );
  }

  Widget _buildRow(Map<String, dynamic> data) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(flex: 2, child: Text(data['month'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.title))),
          _buildCell(100), // M1 is always 100%
          _buildCell(data['m2']),
          _buildCell(data['m3']),
          _buildCell(data['m4']),
        ],
      ),
    );
  }

  Widget _buildCell(dynamic value) {
    if (value == null) {
      return const Expanded(child: SizedBox());
    }
    
    final int val = value as int;
    // Color scale logic
    Color color = AppColors.surface;
    double opacity = 0.1;
    if (val > 80) opacity = 0.9;
    else if (val > 50) opacity = 0.6;
    else if (val > 30) opacity = 0.4;
    else if (val > 0) opacity = 0.2;

    return Expanded(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 2),
        height: 24,
        decoration: BoxDecoration(
          color: AppColors.premiumBurntOrange.withOpacity(opacity),
          borderRadius: BorderRadius.circular(4),
        ),
        child: Center(
          child: Text(
            "$val%", 
            style: TextStyle(
              fontSize: 10, 
              fontWeight: FontWeight.bold,
              color: opacity > 0.5 ? Colors.white : AppColors.title,
            )
          ),
        ),
      ),
    );
  }
}
