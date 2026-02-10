import 'package:flutter/material.dart';
import 'package:friendly_code/l10n/app_localizations.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/features/admin/presentation/screens/venue_detail_view.dart';
import 'package:friendly_code/features/admin/presentation/widgets/venue_configurator.dart';
import 'package:friendly_code/features/admin/presentation/screens/venue_editor_screen.dart';
import 'package:friendly_code/features/admin/presentation/screens/staff_management_screen.dart';
import 'package:friendly_code/core/auth/role_provider.dart';
import 'package:friendly_code/core/services/venue_service.dart';

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
                onPressed: () {
                   Navigator.push(context, MaterialPageRoute(builder: (_) => const VenueEditorScreen()));
                },
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
                      child: StreamBuilder<List<VenueModel>>(
                        stream: _venuesService.getAllVenues(),
                        builder: (context, snapshot) {
                          if (snapshot.hasError) return Center(child: Text("Error: ${snapshot.error}"));
                          if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());

                          final query = _searchCtrl.text.toLowerCase();
                          final venues = snapshot.data!.where((v) {
                            return v.name.toLowerCase().contains(query) ||
                                   v.id.toLowerCase().contains(query) ||
                                   v.ownerId.toLowerCase().contains(query);
                          }).toList();

                          if (venues.isEmpty) return const Center(child: Text("No venues found."));

                          return ListView.builder(
                            itemCount: venues.length,
                            itemBuilder: (context, index) => _buildVenueRow(venues[index]),
                          );
                        },
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
                    image: venue.logoUrl != null 
                      ? DecorationImage(image: NetworkImage(venue.logoUrl!), fit: BoxFit.cover)
                      : null,
                  ),
                  child: venue.logoUrl == null 
                    ? const Icon(Icons.storefront, color: AppColors.accentTeal, size: 20)
                    : null,
                ),
                const SizedBox(width: 16),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(venue.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: AppColors.title)),
                    Text(venue.ownerId, style: const TextStyle(fontSize: 13, color: AppColors.body)),
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
              venue.subscriptionEndDate != null 
                ? "${venue.subscriptionEndDate!.day.toString().padLeft(2, '0')}.${venue.subscriptionEndDate!.month.toString().padLeft(2, '0')}.${venue.subscriptionEndDate!.year}"
                : "N/A",
              style: const TextStyle(color: AppColors.title, fontWeight: FontWeight.w500),
            ),
          ),
          
          // Stats
          Expanded(
            flex: 1,
            child: Text(
              "-", // Stats removed from model
              style: const TextStyle(color: AppColors.title, fontWeight: FontWeight.w600),
            ),
          ),
          
          // Actions
          Expanded(
            flex: 1,
            child: PopupMenuButton<String>(
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
                }
              },
              itemBuilder: (context) => [
                const PopupMenuItem(value: 'edit', child: Text("Edit Details")),
                const PopupMenuItem(value: 'staff', child: Text("Manage Staff")),
                const PopupMenuItem(value: 'config', child: Text("Config Rules")),
              ],
              child: const Text("Options", style: TextStyle(color: AppColors.accentIndigo, fontWeight: FontWeight.bold)),
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

    if (venue.isManuallyBlocked) {
      label = "Blocked";
      bg = AppColors.statusBlockedBg;
      text = AppColors.statusBlockedText;
    } else if (venue.subscriptionEndDate != null && venue.subscriptionEndDate!.isBefore(DateTime.now())) {
      label = "Expired";
      bg = AppColors.statusBlockedBg;
      text = AppColors.statusBlockedText;
    } else if (venue.subscriptionEndDate != null && venue.subscriptionEndDate!.difference(DateTime.now()).inDays < 7) {
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
