import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:friendly_code/core/theme/colors.dart';

class FleetTemplateItem {
  final String id;
  final String name;
  final String category;
  final int totalCapacity;
  final List<Map<String, dynamic>> decks;

  FleetTemplateItem({
    required this.id,
    required this.name,
    required this.category,
    required this.totalCapacity,
    required this.decks,
  });

  factory FleetTemplateItem.fromMap(Map<String, dynamic> map, String id) {
    return FleetTemplateItem(
      id: id,
      name: map['name'] ?? 'Транспорт',
      category: map['category'] ?? 'minivan',
      totalCapacity: (map['totalCapacity'] as num?)?.toInt() ?? 13,
      decks: List<Map<String, dynamic>>.from(
        (map['decks'] as List<dynamic>? ?? []).map((e) => Map<String, dynamic>.from(e)),
      ),
    );
  }
}

class FleetManagementScreen extends StatefulWidget {
  final String venueId;
  final String currency;
  const FleetManagementScreen({super.key, required this.venueId, this.currency = '₫'});

  @override
  State<FleetManagementScreen> createState() => _FleetManagementScreenState();
}

class _FleetManagementScreenState extends State<FleetManagementScreen> {
  bool _isLoading = true;
  List<FleetTemplateItem> _fleet = [];

  @override
  void initState() {
    super.initState();
    _loadFleet();
  }

  Future<void> _loadFleet() async {
    setState(() => _isLoading = true);
    try {
      final snap = await FirebaseFirestore.instance
          .collection('venues')
          .doc(widget.venueId)
          .collection('fleetTemplates')
          .get();

      final list = snap.docs.map((d) => FleetTemplateItem.fromMap(d.data(), d.id)).toList();
      setState(() {
        _fleet = list;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _seedDefaultMinivan() async {
    setState(() => _isLoading = true);
    try {
      await FirebaseFirestore.instance
          .collection('venues')
          .doc(widget.venueId)
          .collection('fleetTemplates')
          .doc('toyota_commuter_13')
          .set({
        'name': 'VIP Минивэн Toyota Commuter (13 мест)',
        'category': 'minivan',
        'totalCapacity': 13,
        'decks': [
          {
            'id': 'main',
            'name': 'Основной салон',
            'badge': 'Кондиционер • Wi-Fi • USB розетки',
            'priceModifier': 0,
            'layoutType': 'seat',
            'rows': 4,
            'columns': 4,
            'seats': [
              {'id': '1A', 'label': '1A', 'row': 1, 'col': 1, 'features': ['window', 'vip', 'usb']},
              {'id': '1B', 'label': '1B', 'row': 1, 'col': 3, 'features': ['window', 'vip', 'usb']},
              {'id': '2A', 'label': '2A', 'row': 2, 'col': 1, 'features': ['window', 'usb']},
              {'id': '2B', 'label': '2B', 'row': 2, 'col': 2, 'features': ['ac_shield']},
              {'id': '2C', 'label': '2C', 'row': 2, 'col': 3, 'features': ['window', 'usb']},
              {'id': '3A', 'label': '3A', 'row': 3, 'col': 1, 'features': ['window', 'usb']},
              {'id': '3B', 'label': '3B', 'row': 3, 'col': 2, 'features': ['ac_shield']},
              {'id': '3C', 'label': '3C', 'row': 3, 'col': 3, 'features': ['window', 'usb']},
              {'id': '4A', 'label': '4A', 'row': 4, 'col': 1, 'features': ['window']},
              {'id': '4B', 'label': '4B', 'row': 4, 'col': 2, 'features': []},
              {'id': '4C', 'label': '4C', 'row': 4, 'col': 3, 'features': []},
              {'id': '4D', 'label': '4D', 'row': 4, 'col': 4, 'features': ['window', 'blocked']},
            ]
          }
        ],
        'createdAt': FieldValue.serverTimestamp(),
      });
      await _loadFleet();
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _seedSleeperBus() async {
    setState(() => _isLoading = true);
    try {
      await FirebaseFirestore.instance
          .collection('venues')
          .doc(widget.venueId)
          .collection('fleetTemplates')
          .doc('sleeper_bus_36')
          .set({
        'name': 'Двухэтажный Слипер-бас (36 полок)',
        'category': 'sleeper',
        'totalCapacity': 36,
        'decks': [
          {
            'id': 'lower',
            'name': 'Нижний ярус',
            'badge': 'Плавный ход • Без качки',
            'priceModifier': 0,
            'layoutType': 'sleeper',
            'rows': 6,
            'columns': 3,
            'seats': List.generate(18, (i) => {
              'id': 'L${(i + 1).toString().padLeft(2, '0')}',
              'label': (i + 1).toString().padLeft(2, '0'),
              'row': (i ~/ 3) + 1,
              'col': (i % 3) + 1,
              'features': (i == 17) ? ['blocked', 'guide'] : ((i % 3 != 1) ? ['window', 'usb'] : ['ac_shield', 'usb']),
            }),
          },
          {
            'id': 'upper',
            'name': 'Верхний ярус',
            'badge': 'Панорамный вид • Скидка -100 ฿',
            'priceModifier': -100,
            'layoutType': 'sleeper',
            'rows': 6,
            'columns': 3,
            'seats': List.generate(18, (i) => {
              'id': 'U${(i + 19).toString().padLeft(2, '0')}',
              'label': (i + 19).toString().padLeft(2, '0'),
              'row': (i ~/ 3) + 1,
              'col': (i % 3) + 1,
              'features': (i % 3 != 1) ? ['window', 'usb'] : ['ac_shield', 'usb'],
            }),
          }
        ],
        'createdAt': FieldValue.serverTimestamp(),
      });
      await _loadFleet();
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _toggleSeatFeature(FleetTemplateItem item, String deckId, String seatId, String feature) async {
    final updatedDecks = List<Map<String, dynamic>>.from(item.decks.map((deck) {
      final d = Map<String, dynamic>.from(deck);
      if (d['id'] == deckId) {
        final seats = List<Map<String, dynamic>>.from((d['seats'] as List<dynamic>? ?? []).map((s) {
          final sMap = Map<String, dynamic>.from(s);
          if (sMap['id'] == seatId) {
            final feats = List<String>.from(sMap['features'] as List<dynamic>? ?? []);
            if (feats.contains(feature)) {
              feats.remove(feature);
            } else {
              feats.add(feature);
            }
            sMap['features'] = feats;
          }
          return sMap;
        }));
        d['seats'] = seats;
      }
      return d;
    }));

    await FirebaseFirestore.instance
        .collection('venues')
        .doc(widget.venueId)
        .collection('fleetTemplates')
        .doc(item.id)
        .update({'decks': updatedDecks});

    _loadFleet();
  }

  Future<void> _deleteTemplate(String id) async {
    await FirebaseFirestore.instance
        .collection('venues')
        .doc(widget.venueId)
        .collection('fleetTemplates')
        .doc(id)
        .delete();
    _loadFleet();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: _isLoading
          ? const Center(child: CupertinoActivityIndicator(color: AppColors.accentTeal))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "Автопарк & Шаблоны рассадки",
                            style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                          ),
                          SizedBox(height: 4),
                          Text(
                            "Оцифровка автобусов, этажей и блокировка служебных мест (для гидов и багажа). Нажмите на кресло для смены статуса.",
                            style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 13),
                          ),
                        ],
                      ),
                      Row(
                        children: [
                          CupertinoButton(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            color: Colors.white.withValues(alpha: 0.1),
                            onPressed: _seedDefaultMinivan,
                            child: const Row(
                              children: [
                                Icon(CupertinoIcons.bus, size: 16, color: Colors.white),
                                SizedBox(width: 6),
                                Text("+ Минивэн 13 мест", style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          CupertinoButton(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            color: AppColors.accentTeal,
                            onPressed: _seedSleeperBus,
                            child: const Row(
                              children: [
                                Icon(CupertinoIcons.sparkles, size: 16, color: Colors.black),
                                SizedBox(width: 6),
                                Text("+ Слипер-бас 36 полок", style: TextStyle(color: Colors.black, fontSize: 12, fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  if (_fleet.isEmpty) ...[
                    Container(
                      padding: const EdgeInsets.all(32),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.macosDivider),
                      ),
                      child: Center(
                        child: Column(
                          children: [
                            const Icon(CupertinoIcons.bus, size: 48, color: Colors.white30),
                            const SizedBox(height: 16),
                            const Text(
                              "Автопарк пуст",
                              style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 6),
                            const Text(
                              "Создайте первый шаблон транспорта. Без него невозможно рассчитать вместимость и запустить рейсы.",
                              style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 13),
                            ),
                            const SizedBox(height: 18),
                            ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.accentTeal,
                                foregroundColor: Colors.black,
                                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              onPressed: _seedDefaultMinivan,
                              icon: const Icon(CupertinoIcons.plus, size: 16),
                              label: const Text("Создать шаблон Toyota Commuter VIP", style: TextStyle(fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ] else ...[
                    ..._fleet.map((item) => _buildFleetCard(item)),
                  ],
                ],
              ),
            ),
    );
  }

  Widget _buildFleetCard(FleetTemplateItem item) {
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.accentTeal.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.accentTeal.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(CupertinoIcons.bus, color: AppColors.accentTeal, size: 22),
                  ),
                  const SizedBox(width: 14),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.name,
                        style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        "Вместимость: ${item.totalCapacity} мест • Ярусов: ${item.decks.length} • Кликните на кресло для быстрой блокировки",
                        style: const TextStyle(color: AppColors.macosTextSecondary, fontSize: 12),
                      ),
                    ],
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(CupertinoIcons.trash, color: Colors.redAccent, size: 18),
                onPressed: () => _deleteTemplate(item.id),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Blueprint Schematic Preview (Вид сверху)
          ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: Container(
              height: 130,
              width: double.infinity,
              decoration: BoxDecoration(
                color: const Color(0xFF0F131D),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.accentTeal.withValues(alpha: 0.2)),
              ),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Image.asset(
                    item.category == 'sleeper'
                        ? 'assets/images/fleet_schematic_sleeper_topview.png'
                        : 'assets/images/fleet_schematic_minivan_topview.png',
                    fit: BoxFit.contain,
                  ),
                  Positioned(
                    top: 8,
                    left: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.75),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: AppColors.accentTeal.withValues(alpha: 0.6)),
                      ),
                      child: const Row(
                        children: [
                          Icon(CupertinoIcons.compass, size: 10, color: AppColors.accentTeal),
                          SizedBox(width: 4),
                          Text(
                            "АРХИТЕКТУРНАЯ СХЕМА КУЗОВА (ВИД СВЕРХУ)",
                            style: TextStyle(color: AppColors.accentTeal, fontSize: 9, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          const Divider(color: AppColors.macosDivider, height: 1),
          const SizedBox(height: 16),

          // Decks & Seat Maps
          ...item.decks.map((deck) {
            final deckId = deck['id']?.toString() ?? 'main';
            final seats = List<Map<String, dynamic>>.from(deck['seats'] as List<dynamic>? ?? []);
            final badge = deck['badge']?.toString() ?? '';
            final priceMod = deck['priceModifier'] ?? 0;

            return Container(
              margin: const EdgeInsets.only(bottom: 14),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.white12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Text(
                            deck['name']?.toString() ?? 'Ярус',
                            style: const TextStyle(color: AppColors.accentTeal, fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                          if (badge.isNotEmpty) ...[
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.08),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(badge, style: const TextStyle(color: Colors.white70, fontSize: 10)),
                            ),
                          ],
                        ],
                      ),
                      if (priceMod != 0)
                        Text(
                          priceMod > 0 ? "+$priceMod ${widget.currency}" : "$priceMod ${widget.currency}",
                          style: TextStyle(
                            color: priceMod > 0 ? AppColors.accentGreen : Colors.orangeAccent,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Interactive Seat layout pills
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: seats.map((s) {
                      final seatId = s['id']?.toString() ?? '';
                      final label = s['label']?.toString() ?? seatId;
                      final features = List<String>.from(s['features'] as List<dynamic>? ?? []);
                      final isBlocked = features.contains('blocked') || features.contains('guide');
                      final isVip = features.contains('vip');
                      final isWindow = features.contains('window');

                      return GestureDetector(
                        onTap: () => _showSeatOptionsDialog(item, deckId, seatId, label, features),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: isBlocked
                                ? Colors.red.withValues(alpha: 0.2)
                                : isVip 
                                    ? Colors.amber.withValues(alpha: 0.2) 
                                    : isWindow 
                                        ? AppColors.accentTeal.withValues(alpha: 0.15)
                                        : Colors.white.withValues(alpha: 0.05),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: isBlocked
                                  ? Colors.redAccent.withValues(alpha: 0.6)
                                  : isVip 
                                      ? Colors.amber.withValues(alpha: 0.6) 
                                      : isWindow 
                                          ? AppColors.accentTeal.withValues(alpha: 0.4)
                                          : Colors.white12,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (isBlocked) ...[
                                const Icon(CupertinoIcons.lock_fill, size: 10, color: Colors.redAccent),
                                const SizedBox(width: 4),
                              ],
                              Text(
                                label,
                                style: TextStyle(
                                  color: isBlocked
                                      ? Colors.redAccent
                                      : isVip ? Colors.amber : (isWindow ? AppColors.accentTeal : Colors.white),
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                  decoration: isBlocked ? TextDecoration.lineThrough : null,
                                ),
                              ),
                              if (isWindow && !isBlocked) ...[
                                const SizedBox(width: 4),
                                const Text("🪟", style: TextStyle(fontSize: 10)),
                              ],
                              if (isVip && !isBlocked) ...[
                                const SizedBox(width: 4),
                                const Text("👑", style: TextStyle(fontSize: 10)),
                              ],
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  void _showSeatOptionsDialog(FleetTemplateItem item, String deckId, String seatId, String label, List<String> features) {
    final isBlocked = features.contains('blocked');
    final isVip = features.contains('vip');
    final isWindow = features.contains('window');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text("Место $label", style: const TextStyle(color: Colors.white, fontSize: 16)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: Icon(
                isBlocked ? CupertinoIcons.lock_open : CupertinoIcons.lock_fill,
                color: isBlocked ? Colors.green : Colors.redAccent,
              ),
              title: Text(
                isBlocked ? "Разблокировать (в продажу)" : "Заблокировать (для гида/багажа)",
                style: const TextStyle(color: Colors.white, fontSize: 13),
              ),
              onTap: () {
                Navigator.pop(ctx);
                _toggleSeatFeature(item, deckId, seatId, 'blocked');
              },
            ),
            ListTile(
              leading: Icon(CupertinoIcons.star_fill, color: isVip ? Colors.amber : Colors.white54),
              title: Text(
                isVip ? "Снять статус VIP" : "Сделать VIP местом",
                style: const TextStyle(color: Colors.white, fontSize: 13),
              ),
              onTap: () {
                Navigator.pop(ctx);
                _toggleSeatFeature(item, deckId, seatId, 'vip');
              },
            ),
            ListTile(
              leading: Icon(CupertinoIcons.rectangle_grid_1x2, color: isWindow ? AppColors.accentTeal : Colors.white54),
              title: Text(
                isWindow ? "Снять отметку 'У окна'" : "Отметить 'У окна'",
                style: const TextStyle(color: Colors.white, fontSize: 13),
              ),
              onTap: () {
                Navigator.pop(ctx);
                _toggleSeatFeature(item, deckId, seatId, 'window');
              },
            ),
          ],
        ),
      ),
    );
  }
}
