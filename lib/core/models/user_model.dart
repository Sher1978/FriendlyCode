class UserModel {
  final String userId;
  final String name;
  final Map<String, String> messengers; // { whatsapp: string, telegram: string }
  final Map<String, UserHistoryItem> history; // { venueId: HistoryItem }

  UserModel({
    required this.userId,
    required this.name,
    required this.messengers,
    required this.history,
  });

  factory UserModel.fromMap(Map<String, dynamic> data, String id) {
    return UserModel(
      userId: id,
      name: data['name'] ?? '',
      messengers: Map<String, String>.from(data['messengers'] ?? {}),
      history: (data['history'] as Map<String, dynamic>? ?? {}).map(
        (key, value) => MapEntry(key, UserHistoryItem.fromMap(value)),
      ),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'name': name,
      'messengers': messengers,
      'history': history.map((key, value) => MapEntry(key, value.toMap())),
    };
  }
}

class UserHistoryItem {
  final DateTime lastVisitTimestamp;
  // totalVisits removed from spec v1.0 but useful to keep in mind? 
  // Spec says: "history: Map { venueId: { lastVisitTimestamp: Timestamp } }"
  // I'll stick to spec exactly.

  UserHistoryItem({required this.lastVisitTimestamp});

  factory UserHistoryItem.fromMap(Map<String, dynamic> data) {
    return UserHistoryItem(
      // Firestore Timestamp handling would go here, simplified for now
      lastVisitTimestamp: data['lastVisitTimestamp'] != null 
          ? DateTime.parse(data['lastVisitTimestamp'].toString()) // simplified
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'lastVisitTimestamp': lastVisitTimestamp.toIso8601String(),
    };
  }
}
