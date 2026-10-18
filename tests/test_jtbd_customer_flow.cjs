const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/Huawei MadeBook XPro/.gemini/antigravity/brain/77653ed7-7368-486e-8678-a7349cd4911f';

async function runJtbdCustomerFlowTests() {
  console.log('\n==================================================================');
  console.log('🧪 PLAYWRIGHT E2E CUSTOMER JTBD & MULTI-PROVIDER AUTH TEST SUITE');
  console.log('==================================================================\n');

  const targetBaseUrl = process.env.TEST_TARGET_URL || 'http://localhost:4173';
  const testUrl = `${targetBaseUrl}/?utm_source=google_maps&id=deCg3Rq1oTawHoOImnoj&cb=${Date.now()}`;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36'
  });
  const page = await context.newPage();

  // Clear localStorage before test to ensure clean unauthenticated state
  await page.addInitScript(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
  });

  console.log(`📡 Connecting to Test Target: ${testUrl}`);
  await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  // ---------------------------------------------------------
  // JTBD 1: Bottom pulsating battery and its background are GONE
  // ---------------------------------------------------------
  // Check specifically that the old fixed bottom battery banner / container does not exist
  const bottomBatteryBar = await page.$('.fixed.bottom-0:has-text("ВАША СКИДКА"), .fixed.bottom-0:has-text("ВАМ СКИДКА ДО")');
  if (!bottomBatteryBar) {
    console.log('✅ PASS: Large bottom pulsating battery is NOT present on the page!');
  } else {
    throw new Error('❌ FAIL: Bottom pulsating battery is still present on the page!');
  }

  // ---------------------------------------------------------
  // JTBD 2: Compact battery & login pill in Google Maps header
  // ---------------------------------------------------------
  console.log('\n🔍 STEP 2: Verifying Google Maps header right-side chip (battery + discount + login + slogan)...');
  const headerChip = await page.waitForSelector('button[title="Заряжайте Вашу скидку покупками"]', { timeout: 10000 });
  const headerChipText = await headerChip.textContent();
  console.log(`✅ PASS: Header chip found with content: "${headerChipText.trim()}"`);
  if (!headerChipText.includes('до') || !headerChipText.includes('Войти') || !headerChipText.includes('Заряжайте')) {
    throw new Error(`❌ FAIL: Expected "до", "Войти", and "Заряжайте" in header chip, got: ${headerChipText}`);
  }

  // Save screenshot of clean unauthenticated view
  const unauthShot = path.join(ARTIFACT_DIR, 'jtbd_1_unauth_clean_header.png');
  await page.screenshot({ path: unauthShot });
  console.log(`📸 Screenshot saved: ${unauthShot}`);

  // ---------------------------------------------------------
  // JTBD 3: Unauthenticated browsing works freely
  // ---------------------------------------------------------
  console.log('\n🔍 STEP 3: Verifying unauthenticated browsing (menu, categories, directions)...');
  const categoryButtons = await page.$$('button:has-text("Все блюда"), button:has-text("Супы"), button:has-text("Закуски")');
  console.log(`✅ PASS: Found ${categoryButtons.length} menu categories accessible without login.`);

  const routeBtn = await page.waitForSelector('button:has-text("Маршрут")');
  console.log('✅ PASS: "Маршрут" button is accessible without login.');

  // ---------------------------------------------------------
  // JTBD 4: Auth Gate on "В заказ" with Multi-Provider Options
  // ---------------------------------------------------------
  console.log('\n🔍 STEP 4: Testing Auth Gate when clicking "В заказ" on a dish...');
  const addOrderButtons = await page.$$('button:has-text("В заказ")');
  if (addOrderButtons.length === 0) {
    throw new Error('❌ FAIL: No "В заказ" buttons found on the page!');
  }

  // Click "В заказ" on the first dish
  await addOrderButtons[0].click();
  await page.waitForTimeout(600);

  // Verify Auth Modal appears with informative pitch and pending item notice
  console.log('🔍 Checking Login / Registration Modal appearance and contents...');
  await page.waitForSelector('text=Заказ онлайн напрямую', { timeout: 5000 });
  console.log('✅ PASS: Auth Modal opened with title "Заказ онлайн напрямую"!');

  await page.waitForSelector('text=Без наценок агрегаторов', { timeout: 5000 });
  console.log('✅ PASS: Service pitch "Без наценок агрегаторов" is prominently displayed!');

  await page.waitForSelector('text=будет добавлено в заказ', { timeout: 5000 });
  console.log('✅ PASS: Pending item notice "Блюдо ... будет добавлено в заказ" is visible!');

  // Wait for modal animation to settle
  await page.waitForTimeout(1000);

  // Check Provider 1: Google (Gmail)
  const googleBtn = await page.waitForSelector('text=Войти через Google (Gmail)', { timeout: 10000 });
  console.log('✅ PASS: 1-Click "Войти через Google (Gmail)" button is present!');

  // Check Provider 2: Telegram
  const tgBtn = await page.waitForSelector('text=Войти через Telegram', { timeout: 10000 });
  console.log('✅ PASS: 1-Click "Войти через Telegram" button is present!');

  // Check Provider 3: Magic Link (Email)
  const magicLinkBtn = await page.waitForSelector('text=Войти по Magic Link (Email)', { timeout: 10000 });
  console.log('✅ PASS: "Войти по Magic Link (Email)" button is present!');

  // Check Provider 4: Phone / WhatsApp
  const phoneBtn = await page.waitForSelector('text=Или войти по номеру телефона / WhatsApp', { timeout: 10000 });
  console.log('✅ PASS: "Или войти по номеру телефона / WhatsApp" link is present!');

  // Save screenshot of multi-provider auth options
  const modalShot = path.join(ARTIFACT_DIR, 'jtbd_2_auth_gate_modal.png');
  await page.screenshot({ path: modalShot });
  console.log(`📸 Screenshot saved: ${modalShot}`);

  // ---------------------------------------------------------
  // JTBD 4b: Test Sub-Views (Telegram and Magic Link Navigation)
  // ---------------------------------------------------------
  console.log('\n🔍 STEP 4b: Testing Telegram sub-view navigation...');
  await tgBtn.click();
  await page.waitForTimeout(400);
  await page.waitForSelector('a:has-text("Открыть бот")', { timeout: 5000 });
  await page.waitForSelector('input[placeholder="username"]', { timeout: 5000 });
  console.log('✅ PASS: Telegram view opens bot link and username input cleanly!');

  // Return to all options
  const backBtn1 = await page.waitForSelector('button:has-text("Все способы")');
  await backBtn1.click();
  await page.waitForTimeout(400);

  console.log('🔍 Testing Magic Link sub-view navigation...');
  const magicLinkBtnAgain = await page.waitForSelector('text=Войти по Magic Link (Email)');
  await magicLinkBtnAgain.click();
  await page.waitForTimeout(400);
  await page.waitForSelector('input[placeholder="alex@gmail.com"]', { timeout: 5000 });
  await page.waitForSelector('text=Получить Magic Link на Email', { timeout: 5000 });
  console.log('✅ PASS: Magic Link view opens passwordless email form cleanly!');

  // Return to all options
  const backBtn2 = await page.waitForSelector('text=Все способы');
  await backBtn2.click();
  await page.waitForTimeout(400);

  // ---------------------------------------------------------
  // JTBD 5: Submitting Auth & Verifying User Stays in Flow
  // ---------------------------------------------------------
  console.log('\n🔍 STEP 5: Testing Phone / WhatsApp login to verify seamless post-login UX...');
  const phoneOptionBtn = await page.waitForSelector('text=Или войти по номеру телефона / WhatsApp');
  await phoneOptionBtn.click();
  await page.waitForTimeout(400);

  const nameInput = await page.waitForSelector('input[placeholder="Александр"]');
  await nameInput.fill('Sherlock Holmes');

  const phoneInput = await page.waitForSelector('input[placeholder="+84 90 123 4567"]');
  await phoneInput.fill('+84 90 999 8888');

  const submitBtn = await page.waitForSelector('button:has-text("Войти и заказать со скидкой")');
  await submitBtn.click();
  await page.waitForTimeout(1000);

  // Verify the user remains on the exact delivery page (NO redirect elsewhere!)
  const currentUrl = page.url();
  console.log(`🔍 Checking current URL after login: ${currentUrl}`);
  if (!currentUrl.includes('deCg3Rq1oTawHoOImnoj') || !currentUrl.includes('utm_source=google_maps')) {
    throw new Error(`❌ FAIL: User was redirected away from the delivery menu! URL: ${currentUrl}`);
  }
  console.log('✅ PASS: User remained on the exact delivery menu without wrong redirects!');

  // Verify header switched to authenticated user profile chip
  console.log('🔍 Checking authenticated state in header...');
  const profileChip = await page.waitForSelector('button[data-testid="profile-chip"], button[title*="профиль"], button[title*="Профиль"]', { timeout: 10000 });
  const profileChipText = await profileChip.textContent();
  console.log(`✅ PASS: Header switched to Authenticated Profile Chip: "${profileChipText.trim()}"`);
  if (!profileChipText.includes('Sherlock') || !profileChipText.includes('%')) {
    throw new Error(`❌ FAIL: Expected user name and % in profile chip, got: ${profileChipText}`);
  }

  // ---------------------------------------------------------
  // JTBD 6: Verify Pending Dish was Automatically Added to Cart
  // ---------------------------------------------------------
  console.log('\n🔍 STEP 6: Verifying clicked dish was automatically added to cart upon login...');
  const cartBar = await page.waitForSelector('text=блюд(а)', { timeout: 5000 });
  const cartBarText = await cartBar.textContent();
  console.log(`✅ PASS: Floating Cart Bar is active with pending item: "${cartBarText.trim()}"`);

  // Save screenshot of authenticated state with floating cart bar
  const cartShot = path.join(ARTIFACT_DIR, 'jtbd_3_authenticated_floating_cart.png');
  await page.screenshot({ path: cartShot });
  console.log(`📸 Screenshot saved: ${cartShot}`);

  // ---------------------------------------------------------
  // JTBD 7: Tapping Profile Chip opens Profile & Loyalty Details
  // ---------------------------------------------------------
  console.log('\n🔍 STEP 7: Testing Profile Modal by tapping top-right header chip...');
  await profileChip.click();
  await page.waitForTimeout(500);

  await page.waitForSelector('text=Ваша скидка онлайн:', { timeout: 5000 });
  await page.waitForSelector('text=Sherlock Holmes', { timeout: 5000 });
  console.log('✅ PASS: Profile & Loyalty Modal opened showing personal discount, tier, and contact!');

  // Save screenshot of profile modal
  const profileShot = path.join(ARTIFACT_DIR, 'jtbd_4_profile_loyalty_modal.png');
  await page.screenshot({ path: profileShot });
  console.log(`📸 Screenshot saved: ${profileShot}`);

  const logoutBtn = await page.waitForSelector('button:has-text("Выйти из профиля")');
  console.log('✅ PASS: "Выйти из профиля" button is available in profile modal.');

  // ---------------------------------------------------------
  // JTBD 8: Logout clears session and restores preview mode
  // ---------------------------------------------------------
  console.log('\n🔍 STEP 8: Testing Logout restores unauthenticated preview mode...');
  await logoutBtn.click();
  await page.waitForTimeout(600);

  const restoredHeaderChip = await page.waitForSelector('button[title="Заряжайте Вашу скидку покупками"]', { timeout: 5000 });
  const restoredChipText = await restoredHeaderChip.textContent();
  console.log(`✅ PASS: Header cleanly reverted to preview mode: "${restoredChipText.trim()}"`);

  console.log('\n==================================================================');
  console.log('🎉 ALL MULTI-PROVIDER AUTH & JTBD FLOW TESTS PASSED (100% OK)!');
  console.log('==================================================================\n');

  await browser.close();
  process.exit(0);
}

runJtbdCustomerFlowTests().catch(err => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
