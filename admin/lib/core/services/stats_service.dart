
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:friendly_code/core/models/venue_stats_model.dart';
import 'package:intl/intl.dart';

class StatsService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // 1. Snapshot System: Aggregate Active Day logs into DailyStats
  // This would ideally be a Cloud Function. Here we simulate it or run it on Admin load.
  Future<void> aggregateDailyStats(String venueId) async {
    // Determine "Today" in venue timezone (omitted for brevity, using simple date)
    final String today = DateFormat('yyyy-MM-dd').format(DateTime.now());
    
    // Fetch today's visits
    final startOfDay = DateTime.now().copyWith(hour: 0, minute: 0, second: 0);
    
    final query = await _firestore.collection('visits')
        .where('venueId', isEqualTo: venueId)
        .where('timestamp', isGreaterThanOrEqualTo: Timestamp.fromDate(startOfDay))
        .get();

    final docs = query.docs;
    if (docs.isEmpty) return;

    int totalVisits = docs.length;
    Set<String> uniqueUsers = {};
    int newActivations = 0;
    Map<String, int> tierDist = {};

    for (var doc in docs) {
      final data = doc.data();
      uniqueUsers.add(data['uid'] ?? '');
      
      // Check if new activation (first visit) - approximate check
      if (data['status'] == 'first' || data['type'] == 'activation') {
        newActivations++; 
      }

      // Tier Distribution
      final discount = data['discountValue']?.toString() ?? '5';
      tierDist[discount] = (tierDist[discount] ?? 0) + 1;
    }

    // Save to daily_stats collection
    final stats = DailyStats(
      date: today,
      totalVisits: totalVisits,
      uniqueUsers: uniqueUsers.length,
      newActivations: newActivations,
      tierDistribution: tierDist,
    );

    await _firestore.collection('venues')
        .doc(venueId)
        .collection('daily_stats')
        .doc(today)
        .set(stats.toMap(), SetOptions(merge: true));
  }

  // 2. Fetch Stats for Charts
  Future<List<DailyStats>> getDailyStats(String venueId, int days) async {
    final query = await _firestore.collection('venues')
        .doc(venueId)
        .collection('daily_stats')
        .orderBy('date', descending: true)
        .limit(days)
        .get();

    return query.docs.map((d) => DailyStats.fromMap(d.data())).toList();
  }

  // 3. Visit Velocity (Avg days between visits) - strategic
  Future<List<FlSpot>> getVisitVelocity(String venueId) async {
    // This requires complex aggregation across ALL visits. 
    // Simplified: Return mock data or pre-calculated field from venue stats.
    // For MVP, we will simulate this based on recent data or return a placeholder structure
    // that the UI can use. 
    // Real implementation would be: Cloud Function calculates this daily and stores in 'venue_kpi'.
    return [
      const FlSpot(0, 12),
      const FlSpot(1, 10), 
      const FlSpot(2, 8), // Improving
      const FlSpot(3, 14),
      const FlSpot(4, 9),
    ];
  }
}

// Temporary placeholder for FlSpot to avoid dependency error before pub get finishes
class FlSpot {
  final double x;
  final double y;
  const FlSpot(this.x, this.y);
}
