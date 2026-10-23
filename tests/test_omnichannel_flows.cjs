/**
 * @file test_omnichannel_flows.cjs
 * Comprehensive Playwright E2E Test Suite for Dual-Origin Omnichannel Booking:
 * - Flow A: Web / Google Maps Visitor -> Messenger Capture Bridge (t.me/Bot?start=bk_...)
 * - Flow B: Messenger-Originated Loop (Telegram Mini App) -> Pre-filled Profile & Auto-Close / Return to Chat
 */

const { chromium } = require('playwright');
const assert = require('assert');

async function runOmnichannelTests() {
  console.log('🧪 Starting Omnichannel Dual-Origin Booking E2E Test...\n');

  const targetUrl = process.env.TEST_TARGET_URL || 'http://localhost:4173';
  const browser = await chromium.launch({ headless: true });

  try {
    // =========================================================================
    // TEST 1: FLOW A (Web / Google Maps visitor -> Messenger Bridge)
    // =========================================================================
    console.log('--- TEST 1: Flow A (Web Visitor with Messenger Bridge) ---');
    const contextA = await browser.newContext({
      viewport: { width: 412, height: 915 }
    });
    const pageA = await contextA.newPage();
    const urlA = `${targetUrl}/?v=test_borderrun_pattaya&source=google_maps&cb=${Date.now()}`;
    
    console.log(`📡 Navigating to: ${urlA}`);
    await pageA.goto(urlA, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await pageA.waitForTimeout(2000);

    // Pick service
    const serviceBtns = await pageA.$$('button:has-text("Выбрать")');
    assert.ok(serviceBtns.length > 0, 'Service action button should exist');
    await serviceBtns[0].click();
    await pageA.waitForTimeout(1000);

    // Pick tomorrow date
    const dateButtons = await pageA.$$('button');
    for (const b of dateButtons) {
      const text = await b.innerText();
      if (text.includes('24 окт') || text.includes('СБ')) {
        await b.click();
        break;
      }
    }
    await pageA.waitForTimeout(800);

    // Pick slot
    const slotBtns = await pageA.$$('button:has-text("10:00"), button:has-text("10:30"), button:has-text("11:00")');
    assert.ok(slotBtns.length > 0, 'Slot button should exist');
    await slotBtns[0].click();
    await pageA.waitForTimeout(1000);

    // Auto-select seat & proceed
    const autoPickBtn = await pageA.waitForSelector('button:has-text("Выбрать автоматически")', { timeout: 8000 });
    await autoPickBtn.click();
    await pageA.waitForTimeout(600);

    const proceedBtn = await pageA.waitForSelector('button:has-text("Забронировать")', { timeout: 8000 });
    await proceedBtn.click();
    await pageA.waitForTimeout(800);

    // Fill contact details
    await pageA.fill('input[placeholder="Иван"]', 'Dmitry');
    await pageA.fill('input[type="tel"]', '+66812345678');

    // Submit booking
    const submitBtn = await pageA.waitForSelector('button:has-text("Забронировать визит со скидкой")', { timeout: 8000 });
    await submitBtn.click();
    await pageA.waitForTimeout(1500);

    // Verify Messenger Bridge presence (Telegram & WhatsApp buttons)
    const tgBridgeBtn = await pageA.waitForSelector('a:has-text("В Telegram")', { timeout: 8000 });
    assert.ok(tgBridgeBtn, 'Telegram bridge button should be displayed for web visitors');
    const tgHref = await tgBridgeBtn.getAttribute('href');
    assert.ok(tgHref.includes('t.me') && tgHref.includes('start=bk_'), `Telegram deep link should carry bk_ token: ${tgHref}`);
    console.log(`✅ Flow A: Telegram Bridge deep link verified: ${tgHref}`);

    const waBridgeBtn = await pageA.waitForSelector('a:has-text("В WhatsApp")', { timeout: 8000 });
    assert.ok(waBridgeBtn, 'WhatsApp bridge button should be displayed for web visitors');
    console.log('✅ Flow A: WhatsApp Bridge button verified!');
    await contextA.close();

    // =========================================================================
    // TEST 2: FLOW B (Messenger-Originated / Telegram Mini App Loop)
    // =========================================================================
    console.log('\n--- TEST 2: Flow B (Telegram Mini App Authenticated Loop) ---');
    const contextB = await browser.newContext({
      viewport: { width: 412, height: 915 }
    });
    const pageB = await contextB.newPage();
    const urlB = `${targetUrl}/?v=test_borderrun_pattaya&source=tg_mini_app&tg_name=Alexey&phone=%2B66987654321&cb=${Date.now()}`;
    
    console.log(`📡 Navigating to: ${urlB}`);
    await pageB.goto(urlB, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await pageB.waitForTimeout(1500);

    // Wait for services and pick first
    const firstServiceBtn = await pageB.waitForSelector('button:has-text("Выбрать")', { timeout: 10000 });
    await firstServiceBtn.click();
    await pageB.waitForTimeout(1000);

    // Pick tomorrow date
    const dateButtonsB = await pageB.$$('button');
    for (const b of dateButtonsB) {
      const text = await b.innerText();
      if (text.includes('24 окт') || text.includes('СБ')) {
        await b.click();
        break;
      }
    }
    await pageB.waitForTimeout(800);

    // Pick slot
    const slotBtnsB = await pageB.$$('button:has-text("10:00"), button:has-text("10:30"), button:has-text("11:00")');
    await slotBtnsB[0].click();
    await pageB.waitForTimeout(1000);

    // Auto-select seat & proceed
    const autoPickB = await pageB.waitForSelector('button:has-text("Выбрать автоматически")', { timeout: 8000 });
    await autoPickB.click();
    await pageB.waitForTimeout(600);

    const proceedB = await pageB.waitForSelector('button:has-text("Забронировать")', { timeout: 8000 });
    await proceedB.click();
    await pageB.waitForTimeout(800);

    // Verify Telegram Mini App badge & pre-filled fields
    const tgBadge = await pageB.waitForSelector('span:has-text("Telegram Mini App • Авторизован")', { timeout: 8000 });
    assert.ok(tgBadge, 'Telegram Mini App badge should be visible');
    console.log('✅ Flow B: Telegram Mini App badge detected!');

    const nameVal = await pageB.inputValue('input[placeholder="Иван"]');
    assert.strictEqual(nameVal, 'Alexey', 'Name should be pre-filled from Telegram context');
    console.log(`✅ Flow B: Client name pre-filled automatically: "${nameVal}"`);

    // Verify submit button text has return-to-chat label
    const returnChatSubmit = await pageB.waitForSelector('button:has-text("и вернуться в чат")', { timeout: 8000 });
    assert.ok(returnChatSubmit, 'Submit button should indicate return to chat');
    console.log('✅ Flow B: Return-to-chat submit button verified!');

    await returnChatSubmit.click();
    await pageB.waitForTimeout(1500);

    // Verify success state has "Заявка передана менеджеру в чат!" and "Вернуться в чат с компанией"
    const chatSentNotice = await pageB.waitForSelector('text=Заявка передана менеджеру в чат!', { timeout: 8000 });
    assert.ok(chatSentNotice, 'In-chat pending notice should be visible');

    const returnBtn = await pageB.waitForSelector('button:has-text("Вернуться в чат с компанией")', { timeout: 8000 });
    assert.ok(returnBtn, 'Return to chat CTA button should be visible');
    console.log('✅ Flow B: Direct return-to-chat confirmation verified!');

    // Verify external bridge buttons are NOT shown in Messenger mode
    const bridgeInTg = await pageB.$('text=Сохранить билет и точку сбора в мессенджер:');
    assert.strictEqual(bridgeInTg, null, 'Messenger bridge should NOT be shown when already inside messenger');
    console.log('✅ Flow B: Redundant channel selector successfully isolated!');

    await contextB.close();

    console.log('\n=============================================================');
    console.log('🎉 ALL OMNICHANNEL DUAL-ORIGIN FLOWS (A & B) PASSED 100%!');
    console.log('=============================================================');

  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runOmnichannelTests();
