class VenueRequestModel {
  final String id;
  final String userId;
  final String userEmail;
  final String userName;
  final String venueId;
  final String venueName;
  final String status; // 'pending', 'approved', 'rejected'
  final DateTime createdAt;

  VenueRequestModel({
    required this.id,
    required this.userId,
    required this.userEmail,
    required this.userName,
    required this.venueId,
    required this.venueName,
    this.status = 'pending',
    required this.createdAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'userEmail': userEmail,
      'userName': userName,
      'venueId': venueId,
      'venueName': venueName,
      'status': status,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  factory VenueRequestModel.fromMap(String id, Map<String, dynamic> map) {
    return VenueRequestModel(
      id: id,
      userId: map['userId'] ?? '',
      userEmail: map['userEmail'] ?? '',
      userName: map['userName'] ?? 'Unknown',
      venueId: map['venueId'] ?? '',
      venueName: map['venueName'] ?? '',
      status: map['status'] ?? 'pending',
      createdAt: DateTime.tryParse(map['createdAt'] ?? '') ?? DateTime.now(),
    );
  }
}
