
import 'package:flutter/material.dart';
import 'package:friendly_code/l10n/app_localizations.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/features/admin/presentation/screens/venue_detail_view.dart';
import 'package:friendly_code/features/admin/presentation/screens/venue_editor_screen.dart';
import 'package:friendly_code/features/admin/presentation/screens/marketing_campaign_screen.dart';
import 'package:friendly_code/core/auth/role_provider.dart';
import 'package:friendly_code/core/models/venue_request_model.dart';
import 'package:friendly_code/core/data/venue_repository.dart';
import 'package:friendly_code/core/services/venue_service.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:provider/provider.dart';
import 'package:friendly_code/core/localization/locale_provider.dart';
import 'package:friendly_code/features/owner/presentation/screens/flyer_generator_screen.dart';
import 'package:friendly_code/features/admin/presentation/screens/global_email_settings_screen.dart';
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
        final isWide = constraints.maxWidth > 900;
        final horizontalPadding = isWide ? constraints.maxWidth * 0.1 : 16.0;

        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: _buildAppBar(context),
          body: SingleChildScrollView(
            padding: EdgeInsets.symmetric(horizontal: horizontalPadding, vertical: 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Phase 1: Network Vitals (JTBD: Monitoring Health)
                _buildSectionHeader("NETWORK VITALS", CupertinoIcons.graph_square_fill),
                const SizedBox(height: 16),
                _buildVitalsGrid(isWide),
                
                const SizedBox(height: 48),

                // Phase 2: Growth Queue (JTBD: Facilitating Onboarding)
                _buildSectionHeader("GROWTH QUEUE", CupertinoIcons.person_add),
                const SizedBox(height: 16),
                _buildRequestsQueue(),

                const SizedBox(height: 48),

                // Phase 3: Strategic Controls (JTBD: Global Management)
                _buildSectionHeader("STRATEGIC CONTROLS", CupertinoIcons.command),
                const SizedBox(height: 16),
                _buildStrategicGrid(isWide),

                const SizedBox(height: 48),

                // Phase 4: Venue Repository (JTBD: Resource Management)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildSectionHeader("VENUE REPOSITORY", CupertinoIcons.building_2_fill),
                    _buildCompactSearch(),
                  ],
                ),
                const SizedBox(height: 16),
                _buildVenueListGrid(isWide),
                
                const SizedBox(height: 40),
              ],
            ),
          ),
        );
      },
    );
  }

  PreferredSizeWidget _buildAppBar(BuildContext context) {
    return AppBar(
      backgroundColor: Colors.transparent,
      elevation: 0,
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("NETWORK COMMAND", style: TextStyle(color: AppColors.body, fontSize: 12, letterSpacing: 2, fontWeight: FontWeight.bold)),
          Text("SuperAdmin Dashboard", style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w900, color: AppColors.title)),
        ],
      ),
      actions: [
        _buildLocaleSwitcher(context),
        const SizedBox(width: 8),
        IconButton(
          onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const VenueEditorScreen())),
          icon: const Icon(CupertinoIcons.plus_circle_fill, color: AppColors.accentGreen, size: 28),
        ),
        const SizedBox(width: 16),
      ],
    );
  }

  Widget _buildLocaleSwitcher(BuildContext context) {
    final provider = Provider.of<LocaleProvider>(context);
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white10),
      ),
      child: IconButton(
        icon: Text(provider.locale.languageCode.toUpperCase(), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
        onPressed: () => provider.toggleLocale(),
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, color: AppColors.premiumGold, size: 18),
        const SizedBox(width: 12),
        Text(title, style: const TextStyle(color: AppColors.premiumGold, fontWeight: FontWeight.w800, letterSpacing: 1.5, fontSize: 13)),
      ],
    );
  }

  Widget _buildVitalsGrid(bool isWide) {
    return StreamBuilder<List<VenueModel>>(
      stream: _venuesService.getAllVenues(),
      builder: (context, snapshot) {
        final venues = snapshot.data ?? [];
        final activeCount = venues.where((v) => v.isActive && !v.isManuallyBlocked).length;
        
        return GridView.count(
          crossAxisCount: isWide ? 4 : 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 16,
          crossAxisSpacing: 16,
          childAspectRatio: 1.8,
          children: [
            _buildVitalCard("ACTIVE NODES", activeCount.toString(), CupertinoIcons.building_2_fill, AppColors.accentGreen),
            _buildVitalCard("SYSTEM HEALTH", "99.9%", CupertinoIcons.infinite, AppColors.accentBlue),
            _buildVitalCard("PENDING", "...", CupertinoIcons.time, AppColors.accentOrange),
            _buildVitalCard("REVENUE PULSE", "STABLE", CupertinoIcons.chart_bar_fill, AppColors.premiumGold),
          ],
        );
      }
    );
  }

  Widget _buildVitalCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: const TextStyle(color: AppColors.body, fontSize: 10, fontWeight: FontWeight.bold)),
              Icon(icon, color: color.withOpacity(0.5), size: 16),
            ],
          ),
          Text(value, style: const TextStyle(color: AppColors.title, fontSize: 24, fontWeight: FontWeight.w900)),
        ],
      ),
    );
  }

  Widget _buildRequestsQueue() {
    return StreamBuilder<List<VenueRequestModel>>(
      stream: VenueRepository().getAllPendingRequestsStream(),
      builder: (context, snapshot) {
        final requests = snapshot.data ?? [];
        if (requests.isEmpty) {
          return Container(
            width: double.infinity,
            padding: const EdgeInsets.all(40),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.white.withOpacity(0.03)),
            ),
            child: const Center(child: Text("All onboarding tickets cleared.", style: TextStyle(color: AppColors.tertiary))),
          );
        }

        return Column(
          children: requests.map((req) => _buildRequestTile(req)).toList(),
        );
      },
    );
  }

  Widget _buildRequestTile(VenueRequestModel req) {
    final title = req.type == 'join' ? "Staff Expansion" : "New Node Creation";
    final sub = "${req.userName} -> ${req.type == 'join' ? req.targetVenueName : req.newVenueDetails?['name']}";
    
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white10),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: AppColors.accentBlue.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
            child: const Icon(CupertinoIcons.sparkles, color: AppColors.accentBlue, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(color: AppColors.title, fontWeight: FontWeight.bold)),
                Text(sub, style: const TextStyle(color: AppColors.body, fontSize: 12)),
              ],
            ),
          ),
          Row(
            children: [
              IconButton(onPressed: () => _approveRequest(req), icon: const Icon(CupertinoIcons.check_mark_circled, color: AppColors.accentGreen)),
              IconButton(onPressed: () => _rejectRequest(req), icon: const Icon(CupertinoIcons.xmark_circle, color: AppColors.accentOrange)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStrategicGrid(bool isWide) {
    return GridView.count(
      crossAxisCount: isWide ? 3 : 1,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 16,
      crossAxisSpacing: 16,
      childAspectRatio: isWide ? 2.5 : 3.5,
      children: [
        _buildStrategicCard("Campaign Control", "Global marketing pulse", CupertinoIcons.speaker_2_fill, AppColors.accentBlue, () {
           Navigator.push(context, MaterialPageRoute(builder: (_) => const MarketingCampaignScreen()));
        }),
        _buildStrategicCard("Asset Forge", "Print design generator", CupertinoIcons.doc_plaintext, AppColors.accentOrange, () {
           Navigator.push(context, MaterialPageRoute(builder: (_) => const FlyerGeneratorScreen()));
        }),
        _buildStrategicCard("Ops Config", "Email & Notification hub", CupertinoIcons.gear, AppColors.premiumGold, () {
           Navigator.push(context, MaterialPageRoute(builder: (_) => const GlobalEmailSettingsScreen()));
        }),
      ],
    );
  }

  Widget _buildStrategicCard(String title, String sub, IconData icon, Color color, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white.withOpacity(0.05)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: color.withOpacity(0.1), shape: BoxShape.circle),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(color: AppColors.title, fontWeight: FontWeight.w900, fontSize: 16)),
                  Text(sub, style: const TextStyle(color: AppColors.body, fontSize: 12)),
                ],
              ),
            ),
            const Icon(CupertinoIcons.chevron_right, color: AppColors.tertiary, size: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildCompactSearch() {
    return Container(
      width: 260,
      height: 36,
      decoration: BoxDecoration(
        color: AppColors.secondarySurface,
        borderRadius: BorderRadius.circular(8),
      ),
      child: TextField(
        controller: _searchCtrl,
        style: const TextStyle(color: AppColors.title, fontSize: 13),
        decoration: const InputDecoration(
          hintText: "Quick node search...",
          hintStyle: TextStyle(color: AppColors.tertiary),
          prefixIcon: Icon(CupertinoIcons.search, color: AppColors.tertiary, size: 14),
          border: InputBorder.none,
          contentPadding: EdgeInsets.only(bottom: 12),
        ),
      ),
    );
  }

  Widget _buildVenueListGrid(bool isWide) {
    return StreamBuilder<List<VenueModel>>(
      stream: _venuesService.getAllVenues(),
      builder: (context, snapshot) {
        final query = _searchCtrl.text.toLowerCase();
        final venues = (snapshot.data ?? []).where((v) {
          return v.name.toLowerCase().contains(query) || v.ownerEmail!.toLowerCase().contains(query);
        }).toList();

        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: venues.length,
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: isWide ? 3 : 1,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 3.5,
          ),
          itemBuilder: (context, index) => _buildVenueCard(venues[index]),
        );
      },
    );
  }

  Widget _buildVenueCard(VenueModel venue) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.04)),
      ),
      child: ListTile(
        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => VenueDetailView(venue: venue))),
        leading: Container(
          width: 40, height: 40,
          decoration: BoxDecoration(color: AppColors.secondarySurface, borderRadius: BorderRadius.circular(8)),
          child: const Icon(CupertinoIcons.building_2_fill, color: AppColors.premiumGold, size: 18),
        ),
        title: Text(venue.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.title, fontWeight: FontWeight.bold, fontSize: 14)),
        subtitle: Text(venue.ownerEmail ?? 'UNCLAIMED', style: const TextStyle(color: AppColors.body, fontSize: 11)),
        trailing: const Icon(CupertinoIcons.chevron_right, color: AppColors.tertiary, size: 14),
      ),
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
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Signal processed: Approved")));
    } catch (e) {
       if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
    }
  }

  Future<void> _rejectRequest(VenueRequestModel req) async {
    try {
      await VenueRepository().updateRequestStatus(req.id, 'rejected');
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Signal processed: Rejected")));
    } catch (e) {
       if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
    }
  }
}
