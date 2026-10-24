import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:url_launcher/url_launcher.dart' as url_launcher;

/// Calculates completion metrics for Step 3: Information Filling
class VenueReadinessInfo {
  final bool hasBasicInfo;
  final bool hasOwner;
  final bool hasLocation;
  final bool hasCurrency;
  final bool isLaunched;

  VenueReadinessInfo({
    required this.hasBasicInfo,
    required this.hasOwner,
    required this.hasLocation,
    required this.hasCurrency,
    required this.isLaunched,
  });

  factory VenueReadinessInfo.fromVenue(VenueModel venue) {
    final hasBasic = venue.name.trim().isNotEmpty && venue.category.trim().isNotEmpty;
    final hasOwner = venue.ownerEmail != null && venue.ownerEmail!.trim().isNotEmpty;
    final hasLoc = venue.address.trim().isNotEmpty || (venue.googleMapsUrl != null && venue.googleMapsUrl!.isNotEmpty);
    final hasCurr = venue.currency.trim().isNotEmpty;
    final launched = venue.isActive && !venue.isManuallyBlocked;

    return VenueReadinessInfo(
      hasBasicInfo: hasBasic,
      hasOwner: hasOwner,
      hasLocation: hasLoc,
      hasCurrency: hasCurr,
      isLaunched: launched,
    );
  }

  int get completedSteps {
    int count = 0;
    if (hasBasicInfo) count++;
    if (hasOwner) count++;
    if (hasLocation) count++;
    if (hasCurrency) count++;
    return count;
  }

  int get totalSteps => 4;
  double get progress => completedSteps / totalSteps;
  int get percentage => (progress * 100).round();
}

/// Helper methods for lifecycle actions: launch, pause, assign owner
class VenueLifecycleHelper {
  static Future<void> launchVenue(BuildContext context, VenueModel venue) async {
    try {
      await FirebaseFirestore.instance.collection('venues').doc(venue.id).update({
        'isActive': true,
        'isManuallyBlocked': false,
        'launchedAt': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
      });

      if (context.mounted) {
        showDialog(
          context: context,
          barrierDismissible: true,
          builder: (ctx) => VenueLaunchCelebrationDialog(venue: venue),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Ошибка запуска заведения: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  static Future<void> pauseVenue(BuildContext context, VenueModel venue) async {
    final confirmed = await showCupertinoDialog<bool>(
      context: context,
      builder: (ctx) => CupertinoAlertDialog(
        title: const Text('Приостановить заведение?'),
        content: Text('Заведение "${venue.name}" будет переведено в режим подготовки. Гости не смогут оформлять новые заказы или бронировать рейсы.'),
        actions: [
          CupertinoDialogAction(
            child: const Text('Отмена'),
            onPressed: () => Navigator.pop(ctx, false),
          ),
          CupertinoDialogAction(
            isDestructiveAction: true,
            child: const Text('Приостановить'),
            onPressed: () => Navigator.pop(ctx, true),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await FirebaseFirestore.instance.collection('venues').doc(venue.id).update({
          'isActive': false,
          'updatedAt': FieldValue.serverTimestamp(),
        });

        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Заведение "${venue.name}" приостановлено и переведено в режим подготовки.'),
              backgroundColor: AppColors.accentOrange,
            ),
          );
        }
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Ошибка приостановки: $e'), backgroundColor: Colors.red),
          );
        }
      }
    }
  }

  static Future<void> assignOwner({
    required BuildContext context,
    required String venueId,
    required String email,
    String? name,
    required String role, // 'owner', 'admin', 'manager'
  }) async {
    final cleanEmail = email.trim().toLowerCase();
    if (cleanEmail.isEmpty) return;

    try {
      final db = FirebaseFirestore.instance;
      final usersSnap = await db.collection('users').where('email', isEqualTo: cleanEmail).limit(1).get();

      String targetUserId;
      if (usersSnap.docs.isNotEmpty) {
        final doc = usersSnap.docs.first;
        targetUserId = doc.id;
        await db.collection('users').doc(targetUserId).set({
          'venueId': venueId,
          'role': role,
          'updatedAt': FieldValue.serverTimestamp(),
        }, SetOptions(merge: true));
      } else {
        final newDoc = db.collection('users').doc();
        targetUserId = newDoc.id;
        await newDoc.set({
          'email': cleanEmail,
          'displayName': name?.trim().isNotEmpty == true ? name!.trim() : cleanEmail.split('@').first,
          'name': name?.trim().isNotEmpty == true ? name!.trim() : cleanEmail.split('@').first,
          'venueId': venueId,
          'role': role,
          'createdAt': FieldValue.serverTimestamp(),
          'updatedAt': FieldValue.serverTimestamp(),
        });
      }

      final venueUpdates = <String, dynamic>{
        'updatedAt': FieldValue.serverTimestamp(),
      };
      if (role == 'owner') {
        venueUpdates['ownerId'] = targetUserId;
        venueUpdates['ownerEmail'] = cleanEmail;
      } else if (role == 'admin') {
        venueUpdates['assignedAdminId'] = targetUserId;
      } else if (role == 'manager') {
        venueUpdates['assignedManagerId'] = targetUserId;
      }

      await db.collection('venues').doc(venueId).update(venueUpdates);

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('$cleanEmail успешно назначен ($role) заведения!'),
            backgroundColor: AppColors.accentGreen,
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Ошибка назначения: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }
}

/// The 4-Step Interactive Lifecycle Header Bar
class VenueLifecycleStepper extends StatelessWidget {
  final VenueModel venue;
  final Function(int tabIndex)? onSelectTab;

  const VenueLifecycleStepper({
    super.key,
    required this.venue,
    this.onSelectTab,
  });

  @override
  Widget build(BuildContext context) {
    final readiness = VenueReadinessInfo.fromVenue(venue);
    final hasOwner = readiness.hasOwner;
    final isLive = venue.isActive && !venue.isManuallyBlocked;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF141416),
        border: Border(
          bottom: BorderSide(color: Colors.white.withOpacity(0.08)),
        ),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final isNarrow = constraints.maxWidth < 900;

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top line: Status summary + Launch Actions
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: isLive
                          ? AppColors.accentGreen.withOpacity(0.15)
                          : AppColors.accentYellow.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isLive ? AppColors.accentGreen : AppColors.accentYellow,
                        width: 1,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          isLive ? CupertinoIcons.check_mark_circled_solid : CupertinoIcons.hourglass,
                          size: 13,
                          color: isLive ? AppColors.accentGreen : AppColors.accentYellow,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          isLive ? 'ЭТАП 4: ЗАПУЩЕНО ОНЛАЙН' : 'ЭТАП 3: НАПОЛНЕНИЕ (${readiness.percentage}%)',
                          style: TextStyle(
                            color: isLive ? AppColors.accentGreen : AppColors.accentYellow,
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Spacer(),

                  // Quick Action Buttons
                  if (!isLive) ...[
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.accentGreen,
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 3,
                      ),
                      onPressed: () => VenueLifecycleHelper.launchVenue(context, venue),
                      icon: const Icon(CupertinoIcons.rocket_fill, size: 16),
                      label: const Text(
                        'ЗАПУСТИТЬ ЗАВЕДЕНИЕ 🚀',
                        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13),
                      ),
                    ),
                  ] else ...[
                    OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white70,
                        side: BorderSide(color: Colors.white.withOpacity(0.2)),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      onPressed: () => VenueLifecycleHelper.pauseVenue(context, venue),
                      icon: const Icon(CupertinoIcons.pause_fill, size: 13),
                      label: const Text('Приостановить', style: TextStyle(fontSize: 12)),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.accentTeal.withOpacity(0.2),
                        foregroundColor: AppColors.accentTeal,
                        side: const BorderSide(color: AppColors.accentTeal),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      onPressed: () {
                        showDialog(
                          context: context,
                          builder: (ctx) => VenueLaunchCelebrationDialog(venue: venue),
                        );
                      },
                      icon: const Icon(CupertinoIcons.qrcode, size: 15),
                      label: const Text('Витрина & QR', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 12),

              // 4-Step Visual Stepper Progress Bar
              if (!isNarrow)
                Row(
                  children: [
                    _buildStepChip(
                      stepNumber: 1,
                      title: 'Создание',
                      subtitle: venue.name,
                      isCompleted: true,
                      isActive: false,
                      icon: CupertinoIcons.building_2_fill,
                    ),
                    _buildConnector(isCompleted: true),
                    _buildStepChip(
                      stepNumber: 2,
                      title: 'Владелец',
                      subtitle: hasOwner ? (venue.ownerEmail ?? 'Назначен') : 'Не назначен ⚠️',
                      isCompleted: hasOwner,
                      isActive: !hasOwner,
                      icon: CupertinoIcons.person_badge_plus_fill,
                      onTap: () {
                        showDialog(
                          context: context,
                          builder: (ctx) => VenueTeamOwnershipDialog(venue: venue),
                        );
                      },
                    ),
                    _buildConnector(isCompleted: readiness.percentage >= 75),
                    _buildStepChip(
                      stepNumber: 3,
                      title: 'Наполнение',
                      subtitle: '${readiness.percentage}% заполнено',
                      isCompleted: readiness.percentage >= 100,
                      isActive: !isLive,
                      icon: CupertinoIcons.doc_text_fill,
                      onTap: () {
                        if (onSelectTab != null) onSelectTab!(0); // Open passport / 3-stages
                      },
                    ),
                    _buildConnector(isCompleted: isLive),
                    _buildStepChip(
                      stepNumber: 4,
                      title: 'Запуск',
                      subtitle: isLive ? 'Работает онлайн' : 'Ожидает запуска',
                      isCompleted: isLive,
                      isActive: isLive,
                      icon: CupertinoIcons.rocket_fill,
                      onTap: () {
                        if (!isLive) {
                          VenueLifecycleHelper.launchVenue(context, venue);
                        } else {
                          showDialog(
                            context: context,
                            builder: (ctx) => VenueLaunchCelebrationDialog(venue: venue),
                          );
                        }
                      },
                    ),
                  ],
                )
              else
                // Compact mobile progress bar
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: isLive ? 1.0 : (readiness.progress * 0.75),
                        backgroundColor: Colors.white.withOpacity(0.08),
                        valueColor: AlwaysStoppedAnimation<Color>(
                          isLive ? AppColors.accentGreen : AppColors.accentYellow,
                        ),
                        minHeight: 6,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '1. Создано ✓  •  2. Владелец: ${hasOwner ? "✓" : "❌"}  •  3. Наполнение: ${readiness.percentage}%',
                          style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 11),
                        ),
                        Text(
                          isLive ? '4. LIVE 🟢' : '4. Ждет запуска',
                          style: TextStyle(
                            color: isLive ? AppColors.accentGreen : AppColors.accentYellow,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildStepChip({
    required int stepNumber,
    required String title,
    required String subtitle,
    required bool isCompleted,
    required bool isActive,
    required IconData icon,
    VoidCallback? onTap,
  }) {
    final borderColor = isCompleted
        ? AppColors.accentGreen.withOpacity(0.6)
        : (isActive ? AppColors.accentYellow : Colors.white.withOpacity(0.12));
    final bgColor = isCompleted
        ? AppColors.accentGreen.withOpacity(0.08)
        : (isActive ? AppColors.accentYellow.withOpacity(0.08) : Colors.white.withOpacity(0.03));
    final iconColor = isCompleted
        ? AppColors.accentGreen
        : (isActive ? AppColors.accentYellow : Colors.white38);

    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: borderColor),
          ),
          child: Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: iconColor.withOpacity(0.2),
                ),
                child: Icon(icon, size: 14, color: iconColor),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '$stepNumber. $title',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.9),
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      subtitle,
                      style: TextStyle(
                        color: isCompleted ? AppColors.accentGreen : Colors.white38,
                        fontSize: 10,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildConnector({required bool isCompleted}) {
    return Container(
      width: 14,
      height: 2,
      margin: const EdgeInsets.symmetric(horizontal: 4),
      color: isCompleted ? AppColors.accentGreen.withOpacity(0.6) : Colors.white.withOpacity(0.12),
    );
  }
}

/// Triumph Dialog when venue is launched, with live QR, links and share buttons
class VenueLaunchCelebrationDialog extends StatelessWidget {
  final VenueModel venue;
  const VenueLaunchCelebrationDialog({super.key, required this.venue});

  @override
  Widget build(BuildContext context) {
    final origin = Uri.base.origin;
    final pwaUrl = "$origin/?v=${venue.id}&source=google_maps";

    return Dialog(
      backgroundColor: const Color(0xFF1C1C1E),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
        side: const BorderSide(color: AppColors.accentGreen, width: 1.5),
      ),
      child: Container(
        width: 520,
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Success Animation Icon
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.accentGreen.withOpacity(0.18),
                border: Border.all(color: AppColors.accentGreen, width: 2),
              ),
              child: const Icon(CupertinoIcons.rocket_fill, color: AppColors.accentGreen, size: 32),
            ),
            const SizedBox(height: 16),

            const Text(
              "Заведение успешно запущено! 🚀",
              style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 6),
            Text(
              "Витрина заведения \"${venue.name}\" активна и принимает бронирования и заказы от гостей.",
              style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 13),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),

            // Live QR Code Widget
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(color: AppColors.accentGreen.withOpacity(0.3), blurRadius: 16, offset: const Offset(0, 4)),
                ],
              ),
              child: QrImageView(
                data: pwaUrl,
                version: QrVersions.auto,
                size: 180,
                backgroundColor: Colors.white,
                eyeStyle: const QrEyeStyle(eyeShape: QrEyeShape.square, color: Colors.black),
                dataModuleStyle: const QrDataModuleStyle(dataModuleShape: QrDataModuleShape.square, color: Colors.black),
              ),
            ),
            const SizedBox(height: 20),

            // Link URL Box
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.4),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withOpacity(0.15)),
              ),
              child: Row(
                children: [
                  const Icon(CupertinoIcons.link, size: 14, color: AppColors.accentTeal),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      pwaUrl,
                      style: const TextStyle(color: AppColors.accentTeal, fontSize: 12, fontWeight: FontWeight.w600),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(CupertinoIcons.doc_on_clipboard, size: 16, color: Colors.white70),
                    tooltip: 'Скопировать ссылку',
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: pwaUrl));
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Ссылка скопирована в буфер обмена!'), backgroundColor: AppColors.accentTeal),
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Action Buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: BorderSide(color: Colors.white.withOpacity(0.2)),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    onPressed: () {
                      final tgUrl = "https://t.me/share/url?url=${Uri.encodeComponent(pwaUrl)}&text=${Uri.encodeComponent('Забронируйте поездку и услуги в ${venue.name}!')}";
                      url_launcher.launchUrl(Uri.parse(tgUrl), mode: url_launcher.LaunchMode.externalApplication);
                    },
                    icon: const Icon(CupertinoIcons.paperplane_fill, size: 16, color: AppColors.accentTeal),
                    label: const Text('В Telegram', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.accentGreen,
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    onPressed: () {
                      url_launcher.launchUrl(Uri.parse(pwaUrl), mode: url_launcher.LaunchMode.externalApplication);
                    },
                    icon: const Icon(CupertinoIcons.globe, size: 16),
                    label: const Text('Открыть витрину', style: TextStyle(fontWeight: FontWeight.w900)),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Quick Modal for Step 2: Assigning/Changing Owner & Admins
class VenueTeamOwnershipDialog extends StatefulWidget {
  final VenueModel venue;
  const VenueTeamOwnershipDialog({super.key, required this.venue});

  @override
  State<VenueTeamOwnershipDialog> createState() => _VenueTeamOwnershipDialogState();
}

class _VenueTeamOwnershipDialogState extends State<VenueTeamOwnershipDialog> {
  final _emailCtrl = TextEditingController();
  final _nameCtrl = TextEditingController();
  String _selectedRole = 'owner';
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _emailCtrl.text = widget.venue.ownerEmail ?? '';
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    _nameCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: const Color(0xFF1C1C1E),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(color: Colors.white.withOpacity(0.15)),
      ),
      child: Container(
        width: 480,
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(CupertinoIcons.person_badge_plus_fill, color: AppColors.accentTeal, size: 22),
                const SizedBox(width: 10),
                const Expanded(
                  child: Text(
                    "Назначение владельца и ролей",
                    style: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.bold),
                  ),
                ),
                IconButton(
                  icon: const Icon(CupertinoIcons.xmark, color: Colors.white54, size: 18),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Text(
              "Заведение: ${widget.venue.name}",
              style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 13),
            ),
            const SizedBox(height: 20),

            // Role Selector
            CupertinoSegmentedControl<String>(
              groupValue: _selectedRole,
              children: const {
                'owner': Padding(padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8), child: Text('Владелец (Owner)')),
                'admin': Padding(padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8), child: Text('Админ (Admin)')),
                'manager': Padding(padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8), child: Text('Менеджер')),
              },
              onValueChanged: (val) => setState(() => _selectedRole = val),
            ),
            const SizedBox(height: 20),

            // Email input
            const Text("Email пользователя", style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            CupertinoTextField(
              controller: _emailCtrl,
              placeholder: "owner@company.com",
              style: const TextStyle(color: Colors.white, fontSize: 14),
              placeholderStyle: TextStyle(color: Colors.white.withOpacity(0.3)),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.3),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.white.withOpacity(0.15)),
              ),
            ),
            const SizedBox(height: 14),

            // Name input
            const Text("Имя / Контакт (для новых пользователей)", style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            CupertinoTextField(
              controller: _nameCtrl,
              placeholder: "Алексей Смирнов",
              style: const TextStyle(color: Colors.white, fontSize: 14),
              placeholderStyle: TextStyle(color: Colors.white.withOpacity(0.3)),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.3),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.white.withOpacity(0.15)),
              ),
            ),
            const SizedBox(height: 24),

            // Save button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.accentTeal,
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: _isSaving
                    ? null
                    : () async {
                        setState(() => _isSaving = true);
                        await VenueLifecycleHelper.assignOwner(
                          context: context,
                          venueId: widget.venue.id,
                          email: _emailCtrl.text,
                          name: _nameCtrl.text,
                          role: _selectedRole,
                        );
                        if (mounted) {
                          setState(() => _isSaving = false);
                          Navigator.pop(context);
                        }
                      },
                child: _isSaving
                    ? const CupertinoActivityIndicator(color: Colors.black)
                    : const Text("СОХРАНИТЬ ПРИВЯЗКУ", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
