import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'dart:ui';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/features/admin/presentation/widgets/analytics_module.dart';
import 'package:friendly_code/core/auth/role_provider.dart';
import 'package:friendly_code/features/admin/presentation/screens/global_venues_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/settings_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/owner_venues_screen.dart';
import 'package:friendly_code/core/auth/auth_service.dart';
import 'package:friendly_code/features/owner/presentation/screens/owner_analytics_screen.dart';
import 'package:provider/provider.dart';
import 'package:friendly_code/core/localization/locale_provider.dart';
import 'package:friendly_code/features/admin/presentation/widgets/notification_badge.dart';
import 'package:friendly_code/features/admin/presentation/screens/staff_management_screen.dart';
import 'package:friendly_code/features/admin/presentation/screens/global_email_settings_screen.dart';
import 'package:friendly_code/features/admin/presentation/screens/my_team_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/billing_screen.dart';

class AdminShell extends StatefulWidget {
  final Widget child; // Default/Initial screen
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
  int _selectedIndex = 0;
  late List<Widget> _screens;
  StreamSubscription<QuerySnapshot>? _notificationSubscription;
  DateTime? _lastNotificationTime;

  @override
  void initState() {
    super.initState();
    _lastNotificationTime = DateTime.now(); // Only show notifications that arrive after login
    _screens = [
      widget.child, // 0: Overview
      widget.role == UserRole.superAdmin 
        ? GlobalVenuesScreen() 
        : OwnerVenuesScreen(), // 1: Venues
      if (widget.role != UserRole.manager) // 2: Analytics (Hidden for Manager)
        widget.role == UserRole.superAdmin
          ? AnalyticsModule()
          : OwnerAnalyticsScreen()
      else
        const Center(child: Text("Analytics not available for Managers", style: TextStyle(color: AppColors.title))),
      
      // 3. Billing / Staff (Depends on Role)
      if (widget.role == UserRole.superAdmin)
         StaffManagementScreen() // Staff Management
      else if (widget.role == UserRole.owner)
          const OwnerBillingScreen()
      else 
          const Center(child: Text("No Billing Access", style: TextStyle(color: AppColors.title))),

      if (widget.role == UserRole.superAdmin)
          GlobalEmailSettingsScreen(),

      GeneralSettingsScreen(), // Settings (Index 5 for SuperAdmin, 4 otherwise)
    ];

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

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
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
                    BoxShadow(color: AppColors.deepSeaBlue.withOpacity(0.4), blurRadius: 150, spreadRadius: 100)
                  ]
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
                    BoxShadow(color: AppColors.accentOrange.withOpacity(0.3), blurRadius: 200, spreadRadius: 100)
                  ]
                ),
              ),
            ),

            Scaffold(
              backgroundColor: Colors.transparent, // Critical: let the glows show through
              appBar: !isDesktop 
                ? AppBar(
                    backgroundColor: Color(0x661C1C1E),
                    iconTheme: const IconThemeData(color: Colors.white),
                    elevation: 0,
                    title: const Text("FRIENDLY CODE", style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16)),
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
                        // Header Search & User Info
                        _buildHeader(isDesktop: isDesktop),
                        
                        // Actual Screen Content (Wrapped in blur if requested)
                        Expanded(
                          child: Container(
                            margin: const EdgeInsets.fromLTRB(0, 0, 24, 24),
                            decoration: BoxDecoration(
                              color: Colors.transparent, // Screens handles their own cards now
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(16),
                              child: _screens[_selectedIndex < _screens.length ? _selectedIndex : 0],
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
    );
  }

  Widget _buildSidebar({bool isMobile = false}) {
    return ClipRRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          width: 260,
          decoration: BoxDecoration(
            color: isMobile ? Color(0xCC111111) : Color(0x331C1C1E),
            border: Border(right: BorderSide(color: Colors.white.withOpacity(0.1))),
          ),
          padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Logo
              if (!isMobile)
                Padding(
                  padding: const EdgeInsets.only(left: 12, bottom: 48),
                  child: Image.asset(
                    'assets/images/logo.png',
                    height: 48,
                    fit: BoxFit.contain,
                    color: Colors.white, // Tint logo white for dark mode if it's transparent PNG
                  ),
                ),
              
              // Navigation Items
              _buildNavItem(0, Icons.grid_view_outlined, "Overview", isMobile: isMobile),
              _buildNavItem(1, Icons.storefront_outlined, "Venues", isMobile: isMobile),
              
              if (widget.role != UserRole.manager)
                 _buildNavItem(2, Icons.bar_chart_outlined, "Analytics", isMobile: isMobile),
              
              if (widget.role == UserRole.superAdmin)
                 _buildNavItem(3, Icons.people_outline, "Staff", isMobile: isMobile)
              else if (widget.role == UserRole.admin || widget.role == UserRole.manager)
                 _buildNavItem(3, Icons.people_outline, "My Team", isMobile: isMobile)
              else if (widget.role == UserRole.owner)
                 _buildNavItem(3, Icons.payments_outlined, "Billing", isMobile: isMobile),

              if (widget.role == UserRole.superAdmin)
                 _buildNavItem(4, Icons.email_outlined, "Email Setup", isMobile: isMobile),

              const Spacer(),
              _buildNavItem(widget.role == UserRole.superAdmin ? 5 : 4, Icons.settings_outlined, "Settings", isMobile: isMobile),
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: InkWell(
                  onTap: () async {
                    await AuthService().signOut();
                    if (context.mounted) Navigator.pushReplacementNamed(context, '/');
                  },
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                    child: Row(
                      children: const [
                        Icon(Icons.logout_outlined, color: Colors.white70, size: 22),
                        SizedBox(width: 16),
                        Text("Logout", style: TextStyle(color: Colors.white70, fontWeight: FontWeight.w600, fontSize: 15)),
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

  Widget _buildNavItem(int index, IconData icon, String label, {bool isMobile = false}) {
    final bool isSelected = _selectedIndex == index;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: () {
          setState(() => _selectedIndex = index);
          if (isMobile) Navigator.pop(context); // Close drawer
        },
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
          decoration: BoxDecoration(
            color: isSelected ? Colors.white.withOpacity(0.1) : Colors.transparent,
            borderRadius: BorderRadius.circular(16),
            border: isSelected ? Border.all(color: Colors.white.withOpacity(0.2)) : null,
          ),
          child: Row(
            children: [
              Icon(
                icon,
                color: isSelected ? Colors.white : Colors.white70,
                size: 22,
              ),
              const SizedBox(width: 16),
              Text(
                label,
                style: TextStyle(
                  color: isSelected ? Colors.white : Colors.white70,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                  fontSize: 15,
                  letterSpacing: isSelected ? 0.2 : 0,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader({bool isDesktop = true}) {
    final currentUser = AuthService().currentUser;
    final userEmail = currentUser?.email ?? 'Venue Owner';

    return ClipRRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          height: 80,
          color: Color(0x1A1C1C1E), // Barely visible glass header
          padding: EdgeInsets.symmetric(horizontal: isDesktop ? 32 : 16),
          child: Row(
            children: [
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
                              fillColor: Colors.transparent, // Override theme
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
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)
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
                        data: Theme.of(context).copyWith(
                          canvasColor: Color(0xFF1C1C1E)
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: localeProvider.locale.languageCode.toUpperCase(),
                            iconEnabledColor: Colors.white70,
                            items: ['EN', 'RU'].map((lang) => DropdownMenuItem(
                              value: lang,
                              child: Text(lang, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white)),
                            )).toList(),
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
                          widget.role == UserRole.superAdmin ? "System Access" : "Venue Owner",
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
