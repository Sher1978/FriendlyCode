import 'package:friendly_code/core/models/venue_model.dart';
import 'package:timezone/standalone.dart' as tz;

enum RewardPhase { 
  active, // Day is active, base or max tier
  decay,  // Melted down to previous/base
}

class RewardState {
  final int currentDiscount;
  final int nextDiscount;
  final int secondsUntilDecay; 
  final int secondsUntilNextTier;
  final RewardPhase phase;
  final String statusLabelKey; // localization key
  final bool isLocked;
  final bool isDayActive;

  const RewardState({
    required this.currentDiscount,
    required this.nextDiscount,
    required this.secondsUntilDecay,
    required this.secondsUntilNextTier,
    required this.phase,
    required this.statusLabelKey,
    required this.isLocked,
    this.isDayActive = false,
  });
}

class RewardCalculator {
  /// Calculates the reward state based on "Active Day" logic.
  static RewardState calculate({
    required DateTime? lastActivatedDate,
    required DateTime currentTime,
    required String timezone,
    required LoyaltyConfig config,
    required int currentTierValue,
    required int maxTierValue,
    required int baseTierValue,
  }) {
    // 1. Setup Timezone
    late tz.Location location;
    try {
      location = tz.getLocation(timezone);
    } catch (e) {
      try {
         location = tz.getLocation('Etc/GMT-3');
      } catch (e) {
         // Fallback to UTC if even GMT-3 fails (likely in test environment without full DB)
         // Note: ensure timezone data is initialized in main/test
         location = tz.getLocation('UTC');
      }
    }

    final tz.TZDateTime nowTz = tz.TZDateTime.from(currentTime, location);
    
    // If never visited, return Base state ready for activation
    if (lastActivatedDate == null) {
      return RewardState(
        currentDiscount: baseTierValue,
        nextDiscount: maxTierValue,
        secondsUntilDecay: 0,
        secondsUntilNextTier: 0,
        phase: RewardPhase.active,
        statusLabelKey: 'start_journey',
        isLocked: false,
        isDayActive: false,
      );
    }

    final tz.TZDateTime lastActiveTz = tz.TZDateTime.from(lastActivatedDate, location);
    
    // Calculate start of days for comparison (00:00:00)
    final nowDayStart = tz.TZDateTime(location, nowTz.year, nowTz.month, nowTz.day);
    final lastActiveDayStart = tz.TZDateTime(location, lastActiveTz.year, lastActiveTz.month, lastActiveTz.day);

    // 2. Check Degradation (Melting)
    final diff = nowDayStart.difference(lastActiveDayStart);
    final daysPassed = diff.inDays;
    
    // Check if cycle expired (reset interval), back to Base
    if (daysPassed >= config.resetIntervalDays) {
       return RewardState(
        currentDiscount: baseTierValue,
        nextDiscount: baseTierValue, 
        secondsUntilDecay: 0,
        secondsUntilNextTier: 0,
        phase: RewardPhase.active,
        statusLabelKey: 'cycle_reset',
        isLocked: false,
        isDayActive: false,
      );
    }

    // If melted completely (degradation interval passed)
    if (daysPassed >= config.degradationIntervalDays) {
      // Return to Base
      return RewardState(
        currentDiscount: baseTierValue, 
        nextDiscount: baseTierValue,
        secondsUntilDecay: 0,
        secondsUntilNextTier: 0,
        phase: RewardPhase.decay,
        statusLabelKey: 'discount_melted',
        isLocked: false,
        isDayActive: false, 
      );
    }

    // Determine target tier based on days passed and current tier
    // We only degrade IF daysPassed exceeds the allowed window for the CURRENT tier.
    
    // First, find the "window" for the current tier.
    int allowedWindowDays = config.degradationIntervalDays; // default fallback
    
    if (currentTierValue >= config.percVip) {
       allowedWindowDays = config.vipWindowDays;
    } else {
       // Find the tightest stage that matches the current discount or better
       for (var stage in config.decayStages) {
         if (currentTierValue >= stage.discount) {
            allowedWindowDays = stage.days;
            break;
         }
       }
    }
    
    int daysUntilDecay = allowedWindowDays - daysPassed;

    // 3. Check Active Day Status
    final bool isSameDay = daysPassed == 0;

    // 4. Time until midnight (Next Tier Unlock)
    final nextDayStart = tz.TZDateTime(location, nowTz.year, nowTz.month, nowTz.day + 1);
    final secondsUntilNextTier = nextDayStart.difference(nowTz).inSeconds;

    return RewardState(
      currentDiscount: currentTierValue,
      nextDiscount: maxTierValue,
      // For legacy compatibility, return decay in seconds, assuming we have x full days + time till midnight today
      secondsUntilDecay: daysUntilDecay > 0 ? (daysUntilDecay * 86400) : 0, 
      secondsUntilNextTier: secondsUntilNextTier,
      phase: RewardPhase.active,
      statusLabelKey: isSameDay ? 'active_for_today' : 'return_tomorrow',
      isLocked: false,
      isDayActive: isSameDay,
    );
  }
}
