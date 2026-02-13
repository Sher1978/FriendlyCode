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
    return DefaultTabController(
      length: 2,
      child: Scaffold(
      child: Scaffold(
        backgroundColor: AppColors.premiumSand,
        body: Padding(
          padding: const EdgeInsets.all(40.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text("SYSTEM CONTROL", style: TextStyle(color: AppColors.premiumBurntOrange, fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 2)),
                      const SizedBox(height: 4),
                      Text("System Management", style: Theme.of(context).textTheme.displayLarge?.copyWith(color: AppColors.title, fontWeight: FontWeight.w900)),
                    ],
                  ),
                    Row(
                      children: [
                        // Language Switcher
                        IconButton(
                          icon: const Icon(Icons.language, color: AppColors.accentOrange),
                          tooltip: "Switch Language",
                          onPressed: () {
                             final provider = Provider.of<LocaleProvider>(context, listen: false);
                             final newLocale = provider.locale.languageCode == 'en' ? const Locale('ru') : const Locale('en');
                             provider.setLocale(newLocale);
                          },
                        ),
                        const SizedBox(width: 16),
                        OutlinedButton.icon(
                        onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MarketingCampaignScreen())),
                        icon: const Icon(Icons.campaign_outlined, size: 20, color: AppColors.accentOrange),
                        label: const Text("MARKETING CAMPAIGN", style: TextStyle(color: AppColors.accentOrange)),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: AppColors.accentOrange),
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                        ),
                      ),
                      const SizedBox(width: 16),
                      ElevatedButton.icon(
                        onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const VenueEditorScreen())),
                        icon: const Icon(Icons.add, size: 20),
                        label: const Text("CREATE NEW VENUE"),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Tabs
              const TabBar(
                isScrollable: true,
                labelColor: AppColors.deepSeaBlue,
                unselectedLabelColor: Colors.grey,
                indicatorColor: AppColors.accentOrange,
                tabs: [
                  Tab(text: "Approved Venues"),
                  Tab(text: "Pending Requests"),
                ],
              ),
              const SizedBox(height: 24),

              Expanded(
                child: TabBarView(
                  children: [
                    _buildVenueList(),
                    _buildRequestsList(),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildVenueList() {
    return Column(
      children: [
        // Search Bar (Only for venues for now)
        Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(20),
            boxShadow: AppColors.softShadow,
          ),
          child: TextField(
            controller: _searchCtrl,
            decoration: InputDecoration(
              hintText: "Search by name, ID or owner...",
              prefixIcon: const Icon(Icons.search, color: AppColors.accentOrange),
              border: InputBorder.none,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            ),
          ),
        ),
        const SizedBox(height: 32),
        
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

              if (venues.isEmpty) return const Center(child: Text("No venues found."));

              return ListView.builder(
                itemCount: venues.length,
                itemBuilder: (context, index) => _buildVenueCard(venues[index]),
              );
            },
          ),
        ),
      ],
    );
  }

  // --- Requests Logic ---

  Widget _buildRequestsList() {
    return StreamBuilder<List<VenueRequestModel>>(
      stream: VenueRepository().getAllPendingRequestsStream(),
      builder: (context, snapshot) {
        if (snapshot.hasError) return Center(child: Text("Error: ${snapshot.error}"));
        if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());

        final requests = snapshot.data!;
        if (requests.isEmpty) return const Center(child: Text("No pending requests."));

        return ListView.builder(
          itemCount: requests.length,
          itemBuilder: (context, index) {
             final req = requests[index];
             return Card(
               margin: const EdgeInsets.only(bottom: 16),
               child: ListTile(
                 title: Text(req.type == 'join' ? "Join Request: ${req.targetVenueName}" : "Create Request: ${req.newVenueDetails?['name']}"),
                 subtitle: Text("User: ${req.userName} (${req.userEmail})\nDate: ${req.createdAt}"),
                 trailing: Row(
                   mainAxisSize: MainAxisSize.min,
                   children: [
                     IconButton(
                       icon: const Icon(Icons.check, color: Colors.green),
                       onPressed: () => _approveRequest(req),
                     ),
                     IconButton(
                       icon: const Icon(Icons.close, color: Colors.red),
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
        // Update User
        await FirebaseFirestore.instance.collection('users').doc(req.userId).update({
          'venueId': req.targetVenueId,
          'role': 'staff', // Default to staff for join requests? Or 'owner'? Usually staff.
        });
      } else if (req.type == 'create') {
        // Create Venue
        final venueRef = FirebaseFirestore.instance.collection('venues').doc();
        final venue = VenueModel(
          id: venueRef.id,
          name: req.newVenueDetails?['name'] ?? 'New Venue',
          address: req.newVenueDetails?['address'] ?? 'Unknown Address',
          ownerId: req.userId,
          ownerEmail: req.userEmail,
          subscription: VenueSubscription(
             plan: 'free', 
             isPaid: false
          ),
          isActive: true,
          isManuallyBlocked: false,
        );
        
        await venueRef.set(venue.toMap());

        // Update User
        await FirebaseFirestore.instance.collection('users').doc(req.userId).update({
           'venueId': venueRef.id,
           'role': 'owner',
        });
      }

      // Update Request Status
      await VenueRepository().updateRequestStatus(req.id, 'approved');
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Request Approved")));

    } catch (e) {
       if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
    }
  }

  Future<void> _rejectRequest(VenueRequestModel req) async {
    try {
      await VenueRepository().updateRequestStatus(req.id, 'rejected');
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Request Rejected")));
    } catch (e) {
       if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
    }
  }


  Widget _buildVenueCard(VenueModel venue) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: AppColors.softShadow,
        border: Border.all(color: AppColors.title.withValues(alpha: 0.05)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Row(
          children: [
            // Logo
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.circular(16),
                image: venue.logoUrl != null 
                  ? DecorationImage(image: NetworkImage(venue.logoUrl!), fit: BoxFit.cover)
                  : null,
              ),
              child: venue.logoUrl == null 
                ? const Icon(Icons.storefront, color: AppColors.accentOrange, size: 24)
                : null,
            ),
            const SizedBox(width: 24),
            
            // Name & Info
            Expanded(
              flex: 3,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(venue.name, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: AppColors.title)),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.person_outline, size: 14, color: AppColors.body),
                      const SizedBox(width: 4),
                      Text(venue.ownerEmail ?? 'UNCLAIMED', style: TextStyle(fontSize: 13, color: AppColors.body.withValues(alpha: 0.7), fontWeight: FontWeight.w500)),
                    ],
                  ),
                ],
              ),
            ),
            
            // Status Badge
            Expanded(
              flex: 2,
              child: _buildStatusBadge(venue),
            ),
            
            // Sub Info
            Expanded(
              flex: 2,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("EXPIRES", style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: AppColors.body.withValues(alpha: 0.4), letterSpacing: 1)),
                  const SizedBox(height: 4),
                  Text(
                    venue.subscription.expiryDate != null 
                      ? "${venue.subscription.expiryDate!.day.toString().padLeft(2, '0')}.${venue.subscription.expiryDate!.month.toString().padLeft(2, '0')}.${venue.subscription.expiryDate!.year}"
                      : "PERPETUAL",
                    style: const TextStyle(color: AppColors.title, fontWeight: FontWeight.w800, fontSize: 13),
                  ),
                ],
              ),
            ),
            
            // Actions
            PopupMenuButton<String>(
              onSelected: (value) {
                if (value == 'edit') {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => VenueEditorScreen(venue: venue)));
                } else if (value == 'staff') {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => StaffManagementScreen(venueId: venue.id)));
                } else if (value == 'config') {
                  showDialog(
                    context: context,
                    builder: (context) => VenueConfigurator(
                      venue: venue,
                      userRole: UserRole.superAdmin,
                    ),
                  );
                } else if (value == 'manage') {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => VenueDetailView(venue: venue)));
                }
              },
              itemBuilder: (context) => [
                const PopupMenuItem(value: 'edit', child: Text("Edit Details")),
                const PopupMenuItem(value: 'staff', child: Text("Manage Staff")),
                const PopupMenuItem(value: 'config', child: Text("Config Rules")),
                const PopupMenuItem(value: 'manage', child: Text("Advanced Management")),
              ],
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  border: Border.all(color: AppColors.accentOrange.withValues(alpha: 0.3)),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text("OPTIONS", style: TextStyle(color: AppColors.accentOrange, fontWeight: FontWeight.w900, fontSize: 11)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusBadge(VenueModel venue) {
    String label = "ACTIVE";
    Color bg = AppColors.statusActiveBg;
    Color text = AppColors.statusActiveText;

    if (venue.isManuallyBlocked) {
      label = "BLOCKED";
      bg = AppColors.statusBlockedBg;
      text = AppColors.statusBlockedText;
    } else if (venue.subscription.expiryDate != null && venue.subscription.expiryDate!.isBefore(DateTime.now())) {
      label = "EXPIRED";
      bg = AppColors.statusBlockedBg;
      text = AppColors.statusBlockedText;
    } else if (!venue.subscription.isPaid && venue.subscription.plan != 'free') {
      label = "UNPAID";
      bg = AppColors.statusWarningBg;
      text = AppColors.statusWarningText;
    } else if (venue.subscription.expiryDate != null && venue.subscription.expiryDate!.difference(DateTime.now()).inDays < 7) {
      label = "EXPIRING";
      bg = AppColors.statusWarningBg;
      text = AppColors.statusWarningText;
    }

    return UnconstrainedBox(
      alignment: Alignment.centerLeft,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Text(
          label,
          style: TextStyle(color: text, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 0.5),
        ),
      ),
    );
  }
}
