import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:ui';
import 'dart:math';
import 'package:friendly_code/l10n/app_localizations.dart';
import 'package:provider/provider.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/data/venue_repository.dart';
import 'package:friendly_code/core/localization/locale_provider.dart';
import 'package:friendly_code/features/owner/presentation/screens/rules_config_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/marketing_blast_screen.dart';
import 'package:friendly_code/features/admin/presentation/screens/venue_editor_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/guest_list_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/venue_staff_screen.dart';
import 'package:friendly_code/core/auth/role_provider.dart';
import 'package:friendly_code/core/auth/auth_service.dart';
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

class _OwnerDashboardScreenState extends State<OwnerDashboardScreen> with SingleTickerProviderStateMixin {
  final VenueRepository _venueRepo = VenueRepository();
  bool _isLoadingRole = false;
  String? _lastInitializedVenueId;

  // Visit Listener Logic
  StreamSubscription? _visitSubscription;
  final VisitsService _visitsService = VisitsService();
  final Set<String> _processedVisitIds = {};

  // Live pending visits for the banner
  List<VisitModel> _pendingVisits = [];

  // Pulse animation for redemption banner
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  void _subscribeToVisits(String venueId) {
    _visitSubscription?.cancel();
    _visitSubscription = _visitsService.getVisitsForVenue(venueId).listen((visits) {
      final pendingVisits = visits.where((v) => v.status == 'pending_validation').toList();

      if (mounted) {
        setState(() => _pendingVisits = pendingVisits);
      }

      if (pendingVisits.isNotEmpty) {
        final latest = pendingVisits.first;
        if (!_processedVisitIds.contains(latest.id)) {
          _processedVisitIds.add(latest.id);
          if (mounted) _showRedemptionDialog(latest);
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
                await _visitsService.updateVisitStatus(visit.id, 'approved');
                if (context.mounted) Navigator.pop(context);
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
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);
    _pulseAnimation = Tween<double>(begin: 0.85, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _visitSubscription?.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _refreshRole() async {
    setState(() => _isLoadingRole = true);
    await Provider.of<RoleProvider>(context, listen: false).refreshRole();
    if (mounted) setState(() => _isLoadingRole = false);
  }

  VenueStats? _realTimeStats;
  final StatisticsService _statsService = StatisticsService();

  Future<void> _fetchRealStats(String venueId) async {
    if (!mounted) return;
    try {
      final stats = await _statsService.calculateVenueStats(venueId);
      if (mounted) {
        setState(() {
          _realTimeStats = stats;
        });
      }
    } catch (e) {
      debugPrint("Error fetching stats: $e");
    }
  }

  @override
  Widget build(BuildContext context) {
    final roleProvider = Provider.of<RoleProvider>(context);
    final venueIds = roleProvider.venueIds;
    final activeVenueId = roleProvider.venueId;

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

    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      backgroundColor: AppColors.premiumSand,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        title: _buildVenueSelector(venueIds, roleProvider),
        actions: [
          IconButton(
            icon: const Icon(Icons.language, color: AppColors.premiumBurntOrange),
            tooltip: "Switch Language",
            onPressed: () {
               final provider = Provider.of<LocaleProvider>(context, listen: false);
               final nextLocale = provider.locale.languageCode == 'en'
                   ? const Locale('ru')
                   : (provider.locale.languageCode == 'ru' ? const Locale('vi') : const Locale('en'));
               provider.setLocale(nextLocale);
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

  Widget _buildVenueSelector(List<String> venueIds, RoleProvider roleProvider) {
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
          child: FutureBuilder<VenueModel?>(
            future: _venueRepo.getVenueById(id),
            builder: (context, snapshot) {
              if (snapshot.hasError) return const Text("Error", style: TextStyle(color: Colors.red));
              if (snapshot.connectionState == ConnectionState.waiting) {
                return Text("...${id.substring(max(0, id.length - 4))}");
              }
              final name = snapshot.data?.name ?? "Venue ($id)";
              return Text(name, style: const TextStyle(fontWeight: FontWeight.w600));
            }
          ),
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

              // ─── J1: Header + Subscription Badge ───────────────────────
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l10n.hello(userEmail.split('@').first),
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.premiumBurntOrange),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          venue.name,
                          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                            color: AppColors.title,
                            fontWeight: FontWeight.w900,
                            fontSize: isMobile ? 24 : null,
                          ),
                        ),
                      ],
                    ),
                  ),
                  _buildSubscriptionBadge(venue),
                ],
              ),

              const SizedBox(height: 20),

              // ─── J2: Live Redemption Banner ────────────────────────────
              if (_pendingVisits.isNotEmpty) ...[
                _buildLiveRedemptionBanner(_pendingVisits),
                const SizedBox(height: 20),
              ],

              // ─── J1: Stats Grid ────────────────────────────────────────
              GridView.count(
                crossAxisCount: isMobile ? 2 : 4,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                childAspectRatio: isMobile ? 1.3 : 1.5,
                children: [
                  _buildStatCard("Total Scans", "${_realTimeStats?.totalCheckins ?? venue.stats.totalCheckins}", Icons.qr_code_scanner, AppColors.premiumBurntOrange),
                  _buildStatCard("Active (Mo)", "${_realTimeStats?.monthlyActiveUsers ?? 0}", Icons.group_outlined, AppColors.premiumGold),
                  _buildStatCard("Avg Discount", "${(_realTimeStats?.avgDiscount ?? 0).toStringAsFixed(1)}%", Icons.percent, Colors.green),
                  _buildStatCard("Retention", "${(_realTimeStats?.retentionRate ?? 0).toStringAsFixed(1)}%", Icons.loop, Colors.blue),
                ],
              ),

              const SizedBox(height: 24),

              // ─── J1: Guest Segments ────────────────────────────────────
              Text("Guest Segments", style: const TextStyle(color: AppColors.title, fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              _buildSegmentationRow(_realTimeStats ?? venue.stats, isMobile),

              const SizedBox(height: 24),

              // ─── J3: Loyalty Rules Quick Card ─────────────────────────
              _buildLoyaltyRulesCard(venue),

              const SizedBox(height: 24),

              // ─── J3: Management Quick-Actions ─────────────────────────
              Text(l10n.management, style: const TextStyle(color: AppColors.title, fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              _buildManagementLink(Icons.people_alt_outlined, l10n.guestDatabase, l10n.guestDatabaseSub, () => Navigator.push(context, MaterialPageRoute(builder: (_) => GuestListScreen(venueId: venue.id)))),
              const SizedBox(height: 10),
              _buildManagementLink(Icons.storefront_outlined, l10n.venueProfile, l10n.venueProfileSub, () => Navigator.push(context, MaterialPageRoute(builder: (_) => VenueEditorScreen(venue: venue)))),
              const SizedBox(height: 10),
              _buildManagementLink(Icons.manage_accounts_outlined, "Staff Management", "Manage venue staff", () => Navigator.push(context, MaterialPageRoute(builder: (_) => VenueStaffScreen(venueId: venue.id)))),

              const SizedBox(height: 24),

              // ─── J4: QR Card ───────────────────────────────────────────
              _buildPremiumQRCard(venue),

              const SizedBox(height: 16),

              // ─── J4: Marketing Blast (secondary CTA) ──────────────────
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

              const SizedBox(height: 10),

              // ─── J4: POS Sticker ───────────────────────────────────────
              _buildManagementLink(Icons.print_rounded, l10n.posStickerGenerator, l10n.posStickerSub, () => Navigator.push(context, MaterialPageRoute(builder: (_) => PosStickerScreen(venue: venue)))),

              const SizedBox(height: 24),
            ],
          ),
        );
      },
    );
  }

  // ─── NEW: Subscription Badge ─────────────────────────────────────────────
  Widget _buildSubscriptionBadge(VenueModel venue) {
    final l10n = AppLocalizations.of(context)!;
    final expiry = venue.subscription.expiryDate;
    final now = DateTime.now();

    Color badgeColor;
    String badgeText;
    IconData badgeIcon;

    if (expiry == null || expiry.isBefore(now)) {
      badgeColor = Colors.red;
      badgeText = l10n.expired;
      badgeIcon = Icons.error_outline;
    } else {
      final daysLeft = expiry.difference(now).inDays;
      if (daysLeft <= 7) {
        badgeColor = const Color(0xFFFF9800);
        badgeText = l10n.subscriptionDaysLeft(max(1, daysLeft));
        badgeIcon = Icons.warning_amber_rounded;
      } else {
        badgeColor = Colors.green;
        badgeText = l10n.statusActive;
        badgeIcon = Icons.check_circle_outline;
      }
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: badgeColor.withOpacity(0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: badgeColor.withOpacity(0.4)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(badgeIcon, size: 14, color: badgeColor),
          const SizedBox(width: 6),
          Text(
            badgeText,
            style: TextStyle(color: badgeColor, fontWeight: FontWeight.bold, fontSize: 12),
          ),
        ],
      ),
    );
  }

  // ─── NEW: Live Redemption Banner ─────────────────────────────────────────
  Widget _buildLiveRedemptionBanner(List<VisitModel> pending) {
    final l10n = AppLocalizations.of(context)!;
    final latest = pending.first;
    return AnimatedBuilder(
      animation: _pulseAnimation,
      builder: (context, child) => Transform.scale(
        scale: _pulseAnimation.value,
        child: child,
      ),
      child: GestureDetector(
        onTap: () => _showRedemptionDialog(latest),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFFFFF8E1),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFFFB300), width: 1.5),
            boxShadow: [
              BoxShadow(color: const Color(0xFFFFB300).withOpacity(0.3), blurRadius: 12, offset: const Offset(0, 4)),
            ],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFB300).withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.person_pin_circle_outlined, color: Color(0xFFE65100), size: 24),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.guestWaiting,
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Color(0xFFE65100), letterSpacing: 1.2),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      "${latest.guestName} — ${latest.discountValue}% OFF",
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF4E342E)),
                    ),
                  ],
                ),
              ),
              if (pending.length > 1)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFB300),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    "+${pending.length - 1}",
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                ),
              const SizedBox(width: 8),
              const Icon(Icons.arrow_forward_ios, size: 14, color: Color(0xFFE65100)),
            ],
          ),
        ),
      ),
    );
  }

  // ─── NEW: Loyalty Rules Quick Card ──────────────────────────────────────
  Widget _buildLoyaltyRulesCard(VenueModel venue) {
    final l10n = AppLocalizations.of(context)!;
    final config = venue.loyaltyConfig;
    return GestureDetector(
      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => RulesConfigScreen(venueId: venue.id))),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.premiumBurntOrange.withOpacity(0.15)),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8, offset: const Offset(0, 4))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: AppColors.premiumSand, borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.tune_rounded, color: AppColors.premiumBurntOrange, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(l10n.loyaltyRules, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: AppColors.title)),
                      const Text("Active Loyalty Tiers & Decay", style: TextStyle(color: AppColors.body, fontSize: 12)),
                    ],
                  ),
                ),
                const Icon(Icons.arrow_forward_ios, size: 12, color: AppColors.premiumGold),
              ],
            ),
            const SizedBox(height: 16),
            // Tier preview
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildTierPill(l10n.baseTier, "${config.percBase}%", Colors.orange),
                  ...config.decayStages.asMap().entries.map((entry) {
                    final index = entry.key + 1;
                    final stage = entry.value;
                    return Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 8),
                          child: Icon(Icons.arrow_forward, size: 14, color: AppColors.body),
                        ),
                        _buildTierPill("Decay $index (${stage.days}d)", "${stage.discount}%", Colors.blue),
                      ],
                    );
                  }),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 8),
                    child: Icon(Icons.arrow_forward, size: 14, color: AppColors.body),
                  ),
                  _buildTierPill("${l10n.vipTier} (${config.vipWindowDays}d)", "${config.percVip}%", Colors.green),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTierPill(String label, String value, Color color) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: color.withOpacity(0.3)),
          ),
          child: Text(value, style: TextStyle(fontWeight: FontWeight.w900, color: color, fontSize: 18)),
        ),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(fontSize: 10, color: AppColors.body, fontWeight: FontWeight.w600)),
      ],
    );
  }

  // ─── Existing Widgets (unchanged) ────────────────────────────────────────

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
    final venueUrl = "https://www.friendlycode.fun/qr?id=${venue.id}";
    return Container(
      decoration: BoxDecoration(
        color: AppColors.title,
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
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.white.withOpacity(0.2)),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          venueUrl,
                          style: const TextStyle(color: Colors.white70, fontSize: 11),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      InkWell(
                        onTap: () async {
                           await Clipboard.setData(ClipboardData(text: venueUrl));
                           if (context.mounted) {
                             ScaffoldMessenger.of(context).showSnackBar(
                               const SnackBar(content: Text('Link copied to clipboard!'), behavior: SnackBarBehavior.floating),
                             );
                           }
                        },
                        child: const Icon(Icons.copy, color: AppColors.premiumGold, size: 16),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 36,
                  child: ElevatedButton(
                    onPressed: () {
                      final url = "https://quickchart.io/qr?text=${Uri.encodeComponent(venueUrl)}&size=1000&format=png&ecLevel=H";
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
                      const Text("Your venue activity is currently paused. Please review your subscription or contact support at friiendlycode@gmail.com.", textAlign: TextAlign.center, style: TextStyle(color: AppColors.body)),
                      const SizedBox(height: 32),
                      ElevatedButton(
                        onPressed: () async {
                          final uri = Uri.parse("mailto:friiendlycode@gmail.com?subject=Subscription Support Request");
                          if (await url_launcher.canLaunchUrl(uri)) {
                            await url_launcher.launchUrl(uri);
                          }
                        },
                        child: const Text("CONTACT SUPPORT"),
                      ),
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
