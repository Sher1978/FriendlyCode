/**
 * @file reviewFlywheel.js
 * Review Flywheel Engine for Google Maps Local SEO Growth.
 * 
 * Automatically prompts guests 45 minutes after completed appointment:
 * - 5/5 stars -> Prompts to publish on Google Maps with bonus incentive.
 * - 1-3 stars -> Intercepts privately to the salon manager before it hits public maps.
 */

const admin = require('firebase-admin');

class ReviewFlywheelManager {
  constructor(db = null) {
    this.db = db || (admin.apps && admin.apps.length > 0 ? admin.firestore() : null);
  }

  /**
   * Process a client's rating response (1 to 5).
   * @param {Object} params
   * @param {string} params.venueId
   * @param {string} params.clientPhone
   * @param {number} params.rating - 1 to 5
   * @param {string} [params.comment='']
   */
  async handleGuestRating({ venueId, clientPhone, rating, comment = '' }) {
    const venueDoc = await this.db.collection('venues').doc(venueId).get();
    const venue = venueDoc.exists ? venueDoc.data() : {};
    const venueName = venue.name || 'Наш салон';
    const address = venue.address || '';

    const googleReviewUrl = venue.googleReviewUrl || 
      `https://search.google.com/local/writereview?placeid=${venue.placeId || ''}` ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venueName} ${address}`)}`;

    // Store feedback record
    await this.db.collection('complaints').add({
      venueId,
      clientPhone,
      rating: Number(rating),
      comment: comment.trim(),
      source: 'whatsapp_review_flywheel',
      isPublicGoogle: rating >= 4,
      createdAt: (admin.apps && admin.apps.length > 0) ? admin.firestore.FieldValue.serverTimestamp() : new Date()
    });

    // 1. Positive Review: 5 stars (or 4) -> Route to Google Maps!
    if (rating >= 4) {
      return {
        isPositive: true,
        replyText: `Огромное спасибо за высокую оценку! ⭐️\n\nДля нашей команды мастеров это лучшая награда. Пожалуйста, поделитесь вашим отзывом на Google Картах по ссылке ниже — это займет всего 20 секунд, а на ваш следующий визит мы закрепим скидку постоянного гостя:\n\n👉 ${googleReviewUrl}`
      };
    }

    // 2. Negative or Neutral Review: 1 to 3 stars -> Private Interception Shield!
    // Alert the venue manager immediately in Telegram/Notifications
    await this._alertManagerAboutNegativeFeedback(venueId, clientPhone, rating, comment);

    return {
      isPositive: false,
      replyText: `Нам очень жаль, что сервис не оправдал ваших ожиданий на все 100%. Мы искренне приносим извинения.\n\nВаш отзыв уже передан напрямую управляющему заведения. Мы свяжемся с вами в течение 15 минут, чтобы исправить ситуацию и компенсировать неудобства.`
    };
  }

  /**
   * Alert manager privately so negative feedback never goes to Google Maps.
   */
  async _alertManagerAboutNegativeFeedback(venueId, clientPhone, rating, comment) {
    try {
      const alertDoc = {
        venueId,
        title: `⚠️ Отрицательная оценка (${rating}/5)`,
        message: `Клиент ${clientPhone} поставил ${rating}/5 звезд. Комментарий: "${comment || 'Без комментария'}". Пожалуйста, свяжитесь с гостем.`,
        read: false,
        type: 'negative_feedback_alert',
        timestamp: (admin.apps && admin.apps.length > 0) ? admin.firestore.FieldValue.serverTimestamp() : new Date()
      };

      await this.db.collection('notifications').add(alertDoc);
      console.log(`[ReviewFlywheel] Intercepted negative rating (${rating}/5) for venue ${venueId}`);
    } catch (err) {
      console.error('[ReviewFlywheel] Failed to send manager alert:', err);
    }
  }
}

module.exports = { ReviewFlywheelManager };
