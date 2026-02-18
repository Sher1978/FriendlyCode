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
    final diff = nowTz.difference(lastActiveTz);
    final hoursPassed = diff.inHours;
    
    // Choose decay window based on current tier
    final int tierWindowHours = (currentTierValue >= config.percVip)
        ? config.vipWindowHours
        : (currentTierValue >= config.percDecay1
            ? config.tier1DecayHours
            : (currentTierValue >= config.percDecay2
                ? config.tier2DecayHours
                : config.degradationIntervalHours)); // Fallback for base or others

    final hoursUntilDecay = tierWindowHours - hoursPassed;
    
    // If cycle expired (reset interval), back to Base
    if (diff.inDays >= config.resetIntervalDays) {
       return RewardState(
        currentDiscount: baseTierValue,
        nextDiscount: baseTierValue, 
        secondsUntilDecay: 0,
        phase: RewardPhase.active,
        statusLabelKey: 'cycle_reset',
        isLocked: false,
        isDayActive: false,
      );
    }

    // If melted (degradation interval passed)
    if (hoursPassed >= config.degradationIntervalHours) {
      // Return to Base
      return RewardState(
        currentDiscount: baseTierValue, 
        nextDiscount: baseTierValue,
        secondsUntilDecay: 0,
        phase: RewardPhase.decay,
        statusLabelKey: 'discount_melted',
        isLocked: false,
        isDayActive: false, 
      );
    }

    // 3. Check Active Day Status
    final bool isSameDay = nowDayStart.isAtSameMomentAs(lastActiveDayStart);

    // 4. Time until midnight (Next Tier Unlock)
    final nextDayStart = tz.TZDateTime(location, nowTz.year, nowTz.month, nowTz.day + 1);
    final secondsUntilNextTier = nextDayStart.difference(nowTz).inSeconds;

    return RewardState(
      currentDiscount: currentTierValue,
      nextDiscount: maxTierValue,
      secondsUntilDecay: hoursUntilDecay > 0 ? hoursUntilDecay * 3600 : 0, 
      secondsUntilNextTier: secondsUntilNextTier,
      phase: RewardPhase.active,
      statusLabelKey: isSameDay ? 'active_for_today' : 'return_tomorrow',
      isLocked: false,
      isDayActive: isSameDay,
    );
  }
}
