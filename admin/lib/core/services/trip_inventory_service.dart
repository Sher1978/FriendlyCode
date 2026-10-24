import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import '../models/services/scheduled_trip_model.dart';
import '../models/services/service_item_model.dart';
import '../models/services/service_yield_rule_model.dart';

class TripInventoryService {
  final FirebaseFirestore _firestore;

  TripInventoryService({FirebaseFirestore? firestore})
      : _firestore = firestore ?? FirebaseFirestore.instance;

  CollectionReference _tripsRef(String venueId) =>
      _firestore.collection('venues').doc(venueId).collection('scheduled_trips');

  CollectionReference _yieldRulesRef(String venueId) =>
      _firestore.collection('venues').doc(venueId).collection('yield_rules');

  /// Create a single custom/floating trip on an exact date & time
  Future<String> createSingleTrip({
    required String venueId,
    required ServiceItem route,
    required Map<String, dynamic> fleetTemplateData,
    required DateTime flightDateTime,
  }) async {
    final decks = List<Map<String, dynamic>>.from(
      (fleetTemplateData['decks'] as List<dynamic>? ?? []).map((e) => Map<String, dynamic>.from(e)),
    );
    final totalCapacity = (fleetTemplateData['totalCapacity'] as num?)?.toInt() ?? 13;
    final templateName = fleetTemplateData['name'] ?? 'Транспорт';

    final initialSeats = <String, TripSeatState>{};
    int initialBlocked = 0;

    for (final deck in decks) {
      final deckId = deck['id'] ?? 'main';
      final seatsList = (deck['seats'] as List<dynamic>? ?? []);
      for (final s in seatsList) {
        final sMap = Map<String, dynamic>.from(s);
        final seatId = sMap['id'] ?? '';
        final label = sMap['label'] ?? seatId;
        final features = (sMap['features'] as List<dynamic>? ?? []).map((f) => f.toString()).toList();
        final isBlocked = features.contains('blocked') || features.contains('guide');

        if (isBlocked) initialBlocked++;

        initialSeats[seatId] = TripSeatState(
          seatId: seatId,
          label: label,
          deckId: deckId,
          row: (sMap['row'] as num?)?.toInt() ?? 1,
          col: (sMap['col'] as num?)?.toInt() ?? 1,
          status: isBlocked ? 'blocked' : 'available',
          notes: isBlocked ? 'Служебное место' : '',
        );
      }
    }

    final dateStr = "${flightDateTime.year}-${flightDateTime.month.toString().padLeft(2, '0')}-${flightDateTime.day.toString().padLeft(2, '0')}";
    final timeStr = "${flightDateTime.hour.toString().padLeft(2, '0')}${flightDateTime.minute.toString().padLeft(2, '0')}";
    final tripDocId = "trip_${route.id}_${dateStr}_$timeStr";

    final sellable = (totalCapacity - initialBlocked).clamp(1, totalCapacity);
    final trip = ScheduledTrip(
      id: tripDocId,
      venueId: venueId,
      serviceId: route.id,
      serviceName: route.name,
      fleetTemplateId: fleetTemplateData['id'] ?? (route.fleetTemplateId ?? 'default'),
      fleetTemplateName: templateName,
      departureTime: flightDateTime,
      totalCapacity: totalCapacity,
      blockedSeatsCount: initialBlocked,
      sellableCapacity: sellable,
      confirmedCount: 0,
      reservedCount: 0,
      occupancyRate: 0.0,
      isYieldActive: false,
      currentDynamicDiscount: 0.0,
      packages: route.packages,
      seats: initialSeats,
      createdAt: DateTime.now(),
    );

    await _tripsRef(venueId).doc(tripDocId).set(trip.toMap(), SetOptions(merge: true));
    return tripDocId;
  }

  /// Generate trips for specified weekdays across the next [weeksCount] weeks
  Future<List<String>> generateWeeklyTrips({
    required String venueId,
    required ServiceItem route,
    required Map<String, dynamic> fleetTemplateData,
    required TimeOfDay departureTime,
    required Set<int> selectedWeekdays, // 1 = Monday, 7 = Sunday
    int weeksCount = 2,
  }) async {
    final generatedTripIds = <String>[];
    final now = DateTime.now();
    final decks = List<Map<String, dynamic>>.from(
      (fleetTemplateData['decks'] as List<dynamic>? ?? []).map((e) => Map<String, dynamic>.from(e)),
    );
    final totalCapacity = (fleetTemplateData['totalCapacity'] as num?)?.toInt() ?? 13;
    final templateName = fleetTemplateData['name'] ?? 'Транспорт';

    // Build initial seats map from template
    final initialSeats = <String, TripSeatState>{};
    int initialBlocked = 0;

    for (final deck in decks) {
      final deckId = deck['id'] ?? 'main';
      final seatsList = (deck['seats'] as List<dynamic>? ?? []);
      for (final s in seatsList) {
        final sMap = Map<String, dynamic>.from(s);
        final seatId = sMap['id'] ?? '';
        final label = sMap['label'] ?? seatId;
        final features = (sMap['features'] as List<dynamic>? ?? []).map((f) => f.toString()).toList();
        final isBlocked = features.contains('blocked') || features.contains('guide');

        if (isBlocked) initialBlocked++;

        initialSeats[seatId] = TripSeatState(
          seatId: seatId,
          label: label,
          deckId: deckId,
          row: (sMap['row'] as num?)?.toInt() ?? 1,
          col: (sMap['col'] as num?)?.toInt() ?? 1,
          status: isBlocked ? 'blocked' : 'available',
          notes: isBlocked ? 'Служебное место' : '',
        );
      }
    }

    final batch = _firestore.batch();
    final totalDays = weeksCount * 7;

    for (int i = 0; i < totalDays; i++) {
      final targetDate = now.add(Duration(days: i));
      if (!selectedWeekdays.contains(targetDate.weekday)) continue;

      final flightDateTime = DateTime(
        targetDate.year,
        targetDate.month,
        targetDate.day,
        departureTime.hour,
        departureTime.minute,
      );

      // Skip past hours for today
      if (flightDateTime.isBefore(now)) continue;

      final dateStr = "${flightDateTime.year}-${flightDateTime.month.toString().padLeft(2, '0')}-${flightDateTime.day.toString().padLeft(2, '0')}";
      final timeStr = "${flightDateTime.hour.toString().padLeft(2, '0')}${flightDateTime.minute.toString().padLeft(2, '0')}";
      final tripDocId = "trip_${route.id}_${dateStr}_$timeStr";

      final sellable = (totalCapacity - initialBlocked).clamp(1, totalCapacity);
      final trip = ScheduledTrip(
        id: tripDocId,
        venueId: venueId,
        serviceId: route.id,
        serviceName: route.name,
        fleetTemplateId: route.fleetTemplateId ?? 'default',
        fleetTemplateName: templateName,
        departureTime: flightDateTime,
        totalCapacity: totalCapacity,
        blockedSeatsCount: initialBlocked,
        sellableCapacity: sellable,
        confirmedCount: 0,
        reservedCount: 0,
        occupancyRate: 0.0,
        isYieldActive: false,
        currentDynamicDiscount: 0.0,
        packages: route.packages,
        seats: initialSeats,
        createdAt: now,
      );

      final docRef = _tripsRef(venueId).doc(tripDocId);
      batch.set(docRef, trip.toMap(), SetOptions(merge: true));
      generatedTripIds.add(tripDocId);
    }

    await batch.commit();
    return generatedTripIds;
  }

  /// Update seat and immediately recalculate occupancy and yield discount triggers
  Future<void> updateSeatStatusAndRecalculateYield({
    required String venueId,
    required String tripId,
    required String seatId,
    required String newStatus, // 'available', 'reserved', 'confirmed', 'blocked'
    String passengerName = '',
    String passengerPhone = '',
    String passengerPassport = '',
    String packageId = '',
    String packageName = '',
    double? customPrice,
    bool isManualOverride = false,
    String paymentStatus = 'unpaid',
    String notes = '',
    String updatedBy = 'manager',
  }) async {
    final tripDocRef = _tripsRef(venueId).doc(tripId);
    final tripSnap = await tripDocRef.get();
    if (!tripSnap.exists) return;

    final trip = ScheduledTrip.fromMap(tripSnap.data() as Map<String, dynamic>, tripSnap.id);
    final currentSeats = Map<String, TripSeatState>.from(trip.seats);
    final existingSeat = currentSeats[seatId];

    if (existingSeat == null) return;

    // Update target seat
    final updatedSeat = existingSeat.copyWith(
      status: newStatus,
      passengerName: newStatus == 'available' ? '' : (passengerName.isNotEmpty ? passengerName : existingSeat.passengerName),
      passengerPhone: newStatus == 'available' ? '' : (passengerPhone.isNotEmpty ? passengerPhone : existingSeat.passengerPhone),
      passengerPassport: newStatus == 'available' ? '' : (passengerPassport.isNotEmpty ? passengerPassport : existingSeat.passengerPassport),
      packageId: newStatus == 'available' ? '' : (packageId.isNotEmpty ? packageId : existingSeat.packageId),
      packageName: newStatus == 'available' ? '' : (packageName.isNotEmpty ? packageName : existingSeat.packageName),
      finalPrice: newStatus == 'available' ? 0.0 : (customPrice ?? existingSeat.finalPrice),
      isManualOverride: isManualOverride,
      paymentStatus: newStatus == 'available' ? 'unpaid' : paymentStatus,
      notes: notes,
      updatedAt: DateTime.now(),
      updatedBy: updatedBy,
    );

    currentSeats[seatId] = updatedSeat;

    // Recalculate metrics
    int blocked = 0;
    int confirmed = 0;
    int reserved = 0;

    for (final s in currentSeats.values) {
      if (s.status == 'blocked') blocked++;
      if (s.status == 'confirmed') confirmed++;
      if (s.status == 'reserved') reserved++;
    }

    final sellable = (trip.totalCapacity - blocked).clamp(1, trip.totalCapacity);
    final occupancy = (confirmed + reserved) / sellable;

    // Evaluate yield rules
    bool isYieldActive = false;
    double dynamicDiscount = 0.0;

    try {
      final rulesSnap = await _yieldRulesRef(venueId).get();
      final rules = rulesSnap.docs.map((d) => ServiceYieldRule.fromMap(d.data() as Map<String, dynamic>, d.id)).toList();
      final hoursToDeparture = trip.departureTime.difference(DateTime.now()).inHours;
      final emptySeats = sellable - (confirmed + reserved);

      for (final rule in rules) {
        if (!rule.isFlashSlot) continue;
        if (hoursToDeparture <= rule.flashLeadHours && emptySeats >= rule.emptySeatsThreshold) {
          isYieldActive = true;
          dynamicDiscount = rule.discountValue;
          break;
        }
      }
    } catch (_) {}

    await tripDocRef.update({
      'seats.$seatId': updatedSeat.toMap(),
      'blockedSeatsCount': blocked,
      'sellableCapacity': sellable,
      'confirmedCount': confirmed,
      'reservedCount': reserved,
      'occupancyRate': occupancy,
      'isYieldActive': isYieldActive,
      'currentDynamicDiscount': dynamicDiscount,
    });
  }

  /// Relocate passenger from one seat to another
  Future<void> relocatePassenger({
    required String venueId,
    required String tripId,
    required String fromSeatId,
    required String toSeatId,
    required String updatedBy,
  }) async {
    final tripDocRef = _tripsRef(venueId).doc(tripId);
    final tripSnap = await tripDocRef.get();
    if (!tripSnap.exists) return;

    final trip = ScheduledTrip.fromMap(tripSnap.data() as Map<String, dynamic>, tripSnap.id);
    final fromSeat = trip.seats[fromSeatId];
    final toSeat = trip.seats[toSeatId];

    if (fromSeat == null || toSeat == null) return;
    if (toSeat.status != 'available') return;

    final transferredSeat = toSeat.copyWith(
      status: fromSeat.status,
      passengerName: fromSeat.passengerName,
      passengerPhone: fromSeat.passengerPhone,
      passengerPassport: fromSeat.passengerPassport,
      packageId: fromSeat.packageId,
      packageName: fromSeat.packageName,
      finalPrice: fromSeat.finalPrice,
      isManualOverride: fromSeat.isManualOverride,
      paymentStatus: fromSeat.paymentStatus,
      notes: "${fromSeat.notes} (Пересажен с ${fromSeat.label})".trim(),
      updatedAt: DateTime.now(),
      updatedBy: updatedBy,
    );

    final clearedSeat = fromSeat.copyWith(
      status: 'available',
      passengerName: '',
      passengerPhone: '',
      passengerPassport: '',
      packageId: '',
      packageName: '',
      finalPrice: 0.0,
      isManualOverride: false,
      paymentStatus: 'unpaid',
      notes: "Освобождено при пересадке на ${toSeat.label}",
      updatedAt: DateTime.now(),
      updatedBy: updatedBy,
    );

    await tripDocRef.update({
      'seats.$fromSeatId': clearedSeat.toMap(),
      'seats.$toSeatId': transferredSeat.toMap(),
    });
  }
}
