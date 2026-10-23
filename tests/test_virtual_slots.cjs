const assert = require('assert');
const { VirtualSlotCalculator } = require('../functions/services/adapters/virtualSlotCalculator');

console.log('🧪 Testing VirtualSlotCalculator...');

// Scenario 1: Test time to minutes and minutes to time
assert.strictEqual(VirtualSlotCalculator.timeToMinutes('10:30'), 630);
assert.strictEqual(VirtualSlotCalculator.minutesToTime(630), '10:30');
console.log('✅ Time conversions passed.');

// Scenario 2: Test Slot Pricing Calculation
const yieldRules = [
  {
    id: 'rule_1',
    name: 'Будни день (-20%)',
    discountType: 'percent',
    discountValue: 20,
    daysOfWeek: ['mon', 'tue', 'wed', 'thu'],
    startHour: 12,
    endHour: 16,
    isActive: true
  },
  {
    id: 'rule_2',
    name: 'Фиксированная скидка 500 руб',
    discountType: 'fixed',
    discountValue: 500,
    daysOfWeek: ['fri'],
    startHour: 10,
    endHour: 14,
    minServicePrice: 2000,
    maxDiscountCap: 1000,
    isActive: true
  }
];

// Test Tuesday 13:00 (Matches rule_1: -20%)
const tuesdayPricing = VirtualSlotCalculator.calculateSlotPricing({
  slotHour: 13,
  dayOfWeek: 'tue',
  basePrice: 1500,
  yieldRules
});
assert.strictEqual(tuesdayPricing.discountAmount, 300); // 20% of 1500
assert.strictEqual(tuesdayPricing.finalPrice, 1200);
assert.strictEqual(tuesdayPricing.appliedRuleName, 'Будни день (-20%)');
console.log('✅ Tuesday percentage discount passed (1500 -> 1200).');

// Test Friday 11:00 with price 2500 (Matches rule_2: fixed -500)
const fridayPricing = VirtualSlotCalculator.calculateSlotPricing({
  slotHour: 11,
  dayOfWeek: 'fri',
  basePrice: 2500,
  yieldRules
});
assert.strictEqual(fridayPricing.discountAmount, 500);
assert.strictEqual(fridayPricing.finalPrice, 2000);
assert.strictEqual(fridayPricing.appliedRuleName, 'Фиксированная скидка 500 руб');
console.log('✅ Friday fixed discount passed (2500 -> 2000).');

// Scenario 3: Test Full Virtual Slot Generation with Busy Intervals
const slots = VirtualSlotCalculator.generateVirtualSlots({
  shiftStart: '10:00',
  shiftEnd: '14:00',
  stepMinutes: 60,
  durationMinutes: 60,
  busyIntervals: [
    { startMinutes: 660, endMinutes: 720 } // 11:00 to 12:00 is busy!
  ],
  yieldRules,
  basePrice: 2000,
  dateStr: '2026-10-27', // Tuesday
  nowDateStr: '2026-10-26', // Future date
  nowMinutes: 0
});

// Out of 10:00, 11:00, 12:00, 13:00 -> 11:00 is busy, so 3 slots should be returned:
assert.strictEqual(slots.length, 3);
assert.strictEqual(slots[0].time, '10:00');
assert.strictEqual(slots[0].finalPrice, 2000); // Before 12:00, no discount
assert.strictEqual(slots[1].time, '12:00');
assert.strictEqual(slots[1].finalPrice, 1600); // 12:00 has 20% discount (2000 - 400)
assert.strictEqual(slots[2].time, '13:00');
assert.strictEqual(slots[2].finalPrice, 1600); // 13:00 has 20% discount (2000 - 400)
console.log('✅ Virtual slot generation and collision detection passed.');

// Scenario 4: Test Orthogonal RECURRENCE Layer (Time-Decay Retention Add-on)
// 4.1 Max Mode: Loyalty (15%) vs Tuesday Yield (20%) -> 20% wins
const recMaxPricing = VirtualSlotCalculator.calculateSlotPricing({
  slotHour: 13,
  dayOfWeek: 'tue',
  basePrice: 2000,
  yieldRules,
  recurrenceReward: { discount: 15, status: 'vip' },
  combinationMode: 'max'
});
assert.strictEqual(recMaxPricing.discountAmount, 400); // 20% > 15%
assert.strictEqual(recMaxPricing.finalPrice, 1600);
console.log('✅ 4.1 Recurrence in Max Mode passed (Yield 20% > Loyalty 15%).');

// 4.2 Stack Mode: Loyalty (15% = 300) + Tuesday Yield (20% = 400) -> 700 руб (35%)
const recStackPricing = VirtualSlotCalculator.calculateSlotPricing({
  slotHour: 13,
  dayOfWeek: 'tue',
  basePrice: 2000,
  yieldRules,
  recurrenceReward: { discount: 15, status: 'vip' },
  combinationMode: 'stack'
});
assert.strictEqual(recStackPricing.discountAmount, 700); // 400 + 300
assert.strictEqual(recStackPricing.finalPrice, 1300);
assert.ok(recStackPricing.appliedRuleName.includes('Лояльность'));
console.log('✅ 4.2 Recurrence in Stack Mode passed (400 Yield + 300 Loyalty = 700 руб).');

console.log('🎉 All VirtualSlotCalculator tests passed successfully!');
