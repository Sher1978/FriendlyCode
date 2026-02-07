/// Configuration model for Time-Decay Rules
class RewardConfig {
  final int tier1Hours; // e.g. 24
  final int tier2Hours; // e.g. 36
  final int tier3Hours; // e.g. 240 (10 days)

  final int rewardTier1; // e.g. 20%
  final int rewardTier2; // e.g. 15%
  final int rewardTier3; // e.g. 10%
  final int rewardBase;  // e.g. 5%

  const RewardConfig({
    this.tier1Hours = 24,
    this.tier2Hours = 36,
    this.tier3Hours = 240,
    this.rewardTier1 = 20,
    this.rewardTier2 = 15,
    this.rewardTier3 = 10,
    this.rewardBase = 5,
  });
}

class RewardCalculator {
  // Default configuration (can be overwritten)
  static RewardConfig _currentConfig = const RewardConfig();

  /// Allows Admin/Owner to update rules dynamically
  static void updateConfig(RewardConfig newConfig) {
    _currentConfig = newConfig;
  }

  /// Calculates the reward based on the time difference between now
  /// and the last visit using the Current Config.
  static int calculate(DateTime lastVisit, DateTime currentTime) {
    final difference = currentTime.difference(lastVisit);
    final hoursPassed = difference.inHours;

    if (hoursPassed < 0) {
      return _currentConfig.rewardBase;
    }

    if (hoursPassed <= _currentConfig.tier1Hours) {
      return _currentConfig.rewardTier1;
    } else if (hoursPassed <= _currentConfig.tier2Hours) {
      return _currentConfig.rewardTier2;
    } else if (hoursPassed <= _currentConfig.tier3Hours) {
      return _currentConfig.rewardTier3;
    } else {
      return _currentConfig.rewardBase;
    }
  }
}
