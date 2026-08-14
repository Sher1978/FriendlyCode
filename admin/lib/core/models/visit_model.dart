import 'package:cloud_firestore/cloud_firestore.dart';

class VisitModel {
  final String id;
  final String venueId;
  final String guestId;
  final DateTime timestamp;
  final String guestName;
  final int discountValue;
  final String status; // 'pending_validation', 'approved', 'rejected'
  final String type; // 'scan', 'redeem'
  final DateTime? lastVisitDate;

  VisitModel({
    required this.id,
    required this.venueId,
    required this.guestId,
    required this.timestamp,
    required this.type,
    this.lastVisitDate,
    this.guestName = '',
    this.discountValue = 0,
    this.status = 'approved',
  });

  Map<String, dynamic> toMap() {
    return {
      'venueId': venueId,
      'uid': guestId, // Map 'guestId' to 'uid' to match others
      'guestName': guestName,
      'discountValue': discountValue,
      'status': status,
      'timestamp': Timestamp.fromDate(timestamp),
      'type': type,
      'lastVisitDate': lastVisitDate != null ? Timestamp.fromDate(lastVisitDate!) : null,
    };
  }

  factory VisitModel.fromMap(String id, Map<String, dynamic> map) {
    final rawDiscount = map['discountValue'] ?? map['discount'] ?? 0;
    int parsedDiscount = 0;
    if (rawDiscount is num) {
      parsedDiscount = rawDiscount.toInt();
    } else if (rawDiscount is String) {
      parsedDiscount = int.tryParse(rawDiscount) ?? 0;
    }

    return VisitModel(
      id: id,
      venueId: map['venueId'] ?? '',
      guestId: map['uid'] ?? map['guestId'] ?? '',
      timestamp: map['timestamp'] != null ? (map['timestamp'] as Timestamp).toDate() : DateTime.now(),
      type: map['type'] ?? 'scan',
      lastVisitDate: map['lastVisitDate'] != null ? (map['lastVisitDate'] as Timestamp).toDate() : null,
      guestName: map['guestName'] ?? map['name'] ?? '',
      discountValue: parsedDiscount,
      status: map['status'] ?? 'approved',
    );
  }
}
