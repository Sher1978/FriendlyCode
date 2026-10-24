/**
 * @file bookingTriggers.js
 * Modular Booking Lifecycle & Seat Synchronization Engine (SoT Compliant < 250 lines).
 * Handles:
 * 1. Unified Telegram Staff Group ID resolution across all schema variants.
 * 2. Real-time HITL Telegram dispatch on web/seatmap booking creation (onBookingCreated).
 * 3. Two-way seat status synchronization with venues/{venueId}/scheduled_trips/{tripId}.
 */

const admin = require('firebase-admin');

/**
 * Collects all configured Telegram group/chat IDs for a venue across all schema versions.
 * @param {Object} venue
 * @returns {string[]}
 */
function extractVenueTelegramTargets(venue = {}) {
  const targets = new Set();

  const candidates = [
    venue.telegramStaffChatId,
    venue.telegramGroupId,
    venue.telegram_group_id,
    venue.logisticsConfig?.telegramChatId
  ];

  for (const c of candidates) {
    if (c !== undefined && c !== null && String(c).trim() !== '') {
      targets.add(String(c).trim());
    }
  }

  if (Array.isArray(venue.authorizedTelegramChatIds)) {
    for (const id of venue.authorizedTelegramChatIds) {
      if (id !== undefined && id !== null && String(id).trim() !== '') {
        targets.add(String(id).trim());
      }
    }
  }

  return Array.from(targets);
}

/**
 * Finds a venue document by Telegram group/chat ID across all supported field names.
 * @param {FirebaseFirestore.Firestore} db
 * @param {string|number} chatId
 * @returns {Promise<FirebaseFirestore.QueryDocumentSnapshot|null>}
 */
async function findVenueByTelegramChatId(db, chatId) {
  const strId = String(chatId).trim();
  const numId = Number(chatId);

  const fields = ['telegramStaffChatId', 'telegramGroupId', 'telegram_group_id'];

  for (const field of fields) {
    const snapStr = await db.collection('venues').where(field, '==', strId).limit(1).get();
    if (!snapStr.empty) return snapStr.docs[0];

    if (!Number.isNaN(numId)) {
      const snapNum = await db.collection('venues').where(field, '==', numId).limit(1).get();
      if (!snapNum.empty) return snapNum.docs[0];
    }
  }

  const arrSnap = await db
    .collection('venues')
    .where('authorizedTelegramChatIds', 'array-contains', strId)
    .limit(1)
    .get();
  if (!arrSnap.empty) return arrSnap.docs[0];

  return null;
}

/**
 * Sends a Telegram message with optional inline keyboard.
 */
async function sendTelegramHitlCard(chatId, text, inlineKeyboard) {
  const token = process.env.TELEGRAM_TOKEN || '8750420325:AAHHz4Y3583OezjjEQ-n7AYD7_c-feVBeO4';
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
    console.warn('[bookingTriggers] sendTelegramHitlCard error:', err.message);
    return null;
  }
}

/**
 * Synchronizes seat statuses in venues/{venueId}/scheduled_trips/{tripId}
 * when a booking is confirmed or rejected by a dispatcher in Telegram.
 */
async function syncScheduledTripSeatsOnDecision(db, bookingData, isConfirm, reviewer) {
  const venueId = bookingData?.venueId;
  const tripId = bookingData?.tripId;
  const seatIds = bookingData?.seats;

  if (!venueId || !tripId || !Array.isArray(seatIds) || seatIds.length === 0) {
    return;
  }

  try {
    const tripRef = db.collection('venues').doc(venueId).collection('scheduled_trips').doc(tripId);
    const tripSnap = await tripRef.get();
    if (!tripSnap.exists) return;

    const tripData = tripSnap.data() || {};
    const rawSeats = tripData.seats;
    const seatSet = new Set(seatIds.map(s => String(s)));

    if (Array.isArray(rawSeats)) {
      let updated = false;
      const nextSeats = rawSeats.map(s => {
        const sId = String(s.seatId || s.id || '');
        const sLabel = String(s.label || '');
        if (seatSet.has(sId) || seatSet.has(sLabel)) {
          updated = true;
          if (isConfirm) {
            return {
              ...s,
              status: 'confirmed',
              passengerName: bookingData.clientName || s.passengerName || 'Пассажир',
              passengerPhone: bookingData.clientPhone || s.passengerPhone || '',
              confirmedBy: reviewer
            };
          } else {
            return {
              ...s,
              status: 'available',
              passengerName: null,
              passengerPhone: null,
              bookingId: null,
              reservedAt: null
            };
          }
        }
        return s;
      });

      if (updated) {
        await tripRef.update({
          seats: nextSeats,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    } else if (rawSeats && typeof rawSeats === 'object') {
      const updatedSeatsMap = { ...rawSeats };
      let updated = false;
      for (const [key, sObj] of Object.entries(updatedSeatsMap)) {
        const s = sObj || {};
        const sId = String(s.seatId || s.id || key);
        const sLabel = String(s.label || key);
        if (seatSet.has(key) || seatSet.has(sId) || seatSet.has(sLabel)) {
          updated = true;
          if (isConfirm) {
            updatedSeatsMap[key] = {
              ...s,
              status: 'confirmed',
              passengerName: bookingData.clientName || s.passengerName || 'Пассажир',
              passengerPhone: bookingData.clientPhone || s.passengerPhone || '',
              updatedBy: reviewer,
              updatedAt: admin.firestore.Timestamp.now()
            };
          } else {
            updatedSeatsMap[key] = {
              ...s,
              status: 'available',
              passengerName: '',
              passengerPhone: '',
              finalPrice: 0,
              paymentStatus: 'unpaid',
              updatedBy: reviewer,
              updatedAt: admin.firestore.Timestamp.now()
            };
          }
        }
      }

      if (updated) {
        let blocked = 0;
        let confirmed = 0;
        let reserved = 0;
        for (const s of Object.values(updatedSeatsMap)) {
          if (s?.status === 'blocked') blocked++;
          if (s?.status === 'confirmed') confirmed++;
          if (s?.status === 'reserved') reserved++;
        }
        const totalCap = Number(tripData.totalCapacity) || Object.keys(updatedSeatsMap).length || 13;
        const sellable = Math.max(1, totalCap - blocked);
        const occupancyRate = (confirmed + reserved) / sellable;

        await tripRef.update({
          seats: updatedSeatsMap,
          blockedSeatsCount: blocked,
          sellableCapacity: sellable,
          confirmedCount: confirmed,
          reservedCount: reserved,
          occupancyRate
        });
      }
    }
  } catch (err) {
    console.warn('[bookingTriggers] syncScheduledTripSeatsOnDecision error:', err.message);
  }
}

/**
 * Handles Firestore onDocumentCreated("bookings/{bookingId}") trigger.
 */
async function handleNewBookingCreated(db, bookingId, bookingData) {
  if (!bookingData || !bookingData.venueId) return;

  const venueId = bookingData.venueId;
  let venue = {};
  try {
    const vSnap = await db.collection('venues').doc(venueId).get();
    if (vSnap.exists) venue = vSnap.data() || {};
  } catch (e) {
    console.warn('[bookingTriggers] Failed to load venue:', e.message);
  }

  const clientName = bookingData.clientName || 'Гость';
  const clientPhone = bookingData.clientPhone || 'Не указан';
  const serviceName = bookingData.serviceName || 'Услуга / Рейс';
  const seatList = Array.isArray(bookingData.seatDescriptions) && bookingData.seatDescriptions.length > 0
    ? bookingData.seatDescriptions.join(', ')
    : (Array.isArray(bookingData.seats) && bookingData.seats.length > 0 ? bookingData.seats.join(', ') : null);

  // 1. Create In-App Notification for Admin Bell Icon
  try {
    await db.collection('notifications').add({
      venueId,
      type: 'new_booking',
      title: `Новая бронь: ${serviceName}`,
      message: `${clientName} (${clientPhone})${seatList ? ` • Места: ${seatList}` : ''}`,
      bookingId,
      read: false,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (notifErr) {
    console.warn('[bookingTriggers] Notification creation error:', notifErr.message);
  }

  // 2. If created via AI Concierge tool, it already dispatched the HITL card
  if (bookingData.source === 'ai_concierge') {
    return;
  }

  // 3. Dispatch HITL Confirmation Card to Venue Telegram Staff Group(s)
  const targetChatIds = extractVenueTelegramTargets(venue);
  if (targetChatIds.length === 0) return;

  let formattedTime = 'Уточняется';
  if (bookingData.startTime) {
    try {
      const dt = bookingData.startTime.toDate
        ? bookingData.startTime.toDate()
        : new Date(bookingData.startTime);
      formattedTime = dt.toLocaleString('ru-RU', {
        timeZone: venue.timezone || 'Asia/Bangkok',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (_) {
      formattedTime = String(bookingData.startTime);
    }
  }

  const currency = venue.currency || '฿';
  const priceStr = bookingData.finalPrice !== undefined
    ? `${Number(bookingData.finalPrice).toLocaleString('ru-RU')} ${currency}`
    : 'По тарифу';

  const tgCardText =
    `🚨 <b>НОВАЯ БРОНЬ С ВИТРИНЫ (НА СОГЛАСОВАНИИ)</b>\n` +
    `🏢 <b>Заведение:</b> ${venue.name || venueId}\n\n` +
    `👤 <b>Пассажир / Клиент:</b> ${clientName}\n` +
    `📞 <b>Телефон:</b> <code>${clientPhone}</code>\n` +
    `🚐 <b>Маршрут / Услуга:</b> ${serviceName}\n` +
    (bookingData.staffName ? `👨‍✈️ <b>Борт / Мастер:</b> ${bookingData.staffName}\n` : '') +
    `📅 <b>Отправление:</b> ${formattedTime}\n` +
    (seatList ? `💺 <b>Выбранные места:</b> <code>${seatList}</code>\n` : '') +
    `💰 <b>К оплате:</b> <b>${priceStr}</b>\n` +
    (bookingData.notes ? `💬 <b>Комментарий:</b> ${bookingData.notes}\n` : '') +
    `\n<i>⏳ Место временно зарезервировано. Свяжитесь с клиентом и подтвердите выпуск посадочного талона:</i>`;

  const inlineKeyboard = [
    [
      { text: '✅ Подтвердить оплату и выдать билет', callback_data: `BKG_CONFIRM_${bookingId}` },
      { text: '❌ Отклонить бронь', callback_data: `BKG_REJECT_${bookingId}` }
    ]
  ];

  for (const chatId of targetChatIds) {
    await sendTelegramHitlCard(chatId, tgCardText, inlineKeyboard);
  }
}

module.exports = {
  extractVenueTelegramTargets,
  findVenueByTelegramChatId,
  syncScheduledTripSeatsOnDecision,
  handleNewBookingCreated
};
