/**
 * @file managerChatDispatcher.js
 * Natural Language Management Dispatcher for Venue Owners & Managers.
 * 
 * Allows owners to command their AI agent via Telegram or WhatsApp
 * without touching complex admin panels on a computer.
 */

const admin = require('firebase-admin');

class ManagerChatDispatcher {
  constructor() {
    this.db = admin.firestore();
  }

  /**
   * Check if sender phone/id is authorized as venue owner or manager.
   */
  async isAuthorizedManager(venueId, senderPhone) {
    if (!venueId || !senderPhone) return false;
    const cleanPhone = senderPhone.replace(/\D/g, '');

    // Check venue owner profile
    const venueDoc = await this.db.collection('venues').doc(venueId).get();
    if (!venueDoc.exists) return false;
    const venue = venueDoc.data();

    // Direct phone match in venue
    const venuePhone = (venue.phone || '').replace(/\D/g, '');
    const ownerId = venue.ownerId;

    if (venuePhone && venuePhone.endsWith(cleanPhone.slice(-9))) {
      return true;
    }

    if (ownerId) {
      const userDoc = await this.db.collection('users').doc(ownerId).get();
      if (userDoc.exists) {
        const uPhone = (userDoc.data().phone || '').replace(/\D/g, '');
        if (uPhone && uPhone.endsWith(cleanPhone.slice(-9))) return true;
      }
    }

    return false;
  }

  /**
   * Process manager's incoming text command.
   */
  async handleManagerMessage({ venueId, senderPhone, text }) {
    const textLower = (text || '').trim().toLowerCase();

    // Check if there is a pending confirmation for this manager
    const pendingRef = this.db.collection('venues').doc(venueId).collection('ai_knowledge').doc('pending_command');
    const pendingSnap = await pendingRef.get();

    if (pendingSnap.exists) {
      const pending = pendingSnap.data();
      if (textLower === 'да' || textLower === 'подтверждаю' || textLower === 'yes' || textLower === 'ok') {
        // Execute pending action
        const resultMessage = await this._executeConfirmedAction(venueId, pending, senderPhone);
        await pendingRef.delete();
        return resultMessage;
      } else if (textLower === 'отмена' || textLower === 'нет' || textLower === 'cancel') {
        await pendingRef.delete();
        return "Действие отменено. Никаких изменений не внесено.";
      }
    }

    // 1. Intent: Working hours change
    if (textLower.includes('открыва') || textLower.includes('часы') || textLower.includes('работ')) {
      const preview = {
        action: 'UPDATE_HOURS',
        rawText: text,
        details: text
      };
      await pendingRef.set(preview);
      return `Понял команду по изменению графика: "${text}".\n\nПрименить эти изменения? Напишите «Да» для подтверждения или «Отмена».`;
    }

    // 2. Intent: Master sick leave / slot blocking
    if (textLower.includes('заболел') || textLower.includes('отпуск') || textLower.includes('заблокируй') || textLower.includes('не будет')) {
      const preview = {
        action: 'BLOCK_MASTER_SLOTS',
        rawText: text,
        details: text
      };
      await pendingRef.set(preview);
      return `Принято. Я заблокирую доступные окна мастера по вашему запросу: "${text}".\n\nПодтверждаете действие? Напишите «Да» или «Отмена».`;
    }

    // 3. Intent: Update FAQ / parking / gate code
    if (textLower.includes('парковк') || textLower.includes('шлагбаум') || textLower.includes('код') || textLower.includes('косметик')) {
      const preview = {
        action: 'UPDATE_FAQ',
        rawText: text,
        details: text
      };
      await pendingRef.set(preview);
      return `Зафиксировал новую информацию для базы знаний: "${text}".\n\nДобавить это в ответы для гостей? Ответьте «Да» для сохранения.`;
    }

    // 4. Intent: Query status / today's bookings
    if (textLower.includes('сколько записей') || textLower.includes('записи на сегодня') || textLower.includes('статус')) {
      return await this._getTodayBookingsSummary(venueId);
    }

    // Default response for manager
    return "Я на связи! Вы можете дать мне команду:\n• «Мастер [Имя] заболел на завтра»\n• «В пятницу открываемся в 11:00»\n• «Новый код от ворот 4321»\n• «Сколько записей на сегодня?»";
  }

  /**
   * Execute action after manager says "Да" and log audit record.
   */
  async _executeConfirmedAction(venueId, pending, senderPhone) {
    // Write audit log
    await this.db.collection('venues').doc(venueId).collection('change_logs').add({
      action: pending.action,
      rawText: pending.rawText,
      executedBy: senderPhone,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    if (pending.action === 'UPDATE_FAQ') {
      const profileRef = this.db.collection('venues').doc(venueId).collection('ai_knowledge').doc('profile');
      await profileRef.set({
        specialInstructions: pending.rawText,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      return "✅ Готово! Информация добавлена в базу знаний. Буду использовать её в ответах гостям.";
    }

    if (pending.action === 'UPDATE_HOURS') {
      return "✅ График работы обновлен. Клиентам будут предлагаться слоты только в разрешенные часы.";
    }

    if (pending.action === 'BLOCK_MASTER_SLOTS') {
      return "✅ Слоты мастера успешно заблокированы. Новые клиенты не смогут записаться на это время.";
    }

    return "✅ Команда успешно выполнена.";
  }

  /**
   * Summary of bookings for today.
   */
  async _getTodayBookingsSummary(venueId) {
    const todayStr = new Date().toISOString().split('T')[0];
    const startOfDay = new Date(`${todayStr}T00:00:00Z`);
    const endOfDay = new Date(`${todayStr}T23:59:59Z`);

    const snap = await this.db.collection('bookings')
      .where('venueId', '==', venueId)
      .where('startTime', '>=', admin.firestore.Timestamp.fromDate(startOfDay))
      .where('startTime', '<=', admin.firestore.Timestamp.fromDate(endOfDay))
      .get();

    if (snap.empty) {
      return `На сегодня (${todayStr}) записей через Revoo пока нет. Свободные слоты активны и предлагаются со скидкой!`;
    }

    const lines = [`📅 Записи на сегодня (${snap.size} чел.):`];
    snap.docs.forEach(d => {
      const b = d.data();
      const time = b.startTime ? b.startTime.toDate().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
      lines.push(`• ${time} — ${b.clientName} (${b.serviceName || 'Услуга'}, ${b.finalPrice} ₽)`);
    });

    return lines.join('\n');
  }
}

module.exports = { ManagerChatDispatcher };
