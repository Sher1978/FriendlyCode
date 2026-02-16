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
  /// and the last visit using the Venue's LoyaltyConfig.
  static RewardState calculate(DateTime lastVisit, DateTime currentTime, LoyaltyConfig config) {
    final difference = currentTime.difference(lastVisit);
    final totalSecondsPassed = difference.inSeconds;
    final double hoursPassed = totalSecondsPassed / 3600.0;

    // 1. Safety Cooldown (e.g. 0-12h)
    // User has Base (5%). Next is VIP (20%).
    if (hoursPassed < config.safetyCooldownHours) {
      final int endTimeSeconds = config.safetyCooldownHours * 3600;
      return RewardState(
        currentDiscount: config.percBase,
        nextDiscount: config.percVip,
        secondsUntilNextChange: endTimeSeconds - totalSecondsPassed,
        phase: RewardPhase.cooldown,
        statusLabelKey: 'unlocks_in',
        isLocked: true,
      );
    }

    // 2. VIP Window (e.g., 12h <= delta < 48h)
    // User has VIP (20%). Next is Decay1 (15%).
    if (hoursPassed < config.vipWindowHours) {
      final int endTimeSeconds = config.vipWindowHours * 3600;
      return RewardState(
        currentDiscount: config.percVip,
        nextDiscount: config.percDecay1,
        secondsUntilNextChange: endTimeSeconds - totalSecondsPassed,
        phase: RewardPhase.vip,
        statusLabelKey: 'valid_for',
        isLocked: false,
      );
    }
    
    // 3. Decay Tier 1 (e.g., 48h <= delta < 72h)
    // User has Decay1 (15%). Next is Decay2 (10%).
    if (hoursPassed < config.tier1DecayHours) {
      final int endTimeSeconds = config.tier1DecayHours * 3600;
      return RewardState(
        currentDiscount: config.percDecay1,
        nextDiscount: config.percDecay2,
        secondsUntilNextChange: endTimeSeconds - totalSecondsPassed,
        phase: RewardPhase.decay1,
        statusLabelKey: 'valid_for',
        isLocked: false,
      );
    }
    
    // 4. Decay Tier 2 (e.g., 72h <= delta < 168h)
    // User has Decay2 (10%). Next is Base (5%).
    if (hoursPassed < config.tier2DecayHours) {
      final int endTimeSeconds = config.tier2DecayHours * 3600;
      return RewardState(
        currentDiscount: config.percDecay2,
        nextDiscount: config.percBase,
        secondsUntilNextChange: endTimeSeconds - totalSecondsPassed,
        phase: RewardPhase.decay2,
        statusLabelKey: 'valid_for',
        isLocked: false,
      );
    }

    // 5. Reset / Base (e.g., delta >= 168h)
    // User has Base (5%). No next change.
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
