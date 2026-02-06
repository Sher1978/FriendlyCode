import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/models/venue_model.dart';
import '../../../../core/data/venue_repository.dart';
import 'rules_config_screen.dart';
import 'venue_profile_edit_screen.dart';

class OwnerDashboardScreen extends StatefulWidget {
  const OwnerDashboardScreen({super.key});

  @override
  State<OwnerDashboardScreen> createState() => _OwnerDashboardScreenState();
}

class _OwnerDashboardScreenState extends State<OwnerDashboardScreen> {
  // For Dev, we hardcode the ID to the first one created usually, or use a known ID.
  // In real app, we get this from AuthService -> UserRepository -> User.venueId
  final String _demoVenueId = "1"; 
  final VenueRepository _venueRepo = VenueRepository();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.deepSeaBlueDark,
      appBar: AppBar(title: const Text("Owner Dashboard")),
      body: StreamBuilder<VenueModel?>(
        stream: _venueRepo.getVenueStream(_demoVenueId),
        builder: (context, snapshot) {
          if (snapshot.hasError) return Center(child: Text("Error: ${snapshot.error}", style: const TextStyle(color: Colors.red)));
          if (!snapshot.hasData) return const Center(child: CircularProgressIndicator(color: AppColors.lime));

          final venue = snapshot.data!;
          final stats = venue.stats;
          
          // Calculate Distribution Data for Chart
          // map: "20" -> count
          final dist = stats.discountDistribution; 
          final double total = dist.values.fold(0, (sum, val) => sum + val);
          
          return SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "TODAY'S METRICS",
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    color: AppColors.lime,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),
                
                // Analytics Cards
                Row(
                  children: [
                    _buildMetricCard(context, "Total Check-ins", "${stats.totalCheckins}", Icons.people),
                    const SizedBox(width: 16),
                    _buildMetricCard(context, "Avg Return", "${stats.avgReturnHours.toStringAsFixed(1)} h", Icons.loop),
                  ],
                ),
                const SizedBox(height: 16),
                // Additional Rows can go here...

                const SizedBox(height: 32),
                
                // Charts Section
                Text(
                  "DISCOUNT DISTRIBUTION",
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    color: AppColors.lime,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),
                
                Container(
                  height: 250,
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                     color: AppColors.deepSeaBlueLight,
                     borderRadius: BorderRadius.circular(24),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: total == 0 
                        ? const Center(child: Text("No Data Yet", style: TextStyle(color: Colors.white54)))
                        : PieChart(
                          PieChartData(
                            sectionsSpace: 2,
                            centerSpaceRadius: 40,
                            sections: [
                              _buildPieSection(dist['20'] ?? 0, total, AppColors.lime, '20%'),
                              _buildPieSection(dist['15'] ?? 0, total, Colors.blue, '15%'),
                              _buildPieSection(dist['10'] ?? 0, total, Colors.orange, '10%'),
                              _buildPieSection(dist['5'] ?? 0, total, Colors.grey, '5%'),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 24),
                      const Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _LegendItem(color: AppColors.lime, label: "Tier 1 (20%)"),
                          SizedBox(height: 8),
                          _LegendItem(color: Colors.blue, label: "Tier 2 (15%)"),
                          SizedBox(height: 8),
                          _LegendItem(color: Colors.orange, label: "Tier 3 (10%)"),
                          SizedBox(height: 8),
                          _LegendItem(color: Colors.grey, label: "Expired (5%)"),
                        ],
                      )
                    ],
                  ),
                ),

                const SizedBox(height: 48),

                Text(
                  "MANAGEMENT",
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    color: AppColors.lime,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),

                ListTile(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const VenueProfileEditScreen()),
                    );
                  },
                  tileColor: AppColors.deepSeaBlueLight,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  leading: const Icon(Icons.store, color: AppColors.lime),
                  title: const Text("Venue Profile", style: TextStyle(color: Colors.white)),
                  subtitle: const Text("Name, Hours, Photos", style: TextStyle(color: Colors.white54)),
                  trailing: const Icon(Icons.arrow_forward_ios, color: Colors.white24, size: 16),
                ),
                const SizedBox(height: 16),
                // Settings Tile
                ListTile(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const RulesConfigScreen()),
                    );
                  },
                  tileColor: AppColors.deepSeaBlueLight,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  leading: const Icon(Icons.tune, color: AppColors.lime),
                  title: const Text("Configure Time Rules", style: TextStyle(color: Colors.white)),
                  subtitle: const Text("Adjust decay limits and percentages", style: TextStyle(color: Colors.white54)),
                  trailing: const Icon(Icons.arrow_forward_ios, color: Colors.white24, size: 16),
                ),
              ],
            ),
          );
        }
      ),
    );
  }

  PieChartSectionData _buildPieSection(int value, double total, Color color, String title) {
    final double percent = (value / total) * 100;
    return PieChartSectionData(
      color: color,
      value: value.toDouble(),
      title: percent >= 5 ? title : '', // Hide title if too small
      radius: 50,
      titleStyle: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
    );
  }

  Widget _buildMetricCard(BuildContext context, String label, String value, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.deepSeaBlueLight,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white10),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: AppColors.lime, size: 20),
            const SizedBox(height: 12),
            Text(
              value,
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              label,
              style: const TextStyle(color: Colors.white54, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}

class _LegendItem extends StatelessWidget {
  final Color color;
  final String label;
  const _LegendItem({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(width: 12, height: 12, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 8),
        Text(label, style: const TextStyle(color: Colors.white70, fontSize: 12)),
      ],
    );
  }
}
