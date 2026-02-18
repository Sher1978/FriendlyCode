
import 'package:cloud_firestore/cloud_firestore.dart';

class DailyStats {
  final String date; // YYYY-MM-DD
  final int totalVisits; // Total scans
  final int uniqueUsers; // Unique people
  final int newActivations; // First time visits
  final Map<String, int> tierDistribution; // "5": 10, "10": 5 etc
  final double retentionRate; // Calculated field

  DailyStats({
    required this.date,
    required this.totalVisits,
    required this.uniqueUsers,
    required this.newActivations,
    required this.tierDistribution,
    this.retentionRate = 0.0,
  });

  Map<String, dynamic> toMap() {
    return {
      'date': date,
      'totalVisits': totalVisits,
      'uniqueUsers': uniqueUsers,
      'newActivations': newActivations,
      'tierDistribution': tierDistribution,
      'retentionRate': retentionRate,
    };
  }

  factory DailyStats.fromMap(Map<String, dynamic> map) {
    return DailyStats(
      date: map['date'] ?? '',
      totalVisits: map['totalVisits'] ?? 0,
      uniqueUsers: map['uniqueUsers'] ?? 0,
      newActivations: map['newActivations'] ?? 0,
      tierDistribution: Map<String, int>.from(map['tierDistribution'] ?? {}),
      retentionRate: (map['retentionRate'] ?? 0.0).toDouble(),
    );
  }
}
