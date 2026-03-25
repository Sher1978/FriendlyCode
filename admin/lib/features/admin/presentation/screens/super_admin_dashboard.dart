import 'package:flutter/material.dart';
import 'package:friendly_code/l10n/app_localizations.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/features/admin/presentation/screens/venue_detail_view.dart';
import 'package:friendly_code/features/admin/presentation/widgets/venue_configurator.dart';
import 'package:friendly_code/features/admin/presentation/screens/venue_editor_screen.dart';
import 'package:friendly_code/features/admin/presentation/screens/staff_management_screen.dart';
import 'package:friendly_code/features/admin/presentation/screens/marketing_campaign_screen.dart';
import 'package:friendly_code/core/auth/role_provider.dart';
import 'package:friendly_code/core/models/venue_request_model.dart';
import 'package:friendly_code/core/data/venue_repository.dart';
import 'package:friendly_code/core/services/venue_service.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:provider/provider.dart';
import 'package:friendly_code/core/localization/locale_provider.dart';
import 'package:friendly_code/features/owner/presentation/screens/flyer_generator_screen.dart';
import 'package:friendly_code/features/admin/presentation/widgets/analytics/venue_leaderboard.dart';
import 'package:friendly_code/features/admin/presentation/widgets/analytics/peak_activity_chart.dart';
import 'package:friendly_code/core/widgets/ios_settings_group.dart';
import 'package:friendly_code/core/widgets/ios_settings_row.dart';
import 'package:friendly_code/features/owner/presentation/widgets/pulse_check_card.dart';
import 'package:flutter/cupertino.dart' show CupertinoIcons;

class SuperAdminDashboard extends StatefulWidget {
  const SuperAdminDashboard({super.key});

  @override
  State<SuperAdminDashboard> createState() => _SuperAdminDashboardState();
}

class _SuperAdminDashboardState extends State<SuperAdminDashboard> {
  final TextEditingController _searchCtrl = TextEditingController();
  final VenuesService _venuesService = VenuesService();

  @override
  void initState() {
    super.initState();
    _searchCtrl.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isMobile = constraints.maxWidth < 800;
        
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text("SYSTEM CONTROL", style: Theme.of(context).textTheme.labelLarge),
              Text("Network Management", style: Theme.of(context).textTheme.headlineMedium),
            ],
          ),
          actions: [
            IconButton(
              icon: const Icon(CupertinoIcons.globe, color: AppColors.premiumGold),
              onPressed: () {
                final provider = Provider.of<LocaleProvider>(context, listen: false);
                final nextLocale = provider.locale.languageCode == 'en' 
                    ? const Locale('ru') 
                    : (provider.locale.languageCode == 'ru' ? const Locale('vi') : const Locale('en'));
                provider.setLocale(nextLocale);
              },
            ),
            IconButton(
              icon: const Icon(CupertinoIcons.plus_app, color: AppColors.premiumGold),
              onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const VenueEditorScreen())),
            ),
            const SizedBox(width: 8),
          ],
        ),
        body: Column(
          children: [
            const SizedBox(height: 16),
            // System Intelligence Actions
            IOSSettingsGroup(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                IOSSettingsRow(
                  title: "Marketing Campaigns",
                  subtitle: "Global engagement metrics",
                  icon: CupertinoIcons.speaker_2_fill,
                  iconColor: AppColors.accentBlue,
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MarketingCampaignScreen())),
                ),
                IOSSettingsRow(
                  title: "Flyer Generator",
                  subtitle: "System-wide brand assets",
                  icon: CupertinoIcons.doc_plaintext,
                  iconColor: AppColors.accentOrange,
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const FlyerGeneratorScreen())),
                ),
              ],
            ),
            const SizedBox(height: 24),
            const TabBar(
              isScrollable: true,
              labelColor: AppColors.premiumGold,
              unselectedLabelColor: AppColors.body,
              indicatorColor: AppColors.premiumGold,
              dividerColor: Colors.transparent,
              tabs: [
                Tab(text: "APPROVED"),
                Tab(text: "REQUESTS"),
                Tab(text: "NETWORK INTELLIGENCE"),
              ],
            ),
            Expanded(
              child: TabBarView(
                children: [
                  _buildVenueList(isMobile),
                  _buildRequestsList(),
                  _buildAnalyticsTab(isMobile),
                ],
              ),
            ),
          ],
        ),
      ),
    );
      }
    );
  }

  Widget _buildAnalyticsTab(bool isMobile) {
    return SingleChildScrollView(
      padding: const EdgeInsets.only(bottom: 40, top: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16),
            child: Text("NETWORK PERFORMANCE", style: TextStyle(color: AppColors.premiumGold, fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 1.5)),
          ),
          const SizedBox(height: 24),
          
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              children: [
                Container(
                  height: 380,
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text("Venue Leaderboard", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.title)),
                      SizedBox(height: 24),
                      Expanded(child: VenueLeaderboard()),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  height: 380,
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text("Peak Activity (24h)", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.title)),
                      SizedBox(height: 24),
                      Expanded(child: PeakActivityChart()),
                    ],
                  ),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 32),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.secondarySurface,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Center(
                child: Text("Predictive network analysis coming soon...", style: TextStyle(color: AppColors.tertiary, fontWeight: FontWeight.bold)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVenueList(bool isMobile) {
    return Column(
      children: [
        // Compact iOS Search Bar
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: Container(
            height: 44,
            decoration: BoxDecoration(
              color: AppColors.secondarySurface,
              borderRadius: BorderRadius.circular(10),
            ),
            child: TextField(
              controller: _searchCtrl,
              style: const TextStyle(color: AppColors.title, fontSize: 16),
              decoration: InputDecoration(
                hintText: "Search vendors, ID or email",
                hintStyle: const TextStyle(color: AppColors.tertiary),
                prefixIcon: const Icon(CupertinoIcons.search, color: AppColors.tertiary, size: 20),
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12),
              ),
            ),
          ),
        ),

        Expanded(
          child: StreamBuilder<List<VenueModel>>(
            stream: _venuesService.getAllVenues(),
            builder: (context, snapshot) {
              if (snapshot.hasError) return Center(child: Text("Error: ${snapshot.error}"));
              if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());

              final query = _searchCtrl.text.toLowerCase();
              final venues = snapshot.data!.where((v) {
                return v.name.toLowerCase().contains(query) ||
                       v.id.toLowerCase().contains(query) ||
                       (v.ownerEmail ?? '').toLowerCase().contains(query);
              }).toList();

              if (venues.isEmpty) return const Center(child: Text("No venues found.", style: TextStyle(color: AppColors.body)));

              return ListView.builder(
                itemCount: venues.length,
                itemBuilder: (context, index) => _buildVenueCard(venues[index], isMobile),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildRequestsList() {
    return StreamBuilder<List<VenueRequestModel>>(
      stream: VenueRepository().getAllPendingRequestsStream(),
      builder: (context, snapshot) {
        if (snapshot.hasError) return Center(child: Text("Error: ${snapshot.error}"));
        if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());

        final requests = snapshot.data!;
        if (requests.isEmpty) {
          return const Center(
            child: Text("No pending requests.", style: TextStyle(color: AppColors.body)),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: requests.length,
          itemBuilder: (context, index) {
            final req = requests[index];
            final title = req.type == 'join' 
                ? "Join: ${req.targetVenueName}" 
                : "Create: ${req.newVenueDetails?['name']}";
            
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(12),
              ),
              child: ListTile(
                title: Text(title, style: const TextStyle(color: AppColors.title, fontWeight: FontWeight.bold)),
                subtitle: Text(
                  "${req.userName} • ${req.userEmail}",
                  style: const TextStyle(color: AppColors.body, fontSize: 12),
                ),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      icon: const Icon(CupertinoIcons.check_mark_circled, color: AppColors.accentGreen),
                      onPressed: () => _approveRequest(req),
                    ),
                    IconButton(
                      icon: const Icon(CupertinoIcons.xmark_circle, color: AppColors.accentOrange),
                      onPressed: () => _rejectRequest(req),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _approveRequest(VenueRequestModel req) async {
    try {
      if (req.type == 'join') {
        await FirebaseFirestore.instance.collection('users').doc(req.userId).update({
          'venueId': req.targetVenueId,
          'role': 'staff',
        });
      } else if (req.type == 'create') {
        final venueRef = FirebaseFirestore.instance.collection('venues').doc();
        final venue = VenueModel(
          id: venueRef.id,
          name: req.newVenueDetails?['name'] ?? 'New Venue',
          address: req.newVenueDetails?['address'] ?? 'Unknown Address',
          ownerId: req.userId,
          ownerEmail: req.userEmail,
          subscription: VenueSubscription(plan: 'free', isPaid: false),
          isActive: true,
          isManuallyBlocked: false,
        );
        await venueRef.set(venue.toMap());
        await FirebaseFirestore.instance.collection('users').doc(req.userId).update({
           'venueId': venueRef.id,
           'role': 'owner',
        });
      }
      await VenueRepository().updateRequestStatus(req.id, 'approved');
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Approved")));
    } catch (e) {
       if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
    }
  }

  Future<void> _rejectRequest(VenueRequestModel req) async {
    try {
      await VenueRepository().updateRequestStatus(req.id, 'rejected');
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Rejected")));
    } catch (e) {
       if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
    }
  }

  Widget _buildVenueCard(VenueModel venue, bool isMobile) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: AppColors.secondarySurface,
            borderRadius: BorderRadius.circular(8),
            image: venue.logoUrl != null 
              ? DecorationImage(image: NetworkImage(venue.logoUrl!), fit: BoxFit.cover)
              : null,
          ),
          child: venue.logoUrl == null 
            ? const Icon(CupertinoIcons.building_2_fill, color: AppColors.premiumGold, size: 20)
            : null,
        ),
        title: Text(venue.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: AppColors.title)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(venue.ownerEmail ?? 'UNCLAIMED', style: const TextStyle(color: AppColors.body, fontSize: 13)),
            const SizedBox(height: 4),
            Row(
              children: [
                _buildStatusBadge(venue),
                const SizedBox(width: 8),
                Text(
                  venue.subscription.expiryDate != null 
                    ? "EXP: ${venue.subscription.expiryDate!.day}/${venue.subscription.expiryDate!.month}/${venue.subscription.expiryDate!.year}"
                    : "PERPETUAL",
                  style: const TextStyle(color: AppColors.tertiary, fontSize: 11, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ],
        ),
        trailing: PopupMenuButton<String>(
          onSelected: (value) {
            if (value == 'edit') {
              Navigator.push(context, MaterialPageRoute(builder: (_) => VenueEditorScreen(venue: venue)));
            } else if (value == 'view') {
              Navigator.push(context, MaterialPageRoute(builder: (_) => VenueDetailView(venue: venue)));
            }
          },
          icon: const Icon(CupertinoIcons.ellipsis_circle, color: AppColors.premiumGold),
          itemBuilder: (context) => [
            const PopupMenuItem(value: 'view', child: Text("View Details")),
            const PopupMenuItem(value: 'edit', child: Text("Edit Venue")),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusBadge(VenueModel venue) {
    String label = "ACTIVE";
    Color color = AppColors.accentGreen;
    if (venue.isManuallyBlocked) {
      label = "BLOCKED";
      color = AppColors.accentOrange;
    } else if (venue.subscription.expiryDate != null && venue.subscription.expiryDate!.isBefore(DateTime.now())) {
      label = "EXPIRED";
      color = AppColors.accentOrange;
    } else if (!venue.subscription.isPaid && venue.subscription.plan != 'free') {
      label = "UNPAID";
      color = AppColors.accentYellow;
    } else if (venue.subscription.expiryDate != null && venue.subscription.expiryDate!.difference(DateTime.now()).inDays < 7) {
      label = "EXPIRING";
      color = AppColors.accentYellow;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(label, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
    );
  }
}
