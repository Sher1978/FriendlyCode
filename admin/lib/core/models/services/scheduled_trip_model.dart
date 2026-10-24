import 'package:cloud_firestore/cloud_firestore.dart';

class TripPackageTier {
  final String id;
  final String name;
  final double price;
  final String description;

  const TripPackageTier({
    required this.id,
    required this.name,
    required this.price,
    this.description = '',
  });

  Map<String, dynamic> toMap() => {
    'id': id,
    'name': name,
    'price': price,
    'description': description,
  };

  factory TripPackageTier.fromMap(Map<String, dynamic> map) => TripPackageTier(
    id: map['id'] ?? '',
    name: map['name'] ?? '',
    price: (map['price'] as num?)?.toDouble() ?? 0.0,
    description: map['description'] ?? '',
  );
}

class TripSeatState {
  final String seatId;
  final String label;
  final String deckId;
  final int row;
  final int col;
  final String status; // 'available', 'reserved', 'confirmed', 'blocked'
  final String passengerName;
  final String passengerPhone;
  final String passengerPassport;
  final String packageId;
  final String packageName;
  final double finalPrice;
  final bool isManualOverride;
  final String paymentStatus; // 'unpaid', 'paid', 'cash'
  final String notes;
  final DateTime? reservedUntil;
  final DateTime? updatedAt;
  final String updatedBy;

  const TripSeatState({
    required this.seatId,
    required this.label,
    this.deckId = 'main',
    this.row = 1,
    this.col = 1,
    this.status = 'available',
    this.passengerName = '',
    this.passengerPhone = '',
    this.passengerPassport = '',
    this.packageId = '',
    this.packageName = '',
    this.finalPrice = 0.0,
    this.isManualOverride = false,
    this.paymentStatus = 'unpaid',
    this.notes = '',
    this.reservedUntil,
    this.updatedAt,
    this.updatedBy = '',
  });

  Map<String, dynamic> toMap() => {
    'seatId': seatId,
    'label': label,
    'deckId': deckId,
    'row': row,
    'col': col,
    'status': status,
    'passengerName': passengerName,
    'passengerPhone': passengerPhone,
    'passengerPassport': passengerPassport,
    'packageId': packageId,
    'packageName': packageName,
    'finalPrice': finalPrice,
    'isManualOverride': isManualOverride,
    'paymentStatus': paymentStatus,
    'notes': notes,
    'reservedUntil': reservedUntil != null ? Timestamp.fromDate(reservedUntil!) : null,
    'updatedAt': updatedAt != null ? Timestamp.fromDate(updatedAt!) : null,
    'updatedBy': updatedBy,
  };

  factory TripSeatState.fromMap(Map<String, dynamic> map, [String? id]) => TripSeatState(
    seatId: id ?? map['seatId'] ?? '',
    label: map['label'] ?? id ?? '',
    deckId: map['deckId'] ?? 'main',
    row: (map['row'] as num?)?.toInt() ?? 1,
    col: (map['col'] as num?)?.toInt() ?? 1,
    status: map['status'] ?? 'available',
    passengerName: map['passengerName'] ?? '',
    passengerPhone: map['passengerPhone'] ?? '',
    passengerPassport: map['passengerPassport'] ?? '',
    packageId: map['packageId'] ?? '',
    packageName: map['packageName'] ?? '',
    finalPrice: (map['finalPrice'] as num?)?.toDouble() ?? 0.0,
    isManualOverride: map['isManualOverride'] ?? false,
    paymentStatus: map['paymentStatus'] ?? 'unpaid',
    notes: map['notes'] ?? '',
    reservedUntil: map['reservedUntil'] != null ? (map['reservedUntil'] as Timestamp).toDate() : null,
    updatedAt: map['updatedAt'] != null ? (map['updatedAt'] as Timestamp).toDate() : null,
    updatedBy: map['updatedBy'] ?? '',
  );

  TripSeatState copyWith({
    String? status,
    String? passengerName,
    String? passengerPhone,
    String? passengerPassport,
    String? packageId,
    String? packageName,
    double? finalPrice,
    bool? isManualOverride,
    String? paymentStatus,
    String? notes,
    DateTime? reservedUntil,
    DateTime? updatedAt,
    String? updatedBy,
  }) => TripSeatState(
    seatId: seatId,
    label: label,
    deckId: deckId,
    row: row,
    col: col,
    status: status ?? this.status,
    passengerName: passengerName ?? this.passengerName,
    passengerPhone: passengerPhone ?? this.passengerPhone,
    passengerPassport: passengerPassport ?? this.passengerPassport,
    packageId: packageId ?? this.packageId,
    packageName: packageName ?? this.packageName,
    finalPrice: finalPrice ?? this.finalPrice,
    isManualOverride: isManualOverride ?? this.isManualOverride,
    paymentStatus: paymentStatus ?? this.paymentStatus,
    notes: notes ?? this.notes,
    reservedUntil: reservedUntil ?? this.reservedUntil,
    updatedAt: updatedAt ?? this.updatedAt,
    updatedBy: updatedBy ?? this.updatedBy,
  );
}

class ScheduledTrip {
  final String id;
  final String venueId;
  final String serviceId;
  final String serviceName;
  final String fleetTemplateId;
  final String fleetTemplateName;
  final DateTime departureTime;
  final int totalCapacity;
  final int blockedSeatsCount;
  final int sellableCapacity;
  final int confirmedCount;
  final int reservedCount;
  final double occupancyRate;
  final bool isYieldActive;
  final double currentDynamicDiscount;
  final List<TripPackageTier> packages;
  final Map<String, TripSeatState> seats;
  final DateTime createdAt;

  const ScheduledTrip({
    required this.id,
    required this.venueId,
    required this.serviceId,
    required this.serviceName,
    required this.fleetTemplateId,
    required this.fleetTemplateName,
    required this.departureTime,
    this.totalCapacity = 13,
    this.blockedSeatsCount = 0,
    this.sellableCapacity = 13,
    this.confirmedCount = 0,
    this.reservedCount = 0,
    this.occupancyRate = 0.0,
    this.isYieldActive = false,
    this.currentDynamicDiscount = 0.0,
    this.packages = const [],
    this.seats = const {},
    required this.createdAt,
  });

  int get availableSeatsCount => (sellableCapacity - confirmedCount - reservedCount).clamp(0, totalCapacity);

  Map<String, dynamic> toMap() => {
    'id': id,
    'venueId': venueId,
    'serviceId': serviceId,
    'serviceName': serviceName,
    'fleetTemplateId': fleetTemplateId,
    'fleetTemplateName': fleetTemplateName,
    'departureTime': Timestamp.fromDate(departureTime),
    'totalCapacity': totalCapacity,
    'blockedSeatsCount': blockedSeatsCount,
    'sellableCapacity': sellableCapacity,
    'confirmedCount': confirmedCount,
    'reservedCount': reservedCount,
    'occupancyRate': occupancyRate,
    'isYieldActive': isYieldActive,
    'currentDynamicDiscount': currentDynamicDiscount,
    'packages': packages.map((p) => p.toMap()).toList(),
    'seats': seats.map((key, val) => MapEntry(key, val.toMap())),
    'createdAt': Timestamp.fromDate(createdAt),
  };

  factory ScheduledTrip.fromMap(Map<String, dynamic> map, [String? docId]) {
    final rawPackages = map['packages'] as List<dynamic>? ?? [];
    final rawSeats = map['seats'] as Map<String, dynamic>? ?? {};

    return ScheduledTrip(
      id: docId ?? map['id'] ?? '',
      venueId: map['venueId'] ?? '',
      serviceId: map['serviceId'] ?? '',
      serviceName: map['serviceName'] ?? '',
      fleetTemplateId: map['fleetTemplateId'] ?? '',
      fleetTemplateName: map['fleetTemplateName'] ?? '',
      departureTime: map['departureTime'] != null
          ? (map['departureTime'] as Timestamp).toDate()
          : DateTime.now(),
      totalCapacity: (map['totalCapacity'] as num?)?.toInt() ?? 13,
      blockedSeatsCount: (map['blockedSeatsCount'] as num?)?.toInt() ?? 0,
      sellableCapacity: (map['sellableCapacity'] as num?)?.toInt() ?? 13,
      confirmedCount: (map['confirmedCount'] as num?)?.toInt() ?? 0,
      reservedCount: (map['reservedCount'] as num?)?.toInt() ?? 0,
      occupancyRate: (map['occupancyRate'] as num?)?.toDouble() ?? 0.0,
      isYieldActive: map['isYieldActive'] ?? false,
      currentDynamicDiscount: (map['currentDynamicDiscount'] as num?)?.toDouble() ?? 0.0,
      packages: rawPackages.map((e) => TripPackageTier.fromMap(Map<String, dynamic>.from(e))).toList(),
      seats: rawSeats.map((key, val) => MapEntry(key, TripSeatState.fromMap(Map<String, dynamic>.from(val), key))),
      createdAt: map['createdAt'] != null
          ? (map['createdAt'] as Timestamp).toDate()
          : DateTime.now(),
    );
  }
}
