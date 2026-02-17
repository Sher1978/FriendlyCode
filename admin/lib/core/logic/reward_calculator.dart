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
  /// 
  /// [previousReward]: The discount obtained in the last visit. Used for Maintenance Mode.
  static RewardState calculate(
    DateTime lastVisit, 
    DateTime currentTime, 
    LoyaltyConfig config, 
    List<VenueTier> tiers, 
    {int? previousReward}
  ) {
    final difference = currentTime.difference(lastVisit);
    final totalSecondsPassed = difference.inSeconds;
    final double hoursPassed = totalSecondsPassed / 3600.0;

    // 0. Maintenance Mode
    // If user previously earned VIP (>=20%), they keep it for 24h from that visit,
    // bypassing the safety cooldown of the next visit.
    if (previousReward != null && previousReward >= config.percVip) { // >= 20%
       // The user rule: "continues to act for 24h from updated start".
       // So if we are within 24h of the anchor/last visit that gave 20%:
       if (hoursPassed < 24) {
         final int endTimeSeconds = 24 * 3600;
         return RewardState(
            currentDiscount: previousReward,
            nextDiscount: config.percDecay1, // After 24h maintenance, usually drops to Decay1
            secondsUntilNextChange: endTimeSeconds - totalSecondsPassed,
            phase: RewardPhase.vip,
            statusLabelKey: 'valid_for',
            isLocked: false,
         );
       }
       // If > 24h, we fall through. 
       // Should we skip Cooldown? 
       // User: "After 24h, decay logic triggers".
       // If we fall through to Cooldown check (if < 12h), that would be weird if hoursPassed > 24h.
       // But if hoursPassed > 24h, then it's definitely > 12h, so Cooldown check (if < 12) won't trigger. 
       // So standard logic works fine for Decay.
    }

    // 1. Safety Cooldown (e.g. 0-12h) - Global Rule
    // If the user returns too quickly (e.g. refreshing the page), we shouldn't punish them by dropping to Base.
    // If they had a valid reward in the anchor visit, verify it.
    if (hoursPassed < config.safetyCooldownHours) {
      final int endTimeSeconds = config.safetyCooldownHours * 3600;
      
      // Determine what they are waiting for (First tier or VIP)
      final int nextTarget = tiers.isNotEmpty ? tiers.first.percentage : config.percVip;

      // FIX: If we have a previous reward higher than base, maintain it during cooldown (Effective Maintenance)
      if (previousReward != null && previousReward > config.percBase) {
        return RewardState(
          currentDiscount: previousReward,
          nextDiscount: nextTarget,
          secondsUntilNextChange: endTimeSeconds - totalSecondsPassed,
          phase: RewardPhase.cooldown,
          statusLabelKey: 'valid_for',
          isLocked: false, // Not locked, they can use it
        );
      }

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
    final sortedTiers = List<VenueTier>.from(tiers)..sort((a, b) => a.maxHours.compareTo(b.maxHours));

    for (int i = 0; i < sortedTiers.length; i++) {
      final tier = sortedTiers[i];
      
      if (hoursPassed <= tier.maxHours) {
        final int endTimeSeconds = tier.maxHours * 3600;
        
        final int nextDisc = (i < sortedTiers.length - 1) 
            ? sortedTiers[i + 1].percentage 
            : config.percBase;

        return RewardState(
          currentDiscount: tier.percentage,
          nextDiscount: nextDisc,
          secondsUntilNextChange: endTimeSeconds - totalSecondsPassed,
          phase: i == 0 ? RewardPhase.vip : RewardPhase.decay1, 
          statusLabelKey: 'valid_for',
          isLocked: false,
        );
      }
    }

    // 3. Reset / Base
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
