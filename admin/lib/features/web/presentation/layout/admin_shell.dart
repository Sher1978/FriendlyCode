import 'package:flutter/material.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/features/admin/presentation/widgets/analytics_module.dart';
import 'package:friendly_code/core/auth/role_provider.dart';
import 'package:friendly_code/features/admin/presentation/screens/global_venues_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/settings_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/analytics_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/billing_screen.dart';
import 'package:friendly_code/features/admin/presentation/screens/venue_editor_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/owner_venues_screen.dart';
import 'package:friendly_code/core/auth/auth_service.dart';
import 'package:provider/provider.dart';
import 'package:friendly_code/core/localization/locale_provider.dart';

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

  @override
  void initState() {
    super.initState();
    _screens = [
      widget.child, // 0: Overview
      widget.role == UserRole.superAdmin 
        ? const GlobalVenuesScreen() 
        : const OwnerVenuesScreen(), 
      widget.role == UserRole.superAdmin
        ? const AnalyticsModule() // Admin Global Analytics
        : const OwnerAnalyticsScreen(), // Owner Venue Analytics
      widget.role == UserRole.superAdmin
        ? const Center(child: Text("System Billing", style: TextStyle(color: AppColors.title)))
        : const OwnerBillingScreen(), // Owner Billing
      const GeneralSettingsScreen(), // 4: Settings
    ];
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isDesktop = constraints.maxWidth >= 800;
        
        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: !isDesktop 
            ? AppBar(
                backgroundColor: AppColors.surface,
                iconTheme: const IconThemeData(color: AppColors.title),
                elevation: 0,
                title: const Text("FRIENDLY CODE", style: TextStyle(color: AppColors.title, fontWeight: FontWeight.w900, fontSize: 16)),
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
                    
                    // Actual Screen Content
                    Expanded(
                      child: Container(
                        margin: const EdgeInsets.fromLTRB(0, 0, 24, 24),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: AppColors.softShadow,
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
        );
      },
    );
  }

  Widget _buildSidebar({bool isMobile = false}) {
    return Container(
      width: 260,
      color: isMobile ? AppColors.surface : null, // Ensure background on drawer
      padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Logo
          if (!isMobile) // Hide logo in mobile drawer if also in AppBar
            Padding(
              padding: const EdgeInsets.only(left: 12, bottom: 48),
              child: Row(
                children: [
                  const Icon(Icons.auto_awesome, color: AppColors.accentOrange, size: 28),
                  const SizedBox(width: 12),
                  const Text(
                    "FRIENDLY CODE",
                    style: TextStyle(
                      color: AppColors.title,
                      fontWeight: FontWeight.w900,
                      fontSize: 18,
                      letterSpacing: -0.5,
                    ),
                  ),
                ],
              ),
            ),
          
          // Navigation Items
          _buildNavItem(0, Icons.grid_view_outlined, "Overview", isMobile: isMobile),
          _buildNavItem(1, Icons.storefront_outlined, "Venues", isMobile: isMobile),
          _buildNavItem(2, Icons.bar_chart_outlined, "Analytics", isMobile: isMobile),
          _buildNavItem(3, Icons.payments_outlined, "Billing", isMobile: isMobile),
          const Spacer(),
          _buildNavItem(4, Icons.settings_outlined, "Settings", isMobile: isMobile),
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: InkWell(
              onTap: () => Navigator.pushReplacementNamed(context, '/login'),
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                child: Row(
                  children: const [
                    Icon(Icons.logout_outlined, color: AppColors.body, size: 22),
                    SizedBox(width: 16),
                    Text("Logout", style: TextStyle(color: AppColors.body, fontWeight: FontWeight.w500, fontSize: 15)),
                  ],
                ),
              ),
            ),
          ),
        ],
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
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.accentOrange.withOpacity(0.1) : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              Icon(
                icon,
                color: isSelected ? AppColors.accentOrange : AppColors.body,
                size: 22,
              ),
              const SizedBox(width: 16),
              Text(
                label,
                style: TextStyle(
                  color: isSelected ? AppColors.title : AppColors.body,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                  fontSize: 15,
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

    return Container(
      height: 80,
      padding: EdgeInsets.symmetric(horizontal: isDesktop ? 32 : 16),
      child: Row(
        children: [
          // Search Bar
          if (isDesktop) 
            Expanded(
              child: Container(
                height: 44,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.black.withOpacity(0.05)),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    const Icon(Icons.search, color: AppColors.body, size: 20),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        decoration: InputDecoration(
                          hintText: widget.role == UserRole.superAdmin 
                            ? "Search venues..."
                            : "Search in your venue...",
                          hintStyle: const TextStyle(color: Colors.black38, fontSize: 14),
                          border: InputBorder.none,
                          contentPadding: const EdgeInsets.only(bottom: 12), // Align text vertically
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
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.title)
              ),
            ),
          
          if (isDesktop) const SizedBox(width: 24),

          // Language Switcher
          Consumer<LocaleProvider>(
            builder: (context, localeProvider, _) => Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.title.withOpacity(0.1)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.language, size: 16, color: AppColors.body),
                  const SizedBox(width: 8),
                  DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: localeProvider.locale.languageCode.toUpperCase(),
                      items: ['EN', 'RU'].map((lang) => DropdownMenuItem(
                        value: lang,
                        child: Text(lang, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                      )).toList(),
                      onChanged: (val) {
                        if (val != null) {
                          localeProvider.setLocale(Locale(val.toLowerCase()));
                        }
                      },
                      isDense: true,
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
                        color: AppColors.title,
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                      ),
                    ),
                    Text(
                      widget.role == UserRole.superAdmin ? "System Access" : "Venue Owner",
                      style: const TextStyle(
                        color: AppColors.body,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 16),
                const CircleAvatar(
                  radius: 20,
                  backgroundColor: AppColors.background,
                  child: Icon(Icons.person_outline, color: AppColors.accentOrange),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
