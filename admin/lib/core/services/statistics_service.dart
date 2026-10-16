import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/models/visit_model.dart';

class StatisticsService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Future<VenueStats> calculateVenueStats(String venueId, {DateTime? selectedMonth}) async {
    // 1. Fetch ALL visits for venue (Scans + Redeems)
    final visitsSnap = await _firestore
        .collection('visits')
        .where('venueId', isEqualTo: venueId)
        .get();

    final allVisits = visitsSnap.docs.map((d) => VisitModel.fromMap(d.id, d.data())).toList();

    return calculateStatsFromVisits(allVisits, selectedMonth: selectedMonth);
  }

  VenueStats calculateStatsFromVisits(List<VisitModel> allVisits, {DateTime? selectedMonth}) {
    if (allVisits.isEmpty) {
      return VenueStats(avgReturnHours: 0, totalCheckins: 0);
    }

    // Filter by selected month if provided
    List<VisitModel> inScopeVisits;
    if (selectedMonth != null) {
      final startOfMonth = DateTime(selectedMonth.year, selectedMonth.month, 1);
      final endOfMonth = DateTime(selectedMonth.year, selectedMonth.month + 1, 0, 23, 59, 59);
      inScopeVisits = allVisits.where((v) {
        return v.timestamp.isAfter(startOfMonth.subtract(const Duration(seconds: 1))) &&
            v.timestamp.isBefore(endOfMonth.add(const Duration(seconds: 1)));
      }).toList();
    } else {
      inScopeVisits = allVisits;
    }

    // 1. Total Scans in period
    final scans = inScopeVisits.where((v) => v.type == 'scan').toList();
    final totalCheckins = scans.length;

    // 2. Active Guests in period
    final uniqueGuestsInScope = inScopeVisits
        .map((v) => v.guestId)
        .where((uid) => uid.isNotEmpty && uid != 'anonymous')
        .toSet();
    final monthlyActiveUsers = uniqueGuestsInScope.length;

    // 3. Avg Discount in period
    double totalDiscount = 0;
    int countWithDiscount = 0;
    for (var v in inScopeVisits) {
      final val = v.discountValue > 0 ? v.discountValue.toDouble() : 5.0;
      totalDiscount += val;
      countWithDiscount++;
    }
    final avgDiscount = countWithDiscount > 0 ? (totalDiscount / countWithDiscount) : 0.0;

    // 4. Return Intervals & Retention
    Map<String, List<VisitModel>> allGuestVisits = {};
    for (var v in allVisits) {
      final uid = v.guestId;
      if (uid.isEmpty || uid == 'anonymous') continue;
      allGuestVisits.putIfAbsent(uid, () => []).add(v);
    }

    List<double> returnIntervals = [];
    allGuestVisits.forEach((guestId, gVisits) {
      gVisits.sort((a, b) => a.timestamp.compareTo(b.timestamp));
      for (int i = 1; i < gVisits.length; i++) {
        final diff = gVisits[i].timestamp.difference(gVisits[i - 1].timestamp).inHours;
        returnIntervals.add(diff.toDouble());
      }
    });

    final avgReturn = returnIntervals.isEmpty
        ? 0.0
        : returnIntervals.reduce((a, b) => a + b) / returnIntervals.length;

    // Retention Rate: for selected month, fraction of active guests who have >= 2 lifetime visits
    int recurringCount = 0;
    for (var guestId in uniqueGuestsInScope) {
      final history = allGuestVisits[guestId] ?? [];
      if (history.length > 1) {
        recurringCount++;
      }
    }
    final totalScopeGuests = uniqueGuestsInScope.length;
    final retentionRate = totalScopeGuests > 0 ? (recurringCount / totalScopeGuests) * 100 : 0.0;

    // 5. Segmentation
    final now = DateTime.now();
    int newGuests = 0;
    int regularGuests = 0;
    int lostGuests = 0;

    for (var guestId in uniqueGuestsInScope) {
      final history = allGuestVisits[guestId] ?? [];
      final totalVisitsCount = history.length;
      final lastVisit = history.isNotEmpty ? history.last.timestamp : now;
      final daysSinceLastVisit = now.difference(lastVisit).inDays;

      if (daysSinceLastVisit >= 14) {
        lostGuests++;
      } else if (totalVisitsCount <= 2) {
        newGuests++;
      } else {
        regularGuests++;
      }
    }

    return VenueStats(
      avgReturnHours: avgReturn,
      totalCheckins: totalCheckins,
      monthlyActiveUsers: monthlyActiveUsers,
      avgDiscount: avgDiscount,
      retentionRate: retentionRate,
      newGuestsCount: newGuests,
      vipGuestsCount: regularGuests,
      lostGuestsCount: lostGuests,
    );
  }
}
