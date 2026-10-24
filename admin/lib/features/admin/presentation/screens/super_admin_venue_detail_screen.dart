import 'package:friendly_code/features/admin/presentation/screens/venue_three_stage_workspace_screen.dart';
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
import 'package:friendly_code/features/owner/presentation/screens/delivery_menu_manager_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/delivery_loyalty_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/delivery_logistics_payment_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/venue_regional_settings_screen.dart';
import 'package:friendly_code/features/services/presentation/screens/services_catalog_screen.dart';
import 'package:friendly_code/features/services/presentation/screens/staff_management_screen.dart';
import 'package:friendly_code/features/services/presentation/screens/fleet_management_screen.dart';
import 'package:friendly_code/features/services/presentation/screens/yield_rules_screen.dart';
import 'package:friendly_code/features/services/presentation/screens/ai_concierge_config_screen.dart';
import 'package:friendly_code/features/services/presentation/screens/trip_dispatcher_screen.dart';

class SuperAdminVenueDetailScreen extends StatefulWidget {
  final VenueModel venue;
  final bool showAppBar;
  const SuperAdminVenueDetailScreen({super.key, required this.venue, this.showAppBar = true});

  @override
  State<SuperAdminVenueDetailScreen> createState() => _SuperAdminVenueDetailScreenState();
}

typedef VenueDetailWorkspaceScreen = SuperAdminVenueDetailScreen;

class _SuperAdminVenueDetailScreenState extends State<SuperAdminVenueDetailScreen> {
  int _selectedTab = 0;

  bool get _isBatch => widget.venue.archetype == 'batch' || 
      widget.venue.category.toLowerCase().contains('виза') || 
      widget.venue.category.toLowerCase().contains('бордер') || 
      widget.venue.category.toLowerCase().contains('трансфер');
  bool get _isServices => widget.venue.gmConfig.businessType == 'services' || _isBatch;

  List<_TabItem> get _tabs {
    if (_isServices) {
      if (_isBatch) {
        return const [
          _TabItem(icon: CupertinoIcons.sparkles,                 label: 'Паспорт & AI (3 этапа)'),
          _TabItem(icon: CupertinoIcons.bus,                      label: 'Автопарк & Шаблоны'),
          _TabItem(icon: CupertinoIcons.map_fill,                 label: 'Маршруты & Тарифы'),
          _TabItem(icon: CupertinoIcons.percent,                 label: 'Yield & Скидки'),
          _TabItem(icon: CupertinoIcons.airplane,                 label: 'Расписание & Диспетчерская'),
          _TabItem(icon: CupertinoIcons.person_2_fill,            label: 'Пассажиры & Маркетинг'),
          _TabItem(icon: CupertinoIcons.slider_horizontal_3,     label: 'Региональные настройки'),
        ];
      }
      return const [
        _TabItem(icon: CupertinoIcons.sparkles,                 label: 'Паспорт & AI (3 этапа)'),
        _TabItem(icon: CupertinoIcons.info_circle_fill,        label: 'Инфо'),
        _TabItem(icon: CupertinoIcons.sparkles,                 label: 'Услуги (Каталог)'),
        _TabItem(icon: CupertinoIcons.person_2_fill,           label: 'Мастера & Смены'),
        _TabItem(icon: CupertinoIcons.percent,                 label: 'Yield Доходность'),
        _TabItem(icon: CupertinoIcons.chat_bubble_2_fill,      label: 'AI-Консьерж'),
        _TabItem(icon: CupertinoIcons.slider_horizontal_3,     label: 'Региональные настройки'),
        _TabItem(icon: CupertinoIcons.person_crop_circle_fill, label: 'Клиенты'),
        _TabItem(icon: CupertinoIcons.rocket_fill,             label: 'Маркетинг'),
      ];
    }
    return const [
      _TabItem(icon: CupertinoIcons.sparkles,                 label: 'Паспорт & AI (3 этапа)'),
      _TabItem(icon: CupertinoIcons.info_circle_fill,        label: 'Info'),
      _TabItem(icon: CupertinoIcons.slider_horizontal_3,     label: 'Региональные настройки'),
      _TabItem(icon: CupertinoIcons.percent,                 label: 'Loyalty'),
      _TabItem(icon: CupertinoIcons.creditcard_fill,         label: 'Deposits'),
      _TabItem(icon: CupertinoIcons.cart_fill,               label: 'Menu & Scraper'),
      _TabItem(icon: CupertinoIcons.timer,                   label: 'Delivery Loyalty'),
      _TabItem(icon: CupertinoIcons.cube_box_fill,           label: 'Logistics & Pay'),
      _TabItem(icon: CupertinoIcons.person_2_fill,           label: 'Staff'),
      _TabItem(icon: CupertinoIcons.person_crop_circle_fill, label: 'Guests'),
      _TabItem(icon: CupertinoIcons.rocket_fill,             label: 'Marketing'),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final venue = widget.venue;

    if (!widget.showAppBar) {
      return Scaffold(
        backgroundColor: AppColors.background,
        body: Column(
          children: [
            _buildTabBar(),
            Expanded(child: _buildBody(venue)),
          ],
        ),
      );
    }

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
            Row(
              children: [
                Text(
                  venue.name,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 17),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: _isServices 
                        ? AppColors.accentTeal.withValues(alpha: 0.2) 
                        : AppColors.accentOrange.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                      color: _isServices ? AppColors.accentTeal : AppColors.accentOrange,
                      width: 0.8,
                    ),
                  ),
                  child: Text(
                    _isServices ? 'SERVICES' : 'HORECA',
                    style: TextStyle(
                      color: _isServices ? AppColors.accentTeal : AppColors.accentOrange,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
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
    final tabs = _tabs;
    final activeTab = _selectedTab >= tabs.length ? 0 : _selectedTab;

    return Container(
      height: 56,
      decoration: BoxDecoration(
        color: AppColors.surface.withValues(alpha: 0.5),
        border: const Border(bottom: BorderSide(color: AppColors.macosDivider)),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Row(
          children: List.generate(tabs.length, (i) {
            final tab = tabs[i];
            final isSelected = activeTab == i;
            return GestureDetector(
              onTap: () => setState(() => _selectedTab = i),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.only(right: 8),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: isSelected 
                      ? (_isServices ? AppColors.accentTeal : AppColors.accentOrange).withValues(alpha: 0.15) 
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isSelected 
                        ? (_isServices ? AppColors.accentTeal : AppColors.accentOrange).withValues(alpha: 0.5) 
                        : Colors.transparent,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      tab.icon,
                      size: 14,
                      color: isSelected 
                          ? (_isServices ? AppColors.accentTeal : AppColors.accentOrange) 
                          : AppColors.tertiary,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      tab.label,
                      style: TextStyle(
                        color: isSelected 
                            ? (_isServices ? AppColors.accentTeal : AppColors.accentOrange) 
                            : AppColors.tertiary,
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
    if (_isServices) {
      if (_isBatch) {
        switch (_selectedTab) {
          case 0:
            return VenueThreeStageWorkspaceScreen(venue: venue, venueId: venue.id);
          case 1:
            return FleetManagementScreen(venueId: venue.id);
          case 2:
            return ServicesCatalogScreen(venueId: venue.id, currency: venue.currency, archetype: 'batch');
          case 3:
            return YieldRulesScreen(venueId: venue.id, currency: venue.currency, archetype: 'batch');
          case 4:
            return TripDispatcherScreen(venueId: venue.id, currency: venue.currency);
          case 5:
            return _BatchDispatcherAndGuestsView(venue: venue);
          case 6:
            return VenueRegionalSettingsScreen(venueId: venue.id);
          default:
            return VenueThreeStageWorkspaceScreen(venue: venue, venueId: venue.id);
        }
      }

      switch (_selectedTab) {
        case 0:
          return VenueThreeStageWorkspaceScreen(venue: venue, venueId: venue.id);
        case 1:
          return VenueEditorScreen(venue: venue);
        case 2:
          return ServicesCatalogScreen(venueId: venue.id, currency: venue.currency, archetype: 'personal_time');
        case 3:
          return StaffManagementScreen(venueId: venue.id);
        case 4:
          return YieldRulesScreen(venueId: venue.id);
        case 5:
          return AiConciergeConfigScreen(venueId: venue.id);
        case 6:
          return VenueRegionalSettingsScreen(venueId: venue.id);
        case 7:
          return GuestListScreen(venueId: venue.id);
        case 8:
          return MarketingBlastScreen(venueId: venue.id);
        default:
          return VenueThreeStageWorkspaceScreen(venue: venue, venueId: venue.id);
      }
    }

    switch (_selectedTab) {
      case 0:
        return VenueThreeStageWorkspaceScreen(venue: venue, venueId: venue.id);
      case 1:
        return VenueEditorScreen(venue: venue);
      case 2:
        return VenueRegionalSettingsScreen(venueId: venue.id);
      case 3:
        return RulesConfigScreen(venueId: venue.id);
      case 4:
        return DepositTiersSetupScreen(venueId: venue.id);
      case 5:
        return DeliveryMenuManagerScreen(venueId: venue.id);
      case 6:
        return DeliveryLoyaltyScreen(venueId: venue.id);
      case 7:
        return DeliveryLogisticsPaymentScreen(venueId: venue.id);
      case 8:
        return VenueStaffScreen(venueId: venue.id);
      case 9:
        return GuestListScreen(venueId: venue.id);
      case 10:
        return MarketingBlastScreen(venueId: venue.id);
      default:
        return VenueThreeStageWorkspaceScreen(venue: venue, venueId: venue.id);
    }
  }
}

class _TabItem {
  final IconData icon;
  final String label;
  const _TabItem({required this.icon, required this.label});
}


class _BatchProductsAndFleetView extends StatefulWidget {
  final VenueModel venue;
  const _BatchProductsAndFleetView({required this.venue});

  @override
  State<_BatchProductsAndFleetView> createState() => _BatchProductsAndFleetViewState();
}

class _BatchProductsAndFleetViewState extends State<_BatchProductsAndFleetView> {
  int _subIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          color: AppColors.surface,
          child: Row(
            children: [
              _buildSubButton(0, CupertinoIcons.sparkles, "Рейсы & Тарифы"),
              const SizedBox(width: 8),
              _buildSubButton(1, CupertinoIcons.bus, "Автопарк & Схемы мест"),
            ],
          ),
        ),
        Expanded(
          child: _subIndex == 0
              ? ServicesCatalogScreen(venueId: widget.venue.id, currency: widget.venue.currency, archetype: 'batch')
              : FleetManagementScreen(venueId: widget.venue.id),
        ),
      ],
    );
  }

  Widget _buildSubButton(int index, IconData icon, String label) {
    final isSelected = _subIndex == index;
    return GestureDetector(
      onTap: () => setState(() => _subIndex = index),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.accentTeal.withValues(alpha: 0.2) : Colors.black.withValues(alpha: 0.2),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: isSelected ? AppColors.accentTeal : Colors.white12),
        ),
        child: Row(
          children: [
            Icon(icon, size: 14, color: isSelected ? AppColors.accentTeal : Colors.white70),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? AppColors.accentTeal : Colors.white70,
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BatchDispatcherAndGuestsView extends StatefulWidget {
  final VenueModel venue;
  const _BatchDispatcherAndGuestsView({required this.venue});

  @override
  State<_BatchDispatcherAndGuestsView> createState() => _BatchDispatcherAndGuestsViewState();
}

class _BatchDispatcherAndGuestsViewState extends State<_BatchDispatcherAndGuestsView> {
  int _subIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          color: AppColors.surface,
          child: Row(
            children: [
              _buildSubButton(0, CupertinoIcons.person_crop_circle_fill, "Пассажиры & Брони"),
              const SizedBox(width: 8),
              _buildSubButton(1, CupertinoIcons.rocket_fill, "Маркетинг & Рассылки"),
            ],
          ),
        ),
        Expanded(
          child: _subIndex == 0
              ? GuestListScreen(venueId: widget.venue.id)
              : MarketingBlastScreen(venueId: widget.venue.id),
        ),
      ],
    );
  }

  Widget _buildSubButton(int index, IconData icon, String label) {
    final isSelected = _subIndex == index;
    return GestureDetector(
      onTap: () => setState(() => _subIndex = index),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.accentTeal.withValues(alpha: 0.2) : Colors.black.withValues(alpha: 0.2),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: isSelected ? AppColors.accentTeal : Colors.white12),
        ),
        child: Row(
          children: [
            Icon(icon, size: 14, color: isSelected ? AppColors.accentTeal : Colors.white70),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? AppColors.accentTeal : Colors.white70,
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
