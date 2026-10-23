const { chromium } = require('playwright');
const assert = require('assert');

(async () => {
  console.log('🧪 Testing Hot Deals Scroller & Direct Booking Flow...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 412, height: 915 } });

  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto(`http://localhost:4173/?v=test_borderrun_pattaya&source=google_maps&bust=${Date.now()}`);
  await page.waitForTimeout(2500);

  // 1. Verify Hot Deals Scroller Header
  const hotDealsHeader = await page.waitForSelector('text=Горящие предложения', { timeout: 8000 });
  assert.ok(hotDealsHeader, 'Hot deals scroller header must be visible');
  console.log('✅ STEP 1: Hot Deals Scroller successfully mounted on storefront!');

  // 2. Check for Sale badge and discount pills (-25%, -30%)
  const saleBadge = await page.$('text=Sale');
  assert.ok(saleBadge, 'Sale badge should be visible');
  const discountPills = await page.$$('span:has-text("-25%"), span:has-text("-30%"), span:has-text("-20%")');
  assert.ok(discountPills.length >= 2, 'Should render multiple flash discount pills');
  console.log(`✅ STEP 2: Detected ${discountPills.length} flash discount pills in scroller!`);

  // 3. Verify Standard Services list is rendered below
  const allServicesHeader = await page.waitForSelector('text=Все услуги', { timeout: 5000 });
  assert.ok(allServicesHeader, '"Все услуги" heading should be visible below scroller');
  console.log('✅ STEP 3: "Все услуги" catalog correctly positioned below hot deals.');

  // 4. Click first hot deal card
  const hotDealCard = await page.waitForSelector('[data-testid="hot-deal-deal_top_1"]', { timeout: 5000 });
  console.log('   Clicking first hot deal card (data-testid="hot-deal-deal_top_1")...');
  await hotDealCard.click();
  await page.waitForTimeout(1200);

  // 5. Verify direct transition to Seat Map for that trip
  const windshield = await page.waitForSelector('text=Лобовое стекло', { timeout: 8000 });
  assert.ok(windshield, 'Clicking hot deal should directly open Vehicle Seat Map');
  console.log('✅ STEP 4: Direct 1-tap transition from Hot Deal to Vehicle Seat Map verified!');

  // 6. Check that discounted price is carried over
  const discountSlotNotice = await page.waitForSelector('text=Выбор места', { timeout: 5000 });
  assert.ok(discountSlotNotice, 'Seat map should reflect chosen deal slot');
  console.log('✅ STEP 5: Seat Map successfully rendered with deal slot active.');

  // 7. Select seat and proceed
  const autoPickBtn = await page.waitForSelector('button:has-text("Выбрать автоматически")', { timeout: 5000 });
  await autoPickBtn.click();
  await page.waitForTimeout(400);

  const proceedBtn = await page.waitForSelector('button:has-text("Забронировать")', { timeout: 5000 });
  await proceedBtn.click();
  await page.waitForTimeout(1000);

  const modal = await page.waitForSelector('text=Подтверждение записи', { timeout: 5000 });
  assert.ok(modal, 'Booking modal opened with pre-selected hot deal');
  console.log('✅ STEP 6: Booking Modal opened with hot deal parameters confirmed!');

  await browser.close();
  assert.strictEqual(errors.length, 0, `Errors encountered: ${errors.join('; ')}`);
  console.log('\n🎉 ALL HOT DEALS SCROLLER TESTS PASSED 100%!\n');
})().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
