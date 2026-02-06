import 'package:flutter_test/flutter_test.dart';
import 'package:friendly_code/core/logic/discount_calculator.dart';

void main() {
  group('DiscountCalculator Logic v1.1 (Updated Rules)', () {
    final now = DateTime(2026, 1, 1, 12, 0, 0); // Reference time

    // Setup the specific rules requested by Owner
    setUp(() {
      DiscountCalculator.updateConfig(const DiscountConfig(
        tier1Hours: 24, // < 24h
        tier2Hours: 36, // < 36h
        tier3Hours: 240, // < 10 days
        discountTier1: 20,
        discountTier2: 15,
        discountTier3: 10,
        discountBase: 5,
      ));
    });

    test('Visit within 24h gives Max Discount (20%)', () {
      final lastVisit = now.subtract(const Duration(hours: 23));
      expect(DiscountCalculator.calculate(lastVisit, now), 20);
    });

    test('Visit between 24h and 36h gives Mid Discount (15%)', () {
      // 30 hours ago
      final lastVisit = now.subtract(const Duration(hours: 30));
      expect(DiscountCalculator.calculate(lastVisit, now), 15);
    });

    test('Visit exactly at 36h gives Mid Discount (15%)', () {
      final lastVisit = now.subtract(const Duration(hours: 36));
      expect(DiscountCalculator.calculate(lastVisit, now), 15);
    });

    test('Visit between 36h and 10 days gives Low Discount (10%)', () {
      // 5 days ago (120 hours)
      final lastVisit = now.subtract(const Duration(days: 5));
      expect(DiscountCalculator.calculate(lastVisit, now), 10);
    });

    test('Visit after 10 days gives Retention Base (5%)', () {
      // 11 days ago
      final lastVisit = now.subtract(const Duration(days: 11));
      expect(DiscountCalculator.calculate(lastVisit, now), 5);
    });

    test('Admin Configuration: Can change rules dynamically', () {
      // Admin changes rules: 24h = 50%
      DiscountCalculator.updateConfig(const DiscountConfig(
        discountTier1: 50,
      ));
      
      final lastVisit = now.subtract(const Duration(hours: 10));
      expect(DiscountCalculator.calculate(lastVisit, now), 50);
    });
  });
}
