import 'package:cloud_firestore/cloud_firestore.dart';

class ServiceBooking {
  final String id;
  final String venueId;
  final String clientName;
  final String clientPhone;
  final String serviceId;
  final String serviceName;
  final String staffId;
  final String staffName;
  final DateTime startTime;
  final DateTime endTime;
  final double originalPrice;
  final double finalPrice;
  final double discountAmount;
  final String discountType; // 'percent' or 'fixed'
  final String status; // 'created', 'sync_pending', 'synced', 'completed', 'cancelled', 'no_show'
  final String source; // 'google_maps', 'whatsapp', 'instagram', 'web'
  final String externalBookingId;
  final String notes;
  final DateTime createdAt;

  const ServiceBooking({
    required this.id,
    required this.venueId,
    required this.clientName,
    required this.clientPhone,
    required this.serviceId,
    this.serviceName = '',
    required this.staffId,
    this.staffName = '',
    required this.startTime,
    required this.endTime,
    this.originalPrice = 0.0,
    this.finalPrice = 0.0,
    this.discountAmount = 0.0,
    this.discountType = 'percent',
    this.status = 'created',
    this.source = 'google_maps',
    this.externalBookingId = '',
    this.notes = '',
    required this.createdAt,
  });

  Map<String, dynamic> toMap() => {
    'id': id,
    'venueId': venueId,
    'clientName': clientName,
    'clientPhone': clientPhone,
    'serviceId': serviceId,
    'serviceName': serviceName,
    'staffId': staffId,
    'staffName': staffName,
    'startTime': Timestamp.fromDate(startTime),
    'endTime': Timestamp.fromDate(endTime),
    'originalPrice': originalPrice,
    'finalPrice': finalPrice,
    'discountAmount': discountAmount,
    'discountType': discountType,
    'status': status,
    'source': source,
    'externalBookingId': externalBookingId,
    'notes': notes,
    'createdAt': Timestamp.fromDate(createdAt),
  };

  factory ServiceBooking.fromMap(Map<String, dynamic> map, [String? docId]) => ServiceBooking(
    id: docId ?? map['id'] ?? '',
    venueId: map['venueId'] ?? '',
    clientName: map['clientName'] ?? '',
    clientPhone: map['clientPhone'] ?? '',
    serviceId: map['serviceId'] ?? '',
    serviceName: map['serviceName'] ?? '',
    staffId: map['staffId'] ?? '',
    staffName: map['staffName'] ?? '',
    startTime: map['startTime'] != null ? (map['startTime'] as Timestamp).toDate() : DateTime.now(),
    endTime: map['endTime'] != null ? (map['endTime'] as Timestamp).toDate() : DateTime.now(),
    originalPrice: (map['originalPrice'] as num?)?.toDouble() ?? 0.0,
    finalPrice: (map['finalPrice'] as num?)?.toDouble() ?? 0.0,
    discountAmount: (map['discountAmount'] as num?)?.toDouble() ?? 0.0,
    discountType: map['discountType'] ?? 'percent',
    status: map['status'] ?? 'created',
    source: map['source'] ?? 'google_maps',
    externalBookingId: map['externalBookingId'] ?? '',
    notes: map['notes'] ?? '',
    createdAt: map['createdAt'] != null ? (map['createdAt'] as Timestamp).toDate() : DateTime.now(),
  );

  ServiceBooking copyWith({
    String? id,
    String? venueId,
    String? clientName,
    String? clientPhone,
    String? serviceId,
    String? serviceName,
    String? staffId,
    String? staffName,
    DateTime? startTime,
    DateTime? endTime,
    double? originalPrice,
    double? finalPrice,
    double? discountAmount,
    String? discountType,
    String? status,
    String? source,
    String? externalBookingId,
    String? notes,
    DateTime? createdAt,
  }) => ServiceBooking(
    id: id ?? this.id,
    venueId: venueId ?? this.venueId,
    clientName: clientName ?? this.clientName,
    clientPhone: clientPhone ?? this.clientPhone,
    serviceId: serviceId ?? this.serviceId,
    serviceName: serviceName ?? this.serviceName,
    staffId: staffId ?? this.staffId,
    staffName: staffName ?? this.staffName,
    startTime: startTime ?? this.startTime,
    endTime: endTime ?? this.endTime,
    originalPrice: originalPrice ?? this.originalPrice,
    finalPrice: finalPrice ?? this.finalPrice,
    discountAmount: discountAmount ?? this.discountAmount,
    discountType: discountType ?? this.discountType,
    status: status ?? this.status,
    source: source ?? this.source,
    externalBookingId: externalBookingId ?? this.externalBookingId,
    notes: notes ?? this.notes,
    createdAt: createdAt ?? this.createdAt,
  );
}
