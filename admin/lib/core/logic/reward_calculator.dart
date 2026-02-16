import 'package:friendly_code/core/models/venue_model.dart';

enum RewardPhase { cooldown, vip, decay1, decay2, base }

class RewardState {
  final int currentDiscount;
  final int nextDiscount;
  final int secondsUntilNextChange;
  final RewardPhase phase;
  final String statusLabelKey; // localization key
  final bool isLocked;

  const RewardState({
    required this.currentDiscount,
    required this.nextDiscount,
    required this.secondsUntilNextChange,
    required this.phase,
    required this.statusLabelKey,
    required this.isLocked,
  });

  @override
  String toString() => 'RewardState(current: $currentDiscount%, next: $nextDiscount%, phase: $phase, locked: $isLocked, secondsLeft: $secondsUntilNextChange)';
}

class RewardCalculator {
  /// Calculates the complete reward state based on the time difference between now
  /// and the last visit using the Venue's LoyaltyConfig and dynamic Tiers.
  static RewardState calculate(
    DateTime lastVisit, 
    DateTime currentTime, 
    LoyaltyConfig config, 
    List<VenueTier> tiers
  ) {
    final difference = currentTime.difference(lastVisit);
    final totalSecondsPassed = difference.inSeconds;
    final double hoursPassed = totalSecondsPassed / 3600.0;

    // 1. Safety Cooldown (e.g. 0-12h) - Global Rule
    // User has Base (5%). Next is the best tier (usually the first one).
    if (hoursPassed < config.safetyCooldownHours) {
      final int endTimeSeconds = config.safetyCooldownHours * 3600;
      
      // Determine what they are waiting for (First tier or VIP)
      // If tiers exist, the target is the first tier's percentage.
      // If no tiers, target is VIP default.
      final int nextTarget = tiers.isNotEmpty ? tiers.first.percentage : config.percVip;

      return RewardState(
        currentDiscount: config.percBase,
        nextDiscount: nextTarget,
        secondsUntilNextChange: endTimeSeconds - totalSecondsPassed,
        phase: RewardPhase.cooldown,
        statusLabelKey: 'unlocks_in',
        isLocked: true,
      );
    }

    // 2. Dynamic Tiers Logic
    // Sort tiers by hours just in case they aren't
    final sortedTiers = List<VenueTier>.from(tiers)..sort((a, b) => a.maxHours.compareTo(b.maxHours));

    for (int i = 0; i < sortedTiers.length; i++) {
      final tier = sortedTiers[i];
      
      // If we are within this tier's window
      if (hoursPassed <= tier.maxHours) {
        final int endTimeSeconds = tier.maxHours * 3600;
        
        // Determine next discount
        // If there is a next tier, that's the next discount.
        // If this is the last tier, next is Base.
        final int nextDisc = (i < sortedTiers.length - 1) 
            ? sortedTiers[i + 1].percentage 
            : config.percBase;

        return RewardState(
          currentDiscount: tier.percentage,
          nextDiscount: nextDisc,
          secondsUntilNextChange: endTimeSeconds - totalSecondsPassed,
          // Map index to phase enum roughly for now, or add generic 'tier' phase
          phase: i == 0 ? RewardPhase.vip : RewardPhase.decay1, 
          statusLabelKey: 'valid_for',
          isLocked: false,
        );
      }
    }

    // 3. Reset / Base (e.g., hours > last tier)
    return RewardState(
      currentDiscount: config.percBase,
      nextDiscount: config.percBase,
      secondsUntilNextChange: 0,
      phase: RewardPhase.base,
      statusLabelKey: 'standard',
      isLocked: false,
    );
  }
}
