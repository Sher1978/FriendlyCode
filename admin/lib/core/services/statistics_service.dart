import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/models/visit_model.dart';

class StatisticsService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Future<VenueStats> calculateVenueStats(String venueId) async {
    // 1. Fetch ALL visits for venue (Scans + Redeems)
    final visitsSnap = await _firestore
        .collection('visits')
        .where('venueId', isEqualTo: venueId)
        .get();

    final allVisits = visitsSnap.docs.map((d) => VisitModel.fromMap(d.id, d.data())).toList();

    // 2. Filter by status/type
    // Scans are 'completed' and 'type: scan'
    // Redemptions are 'approved' and 'type: redeem'
    final scans = allVisits.where((v) => v.type == 'scan').toList();
    final redemptions = allVisits.where((v) => v.type == 'redeem' && v.status == 'approved').toList();

    if (allVisits.isEmpty) {
      return VenueStats(avgReturnHours: 0, totalCheckins: 0);
    }

    // 3. Basic Counts (Total Scans)
    final totalCheckins = scans.length;
    
    // 4. Monthly Active Users (calculated from anyone who scanned/visited)
    final now = DateTime.now();
    final startOfMonth = DateTime(now.year, now.month, 1);
    final visitsThisMonth = allVisits.where((v) => v.timestamp.isAfter(startOfMonth));
    final monthlyActiveUsers = visitsThisMonth.map((v) => v.guestId).toSet().length;

    // 5. Avg Discount (calculated from approved redemptions)
    double totalDiscount = 0;
    for (var v in redemptions) {
      totalDiscount += v.discountValue;
    }
    final avgDiscount = redemptions.isNotEmpty ? (totalDiscount / redemptions.length) : 0.0;

    // 5. Avg Return Time (Logic from before or simplified)
    // Group by guest
    Map<String, List<VisitModel>> guestVisits = {};
    for (var v in allVisits) {
      guestVisits.putIfAbsent(v.guestId, () => []).add(v);
    }

    // Calculate return times
    List<double> returnIntervals = [];
    guestVisits.forEach((guestId, gVisits) {
      gVisits.sort((a, b) => a.timestamp.compareTo(b.timestamp)); // Sort by time
      for (int i = 1; i < gVisits.length; i++) {
        final diff = gVisits[i].timestamp.difference(gVisits[i - 1].timestamp).inHours;
        returnIntervals.add(diff.toDouble());
      }
    });

    final avgReturn = returnIntervals.isEmpty 
        ? 0.0 
        : returnIntervals.reduce((a, b) => a + b) / returnIntervals.length;

    // 6. Retention Rate (Recurring Guests / Total Guests)
    final totalGuests = guestVisits.length;
    final recurringGuests = guestVisits.values.where((list) => list.length > 1).length;
    final retentionRate = totalGuests > 0 ? (recurringGuests / totalGuests) * 100 : 0.0;

    // --- SEGMENTATION ---
    int newGuests = 0;
    int vipGuests = 0;
    int lostGuests = 0;

    guestVisits.forEach((guestId, history) {
      // New: First visit was this month
      // Or simply: history length == 1 and it was recent?
      // User definition: "New Guests"
      // Let's go with: Joined (First Visit) This Month
      final firstVisit = history.first;
      if (firstVisit.timestamp.isAfter(startOfMonth)) {
        newGuests++;
      }

      // VIP: > 5 visits per month (on average or this month?)
      // User said: "more than 5 visits per month"
      // Let's check visits THIS month
      final thisMonthCount = history.where((v) => v.timestamp.isAfter(startOfMonth)).length;
      if (thisMonthCount > 5) {
        vipGuests++;
      }

      // Lost: No visits this month AND has visited before
      if (thisMonthCount == 0 && history.isNotEmpty) {
        lostGuests++;
      }
    });

    return VenueStats(
      avgReturnHours: avgReturn,
      totalCheckins: totalCheckins,
      monthlyActiveUsers: monthlyActiveUsers,
      avgDiscount: avgDiscount,
      retentionRate: retentionRate,
      newGuestsCount: newGuests,
      vipGuestsCount: vipGuests,
      lostGuestsCount: lostGuests,
    );
  }
}
