import 'package:flutter/material.dart';
import 'package:friendly_code/l10n/app_localizations.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/models/venue_model.dart';
import '../../../../core/localization/locale_provider.dart';
import 'venue_detail_view.dart';
import '../widgets/venue_configurator.dart';
import '../../../../features/web/presentation/layout/admin_shell.dart';

class SuperAdminDashboard extends StatefulWidget {
  const SuperAdminDashboard({super.key});

  @override
  State<SuperAdminDashboard> createState() => _SuperAdminDashboardState();
}

class _SuperAdminDashboardState extends State<SuperAdminDashboard> {
  final TextEditingController _searchCtrl = TextEditingController();
  List<VenueModel> _filteredVenues = [];

  // Mock Data
  final List<VenueModel> _mockVenues = [
    VenueModel(
      id: '1',
      name: 'Safari Lounge',
      description: 'Premium cocktails & safari vibes.',
      ownerEmail: 'safari@example.com',
      category: 'Lounge',
      address: 'Dubai Marina, Pier 7',
      tiers: [],
      subscription: VenueSubscription(
        plan: 'Premium', 
        isPaid: true,
        expiryDate: DateTime.now().add(const Duration(days: 45)),
      ),
      stats: VenueStats(avgReturnHours: 3.5, totalCheckins: 1540),
    ),
    VenueModel(
      id: '2',
      name: 'Burger Kingdom',
      description: 'The best burgers in the desert.',
      ownerEmail: 'burger@example.com',
      category: 'Fast Food',
      address: 'Downtown Dubai, Mall of Emirates',
      isActive: false, 
      tiers: [],
      subscription: VenueSubscription(
        plan: 'Free', 
        isPaid: false,
        expiryDate: DateTime.now().subtract(const Duration(days: 2)),
      ),
      stats: VenueStats(avgReturnHours: 5.0, totalCheckins: 45),
    ),
    VenueModel(
      id: '3',
      name: 'The Tea House',
      description: 'Traditional tea and pastries.',
      ownerEmail: 'tea@example.com',
      category: 'Cafe',
      address: 'Old Dubai, Al Seef',
      manualBlock: true,
      tiers: [],
      subscription: VenueSubscription(
        plan: 'Standard', 
        isPaid: true,
        expiryDate: DateTime.now().add(const Duration(days: 10)),
      ),
      stats: VenueStats(avgReturnHours: 2.1, totalCheckins: 890),
    ),
  ];

  @override
  void initState() {
    super.initState();
    _filteredVenues = _mockVenues;
    _searchCtrl.addListener(_onSearchChanged);
  }

  void _onSearchChanged() {
    final query = _searchCtrl.text.toLowerCase();
    setState(() {
      _filteredVenues = _mockVenues.where((v) {
        return v.name.toLowerCase().contains(query) ||
               v.id.toLowerCase().contains(query) ||
               v.ownerEmail.toLowerCase().contains(query);
      }).toList();
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(32.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "Venue Management",
                style: TextStyle(
                  color: AppColors.title,
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.5,
                ),
              ),
              ElevatedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.add, size: 18),
                label: const Text("Create Venue"),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.accentTeal,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  elevation: 0,
                ),
              ),
            ],
          ),
          const SizedBox(height: 32),
          
          // Wide Data Table
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: SizedBox(
                width: 1000,
                child: Column(
                  children: [
                    // Table Header
                    _buildTableHeader(),
                    const Divider(height: 1),
                    // Table Content
                    Expanded(
                      child: ListView.builder(
                        itemCount: _filteredVenues.length,
                        itemBuilder: (context, index) => _buildVenueRow(_filteredVenues[index]),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTableHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
      color: Colors.black.withValues(alpha: 0.02),
      child: Row(
        children: const [
          Expanded(flex: 3, child: Text("VENUE IDENTITY", style: _headerStyle)),
          Expanded(flex: 2, child: Text("STATUS", style: _headerStyle)),
          Expanded(flex: 2, child: Text("SUBSCRIPTION END", style: _headerStyle)),
          Expanded(flex: 1, child: Text("SCANS", style: _headerStyle)),
          Expanded(flex: 1, child: Text("ACTIONS", style: _headerStyle)),
        ],
      ),
    );
  }

  Widget _buildVenueRow(VenueModel venue) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Color(0xFFF3F4F6))),
      ),
      child: Row(
        children: [
          // Identity
          Expanded(
            flex: 3,
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.background,
                    borderRadius: BorderRadius.circular(8),
                    image: venue.coverPhotoUrl != null 
                      ? DecorationImage(image: NetworkImage(venue.coverPhotoUrl!), fit: BoxFit.cover)
                      : null,
                  ),
                  child: venue.coverPhotoUrl == null 
                    ? const Icon(Icons.storefront, color: AppColors.accentTeal, size: 20)
                    : null,
                ),
                const SizedBox(width: 16),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(venue.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: AppColors.title)),
                    Text(venue.ownerEmail, style: const TextStyle(fontSize: 13, color: AppColors.body)),
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
          
          // Sub End
          Expanded(
            flex: 2,
            child: Text(
              venue.subscription.expiryDate != null 
                ? "${venue.subscription.expiryDate!.day.toString().padLeft(2, '0')}.${venue.subscription.expiryDate!.month.toString().padLeft(2, '0')}.${venue.subscription.expiryDate!.year}"
                : "N/A",
              style: const TextStyle(color: AppColors.title, fontWeight: FontWeight.w500),
            ),
          ),
          
          // Stats
          Expanded(
            flex: 1,
            child: Text(
              venue.stats.totalCheckins.toString(),
              style: const TextStyle(color: AppColors.title, fontWeight: FontWeight.w600),
            ),
          ),
          
          // Actions
          Expanded(
            flex: 1,
            child: TextButton(
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (context) => VenueConfigurator(
                    venue: venue,
                    userRole: UserRole.superAdmin,
                  ),
                );
              },
              child: const Text("Edit", style: TextStyle(color: AppColors.accentIndigo, fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(VenueModel venue) {
    String label = "Active";
    Color bg = AppColors.statusActiveBg;
    Color text = AppColors.statusActiveText;

    if (venue.manualBlock) {
      label = "Blocked";
      bg = AppColors.statusBlockedBg;
      text = AppColors.statusBlockedText;
    } else if (venue.subscription.expiryDate != null && venue.subscription.expiryDate!.isBefore(DateTime.now())) {
      label = "Expired";
      bg = AppColors.statusBlockedBg;
      text = AppColors.statusBlockedText;
    } else if (venue.subscription.expiryDate != null && venue.subscription.expiryDate!.difference(DateTime.now()).inDays < 7) {
      label = "Expiring Soon";
      bg = AppColors.statusWarningBg;
      text = AppColors.statusWarningText;
    }

    return UnconstrainedBox(
      alignment: Alignment.centerLeft,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          label,
          style: TextStyle(color: text, fontSize: 12, fontWeight: FontWeight.w700),
        ),
      ),
    );
  }

  static const TextStyle _headerStyle = TextStyle(
    fontSize: 11,
    fontWeight: FontWeight.w700,
    color: Color(0xFF9CA3AF),
    letterSpacing: 0.5,
  );
}
