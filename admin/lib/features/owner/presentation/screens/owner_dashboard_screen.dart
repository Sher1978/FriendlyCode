import 'package:flutter/material.dart';
import 'dart:ui';
import 'dart:math';
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
import 'package:friendly_code/features/owner/presentation/screens/guest_list_screen.dart';
import 'package:friendly_code/core/auth/role_provider.dart';
import 'package:friendly_code/core/auth/auth_service.dart';
import 'package:friendly_code/core/services/notification_service.dart';
import 'package:friendly_code/features/owner/presentation/screens/pos_sticker_screen.dart'; // New Import
import 'package:url_launcher/url_launcher.dart' as url_launcher;

class OwnerDashboardScreen extends StatefulWidget {
  const OwnerDashboardScreen({super.key});

  @override
  State<OwnerDashboardScreen> createState() => _OwnerDashboardScreenState();
}

class _OwnerDashboardScreenState extends State<OwnerDashboardScreen> {
  final VenueRepository _venueRepo = VenueRepository();
  String? _selectedVenueId;
  bool _isLoadingRole = false;

  @override
  void initState() {
    super.initState();
    _refreshRole();
  }

  Future<void> _refreshRole() async {
    setState(() => _isLoadingRole = true);
    await Provider.of<RoleProvider>(context, listen: false).refreshRole();
    if (mounted) setState(() => _isLoadingRole = false);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final roleProvider = Provider.of<RoleProvider>(context);
    final venueIds = roleProvider.venueIds;

    // Default to first venue if none selected or selection invalid
    if ((_selectedVenueId == null || !venueIds.contains(_selectedVenueId)) && venueIds.isNotEmpty) {
      _selectedVenueId = venueIds.first;
    }

    if (_isLoadingRole) {
      return const Scaffold(
        backgroundColor: AppColors.premiumSand,
        body: Center(child: CircularProgressIndicator(color: AppColors.premiumBurntOrange)),
      );
    }

    if (venueIds.isEmpty) {
      return Scaffold(
        backgroundColor: AppColors.premiumSand,
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.storefront_outlined, size: 80, color: AppColors.premiumBurntOrange),
                const SizedBox(height: 24),
                Text(
                  "Welcome to Friendly Code",
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    color: AppColors.title,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                const Text(
                  "You don't have any venues registered yet. Start your journey by creating your first venue.",
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 16, height: 1.5, color: AppColors.body),
                ),
                const SizedBox(height: 32),
                ElevatedButton.icon(
                  onPressed: () async {
                    final result = await Navigator.push(context, MaterialPageRoute(builder: (_) => const VenueEditorScreen()));
                    if (result == true && context.mounted) {
                      _refreshRole();
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.premiumBurntOrange,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                  ),
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
      backgroundColor: AppColors.premiumSand,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        title: _buildVenueSelector(venueIds),
        actions: [
          IconButton(
            icon: const Icon(Icons.language, color: AppColors.premiumBurntOrange),
            tooltip: "Switch Language",
            onPressed: () {
               final provider = Provider.of<LocaleProvider>(context, listen: false);
               final newLocale = provider.locale.languageCode == 'en' ? const Locale('ru') : const Locale('en');
               provider.setLocale(newLocale);
            },
          ),
          IconButton(
            icon: const Icon(Icons.add_business_outlined, color: AppColors.premiumBurntOrange),
            tooltip: "Add Venue",
            onPressed: () async {
              final result = await Navigator.push(context, MaterialPageRoute(builder: (_) => const VenueEditorScreen()));
              if (result == true && context.mounted) {
                _refreshRole();
              }
            },
          ),
          const SizedBox(width: 8),
          IconButton(
            icon: const Icon(Icons.person_outline, color: AppColors.title),
            onPressed: () {}, 
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: StreamBuilder<VenueModel?>(
        stream: _venueRepo.getVenueStream(_selectedVenueId!),
        builder: (context, snapshot) {
          if (snapshot.hasError) return Center(child: Text("Error: ${snapshot.error}", style: const TextStyle(color: Colors.red)));
          if (!snapshot.hasData) return const Center(child: CircularProgressIndicator(color: AppColors.premiumBurntOrange));
          
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

  Widget _buildVenueSelector(List<String> venueIds) {
    final l10n = AppLocalizations.of(context)!;
    if (venueIds.length <= 1) {
      return Text(
         l10n.myDashboard,
         style: const TextStyle(color: AppColors.title, fontWeight: FontWeight.bold, fontSize: 18),
      );
    }

    return PopupMenuButton<String>(
      onSelected: (val) {
          setState(() => _selectedVenueId = val);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
           color: Colors.white,
           borderRadius: BorderRadius.circular(20),
           border: Border.all(color: AppColors.premiumGold.withValues(alpha: 0.3)),
           boxShadow: [
             BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4, offset: const Offset(0, 2))
           ]
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.store, size: 18, color: AppColors.premiumBurntOrange),
            const SizedBox(width: 8),
            Text(
              l10n.switchVenue(venueIds.length), 
              style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.title, fontSize: 12, letterSpacing: 0.5)
            ),
            const SizedBox(width: 4),
            const Icon(Icons.arrow_drop_down, color: AppColors.title),
          ],
        ),
      ),
      itemBuilder: (context) => [
        ...venueIds.map((id) => PopupMenuItem(
          value: id,
          child: Text("Venue ID: ...${id.substring(max(0, id.length - 4))}"),
        )),
      ],
    );
  }

  Widget _buildModernDashboard(BuildContext context, VenueModel venue, AppLocalizations l10n) {
    final userEmail = AuthService().currentUser?.email ?? 'User';
    
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Welcome Header
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text("Hello, ${userEmail.split('@').first}", style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.premiumBurntOrange)),
              const SizedBox(height: 4),
              Text(
                venue.name, 
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  color: AppColors.title,
                  fontWeight: FontWeight.w900,
                )
              ),
            ],
          ),
          
          const SizedBox(height: 32),
          
          // Marketing Blast Button (Quick Action)
          InkWell(
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => MarketingBlastScreen(venueId: venue.id))),
            borderRadius: BorderRadius.circular(16),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [AppColors.premiumBurntOrange, AppColors.premiumGold]),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [BoxShadow(color: AppColors.premiumBurntOrange.withValues(alpha: 0.3), blurRadius: 8, offset: const Offset(0, 4))],
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), shape: BoxShape.circle),
                    child: const Icon(Icons.campaign_outlined, color: Colors.white),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(l10n.marketingBlast.toUpperCase(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, letterSpacing: 1.0, fontSize: 12)),
                        const Text("Send offers to your guests", style: TextStyle(color: Colors.white, fontSize: 14)),
                      ],
                    ),
                  ),
                  const Icon(Icons.arrow_forward, color: Colors.white),
                ],
              ),
            ),
          ),

          const SizedBox(height: 32),

          // Stats Grid
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
            childAspectRatio: 1.5,
            children: [
              _buildStatCard("Total Scans", "${venue.stats.totalCheckins}", Icons.qr_code_scanner, AppColors.premiumBurntOrange),
              _buildStatCard("Avg Return Time", "${venue.stats.avgReturnHours.toStringAsFixed(1)}h", Icons.av_timer, AppColors.premiumGold),
            ],
          ),
          const SizedBox(height: 32),

          // QR Card (Premium Look)
          _buildPremiumQRCard(venue),
          const SizedBox(height: 32),

          // Settings Section
          Text(l10n.management, style: const TextStyle(color: AppColors.title, fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          _buildManagementLink(Icons.people_alt_outlined, l10n.guestDatabase, l10n.guestDatabaseSub, () => Navigator.push(context, MaterialPageRoute(builder: (_) => GuestListScreen(venueId: venue.id)))),
          const SizedBox(height: 12),
          _buildManagementLink(Icons.badge_outlined, l10n.staffManagement, l10n.staffManagementSub, () => Navigator.push(context, MaterialPageRoute(builder: (_) => StaffManagementScreen(venueId: venue.id)))),
          const SizedBox(height: 12),
          _buildManagementLink(Icons.storefront_outlined, l10n.venueProfile, l10n.venueProfileSub, () => Navigator.push(context, MaterialPageRoute(builder: (_) => VenueEditorScreen(venue: venue)))),
          const SizedBox(height: 12),
          _buildManagementLink(Icons.print_rounded, l10n.posStickerGenerator, l10n.posStickerSub, () => Navigator.push(context, MaterialPageRoute(builder: (_) => PosStickerScreen(venue: venue)))),
        ],
      ),
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.1)),
        boxShadow: [
          BoxShadow(color: const Color(0xFF4E342E).withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 24),
          const Spacer(),
          Text(value, style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: AppColors.title, height: 1.0)),
          const SizedBox(height: 4),
          Text(label, style: const TextStyle(color: AppColors.body, fontWeight: FontWeight.w600, fontSize: 11)),
        ],
      ),
    );
  }

  Widget _buildPremiumQRCard(VenueModel venue) {
    final l10n = AppLocalizations.of(context)!;
    return Container(
      decoration: BoxDecoration(
        color: AppColors.title, // Deep Brown
        borderRadius: BorderRadius.circular(24),
        boxShadow: AppColors.softShadow,
      ),
      padding: const EdgeInsets.all(24),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
            child: const Icon(Icons.qr_code_2_outlined, size: 56, color: AppColors.title),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(l10n.shareToClients, style: const TextStyle(color: AppColors.premiumGold, fontWeight: FontWeight.w900, fontSize: 10, letterSpacing: 1.5)),
                const SizedBox(height: 4),
                Text(venue.name.toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900)),
                const SizedBox(height: 12),
                SizedBox(
                  height: 36,
                  child: ElevatedButton(
                    onPressed: () {
                      final url = "https://quickchart.io/qr?text=${Uri.encodeComponent('https://www.friendlycode.fun/qr?id=${venue.id}')}&size=1000&format=png&ecLevel=H";
                      url_launcher.launchUrl(Uri.parse(url));
                    },
                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.premiumSand, foregroundColor: AppColors.title, elevation: 0),
                    child: Text(l10n.downloadQr, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
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
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.title.withValues(alpha: 0.05)),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 4, offset: const Offset(0, 2))],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: AppColors.premiumSand, borderRadius: BorderRadius.circular(12)),
              child: Icon(icon, color: AppColors.premiumBurntOrange, size: 20),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: AppColors.title)),
                  Text(sub, style: TextStyle(color: AppColors.body.withValues(alpha: 0.7), fontSize: 12)),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios, size: 12, color: AppColors.premiumGold),
          ],
        ),
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
                      const Text("Subscription Check", style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppColors.title)),
                      const SizedBox(height: 12),
                      const Text("Your venue activity is currently paused. Please review your subscription or contact support.", textAlign: TextAlign.center, style: TextStyle(color: AppColors.body)),
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

