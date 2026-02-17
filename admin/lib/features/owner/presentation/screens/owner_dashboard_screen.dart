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
import 'package:friendly_code/features/owner/presentation/screens/pos_sticker_screen.dart';
import 'package:url_launcher/url_launcher.dart' as url_launcher;
import 'package:friendly_code/core/services/visit_service.dart';
import 'package:friendly_code/core/models/visit_model.dart';
import 'dart:async';
import 'package:friendly_code/core/services/statistics_service.dart';

class OwnerDashboardScreen extends StatefulWidget {
  const OwnerDashboardScreen({super.key});

  @override
  State<OwnerDashboardScreen> createState() => _OwnerDashboardScreenState();
}

class _OwnerDashboardScreenState extends State<OwnerDashboardScreen> {
  final VenueRepository _venueRepo = VenueRepository();
  bool _isLoadingRole = false;
  String? _lastInitializedVenueId;

  // Visit Listener Logic
  StreamSubscription? _visitSubscription;
  final VisitsService _visitsService = VisitsService();
  final Set<String> _processedVisitIds = {}; // Track IDs we've already seen/handled locally to avoid duplicate popups (though status check handles mostly)

  void _subscribeToVisits(String venueId) {
    _visitSubscription?.cancel();
    _visitSubscription = _visitsService.getVisitsForVenue(venueId).listen((visits) {
      // Filter for PENDING VALIDATION
      // We only want to show popup for 'pending_validation'
      // We also want to avoid showing it if we just showed it (though if it's still pending, maybe we should?)
      // Let's assume one at a time for simplicity or show latest.
      
      final pendingVisits = visits.where((v) => v.status == 'pending_validation').toList();
      
      if (pendingVisits.isNotEmpty) {
        // Show popup for the MOST RECENT one
        final latest = pendingVisits.first; // Timestamp descending from service query
        
        // If we haven't processed this ID yet, OR it's still pending and we are not showing a dialog (complex to track dialog state, but let's try)
        // Simple approach: stick to ID tracking.
        if (!_processedVisitIds.contains(latest.id)) {
           _processedVisitIds.add(latest.id);
           if (mounted) {
             _showRedemptionDialog(latest);
           }
        }
      }
    });
  }

  void _showRedemptionDialog(VisitModel visit) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          backgroundColor: Colors.white,
          title: Row(
            children: [
              const Icon(Icons.celebration, color: AppColors.premiumBurntOrange),
              const SizedBox(width: 12),
              Expanded(child: Text("New Redemption!", style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold))),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                "${visit.guestName} wants to redeem",
                style: const TextStyle(fontSize: 16, color: AppColors.body),
              ),
              const SizedBox(height: 12),
              Text(
                "${visit.discountValue}% OFF",
                style: const TextStyle(fontSize: 48, fontWeight: FontWeight.w900, color: AppColors.title),
              ),
              const SizedBox(height: 12),
              const Text("Ensure the bill reflects this discount before approving.", style: TextStyle(fontSize: 12, color: Colors.grey), textAlign: TextAlign.center),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () async {
                await _visitsService.updateVisitStatus(visit.id, 'rejected');
                if (context.mounted) Navigator.pop(context);
              },
              child: const Text("REJECT", style: TextStyle(color: Colors.grey)),
            ),
            ElevatedButton(
              onPressed: () async {
                // Update stats logic could be here or cloud function, but let's assume direct update for now
                await _visitsService.updateVisitStatus(visit.id, 'approved');
                if (context.mounted) Navigator.pop(context);
                
                // Show success snackbar
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                     const SnackBar(content: Text("Discount Approved!"), backgroundColor: Colors.green),
                  );
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.premiumBurntOrange, foregroundColor: Colors.white),
              child: const Text("APPROVE"),
            ),
          ],
        );
      },
    );
  }

  @override
  void dispose() {
    _visitSubscription?.cancel();
    super.dispose();
  }

  Future<void> _refreshRole() async {
    setState(() => _isLoadingRole = true);
    await Provider.of<RoleProvider>(context, listen: false).refreshRole();
    if (mounted) setState(() => _isLoadingRole = false);
  }

  // State for real-time stats
  VenueStats? _realTimeStats;
  bool _isLoadingStats = false;
  final StatisticsService _statsService = StatisticsService();

  Future<void> _fetchRealStats(String venueId) async {
    if (!mounted) return;
    setState(() => _isLoadingStats = true);
    try {
      final stats = await _statsService.calculateVenueStats(venueId);
      if (mounted) {
        setState(() {
          _realTimeStats = stats;
          _isLoadingStats = false;
        });
      }
    } catch (e) {
      debugPrint("Error fetching stats: $e");
      if (mounted) setState(() => _isLoadingStats = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final roleProvider = Provider.of<RoleProvider>(context);
    final venueIds = roleProvider.venueIds;
    final activeVenueId = roleProvider.venueId;

    // Trigger side effects when active venue changes
    // We use a static variable or a simple check to see if we've initialized for this ID
    if (activeVenueId != null && activeVenueId != _lastInitializedVenueId) {
      _lastInitializedVenueId = activeVenueId;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _subscribeToVisits(activeVenueId);
        _fetchRealStats(activeVenueId);
      });
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
      body: activeVenueId == null 
        ? const Center(child: Text("No venue selected"))
        : StreamBuilder<VenueModel?>(
          stream: _venueRepo.getVenueStream(activeVenueId),
          builder: (context, snapshot) {
            if (snapshot.hasError) return Center(child: Text("Error: ${snapshot.error}", style: const TextStyle(color: Colors.red)));
            if (!snapshot.hasData) return const Center(child: CircularProgressIndicator(color: AppColors.premiumBurntOrange));
            
            final venue = snapshot.data!;
            
            // Side effect: check if we need to refresh stats/visits for this venue
            // This is a bit hacky in build, but since we are in a StatefulWidget and it's a specific ID...
            // better way is using didUpdateWidget or just handle in the selector.
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
          roleProvider.setActiveVenueId(val);
          _subscribeToVisits(val); 
          _fetchRealStats(val);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
           color: Colors.white,
           borderRadius: BorderRadius.circular(20),
           border: Border.all(color: AppColors.premiumGold.withOpacity(0.3)),
           boxShadow: [
             BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4, offset: const Offset(0, 2))
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
    
    return LayoutBuilder(
      builder: (context, constraints) {
        final isMobile = constraints.maxWidth < 600;

        return SingleChildScrollView(
          padding: EdgeInsets.all(isMobile ? 16 : 24),
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
                      fontSize: isMobile ? 24 : null,
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
                    boxShadow: [BoxShadow(color: AppColors.premiumBurntOrange.withOpacity(0.3), blurRadius: 8, offset: const Offset(0, 4))],
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), shape: BoxShape.circle),
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
                crossAxisCount: isMobile ? 2 : 4,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                childAspectRatio: isMobile ? 1.3 : 1.5,
                children: [
                  _buildStatCard("Total Scans", "${_realTimeStats?.totalCheckins ?? venue.stats.totalCheckins}", Icons.qr_code_scanner, AppColors.premiumBurntOrange),
                  _buildStatCard("Active Users (Mo)", "${_realTimeStats?.monthlyActiveUsers ?? 0}", Icons.group_outlined, AppColors.premiumGold),
                  _buildStatCard("Avg Discount", "${(_realTimeStats?.avgDiscount ?? 0).toStringAsFixed(1)}%", Icons.percent, Colors.green),
                  _buildStatCard("Retention Rate", "${(_realTimeStats?.retentionRate ?? 0).toStringAsFixed(1)}%", Icons.loop, Colors.blue),
                ],
              ),
              const SizedBox(height: 32),

              // Guest Segmentation
              Text("Guest Segments", style: const TextStyle(color: AppColors.title, fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              _buildSegmentationRow(_realTimeStats, isMobile),
              const SizedBox(height: 32),
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
      },
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.1)),
        boxShadow: [
          BoxShadow(color: const Color(0xFF4E342E).withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4)),
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
          border: Border.all(color: AppColors.title.withOpacity(0.05)),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 4, offset: const Offset(0, 2))],
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
                  Text(sub, style: TextStyle(color: AppColors.body.withOpacity(0.7), fontSize: 12)),
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
            color: AppColors.title.withOpacity(0.2),
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

  Widget _buildSegmentationRow(VenueStats? stats, bool isMobile) {
    if (stats == null) return const Center(child: CircularProgressIndicator(color: AppColors.premiumBurntOrange));

    if (isMobile) {
      return Column(
        children: [
          Row(
            children: [
              _buildSegmentCard("New", stats.newGuestsCount, Colors.green, "First visit this month"),
              const SizedBox(width: 12),
              _buildSegmentCard("VIP", stats.vipGuestsCount, AppColors.premiumGold, "> 5 visits/mo"),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _buildSegmentCard("Lost", stats.lostGuestsCount, Colors.red, "0 visits this month"),
            ],
          ),
        ],
      );
    }

    return Row(
      children: [
        _buildSegmentCard("New", stats.newGuestsCount, Colors.green, "First visit this month"),
        const SizedBox(width: 12),
        _buildSegmentCard("VIP", stats.vipGuestsCount, AppColors.premiumGold, "> 5 visits/mo"),
        const SizedBox(width: 12),
        _buildSegmentCard("Lost", stats.lostGuestsCount, Colors.red, "0 visits this month"),
      ],
    );
  }

  Widget _buildSegmentCard(String title, int count, Color color, String subtitle) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withOpacity(0.3)),
          boxShadow: [BoxShadow(color: color.withOpacity(0.1), blurRadius: 8, offset: const Offset(0, 4))],
        ),
        child: Column(
          children: [
            Text(title.toUpperCase(), style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 12)),
            const SizedBox(height: 8),
            Text("$count", style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppColors.title)),
             const SizedBox(height: 4),
            Text(subtitle, textAlign: TextAlign.center, style: TextStyle(fontSize: 10, color: AppColors.body.withOpacity(0.7))),
          ],
        ),
      ),
    );
  }
}

