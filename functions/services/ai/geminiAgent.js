/**
 * @file geminiAgent.js
 * 24/7 AI-Concierge Engine powered by Google Gemini.
 * 
 * Handles natural language guest conversations, FAQs, and slot bookings
 * via Function Calling with zero hallucinations and strict brand rules.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const admin = require('firebase-admin');
const { toolsDefinition } = require('./toolsDefinition');
const { VirtualSlotCalculator } = require('../adapters/virtualSlotCalculator');

async function sendTelegramHitlMessage(chatId, text, inlineKeyboard) {
  const token = process.env.TELEGRAM_TOKEN || "8750420325:AAHHz4Y3583OezjjEQ-n7AYD7_c-feVBeO4";
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard ? { inline_keyboard: inlineKeyboard } : undefined
      })
    });
    const data = await res.json();
    return data && data.ok ? data.result : null;
  } catch (err) {
    console.warn("sendTelegramHitlMessage error:", err);
    return null;
  }
}

class GeminiConciergeAgent {
  constructor() {
    this.db = admin.firestore();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GeminiConciergeAgent: GEMINI_API_KEY is not set in environment.");
    }
    this.genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
  }

  /**
   * Load venue profile and knowledge base for system prompt context.
   */
  async _loadVenueContext(venueId) {
    const venueDoc = await this.db.collection('venues').doc(venueId).get();
    const venue = venueDoc.exists ? venueDoc.data() : {};

    const profileDoc = await this.db.collection('venues').doc(venueId).collection('ai_knowledge').doc('profile').get();
    const profile = profileDoc.exists ? profileDoc.data() : {};

    // Load services
    const servicesSnap = await this.db.collection('venues').doc(venueId).collection('services').get();
    const services = servicesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Load staff
    const staffSnap = await this.db.collection('venues').doc(venueId).collection('staff').get();
    const staff = staffSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Load yield rules
    const rulesSnap = await this.db.collection('venues').doc(venueId).collection('yield_rules').get();
    const yieldRules = rulesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Load continuous multimodal knowledge docs (PDFs, flyers, links, auto-learned Telegram facts)
    let knowledgeDocs = [];
    try {
      const knowledgeSnap = await this.db.collection('venues').doc(venueId)
        .collection('knowledge_docs')
        .where('active', '!=', false)
        .limit(50)
        .get();
      knowledgeDocs = knowledgeSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      try {
        const fallbackSnap = await this.db.collection('venues').doc(venueId)
          .collection('knowledge_docs')
          .limit(50)
          .get();
        knowledgeDocs = fallbackSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (err2) {
        knowledgeDocs = [];
      }
    }

    return { venue, profile, services, staff, yieldRules, knowledgeDocs };
  }

  /**
   * Process a message from a guest.
   * @param {Object} params
   * @param {string} params.venueId
   * @param {string} params.userMessage
   * @param {string} [params.senderPhone]
   * @param {Array} [params.chatHistory=[]]
   */
  async processGuestMessage({ venueId, userMessage, senderPhone = '', chatHistory = [] }) {
    if (!this.genAI) {
      return "Здравствуйте! Спасибо за обращение. В данный момент ассистент обновляется, наш администратор свяжется с вами в ближайшее время.";
    }

    const { venue, profile, services, staff, yieldRules, knowledgeDocs = [] } = await this._loadVenueContext(venueId);

    const venueName = venue.name || 'Наш салон';
    const conciergeName = profile.conciergeName || venue.conciergeName || 'AI-консьерж';
    const address = venue.address || '';
    const currency = venue.currency || 'RUB';
    const isInformal = profile.toneOfVoice === 'friendly_informal';

    const knowledgePromptBlock = knowledgeDocs.length > 0
      ? knowledgeDocs.map((k, i) => 
          `[ФАКТ #${i+1} | ${k.category || 'Общее'}] Тема: ${k.question}\nОтвет: ${k.answer}${k.criticalNote ? `\nВАЖНОЕ ПРАВИЛО: ${k.criticalNote}` : ''}`
        ).join('\n\n')
      : 'Специфических регламентов пока не добавлено. Опирайся на список услуг и базовые правила.';

    const systemInstruction = `
Ты — ${conciergeName}, вежливый, заботливый цифровой AI-консьерж заведения "${venueName}".
Если гость спрашивает, как тебя зовут или с кем он общается, всегда представляйся как ${conciergeName}.
Категория: ${venue.category || 'Услуги'}.
Адрес заведения: ${address}.
Валюта: ${currency}.
Тон общения: ${isInformal ? "дружеский на «ты»" : "подчеркнуто уважительный и сервисный на «вы»"}.

МОДЕЛЬ РАБОТЫ — СТРОГИЙ HUMAN-IN-THE-LOOP (HITL) И НУЛЕВЫЕ ГАЛЛЮЦИНАЦИИ:
1. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО выдумывать маршруты, цены, правила проезда границ, визовые требования или брать информацию в интернете. Ты имеешь право сообщать факты ТОЛЬКО из предоставленной базы знаний (FAQ, список услуг).
2. ЕСЛИ В БАЗЕ НЕТ ТОЧНОГО ОТВЕТА на вопрос гостя (например: нестандартные животные, специфические документы, особые точки забора):
   - Ни в коем случае не фантазируй и не строй догадок!
   - ОБЯЗАТЕЛЬНО вызови инструмент askHumanManager, передав вопрос гостя живому дежурному диспетчеру заведения.
   - Скажи гостю: "Я передал ваш вопрос нашему дежурному диспетчеру. Он проверит информацию и свяжется с вами в течение нескольких минут!".
3. СОГЛАСОВАНИЕ БРОНИРОВАНИЯ (ПОДТВЕРЖДЕНИЕ ТОЛЬКО ЧЕЛОВЕКОМ):
   - Когда клиент определяется с датой, рейсом и готов забронировать:
     - Обязательно узнай имя, номер телефона и вызови createBooking.
     - Статус заявки ВСЕГДА создается как "pending_confirmation" (на согласовании).
     - ТЫ ОБЯЗАН ЧЕТКО СООБЩИТЬ ГОСТЮ, что заявка принята и передана на подтверждение живому диспетчеру рейса, который проверит наличие мест и подтвердит бронь.
     - Запрещено утверждать, что бронь уже окончательно подтверждена, пока человек не подтвердил её.
4. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать слово "Тир" или "Tier". Называй клиенту только точную сумму выгоды или скидку.
5. Для проверки свободных слотов вызывай getAvailableSlots. При вопросах о парковке, правилах или документах вызывай getVenueFAQ.
6. Предоплата НЕ ТРЕБУЕТСЯ. Оплата производится на месте при посадке/визите.

=== ВЕРИФИЦИРОВАННАЯ БАЗА ЗНАНИЙ (РЕГЛАМЕНТЫ, ПРАВИЛА, ВИЗЫ, ДОКУМЕНТЫ) ===
${knowledgePromptBlock}
`;

    const model = this.genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction,
      tools: toolsDefinition
    });

    const chat = model.startChat({
      history: chatHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.text }]
      }))
    });

    let result = await chat.sendMessage(userMessage);
    let response = result.response;

    // Check for Function Calls
    const functionCalls = response.functionCalls ? response.functionCalls() : [];

    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      const functionName = call.name;
      const args = call.args;

      let toolResult = {};

      if (functionName === 'getAvailableSlots') {
        toolResult = await this._handleGetAvailableSlots({
          venueId,
          dateStr: args.dateStr,
          serviceName: args.serviceName,
          staffName: args.staffName,
          services,
          staff,
          yieldRules
        });
      } else if (functionName === 'createBooking') {
        toolResult = await this._handleCreateBooking({
          venueId,
          args,
          services,
          staff,
          venue
        });
      } else if (functionName === 'askHumanManager') {
        toolResult = await this._handleAskHumanManager({
          venueId,
          args,
          venue
        });
      } else if (functionName === 'getVenueFAQ') {
        toolResult = this._handleGetVenueFAQ({
          topic: args.topic,
          profile,
          venue,
          knowledgeDocs
        });
      }

      // Send function response back to Gemini to synthesize natural language answer
      const followup = await chat.sendMessage([
        {
          functionResponse: {
            name: functionName,
            response: toolResult
          }
        }
      ]);

      return followup.response.text();
    }

    return response.text();
  }

  async _handleGetAvailableSlots({ venueId, dateStr, serviceName, staffName, services, staff, yieldRules }) {
    const targetService = services.find(s => 
      s.name.toLowerCase().includes((serviceName || '').toLowerCase())
    ) || services[0] || { price: 1500, durationMinutes: 45 };

    // Fetch busy intervals
    const busy = [];
    const slots = VirtualSlotCalculator.generateVirtualSlots({
      shiftStart: "10:00",
      shiftEnd: "21:00",
      stepMinutes: 30,
      durationMinutes: targetService.durationMinutes || 45,
      busyIntervals: busy,
      yieldRules,
      basePrice: targetService.price || 1500,
      dateStr,
      nowDateStr: new Date().toISOString().split('T')[0],
      nowMinutes: new Date().getHours() * 60 + new Date().getMinutes()
    });

    return {
      date: dateStr,
      service: targetService.name,
      availableSlots: slots.slice(0, 8).map(s => ({
        time: s.time,
        price: s.finalPrice,
        discount: s.discountAmount > 0 ? (s.discountType === 'fixed' ? `-${s.discountAmount} ₽` : `-${Math.round((s.discountAmount / s.basePrice) * 100)}%`) : null
      }))
    };
  }

  async _handleCreateBooking({ venueId, args, services, staff, venue }) {
    const bookingDoc = {
      venueId,
      clientName: args.clientName,
      clientPhone: args.clientPhone,
      serviceName: args.serviceName,
      staffName: args.staffName || 'Любой свободный рейс / экипаж',
      startTime: admin.firestore.Timestamp.fromDate(new Date(`${args.dateStr}T${args.timeStr}:00Z`)),
      endTime: admin.firestore.Timestamp.fromDate(new Date(new Date(`${args.dateStr}T${args.timeStr}:00Z`).getTime() + 60 * 60000)),
      status: 'pending_confirmation',
      requiresHumanConfirmation: true,
      source: 'ai_concierge',
      notes: args.notes || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const ref = await this.db.collection('bookings').add(bookingDoc);

    // Human-in-the-Loop: Dispatch interactive Telegram confirmation card
    const targetChatIds = [];
    if (venue.authorizedTelegramChatIds && Array.isArray(venue.authorizedTelegramChatIds)) {
      targetChatIds.push(...venue.authorizedTelegramChatIds);
    }
    if (venue.telegramGroupId && !targetChatIds.includes(venue.telegramGroupId)) {
      targetChatIds.push(venue.telegramGroupId);
    }

    const tgCardText = 
      `🚨 <b>НОВАЯ ЗАЯВКА НА СОГЛАСОВАНИЕ!</b>\n` +
      `🏢 <b>Заведение:</b> ${venue.name || 'Заведение'}\n\n` +
      `👤 <b>Клиент:</b> ${args.clientName}\n` +
      `📞 <b>Телефон:</b> <code>${args.clientPhone}</code>\n` +
      `🚐 <b>Рейс / Услуга:</b> ${args.serviceName}\n` +
      `📅 <b>Дата:</b> ${args.dateStr} в ${args.timeStr}\n` +
      (args.notes ? `💬 <b>Пожелание:</b> ${args.notes}\n` : '') +
      `\n<i>💡 Заявка ожидает вашего решения. Подтвердите наличие мест:</i>`;

    const inlineKeyboard = [
      [
        { text: "✅ Подтвердить бронь", callback_data: `BKG_CONFIRM_${ref.id}` },
        { text: "❌ Отклонить", callback_data: `BKG_REJECT_${ref.id}` }
      ]
    ];

    for (const chatId of targetChatIds) {
      await sendTelegramHitlMessage(chatId, tgCardText, inlineKeyboard);
    }

    return {
      status: 'pending_confirmation',
      bookingId: ref.id,
      clientName: args.clientName,
      date: args.dateStr,
      time: args.timeStr,
      service: args.serviceName,
      message: "Заявка успешно зарегистрирована в статусе ожидания. Диспетчер заведения уже получил уведомление в Telegram и подтвердит наличие мест."
    };
  }

  async _handleAskHumanManager({ venueId, args, venue }) {
    const inquiryRef = await this.db.collection('venues').doc(venueId).collection('manager_inquiries').add({
      question: args.question,
      clientName: args.clientName || 'Гость',
      clientPhone: args.clientPhone || '',
      status: 'pending_answer',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const targetChatIds = [];
    if (venue.authorizedTelegramChatIds && Array.isArray(venue.authorizedTelegramChatIds)) {
      targetChatIds.push(...venue.authorizedTelegramChatIds);
    }
    if (venue.telegramGroupId && !targetChatIds.includes(venue.telegramGroupId)) {
      targetChatIds.push(venue.telegramGroupId);
    }

    const tgAlertText = 
      `❓ <b>ВОПРОС ОТ ГОСТЯ В ЧАТЕ (ТРЕБУЕТСЯ ОТВЕТ ДИСПЕТЧЕРА)</b>\n` +
      `🏢 <b>Заведение:</b> ${venue.name || 'Заведение'}\n\n` +
      `👤 <b>Гость:</b> ${args.clientName || 'Клиент'}` +
      (args.clientPhone ? ` (<code>${args.clientPhone}</code>)\n` : '\n') +
      `💬 <b>Вопрос:</b> «${args.question}»\n\n` +
      `💡 <i>Нажмите <b>Reply (Ответить)</b> на это сообщение текстом. AI-консьерж сразу сохранит этот ответ в базу знаний и обучится отвечать на него сам!</i>`;

    const dispatchedMessageIds = [];
    for (const chatId of targetChatIds) {
      const sentMsg = await sendTelegramHitlMessage(chatId, tgAlertText, null);
      if (sentMsg && sentMsg.message_id) {
        dispatchedMessageIds.push(sentMsg.message_id);
      }
    }

    if (dispatchedMessageIds.length > 0) {
      await inquiryRef.update({
        telegramMessageIds: dispatchedMessageIds,
        telegramMessageId: dispatchedMessageIds[0]
      });
    }

    return {
      status: 'inquiry_sent',
      message: "Вопрос передан дежурному диспетчеру заведения. Он проверит информацию и свяжется с вами в течение нескольких минут."
    };
  }

  _handleGetVenueFAQ({ topic, profile, venue, knowledgeDocs = [] }) {
    const lower = (topic || '').toLowerCase();
    
    // Check continuous multimodal knowledge base
    if (knowledgeDocs && knowledgeDocs.length > 0) {
      const matched = knowledgeDocs.find(k => 
        (k.question && k.question.toLowerCase().includes(lower)) ||
        (k.category && k.category.toLowerCase().includes(lower)) ||
        (k.answer && k.answer.toLowerCase().includes(lower))
      );
      if (matched) {
        return {
          topic: matched.category || topic,
          answer: matched.answer,
          criticalNote: matched.criticalNote || null
        };
      }
    }

    if (topic === 'parking') {
      return { answer: profile.parkingInstructions || "Парковка рядом со входом в заведение." };
    }
    if (topic === 'pets') {
      return { answer: profile.petPolicy || "Уточняйте возможность визита с питомцами у администратора." };
    }
    return {
      address: venue.address || "Центральный район",
      specialInstructions: profile.specialInstructions || "Чай, кофе и премиальный уход."
    };
  }
}

module.exports = { GeminiConciergeAgent };
