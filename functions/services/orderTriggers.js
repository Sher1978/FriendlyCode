/**
 * @file orderTriggers.js
 * Cloud Functions backend handlers for Direct Delivery (HoReCa) Orders.
 * Dispatches real-time Telegram cards to kitchen/courier staff and in-app notifications.
 */

const admin = require('firebase-admin');
const { extractVenueTelegramTargets } = require('./bookingTriggers');

async function sendTelegramOrderMessage(chatId, text, inlineKeyboard) {
  const token = process.env.TELEGRAM_TOKEN || "8750420325:AAHHz4Y3583OezjjEQ-n7AYD7_c-feVBeO4";
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
        reply_markup: inlineKeyboard ? { inline_keyboard: inlineKeyboard } : undefined
      })
    });
    const data = await res.json();
    return data && data.ok ? data.result : null;
  } catch (err) {
    console.warn("[orderTriggers] sendTelegramOrderMessage error:", err.message);
    return null;
  }
}

/**
 * Handles Firestore onDocumentCreated("orders/{orderId}") trigger.
 */
async function handleNewOrderCreated(db, orderId, orderData) {
  if (!orderData || !orderData.venueId) return;

  const venueId = orderData.venueId;
  let venue = {};
  try {
    const venueSnap = await db.collection('venues').doc(venueId).get();
    if (venueSnap.exists) {
      venue = venueSnap.data();
    }
  } catch (e) {
    console.warn('[orderTriggers] Error fetching venue for order:', e.message);
  }

  // 1. Create in-app notification for Admin / Owner Bell
  try {
    await db.collection('notifications').add({
      venueId,
      type: 'new_order',
      title: `Новый заказ #${orderId}`,
      message: `${orderData.customer?.name || 'Клиент'} • ${orderData.deliveryType === 'pickup' ? 'Самовывоз' : 'Доставка'} • ${orderData.totalPayable} ${orderData.currency || 'VND'}`,
      orderId,
      isRead: false,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (notifErr) {
    console.warn('[orderTriggers] Error creating notification:', notifErr.message);
  }

  // 2. Identify Telegram Targets
  const targetChatIds = extractVenueTelegramTargets(venue);
  if (venue.logisticsConfig?.telegramDispatchChatId) {
    const dispatchId = String(venue.logisticsConfig.telegramDispatchChatId).trim();
    if (dispatchId && !targetChatIds.includes(dispatchId)) {
      targetChatIds.push(dispatchId);
    }
  }
  if (targetChatIds.length === 0) return;

  // 3. Format Telegram Card
  const isPickup = orderData.deliveryType === 'pickup';
  const emoji = isPickup ? '🛍️' : '🛵';
  const title = isPickup ? 'НОВЫЙ ЗАКАЗ НА САМОВЫВОЗ' : 'НОВЫЙ ЗАКАЗ НА ДОСТАВКУ';
  const itemsText = (orderData.items || []).map(i => `• <b>${i.name}</b> × ${i.count} = ${Number(i.price * i.count).toLocaleString()} ${orderData.currency || ''}`).join('\n');

  let locationLink = '';
  if (orderData.guestLocation?.googleMapsUrl) {
    locationLink = `\n📍 <b>Точка доставки на карте:</b> <a href="${orderData.guestLocation.googleMapsUrl}">Открыть в Google Maps ↗</a>\n`;
  } else if (orderData.customer?.locationUrl) {
    locationLink = `\n📍 <b>Точка доставки на карте:</b> <a href="${orderData.customer.locationUrl}">Открыть в Google Maps ↗</a>\n`;
  }

  const tgCardText =
    `${emoji} <b>${title} #${orderId}</b>\n` +
    `🏢 <b>Заведение:</b> ${orderData.venueName || venue.name || 'Заведение'}\n\n` +
    `👤 <b>Клиент:</b> ${orderData.customer?.name || 'Гость'}\n` +
    `📞 <b>Телефон:</b> <code>${orderData.customer?.phone || 'Не указан'}</code>\n` +
    (orderData.customer?.address ? `🏠 <b>Адрес:</b> ${orderData.customer.address}\n` : '') +
    locationLink +
    (orderData.customer?.comment ? `💬 <b>Пожелание:</b> «${orderData.customer.comment}»\n` : '') +
    `\n📋 <b>СОСТАВ ЗАКАЗА:</b>\n${itemsText || '• Блюда из меню'}\n\n` +
    `💰 <b>Сумма блюд:</b> ${Number(orderData.subtotal || 0).toLocaleString()} ${orderData.currency || ''}\n` +
    (orderData.discountAmount > 0 ? `🎁 <b>Скидка (${orderData.discountPercentage}%):</b> -${Number(orderData.discountAmount).toLocaleString()} ${orderData.currency || ''}\n` : '') +
    (!isPickup && orderData.deliveryFee > 0 ? `🚗 <b>Доставка:</b> ${Number(orderData.deliveryFee).toLocaleString()} ${orderData.currency || ''}\n` : '') +
    (orderData.depositDeducted > 0 ? `💰 <b>Списано с депозита:</b> -${Number(orderData.depositDeducted).toLocaleString()} ${orderData.currency || ''}\n` : '') +
    `💵 <b>ИТОГО К ОПЛАТЕ:</b> <b>${Number(orderData.totalPayable || 0).toLocaleString()} ${orderData.currency || ''}</b>\n` +
    `💳 <b>Способ оплаты:</b> ${orderData.paymentMethod === 'vietqr' ? '⚡ VietQR (Napas247)' : (orderData.paymentMethod === 'cash' ? '💵 Наличными курьеру' : orderData.paymentMethod || 'Наличные')}\n` +
    `\n<i>💡 Нажмите кнопку, чтобы обновить статус приготовления и доставки:</i>`;

  const inlineKeyboard = [
    [
      { text: "✅ Принять заказ", callback_data: `ORD_ACCEPT_${orderId}` },
      { text: "🛵 Передать курьеру", callback_data: `ORD_COURIER_${orderId}` }
    ],
    [
      { text: "❌ Отклонить заказ", callback_data: `ORD_REJECT_${orderId}` }
    ]
  ];

  for (const chatId of targetChatIds) {
    await sendTelegramOrderMessage(chatId, tgCardText, inlineKeyboard);
  }
}

/**
 * Handles staff callback query for order status updates.
 */
async function handleOrderDecisionCallback(db, callbackData, reviewer) {
  let newStatus = 'new';
  let badge = 'ОБНОВЛЁН';
  let orderId = '';

  if (callbackData.startsWith('ORD_ACCEPT_')) {
    orderId = callbackData.replace('ORD_ACCEPT_', '').trim();
    newStatus = 'accepted';
    badge = '✅ ПРИНЯТ В РАБОТУ';
  } else if (callbackData.startsWith('ORD_COURIER_')) {
    orderId = callbackData.replace('ORD_COURIER_', '').trim();
    newStatus = 'in_delivery';
    badge = '🛵 ПЕРЕДАН КУРЬЕРУ';
  } else if (callbackData.startsWith('ORD_REJECT_')) {
    orderId = callbackData.replace('ORD_REJECT_', '').trim();
    newStatus = 'rejected';
    badge = '❌ ОТКЛОНЁН';
  }

  if (!orderId) return { success: false, badge };

  try {
    // 1. Try finding by document ID first
    let orderRef = db.collection('orders').doc(orderId);
    let orderSnap = await orderRef.get();

    // 2. Fallback query by orderId field if docId differs
    if (!orderSnap.exists) {
      const qSnap = await db.collection('orders').where('orderId', '==', orderId).limit(1).get();
      if (!qSnap.empty) {
        orderRef = qSnap.docs[0].ref;
        orderSnap = qSnap.docs[0];
      }
    }

    if (orderSnap.exists) {
      await orderRef.update({
        status: newStatus,
        reviewedBy: reviewer,
        reviewedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return { success: true, badge, orderData: orderSnap.data() };
    }
  } catch (err) {
    console.warn('[orderTriggers] handleOrderDecisionCallback error:', err.message);
  }

  return { success: false, badge };
}

module.exports = {
  handleNewOrderCreated,
  handleOrderDecisionCallback
};
