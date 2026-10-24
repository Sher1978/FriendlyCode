import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/features/admin/presentation/dialogs/telegram_staff_connect_dialog.dart';
import 'package:friendly_code/features/admin/presentation/widgets/venue_lifecycle_stepper.dart';
import 'package:friendly_code/features/owner/presentation/screens/delivery_menu_manager_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/venue_regional_settings_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/venue_staff_screen.dart';
import 'package:friendly_code/features/services/presentation/screens/fleet_management_screen.dart';
import 'package:friendly_code/features/services/presentation/screens/services_catalog_screen.dart';
import 'package:friendly_code/features/services/presentation/screens/yield_rules_screen.dart';

class OwnerVenueOnboardingBanner extends StatelessWidget {
  final VenueModel venue;

  const OwnerVenueOnboardingBanner({super.key, required this.venue});

  @override
  Widget build(BuildContext context) {
    final readiness = VenueReadinessInfo.fromVenue(venue);
    final isBatch = venue.archetype == 'batch' ||
        venue.category.toLowerCase().contains('виза') ||
        venue.category.toLowerCase().contains('трансфер');

    // If venue is already active and live, render sleek compact status bar
    if (venue.isActive && !venue.isManuallyBlocked) {
      return Container(
        margin: const EdgeInsets.only(bottom: 20),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: const Color(0xFF141416),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.accentGreen.withOpacity(0.3)),
        ),
        child: Row(
          children: [
            Container(
              width: 10,
              height: 10,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.accentGreen,
                boxShadow: [
                  BoxShadow(color: AppColors.accentGreen, blurRadius: 6),
                ],
              ),
            ),
            const SizedBox(width: 10),
            const Expanded(
              child: Text(
                "Заведение работает онлайн (LIVE) — гостевая витрина принимает бронирования",
                style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
              ),
            ),
            OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: venue.telegramGroupId.isNotEmpty ? AppColors.accentTeal : const Color(0xFF0088CC),
                side: BorderSide(color: venue.telegramGroupId.isNotEmpty ? AppColors.accentTeal : const Color(0xFF0088CC)),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (ctx) => TelegramStaffConnectDialog(venue: venue),
                );
              },
              icon: Icon(
                venue.telegramGroupId.isNotEmpty ? CupertinoIcons.checkmark_seal_fill : CupertinoIcons.paperplane_fill,
                size: 14,
              ),
              label: Text(
                venue.telegramGroupId.isNotEmpty ? 'TG Штаб (✓)' : 'TG Штаб & Бот',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
              ),
            ),
            const SizedBox(width: 8),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.accentTeal.withOpacity(0.18),
                foregroundColor: AppColors.accentTeal,
                side: const BorderSide(color: AppColors.accentTeal),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (ctx) => VenueLaunchCelebrationDialog(venue: venue),
                );
              },
              icon: const Icon(CupertinoIcons.qrcode, size: 14),
              label: const Text('Витрина & QR', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
            ),
            const SizedBox(width: 8),
            IconButton(
              icon: const Icon(CupertinoIcons.pause_circle, color: Colors.white54, size: 20),
              tooltip: 'Приостановить заведение',
              onPressed: () => VenueLifecycleHelper.pauseVenue(context, venue),
            ),
          ],
        ),
      );
    }

    // ── ONBOARDING & SETUP MODE: INACTIVE BANNER ──
    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0xFF1F1D15),
            const Color(0xFF16161A),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.accentYellow.withOpacity(0.4), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.4),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.accentYellow.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.accentYellow),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(CupertinoIcons.wrench_fill, size: 12, color: AppColors.accentYellow),
                    SizedBox(width: 6),
                    Text(
                      "ШАГ 3 ИЗ 4: ПОДГОТОВКА К ЗАПУСКУ",
                      style: TextStyle(
                        color: AppColors.accentYellow,
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              Text(
                "Готовность: ${readiness.percentage}%",
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
              ),
            ],
          ),
          const SizedBox(height: 12),

          const Text(
            "Ваше заведение на этапе наполнения информацией",
            style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          Text(
            "Заполните каталог рейсов и услуг, проверьте схемы автопарка и правила скидок. Вы и администратор платформы можете редактировать данные одновременно.",
            style: TextStyle(color: Colors.white.withOpacity(0.65), fontSize: 13, height: 1.4),
          ),
          const SizedBox(height: 16),

          // Progress bar
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: readiness.progress,
              backgroundColor: Colors.white.withOpacity(0.08),
              valueColor: const AlwaysStoppedAnimation<Color>(AppColors.accentYellow),
              minHeight: 6,
            ),
          ),
          const SizedBox(height: 18),

          // Interactive Checklist Grid
          LayoutBuilder(
            builder: (context, constraints) {
              final isWide = constraints.maxWidth > 650;
              return Wrap(
                spacing: 12,
                runSpacing: 10,
                children: [
                  _buildChecklistItem(
                    context: context,
                    title: "1. Контакты & Адрес",
                    isDone: readiness.hasBasicInfo && readiness.hasLocation,
                    width: isWide ? (constraints.maxWidth - 12) / 2 : constraints.maxWidth,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => VenueRegionalSettingsScreen(venueId: venue.id)),
                    ),
                  ),
                  _buildChecklistItem(
                    context: context,
                    title: isBatch ? "2. Автопарк & Рейсы" : "2. Меню & Блюда",
                    isDone: isBatch,
                    width: isWide ? (constraints.maxWidth - 12) / 2 : constraints.maxWidth,
                    onTap: () {
                      if (isBatch) {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => FleetManagementScreen(venueId: venue.id, currency: venue.currencySymbol)),
                        );
                      } else {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => DeliveryMenuManagerScreen(venueId: venue.id)),
                        );
                      }
                    },
                  ),
                  _buildChecklistItem(
                    context: context,
                    title: isBatch ? "3. Пакеты & Скидки Yield" : "3. Скидки & Happy Hours",
                    isDone: isBatch,
                    width: isWide ? (constraints.maxWidth - 12) / 2 : constraints.maxWidth,
                    onTap: () {
                      if (isBatch) {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => YieldRulesScreen(venueId: venue.id, currency: venue.currencySymbol, archetype: 'batch')),
                        );
                      } else {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => ServicesCatalogScreen(venueId: venue.id, currency: venue.currencySymbol, archetype: 'batch')),
                        );
                      }
                    },
                  ),
                  _buildChecklistItem(
                    context: context,
                    title: "4. Команда & Водители",
                    isDone: venue.ownerEmail != null && venue.ownerEmail!.isNotEmpty,
                    width: isWide ? (constraints.maxWidth - 12) / 2 : constraints.maxWidth,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => VenueStaffScreen(venueId: venue.id)),
                    ),
                  ),
                ],
              );
            },
          ),
          const SizedBox(height: 20),

          // Action Buttons: Launch Now!
          Row(
            children: [
              OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: venue.telegramGroupId.isNotEmpty ? AppColors.accentTeal : const Color(0xFF0088CC),
                side: BorderSide(color: venue.telegramGroupId.isNotEmpty ? AppColors.accentTeal : const Color(0xFF0088CC)),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (ctx) => TelegramStaffConnectDialog(venue: venue),
                );
              },
              icon: Icon(
                venue.telegramGroupId.isNotEmpty ? CupertinoIcons.checkmark_seal_fill : CupertinoIcons.paperplane_fill,
                size: 14,
              ),
              label: Text(
                venue.telegramGroupId.isNotEmpty ? 'TG Штаб (✓)' : 'TG Штаб & Бот',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
              ),
            ),
            const SizedBox(width: 8),
            ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.accentGreen,
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 4,
                ),
                onPressed: () => VenueLifecycleHelper.launchVenue(context, venue),
                icon: const Icon(CupertinoIcons.rocket_fill, size: 16),
                label: const Text(
                  "🚀 ЗАПУСТИТЬ ЗАВЕДЕНИЕ ОНЛАЙН",
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13),
                ),
              ),
              const SizedBox(width: 12),
              Text(
                "Заведение станет доступно гостям и откроет бронирование",
                style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 12),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildChecklistItem({
    required BuildContext context,
    required String title,
    required bool isDone,
    required double width,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: width,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.black.withOpacity(0.25),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isDone ? AppColors.accentGreen.withOpacity(0.4) : Colors.white.withOpacity(0.1),
          ),
        ),
        child: Row(
          children: [
            Icon(
              isDone ? CupertinoIcons.check_mark_circled_solid : CupertinoIcons.circle,
              size: 16,
              color: isDone ? AppColors.accentGreen : Colors.white38,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                title,
                style: TextStyle(
                  color: isDone ? Colors.white : Colors.white70,
                  fontSize: 13,
                  fontWeight: isDone ? FontWeight.bold : FontWeight.normal,
                ),
              ),
            ),
            const Icon(CupertinoIcons.chevron_right, size: 12, color: Colors.white38),
          ],
        ),
      ),
    );
  }
}
