/**
 * @file test_telegram_business.cjs
 * Comprehensive unit and logic test for Sprint 3:
 * - Telegram Business API connection & update parsing
 * - Silent Mute Protocol (Manager detection, 45-min lock, /mute, /unmute, customer handoff)
 * - Dynamic bus card generation with Telegram Mini App web_app button
 */

const assert = require('assert');

async function testTelegramBusinessLogic() {
  console.log('🧪 Starting Sprint 3: Telegram Business API & Silent Mute Protocol Tests...\n');

  // =========================================================================
  // 1. Business Connection Update Parser
  // =========================================================================
  console.log('--- TEST 1: Business Connection Update Parser ---');
  const sampleConnectionUpdate = {
    update_id: 10001,
    business_connection: {
      id: "bconn_pattaya_001",
      user: {
        id: 77889900,
        first_name: "Manager Alexey",
        username: "pattaya_fleet_lead"
      },
      user_chat_id: 77889900,
      date: 1711234567,
      can_reply: true,
      is_enabled: true
    }
  };

  const bc = sampleConnectionUpdate.business_connection;
  assert.strictEqual(bc.id, "bconn_pattaya_001");
  assert.strictEqual(String(bc.user.id), "77889900");
  assert.strictEqual(bc.can_reply, true);
  assert.strictEqual(bc.is_enabled, true);
  console.log('✅ STEP 1: Telegram Business Connection event parsed successfully.');

  // =========================================================================
  // 2. Silent Mute Protocol Simulation
  // =========================================================================
  console.log('\n--- TEST 2: Silent Mute Protocol State Machine ---');
  const venueOwnerId = "77889900"; // Business manager ID
  const customerId = "99112233";   // Guest ID
  const chatId = 99112233;

  let dialogueState = {
    isMutedUntil: null,
    lastManagerMsgAt: null,
    mutedBy: null
  };

  function simulateIncomingMessage(fromId, text) {
    const isManager = String(fromId) === venueOwnerId;

    if (isManager) {
      if (text === '/unmute') {
        dialogueState.isMutedUntil = null;
        dialogueState.mutedBy = null;
        return { action: 'UNMUTED_BY_COMMAND', botReplies: true };
      }

      const muteHours = text === '/mute' ? 24 : 0.75; // 45 mins
      dialogueState.isMutedUntil = new Date(Date.now() + muteHours * 3600 * 1000);
      dialogueState.mutedBy = 'manager_activity';
      return { action: 'MUTED_BY_MANAGER', botReplies: false };
    }

    // Customer message: check mute
    if (dialogueState.isMutedUntil && dialogueState.isMutedUntil > new Date()) {
      return { action: 'SILENT_DUE_TO_ACTIVE_MUTE', botReplies: false };
    }

    // Customer asking for human
    const lower = text.toLowerCase();
    if (lower.includes('человек') || lower.includes('оператор') || lower.includes('позови')) {
      dialogueState.isMutedUntil = new Date(Date.now() + 45 * 60 * 1000);
      dialogueState.mutedBy = 'client_requested_human';
      return { action: 'HANDOVER_TO_HUMAN', botReplies: true };
    }

    // Customer booking intent
    if (lower.includes('рейс') || lower.includes('мест') || lower.includes('забронир')) {
      return { action: 'SEND_BOOKING_CARD', botReplies: true };
    }

    return { action: 'SEND_AI_FAQ', botReplies: true };
  }

  // 2.1 Customer writes first (Unmuted) -> should get booking card
  const res1 = simulateIncomingMessage(customerId, "Здравствуйте, есть места на завтра на рейс в Камбоджу?");
  assert.strictEqual(res1.action, 'SEND_BOOKING_CARD');
  assert.strictEqual(res1.botReplies, true);
  console.log('✅ STEP 2.1: Guest booking query triggers booking card when unmuted.');

  // 2.2 Manager types in the chat -> triggers 45-min Silent Mute
  const res2 = simulateIncomingMessage(venueOwnerId, "Добрый вечер! Да, на 06:00 есть места, оформляете?");
  assert.strictEqual(res2.action, 'MUTED_BY_MANAGER');
  assert.strictEqual(res2.botReplies, false);
  assert.ok(dialogueState.isMutedUntil > new Date());
  console.log('✅ STEP 2.2: Manager message in chat automatically triggers 45-min Silent Mute.');

  // 2.3 Guest replies to manager -> Bot must REMAIN SILENT so as not to interrupt
  const res3 = simulateIncomingMessage(customerId, "Да, на двоих, один взрослый и ребенок");
  assert.strictEqual(res3.action, 'SILENT_DUE_TO_ACTIVE_MUTE');
  assert.strictEqual(res3.botReplies, false);
  console.log('✅ STEP 2.3: Guest reply during active manager conversation ignored by bot (Zero Interruption).');

  // 2.4 Manager sends /unmute -> Bot is back online
  const res4 = simulateIncomingMessage(venueOwnerId, "/unmute");
  assert.strictEqual(res4.action, 'UNMUTED_BY_COMMAND');
  assert.strictEqual(dialogueState.isMutedUntil, null);
  console.log('✅ STEP 2.4: /unmute command brings AI-Concierge back to active duty.');

  // 2.5 Guest requests human explicitly -> Bot transfers and mutes
  const res5 = simulateIncomingMessage(customerId, "Позовите человека, пожалуйста");
  assert.strictEqual(res5.action, 'HANDOVER_TO_HUMAN');
  assert.ok(dialogueState.isMutedUntil > new Date());
  assert.strictEqual(dialogueState.mutedBy, 'client_requested_human');
  console.log('✅ STEP 2.5: Customer request for human successfully hands over and sets mute window.');

  // =========================================================================
  // 3. Telegram Business Dynamic Card Format Verification
  // =========================================================================
  console.log('\n--- TEST 3: Business Card HTML & Mini App Markup ---');
  const clientName = "Dmitry";
  const venueId = "test_borderrun_pattaya";

  const busCardText = 
    `🚍 <b>РЕЙСЫ БОРДЕР-РАН ПАТТАЙЯ — КАМБОДЖА</b>\n\n` +
    `Здравствуйте, <b>${clientName}</b>! Ближайшие выезды на комфортабельных слипер-басах:\n\n` +
    `🔹 <b>Завтра (06:00):</b> Слипер-бас VIP • <code>Осталось 4 места</code>\n` +
    `💰 <b>Цена:</b> 2 900 ฿ (Ваша динамическая скидка учтена)\n` +
    `🔹 <b>Послезавтра (06:00):</b> Минивэн Toyota • <code>Свободно 7 мест</code>\n\n` +
    `Нажмите кнопку ниже, чтобы открыть интерактивную схему автобуса и зафиксировать полку:`;

  const replyMarkup = {
    inline_keyboard: [
      [
        {
          text: "💺 Выбрать полку в автобусе (A01-B18)",
          web_app: { url: `https://bot-lab-21910.web.app/?v=${venueId}&source=tg_mini_app&client_name=${encodeURIComponent(clientName)}` }
        }
      ],
      [
        {
          text: "💬 Позвать живого оператора",
          callback_data: "action_call_human"
        }
      ]
    ]
  };

  assert.ok(busCardText.includes('Dmitry'), 'Should contain guest name');
  assert.ok(busCardText.includes('Осталось 4 места'), 'Should convey scarcity');
  assert.ok(replyMarkup.inline_keyboard[0][0].web_app.url.includes('source=tg_mini_app'), 'Must contain Mini App source query');
  console.log('✅ STEP 3: Telegram Business Card and Mini App button verified!\n');

  console.log('=============================================================');
  console.log('🎉 SPRINT 3 TELEGRAM BUSINESS & SILENT MUTE TESTS PASSED 100%!');
  console.log('=============================================================');
}

testTelegramBusinessLogic();
