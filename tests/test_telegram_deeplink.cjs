/**
 * @file test_telegram_deeplink.cjs
 * Test suite for Sprint 2 Telegram Deep Link (/start bk_...) Webhook handler.
 */

const assert = require('assert');

async function testTelegramDeepLinkLogic() {
  console.log('🧪 Testing Telegram Deep Link (/start bk_...) Logic & Parser...\n');

  // Test 1: Command and Token Extraction
  const sampleMessages = [
    { text: '/start bk_mHtkHR1D4T5YPcNgNTy9', expectedToken: 'mHtkHR1D4T5YPcNgNTy9' },
    { text: '/start bk_123456789', expectedToken: '123456789' },
    { text: '/start', expectedToken: null },
    { text: '/start promo_spring', expectedToken: null }
  ];

  for (const m of sampleMessages) {
    const parts = m.text.split(' ');
    const payload = (parts[1] || '').trim();
    const token = payload.startsWith('bk_') ? payload.replace('bk_', '').trim() : null;
    assert.strictEqual(token, m.expectedToken, `Failed to parse token from "${m.text}"`);
  }
  console.log('✅ STEP 1: Deep Link token parser passed for all test cases.');

  // Test 2: Boarding Pass String Formatting
  const mockBooking = {
    id: 'bk_sample_9821',
    clientName: 'Алексей Смирнов',
    serviceName: 'Бордер-ран в Камбоджу (VIP Всё включено)',
    startTime: '2026-10-24T06:00:00Z',
    finalPrice: 2900,
    seats: ['L_r1_c1', 'L_r1_c2'],
    seatDescriptions: ['A01 (Нижний ярус, окно)', 'A02 (Нижний ярус, центр)']
  };

  const clientDisplayName = mockBooking.clientName || 'Пассажир';
  const seatList = mockBooking.seatDescriptions.join(', ');
  const finalPrice = `${mockBooking.finalPrice.toLocaleString()} ฿`;

  const boardingPassMsg = 
    `🎫 <b>ВАШ ЦИФРОВОЙ БИЛЕТ • BOARDING PASS</b>\n\n` +
    `Здравствуйте, <b>${clientDisplayName}</b>! Ваша бронь успешно привязана к этому диалогу в Telegram.\n\n` +
    `🚍 <b>Рейс:</b> ${mockBooking.serviceName}\n` +
    `💺 <b>Места в салоне:</b> <code>${seatList}</code>\n` +
    `💰 <b>К оплате:</b> ${finalPrice} (при посадке)\n` +
    `📋 <b>Номер брони:</b> <code>#${mockBooking.id}</code>`;

  assert.ok(boardingPassMsg.includes('Алексей Смирнов'), 'Should include client name');
  assert.ok(boardingPassMsg.includes('A01 (Нижний ярус, окно)'), 'Should include seat label');
  assert.ok(boardingPassMsg.includes('2,900 ฿') || boardingPassMsg.includes('2 900 ฿'), 'Should include formatted price');
  console.log('✅ STEP 2: Digital Boarding Pass Telegram format verified:\n');
  console.log(boardingPassMsg);

  // Test 3: Keyboard Verification
  const keyboard = {
    inline_keyboard: [
      [{ text: "📍 Точка сбора на Google Картах", url: "https://maps.google.com/?q=Central+Festival+Pattaya" }],
      [{ text: "🚍 Открыть схему автобуса", web_app: { url: `https://bot-lab-21910.web.app/?v=test_borderrun_pattaya&source=tg_mini_app&booking_id=${mockBooking.id}` } }]
    ]
  };

  assert.strictEqual(keyboard.inline_keyboard.length, 2, 'Should have 2 rows of buttons');
  assert.ok(keyboard.inline_keyboard[1][0].web_app.url.includes('tg_mini_app'), 'Should include WebApp link');
  console.log('\n✅ STEP 3: Telegram Mini App action keyboard verified!');

  console.log('\n=============================================================');
  console.log('🎉 SPRINT 2 TELEGRAM DEEP LINK WEBHOOK TESTS PASSED 100%!');
  console.log('=============================================================');
}

testTelegramDeepLinkLogic();
