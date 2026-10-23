import { useState, useEffect } from 'react';

/**
 * Hook to detect whether the user opened the booking flow from inside
 * a messenger (Telegram Mini App, WhatsApp In-App Webview, Instagram Direct)
 * or from an external web source (Google Maps, organic web).
 * 
 * Supports:
 * - Telegram WebApp SDK: window.Telegram?.WebApp
 * - URL parameters: ?source=tg_mini_app | wa | ig | google_maps
 */
export function useMessengerContext() {
  const [context, setContext] = useState({
    isFromMessenger: false,
    channel: 'web', // 'telegram' | 'whatsapp' | 'instagram' | 'web'
    messengerUser: {
      id: null,
      firstName: '',
      lastName: '',
      username: '',
      phone: ''
    },
    isReady: false
  });

  useEffect(() => {
    try {
      const searchParams = typeof window !== 'undefined' 
        ? new URLSearchParams(window.location.search) 
        : new URLSearchParams();

      const sourceParam = searchParams.get('source') || searchParams.get('utm_source') || '';
      const channelParam = searchParams.get('channel') || '';
      const tgUserParam = searchParams.get('tg_name') || searchParams.get('client_name') || '';
      const phoneParam = searchParams.get('phone') || searchParams.get('client_phone') || '';

      // Check Telegram Mini App presence
      const tgWebApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
      const isTelegramSDK = Boolean(tgWebApp?.initData && tgWebApp.initData.length > 0);
      const isTelegramParam = sourceParam === 'tg_mini_app' || channelParam === 'telegram';
      const isWhatsApp = sourceParam === 'wa' || channelParam === 'whatsapp';
      const isInstagram = sourceParam === 'ig' || channelParam === 'instagram';

      let channel = 'web';
      let isFromMessenger = false;
      let userData = {
        id: null,
        firstName: '',
        lastName: '',
        username: '',
        phone: phoneParam
      };

      if (isTelegramSDK || isTelegramParam) {
        channel = 'telegram';
        isFromMessenger = true;

        if (tgWebApp?.initDataUnsafe?.user) {
          const u = tgWebApp.initDataUnsafe.user;
          userData.id = u.id ? String(u.id) : null;
          userData.firstName = u.first_name || '';
          userData.lastName = u.last_name || '';
          userData.username = u.username ? `@${u.username}` : '';
        } else if (tgUserParam) {
          userData.firstName = tgUserParam;
        }

        // Notify Telegram WebApp that app is ready & expand to full height
        if (tgWebApp?.ready) tgWebApp.ready();
        if (tgWebApp?.expand) tgWebApp.expand();

      } else if (isWhatsApp) {
        channel = 'whatsapp';
        isFromMessenger = true;
        if (tgUserParam) userData.firstName = tgUserParam;
      } else if (isInstagram) {
        channel = 'instagram';
        isFromMessenger = true;
        if (tgUserParam) userData.firstName = tgUserParam;
      }

      setContext({
        isFromMessenger,
        channel,
        messengerUser: userData,
        isReady: true
      });
    } catch (e) {
      console.warn('Error detecting messenger context:', e);
      setContext(prev => ({ ...prev, isReady: true }));
    }
  }, []);

  const closeMessengerView = () => {
    if (typeof window === 'undefined') return;

    try {
      const tgWebApp = window.Telegram?.WebApp;
      if (tgWebApp && typeof tgWebApp.close === 'function') {
        tgWebApp.close();
        return;
      }
      if (typeof window.close === 'function') {
        window.close();
      }
    } catch (err) {
      console.warn('Could not close window automatically:', err);
    }
  };

  /**
   * Generates a deep link for unauthenticated web visitors
   * to transfer their booking confirmation to Telegram or WhatsApp.
   */
  const getMessengerDeepLink = (targetChannel, bookingId, venue) => {
    const venueBot = venue?.telegramBotUsername || 'RevooFleetBot';
    const cleanId = String(bookingId || '').replace(/[^a-zA-Z0-9_]/g, '');

    if (targetChannel === 'telegram') {
      return `https://t.me/${venueBot}?start=bk_${cleanId}`;
    }

    if (targetChannel === 'whatsapp') {
      const phone = venue?.whatsappPhone || venue?.phone || '';
      const text = encodeURIComponent(`Здравствуйте! Мой номер бронирования: #${cleanId}. Прошу подтвердить детали поездки.`);
      return phone ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${text}` : `https://wa.me/?text=${text}`;
    }

    return null;
  };

  return {
    ...context,
    closeMessengerView,
    getMessengerDeepLink
  };
}
