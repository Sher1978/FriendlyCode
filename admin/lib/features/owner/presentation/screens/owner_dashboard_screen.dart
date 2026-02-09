import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/models/venue_model.dart';
import '../../../../core/data/venue_repository.dart';
import '../../../../core/localization/locale_provider.dart';
import 'rules_config_screen.dart';
import 'venue_profile_edit_screen.dart';
import 'marketing_blast_screen.dart';

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
    final l10n = AppLocalizations.of(context)!;
    final localeProvider = Provider.of<LocaleProvider>(context);

    return Scaffold(
      // Background handled by Theme
      appBar: AppBar(
        title: Text(l10n.ownerDashboard),
        actions: [
          IconButton(
            icon: const Icon(Icons.language),
            onPressed: () => localeProvider.toggleLocale(),
          ),
        ],
      ),
      body: StreamBuilder<VenueModel?>(
        stream: _venueRepo.getVenueStream(_demoVenueId),
        builder: (context, snapshot) {
          if (snapshot.hasError) return Center(child: Text("Error: ${snapshot.error}", style: const TextStyle(color: Colors.red)));
          if (!snapshot.hasData) return Center(child: CircularProgressIndicator(color: Theme.of(context).colorScheme.primary));

          final venue = snapshot.data!;
          final stats = venue.stats;
          
          final dist = stats.discountDistribution; 
          final double total = dist.values.fold(0, (sum, val) => sum + val);
          
          return SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Temporal Filter
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                       _buildFilterChip("TODAY", true),
                       _buildFilterChip("WEEK", false),
                       _buildFilterChip("MONTH", false),
                       _buildFilterChip("ALL TIME", false),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                Text(
                  l10n.metrics,
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    color: Theme.of(context).colorScheme.primary, // Brand Color
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),
                
                // Analytics Cards
                Row(
                  children: [
                    _buildMetricCard(context, l10n.totalCheckins, "${stats.totalCheckins}", Icons.people),
                    const SizedBox(width: 16),
                    _buildMetricCard(context, l10n.avgReturn, "${stats.avgReturnHours.toStringAsFixed(1)} h", Icons.loop),
                  ],
                ),
                const SizedBox(height: 24),

                // QR Asset Card
                _buildQRCard(context, venue),
                
                const SizedBox(height: 32),
                
                // Charts Section
                Text(
                  l10n.discountDist,
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    color: Theme.of(context).colorScheme.primary,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),
                
                Container(
                  height: 250,
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                     color: Theme.of(context).cardColor,
                     borderRadius: BorderRadius.circular(24),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: total == 0 
                        ? Center(child: Text("No Data Yet", style: TextStyle(color: Theme.of(context).disabledColor)))
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
                      Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _LegendItem(context, color: AppColors.lime, label: l10n.tier1),
                          const SizedBox(height: 8),
                          _LegendItem(context, color: Colors.blue, label: l10n.tier2),
                          const SizedBox(height: 8),
                          _LegendItem(context, color: Colors.orange, label: l10n.tier3),
                          const SizedBox(height: 8),
                          _LegendItem(context, color: Colors.grey, label: l10n.expired),
                        ],
                      )
                    ],
                  ),
                ),

                const SizedBox(height: 48),

                Text(
                  l10n.management,
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    color: Theme.of(context).colorScheme.primary,
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
                  tileColor: Theme.of(context).cardColor,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  leading: Icon(Icons.store, color: Theme.of(context).colorScheme.primary),
                  title: Text(l10n.venueProfile, style: Theme.of(context).textTheme.bodyLarge),
                  subtitle: Text(l10n.venueProfileSub, style: Theme.of(context).textTheme.bodySmall),
                  trailing: Icon(Icons.arrow_forward_ios, color: Theme.of(context).dividerColor, size: 16),
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
                  tileColor: Theme.of(context).cardColor,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  leading: Icon(Icons.tune, color: Theme.of(context).colorScheme.primary),
                  title: Text(l10n.configRules, style: Theme.of(context).textTheme.bodyLarge),
                  subtitle: Text(l10n.configRulesSub, style: Theme.of(context).textTheme.bodySmall),
                  trailing: Icon(Icons.arrow_forward_ios, color: Theme.of(context).dividerColor, size: 16),
                ),
                const SizedBox(height: 16),
                
                ListTile(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => MarketingBlastScreen(venueId: _demoVenueId)),
                    );
                  },
                  tileColor: Theme.of(context).cardColor,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  leading: const Icon(Icons.campaign, color: AppColors.lime), // Campaign icon
                  title: Text(l10n.marketingBlast, style: Theme.of(context).textTheme.bodyLarge),
                  subtitle: Text(l10n.marketingBlastSub, style: Theme.of(context).textTheme.bodySmall),
                  trailing: Icon(Icons.arrow_forward_ios, color: Theme.of(context).dividerColor, size: 16),
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


  Widget _buildFilterChip(String label, bool isActive) {
     return Container(
       margin: const EdgeInsets.only(right: 8),
       child: ChoiceChip(
         label: Text(label, style: TextStyle(color: isActive ? Colors.black : Colors.white70, fontSize: 10)),
         selected: isActive,
         onSelected: (val) {},
         selectedColor: AppColors.lime,
         backgroundColor: Colors.white.withValues(alpha: 0.1),
         side: BorderSide.none,
       ),
     );
  }

  Widget _buildQRCard(BuildContext context, VenueModel venue) {
    final deepLink = "https://app.friendlycode.com/v/${venue.id}";
    
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.deepSeaBlue,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.qr_code, size: 64, color: AppColors.deepSeaBlue),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  "YOUR GUEST LINK",
                  style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold),
                ),
                Text(
                  deepLink,
                  style: const TextStyle(color: AppColors.lime, fontWeight: FontWeight.bold),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    ElevatedButton(
                      onPressed: () {},
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.lime,
                        foregroundColor: AppColors.deepSeaBlue,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                      ),
                      child: const Text("DOWNLOAD QR"),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricCard(BuildContext context, String label, String value, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Theme.of(context).dividerColor),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: Theme.of(context).colorScheme.primary, size: 20),
            const SizedBox(height: 12),
            Text(
              value,
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              label,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}

class _LegendItem extends StatelessWidget {
  final BuildContext context;
  final Color color;
  final String label;
  const _LegendItem(this.context, {required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(width: 12, height: 12, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 8),
        Text(label, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}
