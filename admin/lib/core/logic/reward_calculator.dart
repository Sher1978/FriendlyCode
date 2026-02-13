import 'package:friendly_code/core/models/venue_model.dart';

class RewardCalculator {
  /// Calculates the reward based on the time difference between now
  /// and the last visit using the Venue's LoyaltyConfig.
  static int calculate(DateTime lastVisit, DateTime currentTime, LoyaltyConfig config) {
    final difference = currentTime.difference(lastVisit);
    final hours = difference.inHours;

    // 1. Safety Cooldown
    if (hours < config.safetyCooldownHours) {
      // Too soon -> No upgrade (Return base or handle via UI logic to show "Wait X hours")
      // Spec says "Keep current discount". 
      // Simplified: If they scan too soon, start from base or prev? 
      // For now, let's allow them to claim Base if it's a new visit, 
      // OR better, we just return percBase because they haven't "earned" the upgrade yet.
      return config.percBase; 
    }

    // 2. VIP Window (e.g., 12h <= delta <= 48h)
    if (hours <= config.vipWindowHours) {
      return config.percVip; // 20%
    }
    
    // 3. Decay Tier 1 (e.g., 48h < delta <= 72h)
    if (hours <= config.tier1DecayHours) {
      return config.percDecay1; // 15%
    }
    
    // 4. Decay Tier 2 (e.g., 72h < delta <= 168h)
    if (hours <= config.tier2DecayHours) {
      return config.percDecay2; // 10%
    }

    // 5. Reset (e.g., delta > 168h)
    return config.percBase; // 5%
  }
}
