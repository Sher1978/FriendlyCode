/// Configuration model for Time-Decay Rules
class DiscountConfig {
  final int tier1Hours; // e.g. 24
  final int tier2Hours; // e.g. 36
  final int tier3Hours; // e.g. 240 (10 days)

  final int discountTier1; // e.g. 20%
  final int discountTier2; // e.g. 15%
  final int discountTier3; // e.g. 10%
  final int discountBase;  // e.g. 5%

  const DiscountConfig({
    this.tier1Hours = 24,
    this.tier2Hours = 36,
    this.tier3Hours = 240,
    this.discountTier1 = 20,
    this.discountTier2 = 15,
    this.discountTier3 = 10,
    this.discountBase = 5,
  });
}

class DiscountCalculator {
  // Default configuration (can be overwritten)
  static DiscountConfig _currentConfig = const DiscountConfig();

  /// Allows Admin/Owner to update rules dynamically
  static void updateConfig(DiscountConfig newConfig) {
    _currentConfig = newConfig;
  }

  /// Calculates the discount based on the time difference between now
  /// and the last visit using the Current Config.
  static int calculate(DateTime lastVisit, DateTime currentTime) {
    final difference = currentTime.difference(lastVisit);
    final hoursPassed = difference.inHours;

    if (hoursPassed < 0) {
      return _currentConfig.discountBase;
    }

    if (hoursPassed <= _currentConfig.tier1Hours) {
      return _currentConfig.discountTier1;
    } else if (hoursPassed <= _currentConfig.tier2Hours) {
      return _currentConfig.discountTier2;
    } else if (hoursPassed <= _currentConfig.tier3Hours) {
      return _currentConfig.discountTier3;
    } else {
      return _currentConfig.discountBase;
    }
  }
}
