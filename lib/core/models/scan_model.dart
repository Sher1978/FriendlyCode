import 'package:cloud_firestore/cloud_firestore.dart';

class ScanModel {
  final String id;
  final String venueId;
  final String guestId;
  final String guestName;
  final int applicableDiscount;
  final String status; // 'pending', 'confirmed', 'rejected'
  final DateTime timestamp;

  ScanModel({
    required this.id,
    required this.venueId,
    required this.guestId,
    required this.guestName,
    required this.applicableDiscount,
    this.status = 'pending',
    required this.timestamp,
  });

  Map<String, dynamic> toMap() {
    return {
      'venueId': venueId,
      'guestId': guestId,
      'guestName': guestName,
      'applicableDiscount': applicableDiscount,
      'status': status,
      'timestamp': Timestamp.fromDate(timestamp),
    };
  }

  factory ScanModel.fromMap(String id, Map<String, dynamic> map) {
    return ScanModel(
      id: id,
      venueId: map['venueId'] ?? '',
      guestId: map['guestId'] ?? '',
      guestName: map['guestName'] ?? 'Guest',
      applicableDiscount: map['applicableDiscount'] ?? 0,
      status: map['status'] ?? 'pending',
      timestamp: (map['timestamp'] as Timestamp).toDate(),
    );
  }
}
