import 'package:flutter/material.dart';
import 'dart:ui';
import 'package:fl_chart/fl_chart.dart';
import 'package:friendly_code/l10n/app_localizations.dart';
import 'package:provider/provider.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/data/venue_repository.dart';
import 'package:friendly_code/core/localization/locale_provider.dart';
import 'package:friendly_code/features/owner/presentation/screens/rules_config_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/marketing_blast_screen.dart';
import 'package:friendly_code/features/admin/presentation/screens/venue_editor_screen.dart';
import 'package:friendly_code/features/admin/presentation/screens/staff_management_screen.dart';
import 'package:friendly_code/core/auth/role_provider.dart';
import 'package:friendly_code/core/services/notification_service.dart';

class OwnerDashboardScreen extends StatefulWidget {
  const OwnerDashboardScreen({super.key});

  @override
  State<OwnerDashboardScreen> createState() => _OwnerDashboardScreenState();
}

class _OwnerDashboardScreenState extends State<OwnerDashboardScreen> {
  final VenueRepository _venueRepo = VenueRepository();
  String? _selectedVenueId;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final roleProvider = Provider.of<RoleProvider>(context);
    final venueIds = roleProvider.venueIds;

    // Default to first venue if none selected
    if (_selectedVenueId == null && venueIds.isNotEmpty) {
      _selectedVenueId = venueIds.first;
    }

    if (venueIds.isEmpty) {
      return Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.storefront_outlined, size: 80, color: AppColors.accentOrange),
                const SizedBox(height: 24),
                Text(
                  "Welcome to Friendly Code",
                  style: Theme.of(context).textTheme.displayLarge,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                const Text(
                  "You don't have any venues registered yet. Start your journey by creating your first venue.",
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 16, height: 1.5),
                ),
                const SizedBox(height: 32),
                ElevatedButton.icon(
                  onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const VenueEditorScreen())),
                  icon: const Icon(Icons.add_circle_outline),
                  label: const Text("CREATE MY FIRST VENUE"),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const Text("DASHBOARD"),
            if (venueIds.length > 1) ...[
              const SizedBox(width: 24),
              _buildVenueSwitcher(venueIds),
            ],
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_business_outlined, color: AppColors.accentOrange),
            tooltip: "Add Venue",
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const VenueEditorScreen())),
          ),
          const SizedBox(width: 8),
          IconButton(
            icon: const Icon(Icons.person_outline),
            onPressed: () {}, // Profile
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: StreamBuilder<VenueModel?>(
        stream: _venueRepo.getVenueStream(_selectedVenueId!),
        builder: (context, snapshot) {
          if (snapshot.hasError) return Center(child: Text("Error: ${snapshot.error}"));
          if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
          
          final venue = snapshot.data!;
          final isBlocked = venue.isManuallyBlocked || 
                           (venue.subscription.expiryDate != null && venue.subscription.expiryDate!.isBefore(DateTime.now())) ||
                           (!venue.subscription.isPaid && venue.subscription.plan != 'free');

          return Stack(
            children: [
              _buildModernDashboard(context, venue, l10n),
              if (isBlocked) _buildBlockingOverlay(),
            ],
          );
        },
      ),
    );
  }

  Widget _buildVenueSwitcher(List<String> venueIds) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.title.withValues(alpha: 0.1)),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: _selectedVenueId,
          icon: const Icon(Icons.keyboard_arrow_down, size: 20),
          items: venueIds.map((id) => DropdownMenuItem(value: id, child: Text("ID: ...${id.substring(id.length - 4)}", style: const TextStyle(fontWeight: FontWeight.bold)))).toList(),
          onChanged: (val) => setState(() => _selectedVenueId = val),
        ),
      ),
    );
  }

  Widget _buildModernDashboard(BuildContext context, VenueModel venue, AppLocalizations l10n) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Welcome Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("Hello, ${venue.ownerEmail.split('@').first}", style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.accentOrange)),
                  const SizedBox(height: 4),
                  Text(venue.name, style: Theme.of(context).textTheme.displayLarge),
                ],
              ),
              _buildQuickAction(Icons.campaign_outlined, l10n.marketingBlast, () => Navigator.push(context, MaterialPageRoute(builder: (_) => MarketingBlastScreen(venueId: venue.id)))),
            ],
          ),
          const SizedBox(height: 40),

          // Stats Grid
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 24,
            mainAxisSpacing: 24,
            childAspectRatio: 1.5,
            children: [
              _buildStatCard(l10n.totalCheckins, "${venue.stats.totalCheckins}", Icons.people_outline, AppColors.accentOrange),
              _buildStatCard(l10n.avgReturn, "${venue.stats.avgReturnHours.toStringAsFixed(1)}h", Icons.loop, Colors.blueAccent),
            ],
          ),
          const SizedBox(height: 32),

          // QR Card (Premium Look)
          _buildPremiumQRCard(venue),
          const SizedBox(height: 32),

          // Settings Section
          Text(l10n.management, style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 16),
          _buildManagementLink(Icons.tune, l10n.configRules, l10n.configRulesSub, () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RulesConfigScreen()))),
          const SizedBox(height: 16),
          _buildManagementLink(Icons.badge_outlined, "Staff Management", "Manage your personnel", () => Navigator.push(context, MaterialPageRoute(builder: (_) => StaffManagementScreen(venueId: venue.id)))),
          const SizedBox(height: 16),
          _buildManagementLink(Icons.storefront_outlined, l10n.venueProfile, l10n.venueProfileSub, () => Navigator.push(context, MaterialPageRoute(builder: (_) => VenueEditorScreen(venue: venue)))),
        ],
      ),
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        boxShadow: AppColors.softShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: color.withValues(alpha: 0.1), shape: BoxShape.circle),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(height: 16),
          Text(value, style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontSize: 28)),
          Text(label, style: TextStyle(color: AppColors.body.withValues(alpha: 0.6), fontWeight: FontWeight.bold, fontSize: 12)),
        ],
      ),
    );
  }

  Widget _buildPremiumQRCard(VenueModel venue) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.title, // Deep Brown
        borderRadius: BorderRadius.circular(32),
        boxShadow: AppColors.softShadow,
      ),
      padding: const EdgeInsets.all(32),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20)),
            child: const Icon(Icons.qr_code_2_outlined, size: 64, color: AppColors.title),
          ),
          const SizedBox(width: 24),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("SHARE TO CLIENTS", style: TextStyle(color: AppColors.accentOrange, fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 1.5)),
                const SizedBox(height: 4),
                Text(venue.name.toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900)),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: () {},
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.surface, foregroundColor: AppColors.title),
                  child: const Text("DOWNLOAD QR"),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildManagementLink(IconData icon, String title, String sub, VoidCallback tap) {
    return InkWell(
      onTap: tap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.title.withValues(alpha: 0.05)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: AppColors.background, borderRadius: BorderRadius.circular(12)),
              child: Icon(icon, color: AppColors.accentOrange, size: 24),
            ),
            const SizedBox(width: 20),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                  Text(sub, style: TextStyle(color: AppColors.body.withValues(alpha: 0.6), fontSize: 13)),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios, size: 14, color: AppColors.body),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickAction(IconData icon, String label, VoidCallback tap) {
    return InkWell(
      onTap: tap,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: AppColors.accentOrange.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(16)),
            child: Icon(icon, color: AppColors.accentOrange),
          ),
          const SizedBox(height: 8),
          Text(label, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildBlockingOverlay() {
    return Positioned.fill(
      child: ClipRRect(
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
          child: Container(
            color: AppColors.title.withValues(alpha: 0.2),
            child: Center(
              child: Card(
                margin: const EdgeInsets.symmetric(horizontal: 40),
                child: Padding(
                  padding: const EdgeInsets.all(40),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.lock_clock_outlined, size: 64, color: AppColors.statusBlockedText),
                      const SizedBox(height: 24),
                      const Text("Subscription Check", style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900)),
                      const SizedBox(height: 12),
                      const Text("Your venue activity is currently paused. Please review your subscription or contact support.", textAlign: TextAlign.center),
                      const SizedBox(height: 32),
                      ElevatedButton(onPressed: () {}, child: const Text("SUPPORT")),
                    ],
                  ),
                ),
              ),
            ),
          ),
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
