import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:intl/intl.dart';
import 'package:friendly_code/core/models/services/index.dart';
import 'package:friendly_code/core/services/trip_inventory_service.dart';
import 'package:friendly_code/core/theme/colors.dart';

class TripDispatcherScreen extends StatefulWidget {
  final String venueId;
  final String currency;

  const TripDispatcherScreen({
    super.key,
    required this.venueId,
    this.currency = '฿',
  });

  @override
  State<TripDispatcherScreen> createState() => _TripDispatcherScreenState();
}

class _TripDispatcherScreenState extends State<TripDispatcherScreen> {
  final TripInventoryService _inventoryService = TripInventoryService();

  int _subTab = 1; // 0 = Schedule Generator, 1 = Flight Cockpit & Seats
  bool _isLoading = true;

  // Data
  List<ServiceItem> _routes = [];
  List<Map<String, dynamic>> _fleetTemplates = [];
  List<ScheduledTrip> _upcomingTrips = [];
  ScheduledTrip? _selectedTrip;
  String _selectedDeckId = 'main';

  // Schedule Generator Form State
  String? _genRouteId;
  TimeOfDay _genTime = const TimeOfDay(hour: 5, minute: 30);
  final Set<int> _selectedDays = {DateTime.monday, DateTime.wednesday, DateTime.saturday};
  int _genWeeks = 2;

  @override
  void initState() {
    super.initState();
    _loadAll();
  }

  Future<void> _loadAll() async {
    setState(() => _isLoading = true);
    try {
      // 1. Load routes (services)
      final sSnap = await FirebaseFirestore.instance
          .collection('venues')
          .doc(widget.venueId)
          .collection('services')
          .get();
      final routes = sSnap.docs.map((d) => ServiceItem.fromMap(d.data(), d.id)).toList();

      // 2. Load fleet templates
      final fSnap = await FirebaseFirestore.instance
          .collection('venues')
          .doc(widget.venueId)
          .collection('fleetTemplates')
          .get();
      final templates = fSnap.docs.map((d) {
        final data = d.data();
        data['id'] = d.id;
        return data;
      }).toList();

      // 3. Load scheduled trips
      final tSnap = await FirebaseFirestore.instance
          .collection('venues')
          .doc(widget.venueId)
          .collection('scheduled_trips')
          .orderBy('departureTime')
          .get();
      final trips = tSnap.docs.map((d) => ScheduledTrip.fromMap(d.data(), d.id)).toList();

      ScheduledTrip? active = _selectedTrip;
      if (trips.isNotEmpty) {
        if (active != null) {
          active = trips.firstWhere((t) => t.id == active!.id, orElse: () => trips.first);
        } else {
          active = trips.first;
        }
      } else {
        active = null;
      }

      setState(() {
        _routes = routes;
        _fleetTemplates = templates;
        _upcomingTrips = trips;
        _selectedTrip = active;
        _genRouteId ??= routes.isNotEmpty ? routes.first.id : null;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _generateSchedule() async {
    if (_genRouteId == null) {
      _showToast("Выберите маршрут");
      return;
    }
    final route = _routes.firstWhere((r) => r.id == _genRouteId);
    if (route.fleetTemplateId == null || route.fleetTemplateId!.isEmpty) {
      _showToast("У этого маршрута не выбран автобус в «Маршруты & Тарифы»!");
      return;
    }

    final templateMap = _fleetTemplates.firstWhere(
      (t) => t['id'] == route.fleetTemplateId,
      orElse: () => _fleetTemplates.isNotEmpty ? _fleetTemplates.first : {},
    );

    if (templateMap.isEmpty) {
      _showToast("Шаблон автобуса не найден. Создайте его во вкладке «Автопарк».");
      return;
    }

    setState(() => _isLoading = true);
    try {
      final createdIds = await _inventoryService.generateWeeklyTrips(
        venueId: widget.venueId,
        route: route,
        fleetTemplateData: templateMap,
        departureTime: _genTime,
        selectedWeekdays: _selectedDays,
        weeksCount: _genWeeks,
      );

      _showToast("Успешно создано рейсов: ${createdIds.length}");
      await _loadAll();
      setState(() => _subTab = 1); // switch to cockpit
    } catch (e) {
      setState(() => _isLoading = false);
      _showToast("Ошибка генерации: $e");
    }
  }

  Future<void> _deleteTrip(String tripId) async {
    try {
      await FirebaseFirestore.instance
          .collection('venues')
          .doc(widget.venueId)
          .collection('scheduled_trips')
          .doc(tripId)
          .delete();
      _showToast("Рейс удален");
      await _loadAll();
    } catch (e) {
      _showToast("Ошибка: $e");
    }
  }

  void _showToast(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: AppColors.surface),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(child: CupertinoActivityIndicator(color: AppColors.accentTeal)),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          // Top Subtab Switcher
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            decoration: const BoxDecoration(
              color: AppColors.surface,
              border: Border(bottom: BorderSide(color: AppColors.macosDivider)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    _buildSubTabButton(1, CupertinoIcons.airplane, "Диспетчерская рейса (Рассадка)"),
                    const SizedBox(width: 8),
                    _buildSubTabButton(0, CupertinoIcons.calendar_badge_plus, "Генератор расписания на неделю"),
                  ],
                ),
                if (_selectedTrip != null && _subTab == 1) ...[
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white.withValues(alpha: 0.1),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    icon: const Icon(CupertinoIcons.printer, size: 14),
                    label: const Text("Манифест водителю", style: TextStyle(fontSize: 12)),
                    onPressed: () => _showManifestDialog(_selectedTrip!),
                  ),
                ],
              ],
            ),
          ),

          // Main View Content
          Expanded(
            child: _subTab == 1 ? _buildCockpitView() : _buildGeneratorView(),
          ),
        ],
      ),
    );
  }

  Widget _buildSubTabButton(int index, IconData icon, String title) {
    final isSelected = _subTab == index;
    return GestureDetector(
      onTap: () => setState(() => _subTab = index),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.accentTeal.withValues(alpha: 0.18) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isSelected ? AppColors.accentTeal : Colors.white12),
        ),
        child: Row(
          children: [
            Icon(icon, size: 14, color: isSelected ? AppColors.accentTeal : Colors.white70),
            const SizedBox(width: 8),
            Text(
              title,
              style: TextStyle(
                color: isSelected ? AppColors.accentTeal : Colors.white70,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                fontSize: 13,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // =========================================================================
  // VIEW 1: FLIGHT COCKPIT & LIVE SEAT MAP
  // =========================================================================
  Widget _buildCockpitView() {
    if (_upcomingTrips.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(CupertinoIcons.calendar, size: 48, color: Colors.white30),
            const SizedBox(height: 16),
            const Text("Нет запланированных рейсов", style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            const Text("Используйте «Генератор расписания на неделю», чтобы создать рейсы в 1 клик.", style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 13)),
            const SizedBox(height: 16),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.accentTeal, foregroundColor: Colors.black),
              onPressed: () => setState(() => _subTab = 0),
              child: const Text("Перейти к генератору", style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      );
    }

    final trip = _selectedTrip ?? _upcomingTrips.first;
    final total = trip.totalCapacity;
    final sellable = trip.sellableCapacity;
    final confirmed = trip.confirmedCount;
    final reserved = trip.reservedCount;
    final blocked = trip.blockedSeatsCount;
    final free = (sellable - confirmed - reserved).clamp(0, total);
    final pct = (trip.occupancyRate * 100).toInt();

    // Group seats by deck
    final decks = <String, List<TripSeatState>>{};
    for (final s in trip.seats.values) {
      decks.putIfAbsent(s.deckId, () => []).add(s);
    }

    final activeDeckId = decks.containsKey(_selectedDeckId)
        ? _selectedDeckId
        : (decks.keys.isNotEmpty ? decks.keys.first : 'main');

    final deckSeats = decks[activeDeckId] ?? [];
    deckSeats.sort((a, b) {
      if (a.row != b.row) return a.row.compareTo(b.row);
      return a.col.compareTo(b.col);
    });

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Flight Selector Horizontal Strip
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _upcomingTrips.map((t) {
                final isSelected = t.id == trip.id;
                final dateStr = DateFormat('E, d MMM • HH:mm', 'ru').format(t.departureTime);
                return GestureDetector(
                  onTap: () => setState(() {
                    _selectedTrip = t;
                    _selectedDeckId = 'main';
                  }),
                  child: Container(
                    margin: const EdgeInsets.only(right: 10),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: isSelected ? AppColors.accentTeal.withValues(alpha: 0.15) : AppColors.surface,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: isSelected ? AppColors.accentTeal : Colors.white12),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          dateStr,
                          style: TextStyle(
                            color: isSelected ? AppColors.accentTeal : Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          "${t.serviceName} (${t.confirmedCount + t.reservedCount}/${t.sellableCapacity})",
                          style: TextStyle(
                            color: isSelected ? Colors.white70 : Colors.white38,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 20),

          // 2. Flight Header & Live Metrics Card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.macosDivider),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              trip.serviceName,
                              style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(width: 10),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: AppColors.accentTeal.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(trip.fleetTemplateName, style: const TextStyle(color: AppColors.accentTeal, fontSize: 11)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          "Выезд: ${DateFormat('EEEE, d MMMM yyyy в HH:mm', 'ru').format(trip.departureTime)}",
                          style: const TextStyle(color: AppColors.macosTextSecondary, fontSize: 12),
                        ),
                      ],
                    ),

                    // Yield Dynamic Discount Badge
                    if (trip.isYieldActive)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.deepOrange.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.deepOrange),
                        ),
                        child: Row(
                          children: [
                            const Icon(CupertinoIcons.flame_fill, color: Colors.deepOrange, size: 14),
                            const SizedBox(width: 6),
                            Text(
                              "Hot Deal активен (-${trip.currentDynamicDiscount.toInt()}%)",
                              style: const TextStyle(color: Colors.deepOrange, fontWeight: FontWeight.bold, fontSize: 12),
                            ),
                          ],
                        ),
                      )
                    else
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.05),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Text("Базовый тариф (Yield выкл.)", style: TextStyle(color: Colors.white54, fontSize: 11)),
                      ),
                  ],
                ),
                const SizedBox(height: 16),

                // Stats row
                Row(
                  children: [
                    _buildStatPill("Свободно", "$free мест", Colors.green),
                    const SizedBox(width: 10),
                    _buildStatPill("В резерве", "$reserved мест", Colors.amber),
                    const SizedBox(width: 10),
                    _buildStatPill("Выкуплено", "$confirmed мест", AppColors.accentTeal),
                    const SizedBox(width: 10),
                    _buildStatPill("Тех. блок", "$blocked мест", Colors.redAccent),
                    const SizedBox(width: 10),
                    _buildStatPill("Заполнение", "$pct%", Colors.white),
                  ],
                ),
                const SizedBox(height: 14),

                // Occupancy progress line
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: (trip.occupancyRate).clamp(0.0, 1.0),
                    backgroundColor: Colors.white12,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      trip.occupancyRate > 0.8
                          ? Colors.green
                          : (trip.occupancyRate > 0.4 ? AppColors.accentTeal : Colors.amber),
                    ),
                    minHeight: 6,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // 3. Deck Selector (Lower / Upper)
          if (decks.length > 1) ...[
            Row(
              children: decks.keys.map((dId) {
                final isSel = activeDeckId == dId;
                final label = dId == 'upper' ? 'Верхний ярус' : 'Нижний ярус';
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: CupertinoButton(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    color: isSel ? AppColors.accentTeal : Colors.white.withValues(alpha: 0.08),
                    onPressed: () => setState(() => _selectedDeckId = dId),
                    child: Text(
                      label,
                      style: TextStyle(
                        color: isSel ? Colors.black : Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 16),
          ],

          // 4. Interactive Bus Visual Grid
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.4),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.white12),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(CupertinoIcons.compass, size: 14, color: AppColors.macosTextSecondary),
                        SizedBox(width: 6),
                        Text("Передняя часть автобуса / Водитель", style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 12)),
                      ],
                    ),
                    const Row(
                      children: [
                        Icon(CupertinoIcons.hand_draw, size: 14, color: AppColors.accentTeal),
                        SizedBox(width: 6),
                        Text("Кликните на любое место для управления и смены статуса", style: TextStyle(color: AppColors.accentTeal, fontSize: 12)),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Seat Matrix
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: deckSeats.map((seat) => _buildInteractiveSeat(trip, seat)).toList(),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatPill(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(width: 6, height: 6, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
          const SizedBox(width: 6),
          Text("$label: ", style: TextStyle(color: Colors.white.withValues(alpha: 0.6), fontSize: 11)),
          Text(value, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 12)),
        ],
      ),
    );
  }

  Widget _buildInteractiveSeat(ScheduledTrip trip, TripSeatState seat) {
    Color bg;
    Color border;
    Color textCol;
    Widget? icon;

    switch (seat.status) {
      case 'confirmed':
        bg = AppColors.accentTeal.withValues(alpha: 0.25);
        border = AppColors.accentTeal;
        textCol = Colors.white;
        icon = const Icon(CupertinoIcons.checkmark_seal_fill, size: 11, color: AppColors.accentTeal);
        break;
      case 'reserved':
        bg = Colors.amber.withValues(alpha: 0.25);
        border = Colors.amber;
        textCol = Colors.amber;
        icon = const Icon(CupertinoIcons.clock_fill, size: 11, color: Colors.amber);
        break;
      case 'blocked':
        bg = Colors.red.withValues(alpha: 0.15);
        border = Colors.redAccent.withValues(alpha: 0.5);
        textCol = Colors.redAccent;
        icon = const Icon(CupertinoIcons.lock_fill, size: 11, color: Colors.redAccent);
        break;
      default: // available
        bg = Colors.white.withValues(alpha: 0.05);
        border = Colors.white24;
        textCol = Colors.white70;
        break;
    }

    return GestureDetector(
      onTap: () => _openSeatActionModal(trip, seat),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: 90,
        height: 70,
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: border, width: seat.status == 'reserved' ? 1.5 : 1.0),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  seat.label,
                  style: TextStyle(color: textCol, fontWeight: FontWeight.bold, fontSize: 12),
                ),
                if (icon != null) icon,
              ],
            ),
            if (seat.passengerName.isNotEmpty) ...[
              Text(
                seat.passengerName,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
              ),
              Text(
                seat.packageName.isNotEmpty ? seat.packageName : "${seat.finalPrice.toInt()} ฿",
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(color: border, fontSize: 9),
              ),
            ] else if (seat.status == 'blocked') ...[
              const Text("Блок (гид)", style: TextStyle(color: Colors.redAccent, fontSize: 9)),
            ] else ...[
              const Text("Свободно", style: TextStyle(color: Colors.white30, fontSize: 9)),
            ],
          ],
        ),
      ),
    );
  }

  // =========================================================================
  // MODAL: SEAT OVERRIDE & DISPATCHER ACTIONS
  // =========================================================================
  void _openSeatActionModal(ScheduledTrip trip, TripSeatState seat) {
    String currentStatus = seat.status;
    final nameCtrl = TextEditingController(text: seat.passengerName);
    final phoneCtrl = TextEditingController(text: seat.passengerPhone);
    final passportCtrl = TextEditingController(text: seat.passengerPassport);
    final priceCtrl = TextEditingController(text: seat.finalPrice > 0 ? seat.finalPrice.toStringAsFixed(0) : '2900');
    final notesCtrl = TextEditingController(text: seat.notes);

    String selectedPackageId = seat.packageId.isNotEmpty ? seat.packageId : (trip.packages.isNotEmpty ? trip.packages.first.id : '');
    String paymentStatus = seat.paymentStatus;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          return Dialog(
            backgroundColor: AppColors.surface,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: const BorderSide(color: AppColors.accentTeal, width: 1.5),
            ),
            child: Container(
              width: 560,
              padding: const EdgeInsets.all(24),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: AppColors.accentTeal.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(CupertinoIcons.person_crop_circle_fill, color: AppColors.accentTeal, size: 22),
                            ),
                            const SizedBox(width: 12),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text("Управление местом ${seat.label}", style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                                Text("Ярус: ${seat.deckId} • ${trip.serviceName}", style: const TextStyle(color: AppColors.macosTextSecondary, fontSize: 12)),
                              ],
                            ),
                          ],
                        ),
                        IconButton(
                          icon: const Icon(CupertinoIcons.xmark, color: Colors.white54, size: 20),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // STATUS SEGMENT SELECTOR
                    const Text("Статус места в рейсе", style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 12, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    CupertinoSegmentedControl<String>(
                      children: const {
                        'available': Padding(padding: EdgeInsets.symmetric(horizontal: 8, vertical: 8), child: Text("Свободно", style: TextStyle(fontSize: 12))),
                        'reserved': Padding(padding: EdgeInsets.symmetric(horizontal: 8, vertical: 8), child: Text("В резерве", style: TextStyle(fontSize: 12))),
                        'confirmed': Padding(padding: EdgeInsets.symmetric(horizontal: 8, vertical: 8), child: Text("Выкуплено", style: TextStyle(fontSize: 12))),
                        'blocked': Padding(padding: EdgeInsets.symmetric(horizontal: 8, vertical: 8), child: Text("Блок", style: TextStyle(fontSize: 12))),
                      },
                      groupValue: currentStatus,
                      onValueChanged: (val) => setModalState(() => currentStatus = val),
                    ),
                    const SizedBox(height: 16),

                    // FAST CONFIRM / RELEASE BUTTONS IF IN RESERVE
                    if (seat.status == 'reserved') ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.amber.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.amber.withValues(alpha: 0.3)),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: ElevatedButton.icon(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.accentTeal,
                                  foregroundColor: Colors.black,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                ),
                                icon: const Icon(CupertinoIcons.checkmark_alt, size: 16),
                                label: const Text("Подтвердить (Выкуплено)", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                                onPressed: () async {
                                  Navigator.pop(ctx);
                                  await _inventoryService.updateSeatStatusAndRecalculateYield(
                                    venueId: widget.venueId,
                                    tripId: trip.id,
                                    seatId: seat.seatId,
                                    newStatus: 'confirmed',
                                    paymentStatus: 'paid',
                                    updatedBy: 'manager',
                                  );
                                  _showToast("Место ${seat.label} подтверждено и выкуплено");
                                  await _loadAll();
                                },
                              ),
                            ),
                            const SizedBox(width: 8),
                            ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.redAccent.withValues(alpha: 0.2),
                                foregroundColor: Colors.redAccent,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                              icon: const Icon(CupertinoIcons.xmark, size: 14),
                              label: const Text("Освободить", style: TextStyle(fontSize: 12)),
                              onPressed: () async {
                                Navigator.pop(ctx);
                                await _inventoryService.updateSeatStatusAndRecalculateYield(
                                  venueId: widget.venueId,
                                  tripId: trip.id,
                                  seatId: seat.seatId,
                                  newStatus: 'available',
                                  updatedBy: 'manager',
                                );
                                _showToast("Резерв снят, место освобождено");
                                await _loadAll();
                              },
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // PASSENGER FIELDS (IF NOT AVAILABLE & NOT BLOCKED)
                    if (currentStatus != 'available' && currentStatus != 'blocked') ...[
                      const Text("ФИО Пассажира", style: TextStyle(color: Colors.white70, fontSize: 12)),
                      const SizedBox(height: 4),
                      CupertinoTextField(
                        controller: nameCtrl,
                        placeholder: "e.g. Алексей Смирнов",
                        style: const TextStyle(color: Colors.white, fontSize: 14),
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(color: Colors.black26, borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.white24)),
                      ),
                      const SizedBox(height: 10),

                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text("Телефон / Telegram", style: TextStyle(color: Colors.white70, fontSize: 12)),
                                const SizedBox(height: 4),
                                CupertinoTextField(
                                  controller: phoneCtrl,
                                  placeholder: "+66 82 123 4567 / @alex",
                                  style: const TextStyle(color: Colors.white, fontSize: 13),
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(color: Colors.black26, borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.white24)),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text("Номер паспорта", style: TextStyle(color: Colors.white70, fontSize: 12)),
                                const SizedBox(height: 4),
                                CupertinoTextField(
                                  controller: passportCtrl,
                                  placeholder: "75 1234567",
                                  style: const TextStyle(color: Colors.white, fontSize: 13),
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(color: Colors.black26, borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.white24)),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),

                      // Package tier selector
                      if (trip.packages.isNotEmpty) ...[
                        const Text("Визовый пакет", style: TextStyle(color: Colors.white70, fontSize: 12)),
                        const SizedBox(height: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(color: Colors.black26, borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.white24)),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              value: selectedPackageId.isNotEmpty ? selectedPackageId : trip.packages.first.id,
                              isExpanded: true,
                              dropdownColor: AppColors.surface,
                              style: const TextStyle(color: Colors.white, fontSize: 13),
                              items: trip.packages.map((p) {
                                return DropdownMenuItem<String>(
                                  value: p.id,
                                  child: Text("${p.name} — ${p.price.toInt()} ${widget.currency}"),
                                );
                              }).toList(),
                              onChanged: (val) {
                                if (val != null) {
                                  final selectedPkg = trip.packages.firstWhere((p) => p.id == val);
                                  setModalState(() {
                                    selectedPackageId = val;
                                    priceCtrl.text = selectedPkg.price.toStringAsFixed(0);
                                  });
                                }
                              },
                            ),
                          ),
                        ),
                        const SizedBox(height: 10),
                      ],

                      // Price override
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text("Финальная цена (ручной оверрайд)", style: TextStyle(color: Colors.white70, fontSize: 12)),
                                const SizedBox(height: 4),
                                CupertinoTextField(
                                  controller: priceCtrl,
                                  keyboardType: TextInputType.number,
                                  style: const TextStyle(color: AppColors.accentTeal, fontSize: 14, fontWeight: FontWeight.bold),
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(color: Colors.black26, borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.white24)),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text("Оплата", style: TextStyle(color: Colors.white70, fontSize: 12)),
                                const SizedBox(height: 4),
                                CupertinoSegmentedControl<String>(
                                  children: const {
                                    'unpaid': Padding(padding: EdgeInsets.all(6), child: Text("Не опл.", style: TextStyle(fontSize: 11))),
                                    'paid': Padding(padding: EdgeInsets.all(6), child: Text("Оплачено", style: TextStyle(fontSize: 11))),
                                  },
                                  groupValue: paymentStatus,
                                  onValueChanged: (v) => setModalState(() => paymentStatus = v),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                    ],

                    // Notes
                    const Text("Заметка диспетчера", style: TextStyle(color: Colors.white70, fontSize: 12)),
                    const SizedBox(height: 4),
                    CupertinoTextField(
                      controller: notesCtrl,
                      placeholder: "e.g. Оплачено через PromptPay, штамп чистый",
                      style: const TextStyle(color: Colors.white, fontSize: 13),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(color: Colors.black26, borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.white24)),
                    ),
                    const SizedBox(height: 20),

                    // Relocate Passenger action
                    if (seat.passengerName.isNotEmpty) ...[
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.white70,
                          side: const BorderSide(color: Colors.white24),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        icon: const Icon(CupertinoIcons.arrow_right_arrow_left, size: 14),
                        label: const Text("Пересадить на другое место", style: TextStyle(fontSize: 12)),
                        onPressed: () {
                          Navigator.pop(ctx);
                          _showRelocateDialog(trip, seat);
                        },
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Action buttons
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        CupertinoButton(
                          child: const Text("Отмена", style: TextStyle(color: Colors.white54)),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.accentTeal,
                            foregroundColor: Colors.black,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          child: const Text("Сохранить оверрайд", style: TextStyle(fontWeight: FontWeight.bold)),
                          onPressed: () async {
                            final pkg = trip.packages.firstWhere(
                              (p) => p.id == selectedPackageId,
                              orElse: () => const TripPackageTier(id: '', name: 'Стандарт', price: 2900),
                            );

                            Navigator.pop(ctx);
                            await _inventoryService.updateSeatStatusAndRecalculateYield(
                              venueId: widget.venueId,
                              tripId: trip.id,
                              seatId: seat.seatId,
                              newStatus: currentStatus,
                              passengerName: nameCtrl.text.trim(),
                              passengerPhone: phoneCtrl.text.trim(),
                              passengerPassport: passportCtrl.text.trim(),
                              packageId: pkg.id,
                              packageName: pkg.name,
                              customPrice: double.tryParse(priceCtrl.text) ?? pkg.price,
                              isManualOverride: true,
                              paymentStatus: paymentStatus,
                              notes: notesCtrl.text.trim(),
                              updatedBy: 'manager',
                            );
                            _showToast("Место ${seat.label} успешно обновлено. Yield пересчитан.");
                            await _loadAll();
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  // Relocate passenger dialog
  void _showRelocateDialog(ScheduledTrip trip, TripSeatState currentSeat) {
    final availableSeats = trip.seats.values.where((s) => s.status == 'available').toList();
    if (availableSeats.isEmpty) {
      _showToast("Нет свободных мест для пересадки!");
      return;
    }

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text("Пересадить с места ${currentSeat.label}", style: const TextStyle(color: Colors.white, fontSize: 16)),
        content: SizedBox(
          width: 320,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text("Пассажир: ${currentSeat.passengerName}", style: const TextStyle(color: AppColors.accentTeal, fontSize: 13, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              const Text("Выберите новое свободное место:", style: TextStyle(color: Colors.white70, fontSize: 12)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: availableSeats.map((s) {
                  return ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.white12, foregroundColor: Colors.white),
                    child: Text(s.label),
                    onPressed: () async {
                      Navigator.pop(ctx);
                      await _inventoryService.relocatePassenger(
                        venueId: widget.venueId,
                        tripId: trip.id,
                        fromSeatId: currentSeat.seatId,
                        toSeatId: s.seatId,
                        updatedBy: 'manager',
                      );
                      _showToast("Пассажир пересажен на место ${s.label}");
                      await _loadAll();
                    },
                  );
                }).toList(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // =========================================================================
  // VIEW 2: WEEKLY SCHEDULE GENERATOR
  // =========================================================================
  Widget _buildGeneratorView() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("Генератор расписания на неделю", style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          const Text("Автоматическое создание регулярных рейсов с привязкой автобуса, пакетных тарифов и начальной схемы мест.", style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 13)),
          const SizedBox(height: 24),

          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.macosDivider),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Route Picker
                const Text("1. Выберите маршрут", style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                if (_routes.isEmpty)
                  const Text("Нет созданных маршрутов! Сначала добавьте маршрут во вкладке «Маршруты & Тарифы».", style: TextStyle(color: Colors.amber))
                else
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    decoration: BoxDecoration(color: Colors.black26, borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.white24)),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _genRouteId,
                        isExpanded: true,
                        dropdownColor: AppColors.surface,
                        style: const TextStyle(color: Colors.white, fontSize: 14),
                        items: _routes.map((r) => DropdownMenuItem(value: r.id, child: Text(r.name))).toList(),
                        onChanged: (val) => setState(() => _genRouteId = val),
                      ),
                    ),
                  ),
                const SizedBox(height: 20),

                // Weekday selection
                const Text("2. Регулярные дни отправления", style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: [
                    _buildDayChip(DateTime.monday, "Понедельник"),
                    _buildDayChip(DateTime.tuesday, "Вторник"),
                    _buildDayChip(DateTime.wednesday, "Среда"),
                    _buildDayChip(DateTime.thursday, "Четверг"),
                    _buildDayChip(DateTime.friday, "Пятница"),
                    _buildDayChip(DateTime.saturday, "Суббота"),
                    _buildDayChip(DateTime.sunday, "Воскресенье"),
                  ],
                ),
                const SizedBox(height: 20),

                // Departure Time
                const Text("3. Время выезда", style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      decoration: BoxDecoration(color: Colors.black26, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.accentTeal)),
                      child: Text(
                        "${_genTime.hour.toString().padLeft(2, '0')}:${_genTime.minute.toString().padLeft(2, '0')}",
                        style: const TextStyle(color: AppColors.accentTeal, fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                    ),
                    const SizedBox(width: 12),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.white12, foregroundColor: Colors.white),
                      child: const Text("Изменить время"),
                      onPressed: () async {
                        final t = await showTimePicker(
                          context: context,
                          initialTime: _genTime,
                        );
                        if (t != null) setState(() => _genTime = t);
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Weeks count
                const Text("4. Горизонт планирования", style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Row(
                  children: [
                    _buildWeeksButton(1, "На 1 неделю"),
                    const SizedBox(width: 8),
                    _buildWeeksButton(2, "На 2 недели"),
                    const SizedBox(width: 8),
                    _buildWeeksButton(4, "На месяц вперед"),
                  ],
                ),
                const SizedBox(height: 28),

                // Big Generator CTA
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.accentTeal,
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    icon: const Icon(CupertinoIcons.sparkles, size: 20),
                    label: const Text("Сгенерировать рейсы в расписание", style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                    onPressed: _generateSchedule,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),

          // Existing trips list
          const Text("Существующие рейсы в системе", style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          if (_upcomingTrips.isEmpty)
            const Text("Нет рейсов", style: TextStyle(color: Colors.white30))
          else
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _upcomingTrips.length,
              itemBuilder: (ctx, i) {
                final t = _upcomingTrips[i];
                final dateStr = DateFormat('EEEE, d MMMM • HH:mm', 'ru').format(t.departureTime);
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white12)),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(dateStr, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                          const SizedBox(height: 2),
                          Text("${t.serviceName} • Автобус: ${t.fleetTemplateName}", style: const TextStyle(color: AppColors.macosTextSecondary, fontSize: 12)),
                        ],
                      ),
                      Row(
                        children: [
                          Text("${t.confirmedCount + t.reservedCount}/${t.sellableCapacity} мест", style: const TextStyle(color: AppColors.accentTeal, fontWeight: FontWeight.bold, fontSize: 13)),
                          const SizedBox(width: 14),
                          IconButton(
                            icon: const Icon(CupertinoIcons.trash, color: Colors.redAccent, size: 16),
                            onPressed: () => _deleteTrip(t.id),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  Widget _buildDayChip(int dayIndex, String label) {
    final isSelected = _selectedDays.contains(dayIndex);
    return FilterChip(
      label: Text(label),
      selected: isSelected,
      selectedColor: AppColors.accentTeal,
      backgroundColor: Colors.white12,
      labelStyle: TextStyle(color: isSelected ? Colors.black : Colors.white70, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal),
      onSelected: (val) {
        setState(() {
          if (val) {
            _selectedDays.add(dayIndex);
          } else {
            if (_selectedDays.length > 1) _selectedDays.remove(dayIndex);
          }
        });
      },
    );
  }

  Widget _buildWeeksButton(int weeks, String label) {
    final isSelected = _genWeeks == weeks;
    return ElevatedButton(
      style: ElevatedButton.styleFrom(
        backgroundColor: isSelected ? AppColors.accentTeal.withValues(alpha: 0.2) : Colors.white12,
        foregroundColor: isSelected ? AppColors.accentTeal : Colors.white70,
        side: BorderSide(color: isSelected ? AppColors.accentTeal : Colors.transparent),
      ),
      onPressed: () => setState(() => _genWeeks = weeks),
      child: Text(label),
    );
  }

  // Driver Manifest Print Dialog
  void _showManifestDialog(ScheduledTrip trip) {
    final passengers = trip.seats.values.where((s) => s.status == 'confirmed' || s.status == 'reserved').toList();
    passengers.sort((a, b) => a.label.compareTo(b.label));

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text("Посадочный манифест • ${DateFormat('d MMM HH:mm').format(trip.departureTime)}", style: const TextStyle(color: Colors.white, fontSize: 16)),
        content: SizedBox(
          width: 600,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text("Маршрут: ${trip.serviceName} • Автобус: ${trip.fleetTemplateName}", style: const TextStyle(color: AppColors.accentTeal, fontSize: 12)),
              const SizedBox(height: 12),
              if (passengers.isEmpty)
                const Text("Нет пассажиров на этом рейсе.", style: TextStyle(color: Colors.white54))
              else
                Container(
                  constraints: const BoxConstraints(maxHeight: 350),
                  child: SingleChildScrollView(
                    child: Table(
                      columnWidths: const {
                        0: FlexColumnWidth(1),
                        1: FlexColumnWidth(3),
                        2: FlexColumnWidth(2),
                        3: FlexColumnWidth(2),
                      },
                      children: [
                        const TableRow(
                          decoration: BoxDecoration(border: Border(bottom: BorderSide(color: Colors.white24))),
                          children: [
                            Padding(padding: EdgeInsets.all(6), child: Text("Место", style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, fontSize: 11))),
                            Padding(padding: EdgeInsets.all(6), child: Text("ФИО", style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, fontSize: 11))),
                            Padding(padding: EdgeInsets.all(6), child: Text("Паспорт", style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, fontSize: 11))),
                            Padding(padding: EdgeInsets.all(6), child: Text("Тариф", style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, fontSize: 11))),
                          ],
                        ),
                        ...passengers.map((p) => TableRow(
                          decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Colors.white12))),
                          children: [
                            Padding(padding: const EdgeInsets.all(6), child: Text(p.label, style: const TextStyle(color: AppColors.accentTeal, fontWeight: FontWeight.bold, fontSize: 11))),
                            Padding(padding: const EdgeInsets.all(6), child: Text(p.passengerName, style: const TextStyle(color: Colors.white, fontSize: 11))),
                            Padding(padding: const EdgeInsets.all(6), child: Text(p.passengerPassport.isNotEmpty ? p.passengerPassport : '—', style: const TextStyle(color: Colors.white70, fontSize: 11))),
                            Padding(padding: const EdgeInsets.all(6), child: Text(p.packageName.isNotEmpty ? p.packageName : "${p.finalPrice.toInt()} ฿", style: const TextStyle(color: Colors.white70, fontSize: 11))),
                          ],
                        )),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Закрыть")),
        ],
      ),
    );
  }
}
