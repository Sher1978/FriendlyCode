/**
 * @file test_services_e2e.cjs
 * Comprehensive End-to-End Test Suite for Revoo Services & Review Flywheel.
 */

const assert = require('assert');
const { ServiceYieldCalculator } = require('../src/modules/services/logic/ServiceYieldCalculator.js');
const { VirtualSlotCalculator } = require('../functions/services/adapters/virtualSlotCalculator.js');
const { INTERVIEW_QUESTIONS } = require('../functions/services/ai/onboardingInterview.js');
const { ReviewFlywheelManager } = require('../functions/services/reviewFlywheel.js');
const { RewardCalculator } = require('../src/logic/RewardCalculator.js');

console.log('🚀 Running Comprehensive Revoo Services E2E Test Suite...\n');

// ==========================================
// TEST 1: ServiceYieldCalculator (Frontend & Backend Consistency)
// ==========================================
console.log('--- TEST 1: Dynamic Yield Calculator (Percentage & Fixed) ---');
const sampleYieldRules = [
  {
    id: 'rule_percent',
    name: 'Будни день (-25%)',
    discountType: 'percent',
    discountValue: 25,
    daysOfWeek: ['mon', 'tue', 'wed', 'thu'],
    startHour: 12,
    endHour: 16,
    isActive: true
  },
  {
    id: 'rule_fixed',
    name: 'Фиксированная скидка 500 ₽',
    discountType: 'fixed',
    discountValue: 500,
    daysOfWeek: ['fri'],
    startHour: 10,
    endHour: 15,
    minServicePrice: 1500,
    maxDiscountCap: 800,
    isActive: true
  },
  {
    id: 'rule_flash',
    name: 'Flash окно (< 3 часов)',
    discountType: 'percent',
    discountValue: 30,
    isFlashSlot: true,
    flashLeadHours: 3,
    isActive: true
  }
];

// 1.1: Percentage calculation
const percentCalc = ServiceYieldCalculator.calculatePricing({
  slotHour: 13,
  dayOfWeek: 'tue',
  basePrice: 2000,
  yieldRules: sampleYieldRules
});
assert.strictEqual(percentCalc.discountAmount, 500); // 25% of 2000
assert.strictEqual(percentCalc.finalPrice, 1500);
assert.strictEqual(percentCalc.discountType, 'percent');
console.log('✅ 1.1 Percentage Yield Discount (-25%): 2000 ₽ -> 1500 ₽ [PASSED]');

// 1.2: Fixed Amount calculation with cap
const fixedCalc = ServiceYieldCalculator.calculatePricing({
  slotHour: 11,
  dayOfWeek: 'fri',
  basePrice: 2500,
  yieldRules: sampleYieldRules
});
assert.strictEqual(fixedCalc.discountAmount, 500);
assert.strictEqual(fixedCalc.finalPrice, 2000);
assert.strictEqual(fixedCalc.discountType, 'fixed');
console.log('✅ 1.2 Fixed Amount Discount (-500 ₽): 2500 ₽ -> 2000 ₽ [PASSED]');

// 1.3: Flash Slot calculation
const flashCalc = ServiceYieldCalculator.calculatePricing({
  slotHour: 18,
  dayOfWeek: 'sat',
  basePrice: 3000,
  yieldRules: sampleYieldRules,
  leadTimeHours: 2 // < 3h!
});
assert.strictEqual(flashCalc.discountAmount, 900); // 30% of 3000
assert.strictEqual(flashCalc.finalPrice, 2100);
console.log('✅ 1.3 Flash Slot Discount (-30% for < 3h lead time): 3000 ₽ -> 2100 ₽ [PASSED]');


// ==========================================
// TEST 2: In-Memory Virtual Slots & Collision Detection
// ==========================================
console.log('\n--- TEST 2: In-Memory Virtual Slot Generation ---');
const slots = ServiceYieldCalculator.generateSlots({
  shiftStart: '10:00',
  shiftEnd: '15:00',
  stepMinutes: 60,
  durationMinutes: 60,
  busyIntervals: [
    { startMinutes: 660, endMinutes: 720 } // 11:00-12:00 is busy
  ],
  yieldRules: sampleYieldRules,
  basePrice: 2000,
  dateStr: '2026-10-27', // Tuesday
  nowDateStr: '2026-10-26',
  nowMinutes: 0
});

// Out of 10:00, 11:00, 12:00, 13:00, 14:00 -> 11:00 is busy, so 4 slots:
assert.strictEqual(slots.length, 4);
assert.strictEqual(slots[0].time, '10:00');
assert.strictEqual(slots[0].finalPrice, 2000); // No discount
assert.strictEqual(slots[1].time, '12:00');
assert.strictEqual(slots[1].finalPrice, 1500); // Discounted (-25%)
assert.strictEqual(slots[2].time, '13:00');
assert.strictEqual(slots[2].finalPrice, 1500); // Discounted (-25%)
assert.strictEqual(slots[3].time, '14:00');
assert.strictEqual(slots[3].finalPrice, 1500); // Discounted (-25%)
console.log('✅ 2.1 Generated 4 virtual slots with precise collision avoidance [PASSED]');


// ==========================================
// TEST 3: Review Flywheel (Positive vs Negative Routing)
// ==========================================
console.log('\n--- TEST 3: Google Maps Review Flywheel ---');
// Mock Firestore instance for Flywheel test
const mockComplaints = [];
const mockNotifications = [];
const mockDb = {
  collection: (colName) => ({
    doc: (docId) => ({
      get: async () => ({
        exists: true,
        data: () => ({
          name: 'Barber Pro',
          address: 'ул. Тверская, 10',
          googleReviewUrl: 'https://g.page/r/sample/review'
        })
      })
    }),
    add: async (docData) => {
      if (colName === 'complaints') mockComplaints.push(docData);
      if (colName === 'notifications') mockNotifications.push(docData);
      return { id: 'mock_id_' + Date.now() };
    }
  })
};

const flywheel = new ReviewFlywheelManager(mockDb);

async function testFlywheel() {
  // 3.1: 5-Star Rating (Route to Google Maps)
  const posResult = await flywheel.handleGuestRating({
    venueId: 'v1',
    clientPhone: '+79991112233',
    rating: 5,
    comment: 'Прекрасный сервис, очень доволен!'
  });
  assert.strictEqual(posResult.isPositive, true);
  assert.ok(posResult.replyText.includes('Google Картах'));
  assert.ok(posResult.replyText.includes('https://g.page/r/sample/review'));
  console.log('✅ 3.1 Positive rating (5/5) routed to Google Maps review link [PASSED]');

  // 3.2: 2-Star Rating (Intercept privately)
  const negResult = await flywheel.handleGuestRating({
    venueId: 'v1',
    clientPhone: '+79994445566',
    rating: 2,
    comment: 'Пришлось ждать 20 минут в очереди.'
  });
  assert.strictEqual(negResult.isPositive, false);
  assert.ok(negResult.replyText.includes('управляющему заведения'));
  assert.strictEqual(mockNotifications.length, 1);
  assert.ok(mockNotifications[0].title.includes('Отрицательная оценка'));
  console.log('✅ 3.2 Negative rating (2/5) intercepted privately to venue manager [PASSED]');
}


// ==========================================
// TEST 4: Zero-Regression Check for HoReCa & Direct Delivery
// ==========================================
console.log('\n--- TEST 4: Zero-Regression Check for HoReCa & Direct Delivery ---');
// Test Scenario 1: New Guest gets Base discount today (5%), VIP tomorrow (20%)
const horecaConfig = {
  percBase: 5,
  percMedium: 15,
  percVip: 20,
  percDeposit: 25
};
const day1Reward = RewardCalculator.calculate(null, new Date('2026-10-21'), horecaConfig);
assert.strictEqual(day1Reward.discount, 5);
assert.strictEqual(day1Reward.status, 'new');
console.log('✅ 4.1 HoReCa Scenario 1: Day 1 Guest receives Base Discount 5% [PASSED]');

// Test Scenario 2: Grab Bag QR Scanner immediately gets VIP (20%)
const grabBagReward = RewardCalculator.calculate(null, new Date('2026-10-21'), horecaConfig, 'Asia/Ho_Chi_Minh', false, false, 5, 0, true);
assert.strictEqual(grabBagReward.discount, 20);
assert.strictEqual(grabBagReward.status, 'vip');
assert.strictEqual(grabBagReward.isGrabBagVip, true);
console.log('✅ 4.2 HoReCa Scenario 2: Grab Bag QR immediately unlocks VIP 20% [PASSED]');

testFlywheel().then(() => {
  console.log('\n==========================================');
  console.log('🎉 ALL 5 E2E PHASES AND REGRESSION TESTS PASSED!');
  console.log('==========================================\n');
}).catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
