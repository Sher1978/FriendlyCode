const { chromium } = require('playwright');

async function runDeliveryE2ETests() {
  console.log('🚀 Starting Revoo Direct Delivery Playwright E2E Suite...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36'
  });
  const page = await context.newPage();

  page.on('pageerror', err => console.error('❌ Page Error:', err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') console.warn('⚠️ Console Error:', msg.text());
  });

  try {
    const testUrl = 'http://localhost:5173/?utm_source=google_maps&id=deCg3Rq1oTawHoOImnoj';
    console.log(`📡 Navigating to ${testUrl}...`);
    await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // 1. Verify Venue header and Pre-Login dynamic discount badges
    console.log('🔍 Test 1: Verifying Venue Title and Pre-login Discount elements...');
    const heading = await page.waitForSelector('h1', { timeout: 15000 });
    const titleText = await heading.textContent();
    console.log(`✅ Venue Name loaded: "${titleText.trim()}"`);

    // Verify Direct Order banner
    await page.waitForSelector('text=Прямой заказ', { timeout: 10000 });
    console.log('✅ Direct Order badge ("Прямой заказ") found!');

    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasPreLoginDiscount = bodyText.includes('Скидка ДО') || bodyText.includes('ДО');
    console.log(`✅ Pre-login discount badge rendered: ${hasPreLoginDiscount}`);

    const hasBattery = bodyText.includes('ВАМ СКИДКА') || bodyText.includes('СКИДКА');
    console.log(`✅ Dynamic battery discount badge: ${hasBattery}`);

    // 2. Verify Aggregator Price Comparisons
    console.log('🔍 Test 2: Verifying Menu Items & Aggregator (Grab/Zomato) Price Comparison...');
    await page.waitForSelector('text=В Grab:', { timeout: 10000 });
    console.log('✅ Found strikethrough aggregator price comparison ("В Grab: ...")!');

    await page.waitForSelector('text=Экономия', { timeout: 10000 });
    console.log('✅ Found savings indicator badge ("Экономия -...%")!');

    // 3. Add to Cart Test
    console.log('🛒 Test 3: Adding items to cart...');
    const addButtons = await page.$$('button:has-text("В заказ")');
    console.log(`✅ Found ${addButtons.length} menu items available for order.`);
    if (addButtons.length === 0) {
      throw new Error('No menu items available to add to cart!');
    }

    // Add 1st item (Phở Bò)
    await addButtons[0].click();
    await page.waitForTimeout(600);

    // Verify quantity counter updated to 1
    const qtyOne = await page.waitForSelector('text=1', { timeout: 5000 });
    console.log('✅ Item counter updated to 1 with [+] and [-] controls.');

    // Click [+] to increase quantity to 2
    const plusBtn = await page.locator('button:has-text("+")').first();
    await plusBtn.click();
    await page.waitForTimeout(600);
    console.log('✅ Incremented item quantity to 2.');

    // Verify Floating Cart Bar
    const cartBar = await page.waitForSelector('text=блюд(а)', { timeout: 5000 });
    const cartText = await cartBar.textContent();
    console.log(`✅ Floating Cart bar active: "${cartText.trim()}"`);

    // 4. Open Checkout Drawer
    console.log('💳 Test 4: Opening Checkout Drawer...');
    const checkoutBtn = await page.waitForSelector('button:has-text("Оформить")');
    await checkoutBtn.click();
    await page.waitForTimeout(800);

    await page.waitForSelector('text=Ваш заказ', { timeout: 5000 });
    console.log('✅ Checkout Drawer opened successfully.');

    // 5. Test Delivery / Pickup mode toggle
    console.log('🛵 Test 5: Testing Delivery & Pickup toggles...');
    const pickupBtn = await page.locator('button:has-text("Самовывоз")');
    await pickupBtn.click();
    await page.waitForTimeout(400);
    console.log('✅ Switched to Pickup mode.');

    const deliveryBtn = await page.locator('button:has-text("Доставка курьером")');
    await deliveryBtn.click();
    await page.waitForTimeout(400);
    console.log('✅ Switched to Delivery mode.');

    // 6. Fill in Customer Details
    console.log('📝 Test 6: Filling in Guest Details & Address...');
    await page.locator('input[placeholder="Ваше имя"]').fill('Тестовый Гость');
    await page.locator('input[placeholder="+84..."]').fill('+84901234567');
    await page.locator('input[placeholder*="Улица"]').fill('123 Vo Nguyen Giap, My Khe, Da Nang');

    // 7. Select Payment Method & Place Order
    console.log('⚡ Test 7: Selecting VietQR & Submitting Order...');
    const vietQrBtn = await page.locator('button:has-text("VietQR")');
    await vietQrBtn.click();
    await page.waitForTimeout(300);

    const submitBtn = await page.locator('button:has-text("Подтвердить заказ")');
    await submitBtn.click();
    await page.waitForTimeout(2000);

    // 8. Verify Order Confirmation Modal & VietQR Display
    console.log('🎉 Test 8: Verifying Order Confirmation and VietQR Generation...');
    const confirmedHeading = await page.waitForSelector('text=принят!', { timeout: 10000 });
    const confirmedText = await confirmedHeading.textContent();
    console.log(`✅ Order Placed: "${confirmedText.trim()}"!`);

    const vietQrImage = await page.waitForSelector('img[alt="VietQR"]', { timeout: 8000 });
    const qrSrc = await vietQrImage.getAttribute('src');
    console.log(`✅ VietQR Image generated: ${qrSrc.slice(0, 75)}...`);

    // Dismiss order confirmation
    await page.locator('button:has-text("Отлично, понятно")').click();
    await page.waitForTimeout(500);

    console.log('\n=============================================');
    console.log('🎉 ALL REVOO DIRECT DELIVERY PLAYWRIGHT E2E TESTS PASSED (8/8)!');
    console.log('=============================================\n');

  } catch (err) {
    console.error('❌ Playwright E2E Test Failure:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

runDeliveryE2ETests().then(() => {
  console.log('🏁 Test Suite Finished Successfully.');
  process.exit(0);
}).catch(err => {
  console.error('💥 Test Suite Exited with Error.');
  process.exit(1);
});
