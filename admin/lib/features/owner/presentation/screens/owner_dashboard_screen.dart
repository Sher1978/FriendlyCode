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
import 'package:friendly_code/core/widgets/ios_settings_group.dart';
import 'package:friendly_code/core/widgets/ios_settings_row.dart';
import 'package:friendly_code/features/owner/presentation/widgets/pulse_check_card.dart';
import 'package:flutter/cupertino.dart';

class OwnerDashboardScreen extends StatefulWidget {
  final VenueModel? venue;
  const OwnerDashboardScreen({super.key, this.venue});

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
    showCupertinoDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return CupertinoAlertDialog(
          title: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(CupertinoIcons.sparkles, color: AppColors.accentOrange),
              const SizedBox(width: 12),
              const Text("New Redemption"),
            ],
          ),
          content: Padding(
            padding: const EdgeInsets.only(top: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  "${visit.guestName} is waiting for",
                  style: const TextStyle(fontSize: 14),
                ),
                const SizedBox(height: 12),
                Text(
                  "${visit.discountValue}% OFF",
                  style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: AppColors.accentOrange),
                ),
                const SizedBox(height: 12),
                const Text(
                  "Ensure the bill reflects this discount before approving.",
                  style: TextStyle(fontSize: 12, color: AppColors.macosTextSecondary),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
          actions: [
            CupertinoDialogAction(
              isDestructiveAction: true,
              onPressed: () async {
                await _visitsService.updateVisitStatus(visit.id, 'rejected');
                if (context.mounted) Navigator.pop(context);
              },
              child: const Text("Reject"),
            ),
            CupertinoDialogAction(
              isDefaultAction: true,
              onPressed: () async {
                await _visitsService.updateVisitStatus(visit.id, 'approved');
                if (context.mounted) Navigator.pop(context);
                if (mounted) {
                  // Keep snackbar for transient feedback or switch to custom overlay
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("Discount Approved!"), backgroundColor: Colors.green),
                  );
                }
              },
              child: const Text("Approve"),
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

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Stack(
        children: [
          // 1. Smooth Background Vibrancy
          Positioned.fill(
            child: Opacity(
              opacity: 0.1,
              child: Image.asset(
                'assets/images/macos_vibrancy.png', // Fallback or design token
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => Container(),
              ),
            ),
          ),
          
          if (_isLoadingRole)
            const Center(child: CupertinoActivityIndicator(radius: 16))
          else if (venueIds.isEmpty)
            _buildEmptyState(context)
          else
            _buildDashboardContent(context, roleProvider, activeVenueId),
        ],
      ),
    );
  }

  Widget _buildBatteryWatermark() {
    return Positioned(
      bottom: -40,
      right: -60,
      child: Opacity(
        opacity: 0.05,
        child: Transform.rotate(
          angle: -pi / 6,
          child: Container(
            width: 320,
            height: 180,
            decoration: BoxDecoration(
              border: Border.all(color: AppColors.accentGreen, width: 4),
              borderRadius: BorderRadius.circular(20),
            ),
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Container(
                  width: 50, // 20% of width roughly
                  decoration: BoxDecoration(
                    color: AppColors.accentGreen,
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                const Spacer(),
                // Battery Tip
                Container(
                  width: 15,
                  height: 40,
                  decoration: const BoxDecoration(
                    color: AppColors.accentGreen,
                    borderRadius: BorderRadius.only(
                      topRight: Radius.circular(5),
                      bottomRight: Radius.circular(5),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
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
      );
  }

  Widget _buildDashboardContent(BuildContext context, RoleProvider roleProvider, String? activeVenueId) {
    final l10n = AppLocalizations.of(context)!;
    final venueIds = roleProvider.venueIds;

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        title: _buildVenueSelector(venueIds, roleProvider),
        actions: [
          CupertinoButton(
            child: const Icon(CupertinoIcons.globe, color: AppColors.accentOrange, size: 22),
            onPressed: () {
               final provider = Provider.of<LocaleProvider>(context, listen: false);
               final nextLocale = provider.locale.languageCode == 'en'
                   ? const Locale('ru')
                   : (provider.locale.languageCode == 'ru' ? const Locale('vi') : const Locale('en'));
               provider.setLocale(nextLocale);
            },
          ),
          CupertinoButton(
            child: const Icon(CupertinoIcons.plus_circle, color: AppColors.accentOrange, size: 22),
            onPressed: () async {
              final result = await Navigator.push(context, MaterialPageRoute(builder: (_) => const VenueEditorScreen()));
              if (result == true && context.mounted) {
                _refreshRole();
              }
            },
          ),
          const SizedBox(width: 8),
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
                // Background Decoration: 20% Battery Watermark
                Positioned(
                  bottom: -100,
                  right: -100,
                    child: Opacity(
                      opacity: 0.08,
                      child: Transform.rotate(
                        angle: -0.2,
                        child: const Icon(
                          Icons.battery_2_bar, // Represents ~20%
                          size: 600,
                          color: AppColors.accentGreen,
                        ),
                      ),
                    ),
                ),
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
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
           color: AppColors.macosSurfaceBg,
           borderRadius: BorderRadius.circular(12),
           border: Border.all(color: AppColors.macosDivider),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(CupertinoIcons.building_2_fill, size: 16, color: AppColors.accentOrange),
            const SizedBox(width: 10),
            Text(
              l10n.switchVenue(venueIds.length),
              style: const TextStyle(fontWeight: FontWeight.w700, color: Colors.white, fontSize: 13, letterSpacing: -0.2)
            ),
            const SizedBox(width: 6),
            const Icon(CupertinoIcons.chevron_down, color: AppColors.macosTextSecondary, size: 12),
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
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l10n.hello(userEmail.split('@').first).toUpperCase(),
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.accentOrange, letterSpacing: 1.5),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          venue.name,
                          style: const TextStyle(
                            color: AppColors.macosTextPrimary,
                            fontWeight: FontWeight.w900,
                            fontSize: 34,
                            letterSpacing: -1.0,
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

              // ─── J1: Pulse Check (Quick Dashboard) ───────────────────────
              GridView.count(
                crossAxisCount: isMobile ? 2 : 4,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 1.1,
                children: [
                  PulseCheckCard(
                    title: "Total Scans",
                    value: "${_realTimeStats?.totalCheckins ?? venue.stats.totalCheckins}",
                    icon: CupertinoIcons.qrcode_viewfinder,
                  ),
                  PulseCheckCard(
                    title: "Retention",
                    value: "${(_realTimeStats?.retentionRate ?? 0).toStringAsFixed(1)}%",
                    icon: CupertinoIcons.arrow_2_circlepath,
                    trend: "+12%",
                  ),
                  PulseCheckCard(
                    title: "Monthly Active",
                    value: "${_realTimeStats?.monthlyActiveUsers ?? 0}",
                    icon: CupertinoIcons.person_2,
                  ),
                  PulseCheckCard(
                    title: "Avg Discount",
                    value: "${(_realTimeStats?.avgDiscount ?? 0).toStringAsFixed(1)}%",
                    icon: CupertinoIcons.percent,
                    isPositive: false,
                  ),
                ],
              ),

              const SizedBox(height: 32),

              // ─── J2: Fast Management (System Settings Look) ────────────
              IOSSettingsGroup(
                title: l10n.management,
                children: [
                   IOSSettingsRow(
                    title: l10n.guestDatabase,
                    subtitle: l10n.guestDatabaseSub,
                    icon: CupertinoIcons.person_crop_square_fill,
                    iconColor: AppColors.accentBlue,
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => GuestListScreen(venueId: venue.id))),
                  ),
                  IOSSettingsRow(
                    title: l10n.venueProfile,
                    subtitle: l10n.venueProfileSub,
                    icon: CupertinoIcons.building_2_fill,
                    iconColor: AppColors.accentOrange,
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => VenueEditorScreen(venue: venue))),
                  ),
                  IOSSettingsRow(
                    title: "Staff Management",
                    subtitle: "Manage venue staff & roles",
                    icon: CupertinoIcons.person_badge_plus_fill,
                    iconColor: AppColors.accentGreen,
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => VenueStaffScreen(venueId: venue.id))),
                  ),
                   IOSSettingsRow(
                    title: l10n.posStickerGenerator,
                    subtitle: l10n.posStickerSub,
                    icon: CupertinoIcons.printer_fill,
                    iconColor: AppColors.premiumGold,
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => PosStickerScreen(venue: venue))),
                  ),
                ],
              ),

              const SizedBox(height: 24),

              // ─── J3: Growth & Analytics (Pulse Extended) ──────────────
              IOSSettingsGroup(
                title: "Intelligence & Growth",
                children: [
                  IOSSettingsRow(
                    title: l10n.loyaltyRules,
                    subtitle: "Configure tiers, decay, and VIP windows",
                    icon: CupertinoIcons.infinite,
                    iconColor: AppColors.accentOrange,
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => RulesConfigScreen(venueId: venue.id))),
                  ),
                  IOSSettingsRow(
                    title: "Marketing Campaigns",
                    subtitle: "Send blasts & automated offers",
                    icon: CupertinoIcons.speaker_2_fill,
                    iconColor: AppColors.accentBlue,
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => MarketingBlastScreen(venueId: venue.id))),
                  ),
                ],
              ),

              const SizedBox(height: 32),

              // ─── J1: Guest Segmentation (Pulse Detail) ─────────────────
              Padding(
                padding: const EdgeInsets.only(left: 16, bottom: 12),
                child: Text(
                  "GUEST SEGMENTS",
                  style: Theme.of(context).textTheme.labelLarge,
                ),
              ),
              _buildSegmentationRow(_realTimeStats ?? venue.stats, isMobile),

              const SizedBox(height: 32),

              // ─── J4: Distribution (QR & Landing) ──────────────────────
              _buildPremiumQRCard(venue),

              const SizedBox(height: 48),
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
            color: AppColors.secondarySurface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.accentGreen.withOpacity(0.5), width: 1),
            boxShadow: [
              BoxShadow(color: AppColors.accentGreen.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4)),
            ],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.accentGreen.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.person_pin_circle_outlined, color: AppColors.accentGreen, size: 24),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.guestWaiting,
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: AppColors.accentGreen, letterSpacing: 1.2),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      "${latest.guestName} — ${latest.discountValue}% OFF",
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                  ],
                ),
              ),
              if (pending.length > 1)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.accentGreen,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    "+${pending.length - 1}",
                    style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                ),
              const SizedBox(width: 8),
              const Icon(Icons.arrow_forward_ios, size: 14, color: AppColors.accentGreen),
            ],
          ),
        ),
      ),
    );
  }

  // ─── Existing Widgets (Refactored) ────────────────────────────────────────

  Widget _buildPremiumQRCard(VenueModel venue) {
    final l10n = AppLocalizations.of(context)!;
    final venueUrl = "https://www.friendlycode.fun/qr?id=${venue.id}";
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
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
                Text(l10n.shareToClients, style: const TextStyle(color: AppColors.accentGreen, fontWeight: FontWeight.w900, fontSize: 10, letterSpacing: 1.5)),
                const SizedBox(height: 4),
                Text(venue.name.toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900)),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.white.withOpacity(0.05)),
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
                        child: const Icon(Icons.copy, color: AppColors.accentGreen, size: 16),
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
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withOpacity(0.05)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: AppColors.premiumSand, borderRadius: BorderRadius.circular(12)),
              child: Icon(icon, color: AppColors.accentGreen, size: 20),
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
            const Icon(Icons.arrow_forward_ios, size: 12, color: AppColors.accentGreen),
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
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withOpacity(0.2)),
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
