import 'package:cloud_firestore/cloud_firestore.dart';

class LeadModel {
  final String id;
  final String venueId;
  final String guestId;
  final String guestName;
  final String guestContact;
  final String source;
  final String status;
  final String notes;
  final DateTime createdAt;

  // Legacy fields (keeping for compatibility)
  final String city;
  final String phone;
  final String email;

  LeadModel({
    required this.id,
    required this.venueId,
    required this.guestId,
    required this.guestName,
    required this.guestContact,
    this.source = 'scan_qr',
    this.status = 'new',
    this.notes = '',
    required this.createdAt,
    this.city = '',
    this.phone = '',
    this.email = '',
  });

  Map<String, dynamic> toMap() {
    return {
      'venueId': venueId,
      'guestId': guestId,
      'guestName': guestName,
      'guestContact': guestContact,
      'source': source,
      'status': status,
      'notes': notes,
      'createdAt': Timestamp.fromDate(createdAt),
      'city': city,
      'phone': phone,
      'email': email,
    };
  }

  factory LeadModel.fromMap(String id, Map<String, dynamic> map) {
    return LeadModel(
      id: id,
      venueId: map['venueId'] ?? '',
      guestId: map['uid'] ?? map['guestId'] ?? '', // Handle both new 'uid' and legacy 'guestId'
      guestName: map['name'] ?? map['guestName'] ?? 'Guest', // Handle 'name' from Leads collection
      guestContact: map['email'] ?? map['guestContact'] ?? '',
      source: map['source'] ?? 'scan_qr',
      status: map['status'] ?? 'new',
      notes: map['notes'] ?? '',
      createdAt: (map['createdAt'] as Timestamp).toDate(),
      city: map['city'] ?? '',
      phone: map['phone'] ?? '',
      email: map['email'] ?? '',
    );
  }
}
