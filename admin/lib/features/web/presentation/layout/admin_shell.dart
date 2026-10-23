import 'dart:async';
import 'dart:ui';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:friendly_code/core/auth/auth_service.dart';
import 'package:friendly_code/core/auth/role_provider.dart';
import 'package:friendly_code/core/data/venue_repository.dart';
import 'package:friendly_code/core/localization/locale_provider.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/theme/colors.dart';

// SuperAdmin & Global Screens
import 'package:friendly_code/features/web/presentation/pages/super_admin_login_screen.dart';
import 'package:friendly_code/features/admin/presentation/screens/global_email_settings_screen.dart';
import 'package:friendly_code/features/admin/presentation/screens/global_guests_screen.dart';
import 'package:friendly_code/features/admin/presentation/screens/global_venues_screen.dart';
import 'package:friendly_code/features/admin/presentation/screens/my_team_screen.dart';
import 'package:friendly_code/features/admin/presentation/screens/scan_logs_screen.dart';
import 'package:friendly_code/features/admin/presentation/screens/staff_management_screen.dart';
import 'package:friendly_code/features/admin/presentation/screens/venue_role_assignment_screen.dart';
import 'package:friendly_code/features/admin/presentation/widgets/analytics_module.dart';
import 'package:friendly_code/features/admin/presentation/widgets/notification_badge.dart';

// Owner & Operational Screens
import 'package:friendly_code/features/owner/presentation/screens/billing_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/delivery_logistics_payment_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/delivery_loyalty_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/delivery_menu_manager_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/deposit_analytics_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/deposit_tiers_setup_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/google_maps_config_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/guest_list_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/marketing_blast_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/owner_analytics_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/owner_venues_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/pos_sticker_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/rules_config_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/settings_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/venue_regional_settings_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/venue_staff_screen.dart';

/// Scope to allow nested widgets to switch the active AdminShell tab
class AdminShellScope extends InheritedWidget {
  final void Function(String key) selectTab;
  final String activeKey;

  const AdminShellScope({
    super.key,
    required this.selectTab,
    required this.activeKey,
    required super.child,
  });

  static AdminShellScope? of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<AdminShellScope>();

  @override
  bool updateShouldNotify(AdminShellScope oldWidget) =>
      activeKey != oldWidget.activeKey;
}

/// Helper wrapper that streams the active VenueModel for screens that require a VenueModel
class _VenueStreamWrapper extends StatelessWidget {
  final String? venueId;
  final Widget Function(BuildContext context, VenueModel venue) builder;

  const _VenueStreamWrapper({required this.venueId, required this.builder});

  @override
  Widget build(BuildContext context) {
    if (venueId == null || venueId!.isEmpty) {
      return const Center(
        child: Text("Выберите заведение для просмотра", style: TextStyle(color: Colors.white70)),
      );
    }
    return StreamBuilder<VenueModel?>(
      stream: VenueRepository().getVenueStream(venueId!),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CupertinoActivityIndicator(color: AppColors.accentOrange));
        }
        if (snapshot.hasError || !snapshot.hasData || snapshot.data == null) {
          return const Center(
            child: Text("Заведение не найдено", style: TextStyle(color: Colors.white70)),
          );
        }
        return builder(context, snapshot.data!);
      },
    );
  }
}

/// Data structure describing a sidebar navigation item
class AdminNavItem {
  final String key;
  final String title;
  final String titleRu;
  final IconData icon;
  final String? groupTitle;
  final String? groupTitleRu;
  final String? badgeText;
  final Widget Function(BuildContext context, String? venueId) builder;
  final bool Function(UserRole role) isVisible;

  const AdminNavItem({
    required this.key,
    required this.title,
    required this.titleRu,
    required this.icon,
    this.groupTitle,
    this.groupTitleRu,
    this.badgeText,
    required this.builder,
    required this.isVisible,
  });
}

class AdminShell extends StatefulWidget {
  final Widget child; // Default/Initial screen (e.g. OwnerDashboardScreen or SuperAdminDashboard)
  final UserRole role;

  const AdminShell({
    super.key,
    required this.child,
    required this.role,
  });

  @override
  State<AdminShell> createState() => _AdminShellState();
}

class _AdminShellState extends State<AdminShell> {
  String _selectedKey = 'overview';
  StreamSubscription<QuerySnapshot>? _notificationSubscription;
  DateTime? _lastNotificationTime;

  @override
  void initState() {
    super.initState();
    _lastNotificationTime = DateTime.now();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _setupNotificationListener();
    });
  }

  void _setupNotificationListener() {
    final roleProvider = Provider.of<RoleProvider>(context, listen: false);
    final venueIds = roleProvider.venueIds;
    final isSuperAdmin = roleProvider.isSuperAdmin;

    if (!isSuperAdmin && venueIds.isEmpty) return;

    Query query = FirebaseFirestore.instance
        .collection('notifications')
        .where('timestamp', isGreaterThanOrEqualTo: Timestamp.fromDate(_lastNotificationTime!))
        .orderBy('timestamp', descending: true);

    if (!isSuperAdmin) {
      if (venueIds.isNotEmpty && venueIds.length <= 10) {
        query = query.where('venueId', whereIn: venueIds);
      }
    }

    _notificationSubscription = query.snapshots().listen((snapshot) {
      for (var change in snapshot.docChanges) {
        if (change.type == DocumentChangeType.added) {
          final data = change.doc.data() as Map<String, dynamic>?;
          if (data == null) continue;

          final title = data['title'] ?? 'New Notification';
          final message = data['message'] ?? '';

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Row(
                  children: [
                    const Icon(Icons.notifications_active, color: Colors.white),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                          Text(message, style: const TextStyle(fontSize: 12)),
                        ],
                      ),
                    ),
                  ],
                ),
                backgroundColor: AppColors.accentOrange,
                behavior: SnackBarBehavior.floating,
                margin: const EdgeInsets.only(bottom: 24, right: 24, left: 24),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                duration: const Duration(seconds: 4),
              ),
            );
          }
        }
      }
    });
  }

  @override
  void dispose() {
    _notificationSubscription?.cancel();
    super.dispose();
  }

  Widget _buildNoVenuePlaceholder(BuildContext context) {
    return Center(
      child: Container(
        padding: const EdgeInsets.all(32),
        constraints: const BoxConstraints(maxWidth: 440),
        decoration: BoxDecoration(
          color: const Color(0x331C1C1E),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white.withOpacity(0.1)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(CupertinoIcons.building_2_fill, size: 48, color: AppColors.accentOrange),
            const SizedBox(height: 16),
            const Text(
              "Заведение не выбрано",
              style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              "Пожалуйста, выберите или создайте заведение, чтобы настроить этот раздел.",
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 14),
            ),
            const SizedBox(height: 20),
            CupertinoButton(
              color: AppColors.accentOrange,
              borderRadius: BorderRadius.circular(12),
              child: const Text("Перейти к заведениям", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
              onPressed: () {
                setState(() => _selectedKey = 'venues');
              },
            ),
          ],
        ),
      ),
    );
  }

  List<AdminNavItem> _getNavItems() {
    return [
      // ─── 1. MAIN / ОСНОВНОЕ ─────────────────────────────────────────────
      AdminNavItem(
        key: 'overview',
        title: 'Overview',
        titleRu: 'Обзор',
        icon: Icons.grid_view_outlined,
        groupTitle: 'MAIN',
        groupTitleRu: 'ОСНОВНОЕ',
        builder: (context, venueId) => widget.child,
        isVisible: (role) => true,
      ),
      AdminNavItem(
        key: 'guests',
        title: 'Guests',
        titleRu: 'База гостей',
        icon: Icons.people_alt_outlined,
        builder: (context, venueId) {
          if (widget.role == UserRole.superAdmin) {
            return const GlobalGuestsScreen();
          }
          if (venueId == null || venueId.isEmpty) {
            return _buildNoVenuePlaceholder(context);
          }
          return GuestListScreen(venueId: venueId);
        },
        isVisible: (role) => true,
      ),

      // ─── 2. DIRECT DELIVERY & FOOD APPS / ОНЛАЙН-ДОСТАВКА ────────────────
      AdminNavItem(
        key: 'delivery_menu',
        title: 'Menu & Scraper',
        titleRu: 'Меню & Парсинг',
        icon: Icons.restaurant_menu_outlined,
        groupTitle: 'DIRECT DELIVERY',
        groupTitleRu: 'ОНЛАЙН-ДОСТАВКА',
        badgeText: 'NEW',
        builder: (context, venueId) {
          if (venueId == null || venueId.isEmpty) {
            return _buildNoVenuePlaceholder(context);
          }
          return DeliveryMenuManagerScreen(venueId: venueId);
        },
        isVisible: (role) => role != UserRole.manager,
      ),
      AdminNavItem(
        key: 'delivery_loyalty',
        title: 'Delivery Loyalty',
        titleRu: 'Скидки & Happy Hours',
        icon: Icons.timer_outlined,
        builder: (context, venueId) {
          if (venueId == null || venueId.isEmpty) {
            return _buildNoVenuePlaceholder(context);
          }
          return DeliveryLoyaltyScreen(venueId: venueId);
        },
        isVisible: (role) => role != UserRole.manager,
      ),
      AdminNavItem(
        key: 'delivery_logistics',
        title: 'Payments & Logistics',
        titleRu: 'Оплата & Курьеры',
        icon: Icons.local_shipping_outlined,
        builder: (context, venueId) {
          if (venueId == null || venueId.isEmpty) {
            return _buildNoVenuePlaceholder(context);
          }
          return DeliveryLogisticsPaymentScreen(venueId: venueId);
        },
        isVisible: (role) => role != UserRole.manager,
      ),

      // ─── 3. INTELLIGENCE & GROWTH / ЛОЯЛЬНОСТЬ & РОСТ ───────────────────
      AdminNavItem(
        key: 'loyalty_rules',
        title: 'Loyalty Rules',
        titleRu: 'Правила лояльности',
        icon: CupertinoIcons.infinite,
        groupTitle: 'GROWTH & MARKETING',
        groupTitleRu: 'ЛОЯЛЬНОСТЬ & РОСТ',
        builder: (context, venueId) => RulesConfigScreen(venueId: venueId),
        isVisible: (role) => role == UserRole.owner || role == UserRole.admin,
      ),
      AdminNavItem(
        key: 'deposits',
        title: 'Deposit Analytics',
        titleRu: 'Депозиты & Отчеты',
        icon: CupertinoIcons.money_dollar_circle,
        builder: (context, venueId) => DepositAnalyticsScreen(venueId: venueId),
        isVisible: (role) => role == UserRole.owner || role == UserRole.admin,
      ),
      AdminNavItem(
        key: 'deposit_tiers',
        title: 'Deposit Tiers',
        titleRu: 'Тиры депозитов',
        icon: Icons.credit_card_outlined,
        builder: (context, venueId) {
          if (venueId == null || venueId.isEmpty) {
            return _buildNoVenuePlaceholder(context);
          }
          return DepositTiersSetupScreen(venueId: venueId);
        },
        isVisible: (role) => role == UserRole.owner || role == UserRole.admin,
      ),
      AdminNavItem(
        key: 'marketing',
        title: 'Marketing Blasts',
        titleRu: 'Маркетинг & Рассылки',
        icon: Icons.campaign_outlined,
        builder: (context, venueId) {
          if (venueId == null || venueId.isEmpty) {
            return _buildNoVenuePlaceholder(context);
          }
          return MarketingBlastScreen(venueId: venueId);
        },
        isVisible: (role) => role == UserRole.owner || role == UserRole.admin,
      ),
      AdminNavItem(
        key: 'pos_stickers',
        title: 'POS Stickers',
        titleRu: 'POS-наклейки',
        icon: CupertinoIcons.qrcode,
        builder: (context, venueId) {
          if (venueId == null || venueId.isEmpty) {
            return _buildNoVenuePlaceholder(context);
          }
          return _VenueStreamWrapper(
            venueId: venueId,
            builder: (ctx, venue) => PosStickerScreen(venue: venue),
          );
        },
        isVisible: (role) => role == UserRole.owner || role == UserRole.admin,
      ),

      // ─── 4. VENUE MANAGEMENT / УПРАВЛЕНИЕ ──────────────────────────────
      AdminNavItem(
        key: 'analytics',
        title: 'Analytics',
        titleRu: 'Аналитика',
        icon: Icons.bar_chart_outlined,
        groupTitle: 'MANAGEMENT',
        groupTitleRu: 'УПРАВЛЕНИЕ',
        builder: (context, venueId) => widget.role == UserRole.superAdmin
            ? const AnalyticsModule()
            : const OwnerAnalyticsScreen(),
        isVisible: (role) => role != UserRole.manager,
      ),
      AdminNavItem(
        key: 'venues',
        title: 'Venues',
        titleRu: 'Заведения',
        icon: Icons.storefront_outlined,
        builder: (context, venueId) => widget.role == UserRole.superAdmin
            ? GlobalVenuesScreen()
            : OwnerVenuesScreen(),
        isVisible: (role) => true,
      ),
      AdminNavItem(
        key: 'staff',
        title: 'Team & Staff',
        titleRu: 'Команда & Персонал',
        icon: Icons.people_outline,
        builder: (context, venueId) {
          if (widget.role == UserRole.superAdmin) {
            return StaffManagementScreen();
          } else if (widget.role == UserRole.owner) {
            if (venueId == null || venueId.isEmpty) {
              return _buildNoVenuePlaceholder(context);
            }
            return VenueStaffScreen(venueId: venueId);
          } else {
            return const MyTeamScreen();
          }
        },
        isVisible: (role) => true,
      ),
      AdminNavItem(
        key: 'regional_settings',
        title: 'Venue Settings',
        titleRu: 'Настройки заведения',
        icon: CupertinoIcons.slider_horizontal_3,
        builder: (context, venueId) {
          if (venueId == null || venueId.isEmpty) {
            return _buildNoVenuePlaceholder(context);
          }
          return VenueRegionalSettingsScreen(venueId: venueId);
        },
        isVisible: (role) => true,
      ),
      AdminNavItem(
        key: 'billing',
        title: 'Billing',
        titleRu: 'Подписка & Биллинг',
        icon: Icons.payments_outlined,
        builder: (context, venueId) => const OwnerBillingScreen(),
        isVisible: (role) => role == UserRole.owner,
      ),
      AdminNavItem(
        key: 'google_maps',
        title: 'Google Maps & Reviews',
        titleRu: 'Google Maps & Отзывы',
        icon: CupertinoIcons.map,
        builder: (context, venueId) {
          if (venueId == null || venueId.isEmpty) {
            return _buildNoVenuePlaceholder(context);
          }
          return _VenueStreamWrapper(
            venueId: venueId,
            builder: (ctx, venue) => GoogleMapsConfigScreen(venue: venue),
          );
        },
        isVisible: (role) => role == UserRole.owner || role == UserRole.admin,
      ),

      // ─── 5. SUPERADMIN SPECIFIC / АДМИНИСТРИРОВАНИЕ ─────────────────────
      AdminNavItem(
        key: 'email_setup',
        title: 'Email Setup',
        titleRu: 'Email Setup',
        icon: Icons.email_outlined,
        groupTitle: 'ADMINISTRATION',
        groupTitleRu: 'АДМИНИСТРИРОВАНИЕ',
        builder: (context, venueId) => GlobalEmailSettingsScreen(),
        isVisible: (role) => role == UserRole.superAdmin,
      ),
      AdminNavItem(
        key: 'roles_assignment',
        title: 'Role Assignment',
        titleRu: 'Назначение ролей',
        icon: Icons.manage_accounts_outlined,
        builder: (context, venueId) => const VenueRoleAssignmentScreen(),
        isVisible: (role) => role == UserRole.superAdmin,
      ),
      AdminNavItem(
        key: 'scan_logs',
        title: 'Scan Logs',
        titleRu: 'Журнал регистраций',
        icon: CupertinoIcons.doc_text_search,
        builder: (context, venueId) => const ScanLogsScreen(),
        isVisible: (role) => role == UserRole.superAdmin,
      ),

      // ─── 6. SETTINGS / НАСТРОЙКИ ────────────────────────────────────────
      AdminNavItem(
        key: 'settings',
        title: 'Settings',
        titleRu: 'Настройки',
        icon: Icons.settings_outlined,
        builder: (context, venueId) => GeneralSettingsScreen(),
        isVisible: (role) => true,
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    // ── STRICT AUTH & RBAC GUARD ──
    final currentUser = AuthService().currentUser;
    if (currentUser == null) {
      return const SuperAdminLoginScreen();
    }

    final roleProvider = Provider.of<RoleProvider>(context);

    final isKnownSuperAdmin = roleProvider.isSuperAdmin ||
        (currentUser.email?.trim().toLowerCase() == '0451611@gmail.com');

    // If route requires SuperAdmin, strictly enforce SuperAdmin role
    if (widget.role == UserRole.superAdmin && !isKnownSuperAdmin) {
      // If role data hasn't initialized from local storage / Firestore yet, show sleek dark loader instead of flashing 403
      if (!roleProvider.isInitialized) {
        return const Scaffold(
          backgroundColor: Colors.black,
          body: Center(
            child: CupertinoActivityIndicator(
              color: AppColors.accentOrange,
              radius: 16,
            ),
          ),
        );
      }

      return Scaffold(
        backgroundColor: Colors.black,
        body: Center(
          child: Container(
            padding: const EdgeInsets.all(32),
            constraints: const BoxConstraints(maxWidth: 480),
            decoration: BoxDecoration(
              color: const Color(0xFF1C1C1E),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.redAccent.withOpacity(0.3)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.lock_outline, size: 64, color: Colors.redAccent),
                const SizedBox(height: 16),
                const Text(
                  "403: Доступ запрещен",
                  style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                const Text(
                  "Этот раздел доступен только Суперадминистратору платформы Revoo.",
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white70, fontSize: 14),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.accentOrange,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () => Navigator.pushReplacementNamed(context, '/superadmin-login'),
                  child: const Text("Войти под аккаунтом администратора"),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final activeVenueId = roleProvider.venueId;
    final allItems = _getNavItems();
    final visibleItems = allItems.where((item) => item.isVisible(widget.role)).toList();

    // Find the currently active item, fallback to first item
    final activeItem = visibleItems.firstWhere(
      (item) => item.key == _selectedKey,
      orElse: () => visibleItems.first,
    );

    return AdminShellScope(
      selectTab: (key) {
        if (mounted) setState(() => _selectedKey = key);
      },
      activeKey: _selectedKey,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final isDesktop = constraints.maxWidth >= 800;

          return Stack(
            children: [
              // Deep OLED Base Background
              Container(color: Colors.black),
              // Glowing Ambient Orbs for iOS 26 Aesthetic
              Positioned(
                top: -100,
                left: -100,
                child: Container(
                  width: 400,
                  height: 400,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.deepSeaBlue.withOpacity(0.4),
                    boxShadow: [
                      BoxShadow(color: AppColors.deepSeaBlue.withOpacity(0.4), blurRadius: 150, spreadRadius: 100),
                    ],
                  ),
                ),
              ),
              Positioned(
                bottom: -100,
                right: -100,
                child: Container(
                  width: 500,
                  height: 500,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.accentOrange.withOpacity(0.3),
                    boxShadow: [
                      BoxShadow(color: AppColors.accentOrange.withOpacity(0.3), blurRadius: 200, spreadRadius: 100),
                    ],
                  ),
                ),
              ),

              Scaffold(
                backgroundColor: Colors.transparent,
                appBar: !isDesktop
                    ? AppBar(
                        backgroundColor: const Color(0x661C1C1E),
                        iconTheme: const IconThemeData(color: Colors.white),
                        elevation: 0,
                        title: const Text("REVOO", style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16)),
                      )
                    : null,
                drawer: !isDesktop ? Drawer(child: _buildSidebar(isMobile: true)) : null,
                body: Row(
                  children: [
                    // Permanent Side Navigation (Desktop only)
                    if (isDesktop) _buildSidebar(),

                    // Main Content Area
                    Expanded(
                      child: Column(
                        children: [
                          // Header Search & User Info & Venue Switcher
                          _buildHeader(isDesktop: isDesktop),

                          // Actual Screen Content
                          Expanded(
                            child: Container(
                              margin: const EdgeInsets.fromLTRB(0, 0, 24, 24),
                              decoration: BoxDecoration(
                                color: Colors.transparent,
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(16),
                                child: activeItem.builder(context, activeVenueId),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildSidebar({bool isMobile = false}) {
    final localeProvider = Provider.of<LocaleProvider>(context);
    final isRu = localeProvider.locale.languageCode == 'ru';
    final allItems = _getNavItems();
    final visibleItems = allItems.where((item) => item.isVisible(widget.role)).toList();

    return ClipRRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          width: 270,
          decoration: BoxDecoration(
            color: isMobile ? const Color(0xEE111111) : const Color(0x331C1C1E),
            border: Border(right: BorderSide(color: Colors.white.withOpacity(0.08))),
          ),
          padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Logo
              if (!isMobile)
                Padding(
                  padding: const EdgeInsets.only(left: 10, bottom: 20, top: 4),
                  child: Row(
                    children: [
                      Image.asset(
                        'assets/images/logo.png',
                        height: 36,
                        fit: BoxFit.contain,
                        errorBuilder: (_, __, ___) => const Text(
                          "REVOO",
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 20),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                        decoration: BoxDecoration(
                          color: AppColors.accentOrange.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: AppColors.accentOrange.withOpacity(0.35)),
                        ),
                        child: Text(
                          widget.role == UserRole.superAdmin ? "SUPERADMIN" : "OWNER",
                          style: const TextStyle(
                            color: AppColors.accentOrange,
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.8,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

              // Scrollable Navigation Items
              Expanded(
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      for (final item in visibleItems.where((i) => i.key != 'settings')) ...[
                        if (item.groupTitle != null)
                          Padding(
                            padding: const EdgeInsets.only(left: 14, top: 18, bottom: 8),
                            child: Text(
                              isRu ? (item.groupTitleRu ?? item.groupTitle!) : item.groupTitle!,
                              style: TextStyle(
                                color: Colors.white.withOpacity(0.35),
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 1.2,
                              ),
                            ),
                          ),
                        _buildNavItem(item, isRu: isRu, isMobile: isMobile),
                      ],
                    ],
                  ),
                ),
              ),

              // Bottom Section: Divider, Settings, Logout
              Divider(color: Colors.white.withOpacity(0.08), height: 20),

              // Settings Item
              _buildNavItem(
                visibleItems.firstWhere(
                  (i) => i.key == 'settings',
                  orElse: () => AdminNavItem(
                    key: 'settings',
                    title: 'Settings',
                    titleRu: 'Настройки',
                    icon: Icons.settings_outlined,
                    builder: (c, v) => GeneralSettingsScreen(),
                    isVisible: (r) => true,
                  ),
                ),
                isRu: isRu,
                isMobile: isMobile,
              ),

              // Logout Item
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: InkWell(
                  onTap: () async {
                    await AuthService().signOut();
                    if (context.mounted) Navigator.pushReplacementNamed(context, '/');
                  },
                  borderRadius: BorderRadius.circular(14),
                  hoverColor: Colors.redAccent.withOpacity(0.1),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 14),
                    child: Row(
                      children: [
                        Icon(CupertinoIcons.square_arrow_right, color: Colors.white.withOpacity(0.6), size: 20),
                        const SizedBox(width: 14),
                        Text(
                          isRu ? "Выход" : "Logout",
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.6),
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(AdminNavItem item, {required bool isRu, bool isMobile = false}) {
    final bool isSelected = _selectedKey == item.key;
    final label = isRu ? item.titleRu : item.title;

    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: InkWell(
        onTap: () {
          setState(() => _selectedKey = item.key);
          if (isMobile) Navigator.pop(context); // Close drawer
        },
        borderRadius: BorderRadius.circular(14),
        hoverColor: Colors.white.withOpacity(0.06),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 14),
          decoration: BoxDecoration(
            color: isSelected ? Colors.white.withOpacity(0.12) : Colors.transparent,
            borderRadius: BorderRadius.circular(14),
            border: isSelected
                ? Border.all(color: Colors.white.withOpacity(0.22), width: 1)
                : Border.all(color: Colors.transparent, width: 1),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.2),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: Row(
            children: [
              Icon(
                item.icon,
                color: isSelected ? AppColors.accentOrange : Colors.white.withOpacity(0.65),
                size: 20,
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    color: isSelected ? Colors.white : Colors.white.withOpacity(0.7),
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                    fontSize: 13.5,
                    letterSpacing: isSelected ? 0.2 : 0,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (item.badgeText != null) ...[
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.accentOrange.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: AppColors.accentOrange.withOpacity(0.5)),
                  ),
                  child: Text(
                    item.badgeText!,
                    style: const TextStyle(
                      color: AppColors.accentOrange,
                      fontSize: 9,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader({bool isDesktop = true}) {
    final currentUser = AuthService().currentUser;
    final userEmail = currentUser?.email ?? 'Не авторизован';

    return ClipRRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          height: 80,
          color: const Color(0x1A1C1C1E),
          padding: EdgeInsets.symmetric(horizontal: isDesktop ? 32 : 16),
          child: Row(
            children: [
              // Venue Switcher Dropdown (when owner has multiple venues)
              Consumer<RoleProvider>(
                builder: (context, roleProv, _) {
                  final activeId = roleProv.venueId;
                  final venueIds = roleProv.venueIds;
                  if (venueIds.isEmpty) return const SizedBox.shrink();

                  return Container(
                    margin: const EdgeInsets.only(right: 16),
                    child: PopupMenuButton<String>(
                      tooltip: "Сменить заведение",
                      offset: const Offset(0, 45),
                      color: const Color(0xFF1C1C1E),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                        side: BorderSide(color: Colors.white.withOpacity(0.15)),
                      ),
                      onSelected: (newId) {
                        roleProv.setActiveVenueId(newId);
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.06),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppColors.accentOrange.withOpacity(0.4)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(CupertinoIcons.building_2_fill, size: 15, color: AppColors.accentOrange),
                            const SizedBox(width: 8),
                            FutureBuilder<VenueModel?>(
                              future: VenueRepository().getVenueById(activeId ?? ''),
                              builder: (context, snap) {
                                final name = snap.data?.name ??
                                    (activeId != null && activeId.length >= 4
                                        ? "...${activeId.substring(activeId.length - 4)}"
                                        : "Заведение");
                                return Text(
                                  name,
                                  style: const TextStyle(fontWeight: FontWeight.w700, color: Colors.white, fontSize: 13),
                                );
                              },
                            ),
                            const SizedBox(width: 6),
                            Icon(CupertinoIcons.chevron_down, color: Colors.white.withOpacity(0.6), size: 12),
                          ],
                        ),
                      ),
                      itemBuilder: (context) => [
                        ...venueIds.map((id) => PopupMenuItem<String>(
                              value: id,
                              child: FutureBuilder<VenueModel?>(
                                future: VenueRepository().getVenueById(id),
                                builder: (context, snap) {
                                  final isCurrent = id == activeId;
                                  final name = snap.data?.name ?? "...${id.length >= 4 ? id.substring(id.length - 4) : id}";
                                  return Row(
                                    children: [
                                      Icon(
                                        isCurrent ? CupertinoIcons.check_mark_circled_solid : CupertinoIcons.circle,
                                        size: 16,
                                        color: isCurrent ? AppColors.accentOrange : Colors.white38,
                                      ),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Text(
                                          name,
                                          style: TextStyle(
                                            color: isCurrent ? Colors.white : Colors.white70,
                                            fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
                                            fontSize: 13,
                                          ),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  );
                                },
                              ),
                            )),
                      ],
                    ),
                  );
                },
              ),

              // Search Bar
              if (isDesktop)
                Expanded(
                  child: Container(
                    height: 48,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: Colors.white.withOpacity(0.1)),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Row(
                      children: [
                        Icon(Icons.search, color: Colors.white.withOpacity(0.5), size: 20),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextField(
                            style: const TextStyle(color: Colors.white),
                            decoration: InputDecoration(
                              hintText: widget.role == UserRole.superAdmin
                                  ? "Search venues..."
                                  : "Search in your venue...",
                              hintStyle: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 14),
                              border: InputBorder.none,
                              enabledBorder: InputBorder.none,
                              focusedBorder: InputBorder.none,
                              fillColor: Colors.transparent,
                              filled: false,
                              contentPadding: const EdgeInsets.only(bottom: 0),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                )
              else
                Expanded(
                  child: Text(
                    userEmail.split('@').first,
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                ),

              if (isDesktop) const SizedBox(width: 24),

              // Notification Badge
              const NotificationBadge(),
              const SizedBox(width: 16),

              // Language Switcher
              Consumer<LocaleProvider>(
                builder: (context, localeProvider, _) => Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: Colors.white.withOpacity(0.1)),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.language, size: 16, color: Colors.white.withOpacity(0.7)),
                      const SizedBox(width: 8),
                      Theme(
                        data: Theme.of(context).copyWith(canvasColor: const Color(0xFF1C1C1E)),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: localeProvider.locale.languageCode.toUpperCase(),
                            iconEnabledColor: Colors.white70,
                            items: ['EN', 'RU']
                                .map((lang) => DropdownMenuItem(
                                      value: lang,
                                      child: Text(lang, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white)),
                                    ))
                                .toList(),
                            onChanged: (val) {
                              if (val != null) {
                                localeProvider.setLocale(Locale(val.toLowerCase()));
                              }
                            },
                            isDense: true,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              if (isDesktop) ...[
                const SizedBox(width: 24),
                Row(
                  children: [
                    Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          userEmail,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                            fontSize: 14,
                          ),
                        ),
                        Text(
                          widget.role == UserRole.superAdmin ? "SuperAdmin" : "Владелец заведения",
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.5),
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(width: 16),
                    CircleAvatar(
                      radius: 20,
                      backgroundColor: Colors.white.withOpacity(0.1),
                      child: const Icon(Icons.person_outline, color: Colors.white),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
