import 'package:flutter/material.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/features/admin/presentation/widgets/analytics_module.dart';
import 'package:friendly_code/core/auth/role_provider.dart';

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
      widget.child, // 0: Overview (SuperAdminDashboard or OwnerDashboardScreen)
      widget.role == UserRole.superAdmin 
        ? widget.child // Super Admin: Venues = Overall list
        : const VenueEditorScreen(), // Owner: My Venue = Editor screen
      const AnalyticsModule(), // 2: Analytics
      const Center(child: Text("Billing Screen")), // 3: Billing
      const Center(child: Text("Settings Screen")), // 4: Settings
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Row(
        children: [
          // Permanent Side Navigation
          _buildSidebar(),
          
          // Main Content Area
          Expanded(
            child: Column(
              children: [
                // Header Search & User Info
                _buildHeader(),
                
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
  }

  Widget _buildSidebar() {
    return Container(
      width: 260,
      padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Logo
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
          _buildNavItem(0, Icons.grid_view_outlined, "Overview"),
          _buildNavItem(1, Icons.storefront_outlined, widget.role == UserRole.superAdmin ? "Venues" : "My Venue"),
          _buildNavItem(2, Icons.bar_chart_outlined, "Analytics"),
          _buildNavItem(3, Icons.payments_outlined, "Billing"),
          const Spacer(),
          _buildNavItem(4, Icons.settings_outlined, "Settings"),
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

  Widget _buildNavItem(int index, IconData icon, String label) {
    final bool isSelected = _selectedIndex == index;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: () => setState(() => _selectedIndex = index),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.accentOrange.withValues(alpha: 0.1) : Colors.transparent,
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

  Widget _buildHeader() {
    return Container(
      height: 80,
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Row(
        children: [
          // Search Bar
          Expanded(
            child: Container(
              height: 44,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.black.withValues(alpha: 0.05)),
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
                          ? "Search venues by name, ID, or owner email..."
                          : "Search in your venue...",
                        hintStyle: const TextStyle(color: Colors.black38, fontSize: 14),
                        border: InputBorder.none,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 32),
          
          // User Info
          Row(
            children: [
              Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    widget.role == UserRole.superAdmin ? "Super Admin" : "Venue Owner",
                    style: const TextStyle(
                      color: AppColors.title,
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                    ),
                  ),
                  Text(
                    widget.role == UserRole.superAdmin ? "System Access" : "The Safari Lounge",
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
      ),
    );
  }
}
