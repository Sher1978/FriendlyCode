import 'package:cloud_firestore/cloud_firestore.dart';

class LeadModel {
  final String id;
  final String city;
  final String phone;
  final String email;
  final DateTime createdAt;

  LeadModel({
    required this.id,
    required this.city,
    required this.phone,
    required this.email,
    required this.createdAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'city': city,
      'phone': phone,
      'email': email,
      'createdAt': Timestamp.fromDate(createdAt),
    };
  }

  factory LeadModel.fromMap(String id, Map<String, dynamic> map) {
    return LeadModel(
      id: id,
      city: map['city'] ?? '',
      phone: map['phone'] ?? '',
      email: map['email'] ?? '',
      createdAt: (map['createdAt'] as Timestamp).toDate(),
    );
  }
}
