
import 'package:flutter_test/flutter_test.dart';
import 'package:friendly_code/core/logic/reward_calculator.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:timezone/data/latest.dart' as tz;
import 'package:timezone/standalone.dart' as tz;

void main() {
  late tz.Location location;
  late LoyaltyConfig config;
  const String timeZone = 'UTC';

  setUpAll(() {
    tz.initializeTimeZones();
    location = tz.getLocation(timeZone);
    
    config = LoyaltyConfig(
      percBase: 5,
      percVip: 20,
      degradationIntervalHours: 168, // 7 days
      resetIntervalDays: 30, // 30 days
      safetyCooldownHours: 12, 
    );
  });

  group('Active Day Reward Calculator Tests', () {
    
    test('First Activation (No previous visits) returns Base Tier', () {
      final now = DateTime.now();
      
      final result = RewardCalculator.calculate(
        lastActivatedDate: null,
        currentTime: now,
        timezone: timeZone,
        config: config,
        currentTierValue: 0, 
        maxTierValue: config.percVip,
        baseTierValue: config.percBase,
      );

      expect(result.currentDiscount, config.percBase);
      expect(result.phase, RewardPhase.active);
      expect(result.isDayActive, false);
      expect(result.statusLabelKey, 'start_journey');
    });

    test('Same Day Scan (Idempotency) returns Active Day Status', () {
      final now = DateTime(2025, 1, 1, 10, 0, 0); // 10:00 AM
      final lastActivated = DateTime(2025, 1, 1, 9, 0, 0); // 9:00 AM same day
      
      final result = RewardCalculator.calculate(
        lastActivatedDate: lastActivated,
        currentTime: now,
        timezone: timeZone,
        config: config,
        currentTierValue: 5, 
        maxTierValue: 20,
        baseTierValue: 5,
      );

      expect(result.isDayActive, true);
      expect(result.currentDiscount, 5);
      expect(result.statusLabelKey, 'active_for_today');
    });

    test('Next Day Scan (Promotion) returns Next Discount', () {
      final now = DateTime(2025, 1, 2, 10, 0, 0); // Day 2
      final lastActivated = DateTime(2025, 1, 1, 10, 0, 0); // Day 1
      
      final result = RewardCalculator.calculate(
        lastActivatedDate: lastActivated,
        currentTime: now,
        timezone: timeZone,
        config: config,
        currentTierValue: 5, 
        maxTierValue: 20,
        baseTierValue: 5,
      );

      expect(result.isDayActive, false); // Not active TODAY yet
      expect(result.phase, RewardPhase.active);
      expect(result.nextDiscount, 20); // Ready for promotion
      expect(result.statusLabelKey, 'return_tomorrow'); 
    });

    test('Scan after 7 days (Degradation) returns Base', () {
      final now = DateTime(2025, 1, 9, 10, 0, 0); // Day 9 (8 days later)
      final lastActivated = DateTime(2025, 1, 1, 10, 0, 0); // Day 1
      
      final result = RewardCalculator.calculate(
        lastActivatedDate: lastActivated,
        currentTime: now,
        timezone: timeZone,
        config: config,
        currentTierValue: 20, 
        maxTierValue: 20,
        baseTierValue: 5,
      );

      expect(result.phase, RewardPhase.decay);
      expect(result.currentDiscount, 5); // Melted to base
      expect(result.statusLabelKey, 'discount_melted');
    });

    test('Scan after 31 days (Reset) returns Cycle Reset', () {
      final now = DateTime(2025, 2, 5, 10, 0, 0); // > 30 days
      final lastActivated = DateTime(2025, 1, 1, 10, 0, 0); 
      
      final result = RewardCalculator.calculate(
        lastActivatedDate: lastActivated,
        currentTime: now,
        timezone: timeZone,
        config: config,
        currentTierValue: 20, 
        maxTierValue: 20,
        baseTierValue: 5,
      );

      expect(result.statusLabelKey, 'cycle_reset');
      expect(result.currentDiscount, 5);
    });
  });
}
