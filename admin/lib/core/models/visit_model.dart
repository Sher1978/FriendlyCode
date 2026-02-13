import 'package:cloud_firestore/cloud_firestore.dart';

class VisitModel {
  final String id;
  final String venueId;
  final String guestId;
  final DateTime timestamp;
  final String guestName;
  final int discountValue;
  final String status; // 'pending_validation', 'approved', 'rejected'

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
    return VisitModel(
      id: id,
      venueId: map['venueId'] ?? '',
      guestId: map['uid'] ?? map['guestId'] ?? '',
      timestamp: (map['timestamp'] as Timestamp).toDate(),
      type: map['type'] ?? 'scan',
      lastVisitDate: map['lastVisitDate'] != null ? (map['lastVisitDate'] as Timestamp).toDate() : null,
      guestName: map['guestName'] ?? '',
      discountValue: map['discountValue'] ?? 0,
      status: map['status'] ?? 'approved',
    );
  }
}
