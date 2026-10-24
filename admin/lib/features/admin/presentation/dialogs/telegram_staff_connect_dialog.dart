import 'dart:convert';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart' as url_launcher;
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/theme/colors.dart';

/// Modal dialog providing step-by-step onboarding for launching and linking
/// the Telegram Bot and Staff/Dispatcher Team Group to a venue.
class TelegramStaffConnectDialog extends StatefulWidget {
  final VenueModel venue;

  const TelegramStaffConnectDialog({super.key, required this.venue});

  @override
  State<TelegramStaffConnectDialog> createState() => _TelegramStaffConnectDialogState();
}

class _TelegramStaffConnectDialogState extends State<TelegramStaffConnectDialog> {
  bool _isSendingTestPing = false;
  String? _testPingResult;

  static const List<String> _aiProxyEndpoints = [
    '/api/ai-proxy',
    'https://bot-lab-21910.web.app/api/ai-proxy',
    'https://friendly-code-489513.web.app/api/ai-proxy',
  ];

  Future<void> _sendTestPing(String chatId, String venueName) async {
    setState(() {
      _isSendingTestPing = true;
      _testPingResult = null;
    });

    bool success = false;
    for (final endpoint in _aiProxyEndpoints) {
      try {
        final res = await http.post(
          Uri.parse(endpoint),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'mode': 'telegram_test_ping',
            'chatId': chatId,
            'venueName': venueName,
          }),
        ).timeout(const Duration(seconds: 12));

        if (res.statusCode == 200) {
          final data = jsonDecode(res.body);
          if (data['ok'] == true) {
            success = true;
            break;
          }
        }
      } catch (_) {}
    }

    if (!mounted) return;
    setState(() {
      _isSendingTestPing = false;
      _testPingResult = success
          ? 'Тестовое сообщение успешно отправлено в чат команды!'
          : 'Не удалось отправить. Убедитесь, что бот состоит в группе.';
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          success
              ? '✅ Тестовое сообщение доставлено в Telegram!'
              : '⚠️ Ошибка доставки тестового сообщения',
        ),
        backgroundColor: success ? AppColors.accentGreen : Colors.redAccent,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  void _copyToClipboard(String text, String successMsg) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(CupertinoIcons.checkmark_alt, color: Colors.white, size: 18),
            const SizedBox(width: 8),
            Expanded(child: Text(successMsg)),
          ],
        ),
        backgroundColor: const Color(0xFF1E2024),
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final venueId = widget.venue.id;
    final botUsername = 'FriendIycode_bot';
    final oneClickAddUrl = 'https://t.me/$botUsername?startgroup=reg_$venueId';
    final managerDirectUrl = 'https://t.me/$botUsername?start=mgr_$venueId';
    final registerCmd = '/register_venue $venueId';

    return StreamBuilder<DocumentSnapshot>(
      stream: FirebaseFirestore.instance.collection('venues').doc(venueId).snapshots(),
      builder: (context, snapshot) {
        final data = snapshot.data?.data() as Map<String, dynamic>?;
        final currentGroupId = data?['telegramGroupId']?.toString() ??
            data?['telegram_group_id']?.toString() ??
            widget.venue.telegramGroupId;
        final isConnected = currentGroupId.trim().isNotEmpty;
        final venueName = data?['name']?.toString() ?? widget.venue.name;

        return Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
          child: Container(
            width: 640,
            constraints: const BoxConstraints(maxHeight: 740),
            decoration: BoxDecoration(
              color: const Color(0xFF15161A),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: isConnected
                    ? AppColors.accentTeal.withValues(alpha: 0.5)
                    : const Color(0xFF0088CC).withValues(alpha: 0.4),
                width: 1.2,
              ),
              boxShadow: [
                BoxShadow(
                  color: (isConnected ? AppColors.accentTeal : const Color(0xFF0088CC))
                      .withValues(alpha: 0.15),
                  blurRadius: 30,
                  spreadRadius: 2,
                ),
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.6),
                  blurRadius: 40,
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // ── HEADER ──
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1A1C23),
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                    border: Border(
                      bottom: BorderSide(color: Colors.white.withValues(alpha: 0.08)),
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF0088CC), Color(0xFF2AABEE)],
                          ),
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF0088CC).withValues(alpha: 0.4),
                              blurRadius: 10,
                            ),
                          ],
                        ),
                        child: const Icon(CupertinoIcons.paperplane_fill, color: Colors.white, size: 20),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Подключение Telegram-бота и группы команды',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                                fontSize: 16,
                                letterSpacing: 0.2,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '$venueName  •  ID: $venueId',
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.6),
                                fontSize: 12,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(CupertinoIcons.xmark_circle_fill, color: Colors.white38, size: 22),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                ),

                // ── CONTENT BODY ──
                Flexible(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(22),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Live Status Badge
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: isConnected
                                ? AppColors.accentTeal.withValues(alpha: 0.12)
                                : Colors.amber.withValues(alpha: 0.10),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: isConnected
                                  ? AppColors.accentTeal.withValues(alpha: 0.4)
                                  : Colors.amber.withValues(alpha: 0.35),
                            ),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                isConnected
                                    ? CupertinoIcons.checkmark_seal_fill
                                    : CupertinoIcons.clock_fill,
                                color: isConnected ? AppColors.accentTeal : Colors.amberAccent,
                                size: 22,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      isConnected
                                          ? 'Группа команды подключена!'
                                          : 'Ожидает подключения группы в Telegram',
                                      style: TextStyle(
                                        color: isConnected ? Colors.white : Colors.amberAccent,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 13,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      isConnected
                                          ? 'ID группы: $currentGroupId  •  Заявки и обучение активны'
                                          : 'Добавьте бота в рабочий чат для мгновенного приема заявок',
                                      style: TextStyle(
                                        color: Colors.white.withValues(alpha: 0.7),
                                        fontSize: 11.5,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              if (isConnected) ...[
                                ElevatedButton.icon(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.accentTeal.withValues(alpha: 0.25),
                                    foregroundColor: AppColors.accentTeal,
                                    side: const BorderSide(color: AppColors.accentTeal),
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                  ),
                                  onPressed: _isSendingTestPing
                                      ? null
                                      : () => _sendTestPing(currentGroupId, venueName),
                                  icon: _isSendingTestPing
                                      ? const SizedBox(
                                          width: 12,
                                          height: 12,
                                          child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.accentTeal),
                                        )
                                      : const Icon(CupertinoIcons.bolt_fill, size: 14),
                                  label: const Text(
                                    'Тест связи',
                                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                        if (_testPingResult != null) ...[
                          const SizedBox(height: 8),
                          Text(
                            _testPingResult!,
                            style: const TextStyle(color: AppColors.accentTeal, fontSize: 11),
                          ),
                        ],
                        const SizedBox(height: 20),

                        // STEP 1: AUTOMATIC ADD IN 1 CLICK
                        _buildSectionHeader(
                          step: '1',
                          title: 'Быстрый запуск в 1 клик (Рекомендуется)',
                          subtitle: 'Нажмите кнопку, выберите вашу рабочую группу — бот добавится и привяжется сам:',
                        ),
                        const SizedBox(height: 10),
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF0088CC),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            elevation: 4,
                          ),
                          onPressed: () async {
                            final uri = Uri.parse(oneClickAddUrl);
                            if (await url_launcher.canLaunchUrl(uri)) {
                              await url_launcher.launchUrl(uri, mode: url_launcher.LaunchMode.externalApplication);
                            }
                          },
                          icon: const Icon(CupertinoIcons.plus_circle_fill, size: 18),
                          label: const Text(
                            'Добавить @FriendIycode_bot в группу команды ↗',
                            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                          ),
                        ),
                        const SizedBox(height: 22),

                        // STEP 2: MANUAL REGISTRATION (IF BOT ALREADY IN GROUP)
                        _buildSectionHeader(
                          step: '2',
                          title: 'Или ручная привязка по команде',
                          subtitle: 'Если бот уже состоит в вашей группе, отправьте в чат команду:',
                        ),
                        const SizedBox(height: 10),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          decoration: BoxDecoration(
                            color: const Color(0xFF0F1012),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
                          ),
                          child: Row(
                            children: [
                              const Icon(CupertinoIcons.chevron_left_slash_chevron_right, size: 15, color: AppColors.accentTeal),
                              const SizedBox(width: 10),
                              Expanded(
                                child: SelectableText(
                                  registerCmd,
                                  style: const TextStyle(
                                    fontFamily: 'monospace',
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                    fontSize: 13,
                                  ),
                                ),
                              ),
                              ElevatedButton.icon(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.white.withValues(alpha: 0.12),
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                                onPressed: () => _copyToClipboard(
                                  registerCmd,
                                  'Команда привязки скопирована! Вставьте её в чат группы в Telegram.',
                                ),
                                icon: const Icon(CupertinoIcons.doc_on_clipboard, size: 13),
                                label: const Text('Скопировать', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 22),

                        // STEP 3: DISPATCHER DIRECT MESSAGES
                        _buildSectionHeader(
                          step: '3',
                          title: 'Личные сообщения диспетчера',
                          subtitle: 'Для персональных уведомлений менеджеров в личку бота:',
                        ),
                        const SizedBox(height: 10),
                        OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.white70,
                            side: BorderSide(color: Colors.white.withValues(alpha: 0.2)),
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          onPressed: () async {
                            final uri = Uri.parse(managerDirectUrl);
                            if (await url_launcher.canLaunchUrl(uri)) {
                              await url_launcher.launchUrl(uri, mode: url_launcher.LaunchMode.externalApplication);
                            }
                          },
                          icon: const Icon(CupertinoIcons.person_crop_circle_badge_checkmark, size: 16),
                          label: const Text('Подключить бота в личные сообщения диспетчера ↗', style: TextStyle(fontSize: 12)),
                        ),
                        const SizedBox(height: 26),

                        // ── CHEAT SHEET SUMMARY ──
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: const Color(0xFF191B22),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Icon(CupertinoIcons.pin_fill, color: Colors.amberAccent, size: 16),
                                  const SizedBox(width: 8),
                                  const Text(
                                    'Автоматическая закрепляемая памятка для команды:',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 12.5,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),
                              Text(
                                'При подключении группы бот автоматически отправит и закрепит памятку со всеми командами:\n'
                                '• 🚍 Заявки бронирования с кнопками [✅ Подтвердить] / [❌ Отклонить]\n'
                                '• 🛵 Заказы доставки с блюдами, ценами и точкой на Google Maps\n'
                                '• 🧠 /learn [текст] — мгновенное обучение ИИ новому правилу прямо из чата\n'
                                '• 🧪 /test [вопрос] — проверка, как ИИ-консьерж ответит гостю\n'
                                '• 💬 Ответ через Reply на вопрос гостя — бот запоминает факт навсегда\n'
                                '• 💰 /deposit [телефон] [сумма] — пополнение депозита гостя на кассе',
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.75),
                                  fontSize: 11.5,
                                  height: 1.55,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                // ── BOTTOM ACTION BAR ──
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                  decoration: BoxDecoration(
                    color: const Color(0xFF141519),
                    borderRadius: const BorderRadius.vertical(bottom: Radius.circular(24)),
                    border: Border(
                      top: BorderSide(color: Colors.white.withValues(alpha: 0.08)),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Все данные синхронизируются в реальном времени',
                        style: TextStyle(color: Colors.white.withValues(alpha: 0.4), fontSize: 11),
                      ),
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('Закрыть', style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildSectionHeader({
    required String step,
    required String title,
    required String subtitle,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 22,
              height: 22,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: AppColors.accentTeal.withValues(alpha: 0.15),
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.accentTeal, width: 1.2),
              ),
              child: Text(
                step,
                style: const TextStyle(
                  color: AppColors.accentTeal,
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(width: 8),
            Text(
              title,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 13,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Padding(
          padding: const EdgeInsets.only(left: 30),
          child: Text(
            subtitle,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.6),
              fontSize: 11.5,
            ),
          ),
        ),
      ],
    );
  }
}
