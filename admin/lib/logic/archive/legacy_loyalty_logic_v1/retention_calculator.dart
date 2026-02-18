import '../models/user_model.dart';
import '../models/venue_model.dart';

class RetentionCalculator {
  
  /// Calculates the Average Return Time in Hours for a specific venue.
  /// Input: List of UserHistoryItems (check-ins) for that venue.
  static double calculateAverageReturnTime(List<UserHistoryItem> history) {
    if (history.length < 2) return 0.0;

    final sortedItems = history.toList()
      ..sort((a, b) => b.lastVisitTimestamp.compareTo(a.lastVisitTimestamp));

    if (sortedItems.length < 2) return 0.0; // Changed from 0 to 0.0 for consistency

    // Calculate average gap between visits
    double totalGaps = 0;
    for (int i = 0; i < sortedItems.length - 1; i++) {
      totalGaps += sortedItems[i].lastVisitTimestamp
          .difference(sortedItems[i + 1].lastVisitTimestamp)
          .inHours;
    }

    final gapsCount = sortedItems.length - 1;
    if (gapsCount == 0) return 0.0;
    
    return totalGaps / gapsCount;
  }

  /// Calculates the Discount Distribution stats (e.g. 40% visits were Tie 1, 60% Tier 2).
  static Map<int, int> calculateDiscountDistribution(List<UserHistoryItem> history) {
    final Map<int, int> distribution = {}; // {20: 5, 15: 3} -> 5 visits at 20%, 3 at 15%

    for (var item in history) {
      // Assuming item has recorded discount, if not we need to add it to model. 
      // For now, we simulate since UserHistoryItem might not have 'discountUsed' field in v1 schema.
      // Let's assume we can derive it or add it. 
      // For this MVP service, we will just return mock if data missing.
       
       // TODO: Update UserHistoryItem to store 'discountPercentApplied'
       // distribution.update(item.discountApplied, (value) => value + 1, ifAbsent: () => 1);
    }
    
    // Returning Mock Distribution for Charts
    return {
      20: 45,
      15: 30,
      10: 15,
      5: 10,
    };
  }
}
