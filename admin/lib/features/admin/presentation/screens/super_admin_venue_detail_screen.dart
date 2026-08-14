import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/features/admin/presentation/screens/venue_editor_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/rules_config_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/deposit_tiers_setup_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/venue_staff_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/guest_list_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/marketing_blast_screen.dart';

class SuperAdminVenueDetailScreen extends StatefulWidget {
  final VenueModel venue;
  const SuperAdminVenueDetailScreen({super.key, required this.venue});

  @override
  State<SuperAdminVenueDetailScreen> createState() => _SuperAdminVenueDetailScreenState();
}

class _SuperAdminVenueDetailScreenState extends State<SuperAdminVenueDetailScreen> {
  int _selectedTab = 0;

  static const _tabs = [
    _TabItem(icon: CupertinoIcons.info_circle_fill,   label: 'Info'),
    _TabItem(icon: CupertinoIcons.percent,            label: 'Loyalty'),
    _TabItem(icon: CupertinoIcons.creditcard_fill,    label: 'Deposits'),
    _TabItem(icon: CupertinoIcons.person_2_fill,      label: 'Staff'),
    _TabItem(icon: CupertinoIcons.person_crop_circle_fill, label: 'Guests'),
    _TabItem(icon: CupertinoIcons.rocket_fill,        label: 'Marketing'),
  ];

  @override
  Widget build(BuildContext context) {
    final venue = widget.venue;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        leading: CupertinoButton(
          padding: EdgeInsets.zero,
          child: const Icon(CupertinoIcons.chevron_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              venue.name,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 17),
            ),
            Text(
              venue.ownerEmail ?? 'No owner email',
              style: const TextStyle(color: AppColors.tertiary, fontSize: 12),
            ),
          ],
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(56),
          child: _buildTabBar(),
        ),
      ),
      body: _buildBody(venue),
    );
  }

  Widget _buildTabBar() {
    return Container(
      height: 56,
      decoration: BoxDecoration(
        color: AppColors.surface.withOpacity(0.5),
        border: const Border(bottom: BorderSide(color: AppColors.macosDivider)),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Row(
          children: List.generate(_tabs.length, (i) {
            final tab = _tabs[i];
            final isSelected = _selectedTab == i;
            return GestureDetector(
              onTap: () => setState(() => _selectedTab = i),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.only(right: 8),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: isSelected ? AppColors.accentOrange.withOpacity(0.15) : Colors.transparent,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isSelected ? AppColors.accentOrange.withOpacity(0.5) : Colors.transparent,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      tab.icon,
                      size: 14,
                      color: isSelected ? AppColors.accentOrange : AppColors.tertiary,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      tab.label,
                      style: TextStyle(
                        color: isSelected ? AppColors.accentOrange : AppColors.tertiary,
                        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
        ),
      ),
    );
  }

  Widget _buildBody(VenueModel venue) {
    switch (_selectedTab) {
      case 0:
        return VenueEditorScreen(venue: venue);
      case 1:
        return RulesConfigScreen(venueId: venue.id);
      case 2:
        return DepositTiersSetupScreen(venueId: venue.id);
      case 3:
        return VenueStaffScreen(venueId: venue.id);
      case 4:
        return GuestListScreen(venueId: venue.id);
      case 5:
        return MarketingBlastScreen(venueId: venue.id);
      default:
        return VenueEditorScreen(venue: venue);
    }
  }
}

class _TabItem {
  final IconData icon;
  final String label;
  const _TabItem({required this.icon, required this.label});
}
