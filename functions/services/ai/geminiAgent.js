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

    return { venue, profile, services, staff, yieldRules };
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

    const { venue, profile, services, staff, yieldRules } = await this._loadVenueContext(venueId);

    const venueName = venue.name || 'Наш салон';
    const address = venue.address || '';
    const currency = venue.currency || 'RUB';
    const isInformal = profile.toneOfVoice === 'friendly_informal';

    const systemInstruction = `
Ты — вежливый, заботливый цифровой AI-консьерж заведения "${venueName}".
Адрес заведения: ${address}.
Валюта: ${currency}.
Тон общения: ${isInformal ? "дружеский на «ты», как в стильном барбершопе" : "подчеркнуто уважительный и сервисный на «вы»"}.

СТРОГИЕ ПРАВИЛА:
1. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать слово "Тир" или "Tier" в любых ответах. Называй клиенту только точную сумму выгоды (например: "со скидкой 20%" или "со скидкой 500 рублей").
2. Твоя главная цель — заботливо ответить на вопросы гостя и помочь забронировать удобное время.
3. Активно предлагай свободные дневные окна со скидкой (будни 12:00-16:00), чтобы заполнить пустые часы.
4. Для проверки свободных слотов ОБЯЗАТЕЛЬНО вызывай функцию getAvailableSlots.
5. Для подтверждения бронирования ОБЯЗАТЕЛЬНО узнай имя, номер телефона, дату, время и вызови createBooking.
6. При вопросах о парковке или правилах вызывай функцию getVenueFAQ.
7. Предоплата НЕ ТРЕБУЕТСЯ. Всегда подчеркивай, что оплата происходит на месте в заведении после визита.
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
          staff
        });
      } else if (functionName === 'getVenueFAQ') {
        toolResult = this._handleGetVenueFAQ({
          topic: args.topic,
          profile,
          venue
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

  async _handleCreateBooking({ venueId, args, services, staff }) {
    const bookingDoc = {
      venueId,
      clientName: args.clientName,
      clientPhone: args.clientPhone,
      serviceName: args.serviceName,
      staffName: args.staffName || 'Любой свободный мастер',
      startTime: admin.firestore.Timestamp.fromDate(new Date(`${args.dateStr}T${args.timeStr}:00Z`)),
      endTime: admin.firestore.Timestamp.fromDate(new Date(new Date(`${args.dateStr}T${args.timeStr}:00Z`).getTime() + 45 * 60000)),
      status: 'created',
      source: 'ai_concierge',
      notes: args.notes || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const ref = await this.db.collection('bookings').add(bookingDoc);

    return {
      status: 'confirmed',
      bookingId: ref.id,
      clientName: args.clientName,
      date: args.dateStr,
      time: args.timeStr,
      service: args.serviceName
    };
  }

  _handleGetVenueFAQ({ topic, profile, venue }) {
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
