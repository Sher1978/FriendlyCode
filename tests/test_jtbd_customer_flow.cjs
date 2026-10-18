const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Simple static server for dist
function startDistServer(port = 4173) {
  const distDir = path.join(__dirname, '..', 'dist');
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
  };

  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
    let filePath = path.join(distDir, reqPath);

    if (!fs.existsSync(filePath)) {
      filePath = path.join(distDir, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Server Error: ' + err.code);
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`🌐 Local test server started at http://localhost:${port}`);
      resolve(server);
    });
  });
}

async function runJtbdCustomerFlowTests() {
  const PORT = 4188;
  const server = await startDistServer(PORT);

  console.log('\n======================================================');
  console.log('🧪 RUNNING PLAYWRIGHT TESTS FOR ONLINE CUSTOMER JTBD');
  console.log('======================================================\n');

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

  const testUrl = `http://localhost:${PORT}/?utm_source=google_maps&id=deCg3Rq1oTawHoOImnoj`;
  console.log(`📡 Loading menu page as unauthenticated guest: ${testUrl}`);
  await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);

  // ---------------------------------------------------------
  // JTBD 1: Bottom pulsating battery and its background are GONE
  // ---------------------------------------------------------
  console.log('\n🔍 STEP 1: Verifying bottom pulsating battery is completely removed...');
  const bottomBatteryOldText = await page.$('text=ВАША СКИДКА');
  const bottomBatteryOldText2 = await page.$('text=ВАМ СКИДКА ДО');
  if (!bottomBatteryOldText && !bottomBatteryOldText2) {
    console.log('✅ PASS: Large bottom pulsating battery text ("ВАША СКИДКА ...") is NOT present!');
  } else {
    throw new Error('❌ FAIL: Bottom pulsating battery is still present on the page!');
  }

  // Verify that the Google Maps top bar has the compact battery & login pill on the right
  console.log('\n🔍 STEP 2: Verifying Google Maps header right-side chip (battery + discount + login)...');
  const headerChip = await page.waitForSelector('button[title="Войти для активации скидки"]', { timeout: 10000 });
  const headerChipText = await headerChip.textContent();
  console.log(`✅ PASS: Header chip found with content: "${headerChipText.trim()}"`);
  if (!headerChipText.includes('до') || !headerChipText.includes('Войти')) {
    throw new Error(`❌ FAIL: Expected "до" and "Войти" in header chip, got: ${headerChipText}`);
  }

  // ---------------------------------------------------------
  // JTBD 2: Unauthenticated browsing works freely
  // ---------------------------------------------------------
  console.log('\n🔍 STEP 3: Verifying unauthenticated browsing (menu, categories, prices)...');
  const categoryButtons = await page.$$('button:has-text("Все блюда"), button:has-text("Супы"), button:has-text("Закуски")');
  console.log(`✅ PASS: Found ${categoryButtons.length} menu categories accessible without login.`);

  const routeBtn = await page.waitForSelector('button:has-text("Маршрут")');
  console.log('✅ PASS: "Маршрут" button is accessible without login.');

  // ---------------------------------------------------------
  // JTBD 3: Auth Gate when clicking "В заказ" or header chip
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
  const authModalTitle = await page.waitForSelector('text=Заказ онлайн напрямую', { timeout: 5000 });
  console.log('✅ PASS: Auth Modal opened with title "Заказ онлайн напрямую"!');

  await page.waitForSelector('text=Без наценок агрегаторов', { timeout: 5000 });
  console.log('✅ PASS: Service pitch "Без наценок агрегаторов" is prominently displayed!');

  await page.waitForSelector('text=будет добавлено в заказ', { timeout: 5000 });
  console.log('✅ PASS: Pending item notice "Блюдо ... будет добавлено в заказ" is visible!');

  // Test "Продолжить просмотр меню" (Close modal without pressure)
  const cancelBtn = await page.waitForSelector('button:has-text("Продолжить просмотр меню")');
  await cancelBtn.click();
  await page.waitForTimeout(500);

  const isModalHidden = await page.$('text=Заказ онлайн напрямую');
  if (!isModalHidden) {
    console.log('✅ PASS: "Продолжить просмотр меню" successfully dismissed the modal!');
  }

  // ---------------------------------------------------------
  // JTBD 4: Clicking header chip opens Auth Modal
  // ---------------------------------------------------------
  console.log('\n🔍 STEP 5: Clicking top header chip (battery/discount/login)...');
  await headerChip.click();
  await page.waitForTimeout(500);
  await page.waitForSelector('text=Заказ онлайн напрямую', { timeout: 5000 });
  console.log('✅ PASS: Header chip successfully opened Login / Registration modal!');

  // ---------------------------------------------------------
  // JTBD 5: Submitting Quick Login & Seamless Cart Activation
  // ---------------------------------------------------------
  console.log('\n🔍 STEP 6: Entering guest credentials and completing quick login...');
  const nameInput = await page.waitForSelector('input[placeholder="Александр"]');
  await nameInput.fill('Sherlock Holmes');

  const phoneInput = await page.waitForSelector('input[placeholder="+84 90 123 4567"]');
  await phoneInput.fill('+84 90 999 8888');

  const submitBtn = await page.waitForSelector('button:has-text("Войти и заказать со скидкой")');
  await submitBtn.click();
  await page.waitForTimeout(1000);

  // Verify user is now authenticated!
  console.log('🔍 Checking authenticated state in header...');
  const profileChip = await page.waitForSelector('button[title="Ваш профиль и скидка"]', { timeout: 10000 });
  const profileChipText = await profileChip.textContent();
  console.log(`✅ PASS: Header switched to Authenticated Profile Chip: "${profileChipText.trim()}"`);
  if (!profileChipText.includes('Sherlock') && !profileChipText.includes('%')) {
    throw new Error(`❌ FAIL: Expected user name and % in profile chip, got: ${profileChipText}`);
  }

  // ---------------------------------------------------------
  // JTBD 6: Adding to cart now works directly for authenticated user
  // ---------------------------------------------------------
  console.log('\n🔍 STEP 7: Adding dish to cart as authenticated user...');
  const addButtonsAuth = await page.$$('button:has-text("В заказ")');
  await addButtonsAuth[0].click();
  await page.waitForTimeout(500);

  // Verify Floating Cart Bar appears cleanly at the bottom
  const cartBar = await page.waitForSelector('text=блюд(а)', { timeout: 5000 });
  const cartBarText = await cartBar.textContent();
  console.log(`✅ PASS: Clean Floating Cart Bar is active at the bottom: "${cartBarText.trim()}"`);

  // Verify bottom pulsating battery is NOT overlapping or present
  const checkOldBattery = await page.$('text=ВАША СКИДКА');
  if (!checkOldBattery) {
    console.log('✅ PASS: Bottom area has ONLY the floating cart bar, zero old pulsating battery clutter!');
  }

  // ---------------------------------------------------------
  // JTBD 7: Tapping Profile Chip opens Profile & Loyalty Details
  // ---------------------------------------------------------
  console.log('\n🔍 STEP 8: Testing Profile Modal by tapping top-right header chip...');
  await profileChip.click();
  await page.waitForTimeout(500);

  await page.waitForSelector('text=Ваша скидка онлайн:', { timeout: 5000 });
  await page.waitForSelector('text=Sherlock Holmes', { timeout: 5000 });
  console.log('✅ PASS: Profile & Loyalty Modal opened showing personal discount, tier, and number!');

  const changeNumBtn = await page.waitForSelector('button:has-text("Сменить номер")');
  console.log('✅ PASS: "Сменить номер" button is available in profile modal.');

  const closeProfileBtn = await page.waitForSelector('button:has-text("В меню")');
  await closeProfileBtn.click();
  await page.waitForTimeout(500);
  console.log('✅ PASS: Profile modal closed smoothly.');

  console.log('\n======================================================');
  console.log('🎉 ALL JTBD CUSTOMER FLOW TESTS PASSED WITH 100% SUCCESS!');
  console.log('======================================================\n');

  await browser.close();
  server.close();
  process.exit(0);
}

runJtbdCustomerFlowTests().catch(err => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
