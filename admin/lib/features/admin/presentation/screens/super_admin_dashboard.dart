import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/models/venue_model.dart';
import '../../../../core/localization/locale_provider.dart';
import 'venue_detail_view.dart';

class SuperAdminDashboard extends StatefulWidget {
  const SuperAdminDashboard({super.key});

  @override
  State<SuperAdminDashboard> createState() => _SuperAdminDashboardState();
}

class _SuperAdminDashboardState extends State<SuperAdminDashboard> {
  // Mock Data
  final List<VenueModel> _mockVenues = [
    VenueModel(
      id: '1',
      name: 'Sushi Palace',
      description: 'Best Sushi',
      ownerEmail: 'owner1@example.com',
      tiers: [],
      subscription: VenueSubscription(plan: 'pro', isPaid: true),
      stats: VenueStats(avgReturnHours: 3.5, totalCheckins: 150),
    ),
    VenueModel(
      id: '2',
      name: 'Burger Kingdom',
      description: 'Juicy Burgers',
      ownerEmail: 'owner2@example.com',
      isActive: false, // Frozen
      tiers: [],
      subscription: VenueSubscription(plan: 'free', isPaid: false),
      stats: VenueStats(avgReturnHours: 5.0, totalCheckins: 45),
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final localeProvider = Provider.of<LocaleProvider>(context);

    return Scaffold(
      backgroundColor: AppColors.deepSeaBlueDark,
      appBar: AppBar(
        title: Text(l10n.adminConsole),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.language),
            onPressed: () => localeProvider.toggleLocale(),
          ),
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () {},
          ),
        ],
      ),
      body: Row(
        children: [
          // Side Panel (Web Style)
          Container(
            width: 250,
            color: AppColors.deepSeaBlue,
            child: Column(
              children: [
                _buildNavItem(Icons.dashboard, l10n.ownerDashboard, true),
                _buildNavItem(Icons.store, l10n.venues, false),
                _buildNavItem(Icons.people, l10n.users, false),
                _buildNavItem(Icons.analytics, l10n.systemStats, false),
              ],
            ),
          ),
          
          // Main Content
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(32.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                   Text(
                    l10n.platformOverview,
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  // KPI Cards
                   Row(
                    children: [
                      _buildKPICard(l10n.totalVenues, "2", Icons.store, Colors.blue),
                      const SizedBox(width: 16),
                      _buildKPICard(l10n.totalGuests, "1,240", Icons.people, Colors.green),
                      const SizedBox(width: 16),
                      _buildKPICard(l10n.pendingApproval, "5", Icons.warning, Colors.orange),
                    ],
                  ),
                  Text(
                    l10n.activeVenues,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(color: AppColors.lime),
                  ),
                  const SizedBox(height: 16),

                  // Data Table
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.05),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: ListView.separated(
                        itemCount: _mockVenues.length,
                        separatorBuilder: (context, index) => const Divider(color: Colors.white10),
                        itemBuilder: (context, index) {
                          final venue = _mockVenues[index];
                          return ListTile(
                            leading: CircleAvatar(
                              backgroundColor: venue.isActive ? Colors.green : Colors.red,
                              child: Icon(
                                venue.isActive ? Icons.check : Icons.block,
                                color: Colors.white,
                                size: 16,
                              ),
                            ),
                            title: Text(venue.name, style: const TextStyle(color: Colors.white)),
                            subtitle: Text("${venue.subscription.plan} | ${venue.ownerEmail}", style: const TextStyle(color: Colors.white54)),
                            trailing: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.lime.withValues(alpha: 0.1),
                                foregroundColor: AppColors.lime,
                              ),
                              onPressed: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => VenueDetailView(venue: venue),
                                  ),
                                );
                              },
                              child: Text(l10n.manage),
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNavItem(IconData icon, String label, bool isActive) {
    return Container(
      color: isActive ? Colors.white.withValues(alpha: 0.1) : Colors.transparent,
      child: ListTile(
        leading: Icon(icon, color: isActive ? AppColors.lime : Colors.white54),
        title: Text(
          label,
          style: TextStyle(
            color: isActive ? Colors.white : Colors.white54,
            fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
          ),
        ),
        onTap: () {},
      ),
    );
  }

  Widget _buildKPICard(String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: AppColors.deepSeaBlue,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white10),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Icon(icon, color: color, size: 24),
                Text(
                  value,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(label, style: const TextStyle(color: Colors.white54)),
          ],
        ),
      ),
    );
  }
}
