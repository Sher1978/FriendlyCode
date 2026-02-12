import 'package:cloud_firestore/cloud_firestore.dart';

class VenueRequestModel {
  final String id;
  final String type; // 'join' or 'create'
  final String status; // 'pending', 'approved', 'rejected'
  final String userId;
  final String userEmail;
  final String userName;
  
  // For 'join' requests
  final String? targetVenueId;
  final String? targetVenueName;

  // For 'create' requests
  final Map<String, dynamic>? newVenueDetails; // {name, address, type, etc}

  final DateTime createdAt;

  VenueRequestModel({
    required this.id,
    required this.type,
    required this.status,
    required this.userId,
    required this.userEmail,
    required this.userName,
    this.targetVenueId,
    this.targetVenueName,
    this.newVenueDetails,
    required this.createdAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'type': type,
      'status': status,
      'userId': userId,
      'userEmail': userEmail,
      'userName': userName,
      'targetVenueId': targetVenueId,
      'targetVenueName': targetVenueName,
      'newVenueDetails': newVenueDetails,
      'createdAt': Timestamp.fromDate(createdAt),
    };
  }

  factory VenueRequestModel.fromMap(String id, Map<String, dynamic> map) {
    return VenueRequestModel(
      id: id,
      type: map['type'] ?? 'join',
      status: map['status'] ?? 'pending',
      userId: map['userId'] ?? '',
      userEmail: map['userEmail'] ?? '',
      userName: map['userName'] ?? 'Unknown',
      targetVenueId: map['targetVenueId'],
      targetVenueName: map['targetVenueName'],
      newVenueDetails: map['newVenueDetails'] != null ? Map<String, dynamic>.from(map['newVenueDetails']) : null,
      createdAt: (map['createdAt'] as Timestamp).toDate(),
    );
  }
}
