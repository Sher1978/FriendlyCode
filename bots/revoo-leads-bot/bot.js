const TelegramBot = require('node-telegram-bot-api');
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const { parseGooglePlace } = require('./google_maps_parser');
const { syncLeadToSupabase } = require('./supabase_sync');

const WELCOME_BANNER_PATH = path.join(__dirname, 'assets', 'revoo_giftx_banner.jpg');
const WELCOME_BANNER_URL = 'https://bot-lab-21910.web.app/revoo_giftx_banner.jpg';

function extractUserInputValue(text, currentFallback) {
  if (!text) return currentFallback || '';
  if (text.startsWith('✅ Оставить') || text.startsWith('✅ Использовать')) {
    if (text.includes(':')) {
      const extracted = text.substring(text.indexOf(':') + 1).trim().replace(/^["«']|["»']$/g, '');
      return extracted || currentFallback || '';
    }
    return currentFallback || '';
  }
  return text.trim();
}

// ─── FIREBASE ADMIN INIT ───────────────────────────────────────────────────
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: 'bot-lab-21910',
    });
    console.log('🔥 Firebase Admin initialized in Bot');
  }
} catch (err) {
  console.warn('⚠️ Firebase Admin init error:', err.message);
}

const db = admin.apps.length ? admin.firestore() : null;

const BOT_TOKEN = '8750420325:AAHThiUpAMViiQuCUC5pYxr3RIgUswLLkBE';
const ADMIN_USERNAME = 'sherlockdxb';

const ADMIN_CHAT_IDS = new Set([260669598]);
const ADMIN_USERNAMES = new Set(['sherlockdxb']);

function isUserAdmin(chatId, username) {
  if (ADMIN_CHAT_IDS.has(chatId)) return true;
  if (username && ADMIN_USERNAMES.has(username.toLowerCase())) {
    ADMIN_CHAT_IDS.add(chatId);
    return true;
  }
  return false;
}

const DEMO_WEB_APP_URL = 'https://bot-lab-21910.web.app/hybrid-v2?id=demo';

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ─── UNIVERSAL PERSISTENT BOTTOM MENUS ──────────────────────────────────────
const MAIN_MENU = {
  reply_markup: {
    keyboard: [
      [
        { text: '🎮 ДЕМО', web_app: { url: DEMO_WEB_APP_URL } },
        { text: '🚀 ДОБАВИТЬ' },
      ],
      [
        { text: 'ℹ️ О продуктах' },
        { text: '📞 Связаться с менеджером' },
      ],
      [
        { text: '❓ Помощь / FAQ' },
      ],
    ],
    resize_keyboard: true,
    persistent: true,
  },
};

const ADMIN_MENU = {
  reply_markup: {
    keyboard: [
      [
        { text: '🎮 ДЕМО', web_app: { url: DEMO_WEB_APP_URL } },
        { text: '🚀 ДОБАВИТЬ' },
      ],
      [
        { text: '📋 Заявки на модерацию' },
        { text: '📊 Статистика' },
      ],
      [
        { text: '👥 Управление ролями' },
        { text: 'ℹ️ О продуктах' },
      ],
    ],
    resize_keyboard: true,
    persistent: true,
  },
};

function sendWelcomeMessage(chatId, text, fromUser = null) {
  const isAdm = isUserAdmin(chatId, fromUser ? fromUser.username : null);
  const menu = isAdm ? ADMIN_MENU : MAIN_MENU;

  bot.setChatMenuButton({
    chat_id: chatId,
    menu_button: JSON.stringify({
      type: 'web_app',
      text: '🎮 ДЕМО',
      web_app: { url: DEMO_WEB_APP_URL }
    })
  }).catch((err) => console.warn('setChatMenuButton notice:', err.message));

  const photoSource = fs.existsSync(WELCOME_BANNER_PATH)
    ? WELCOME_BANNER_PATH
    : WELCOME_BANNER_URL;

  return bot.sendPhoto(chatId, photoSource, {
    caption: text,
    parse_mode: 'Markdown',
    ...menu,
  }).catch((err) => {
    console.warn('sendPhoto local banner failed, attempting URL or text fallback:', err.message);
    return bot.sendPhoto(chatId, WELCOME_BANNER_URL, {
      caption: text,
      parse_mode: 'Markdown',
      ...menu,
    }).catch((err2) => {
      console.warn('sendPhoto fallback failed, sending text:', err2.message);
      return bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...menu });
    });
  });
}

function sendMainMenu(chatId, text, fromUser = null) {
  const isAdm = isUserAdmin(chatId, fromUser ? fromUser.username : null);
  const menu = isAdm ? ADMIN_MENU : MAIN_MENU;

  bot.setChatMenuButton({
    chat_id: chatId,
    menu_button: JSON.stringify({
      type: 'web_app',
      text: '🎮 ДЕМО',
      web_app: { url: DEMO_WEB_APP_URL }
    })
  }).catch((err) => console.warn('setChatMenuButton notice:', err.message));

  return bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...menu });
}

// ─── DEDUPLICATION HELPER ──────────────────────────────────────────────────
async function findExistingVenue(venueName, city, phone) {
  if (!db) return null;
  try {
    const normName = (venueName || '').trim().toLowerCase();
    const normCity = (city || '').trim().toLowerCase();
    const normPhone = (phone || '').trim().replace(/[^\d+]/g, '');

    const snap = await db.collection('venues').limit(100).get();
    let matched = null;

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const exName = (data.name || '').trim().toLowerCase();
      const exCity = (data.city || '').trim().toLowerCase();
      const exPhone = (data.phone || '').trim().replace(/[^\d+]/g, '');

      if (
        (normName && exName && normName === exName && normCity === exCity) ||
        (normPhone && exPhone && normPhone.length > 5 && normPhone === exPhone)
      ) {
        matched = { id: docSnap.id, data };
      }
    });

    return matched;
  } catch (e) {
    console.warn('⚠️ Deduplication search error:', e.message);
    return null;
  }
}

// ─── STATE MACHINE & MODERATION STORES ─────────────────────────────────────
const sessions = {};
const pendingLeads = {};
const adminState = {};
const userClarificationState = {};

function newSession() {
  return {
    stage: 'revoo',
    step: 'revoo_maps_url_initial',
    isMerged: false,
    existingVenueId: null,
    matchedVenue: null,
    googleData: null,
    revooData: {
      venue_name: null,
      niche: null,
      city: null,
      address: null,
      maps_url: null,
      contact_name: null,
      user_role: null, // Role: Owner, Manager, Staff
      phone: null,
      rates: '5% Базовый ➔ 10% Средний ➔ 15% Макс', // Regular discount tiers
      deposit: null, // Deposit amount for VIP discount lock
      time_limit: null, // Retention / expiration period
    },
    giftxData: {
      same_as_revoo: true,
      venue_name: null,
      niche: null,
      city: null,
      address: null,
      maps_url: null,
      silver_gift: null, // 🥈 Silver Gift
      gold_gift: null,   // 🥇 Gold Gift
      platinum_gift: null, // 💎 Platinum Gift
    },
  };
}

// ─── STEP PROMPTS & KEYBOARDS ──────────────────────────────────────────────
async function askCurrentStep(chatId, session) {
  const step = session.step;

  // 0. INITIAL GOOGLE MAPS / BUSINESS LINK
  if (step === 'revoo_maps_url_initial') {
    bot.sendMessage(
      chatId,
      `🌐 *ШАГ 1: Ссылка на заведение в Google Maps*\n\n` +
      `Отправьте ссылку на профиль вашего заведения в *Google Maps* (или 2ГИС / Яндекс Карты).\n\n` +
      `🤖 *Мы автоматически загрузим:* название, нишу, адрес, город, рейтинг, отзывы и часы работы!\n\n` +
      `_Пример:_ \`https://maps.app.goo.gl/...\` или \`https://www.google.com/maps/place/...\`\n\n` +
      `Если ссылки нет под рукой, нажмите *⏩ Пропустить* для ручного ввода:`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [[{ text: '⏩ Пропустить' }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
  }
  // GOOGLE PREVIEW & QUICK CONFIRMATION
  else if (step === 'google_preview_confirm') {
    const r = session.revooData;
    const g = session.googleData || {};
    const ratingLine = g.rating ? `⭐ *Рейтинг и отзывы:* ${g.rating} (${g.reviewsCount || 'отзывы'})\n` : '';
    const hoursLine = g.workingHours ? `🕒 *Часы работы:* ${g.workingHours}\n` : '';
    const phoneLine = r.phone ? `📞 *Телефон:* ${r.phone}\n` : '';

    bot.sendMessage(
      chatId,
      `🎉 *Данные заведения успешно найдены на картах!*\n\n` +
      `🏠 *Название:* ${r.venue_name || '—'}\n` +
      `🍽 *Ниша / Категория:* ${r.niche || '—'}\n` +
      `🌆 *Город:* ${r.city || '—'}\n` +
      `📍 *Адрес:* ${r.address || '—'}\n` +
      ratingLine +
      hoursLine +
      phoneLine +
      `\n` +
      `Вы можете продолжить с этими данными или отредактировать их по шагам:`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [
            [{ text: '✅ Всё верно, продолжить' }],
            [{ text: '✏️ Отредактировать данные' }],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
  }
  // 1. REVOO STAGE
  else if (step === 'revoo_venue_name') {
    const curVal = session.revooData.venue_name;
    const hint = curVal ? `\n\n_Текущее найденное название:_ *${curVal}*` : '';
    const keyboard = curVal ? [[{ text: `✅ Оставить: ${curVal}` }]] : undefined;

    bot.sendMessage(
      chatId,
      `🟢 *ЭТАП 1: Настройка Revoo (Программа лояльности)*\n\n` +
      `🏠 *Название заведения:*\n` +
      `Укажите название вашего кафе, ресторана или заведения:` +
      hint,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard
          ? { keyboard, resize_keyboard: true, one_time_keyboard: true }
          : { remove_keyboard: true },
      }
    );
  } else if (step === 'revoo_niche') {
    const curVal = session.revooData.niche;
    const hint = curVal ? `\n\n_Текущая определенная ниша:_ *${curVal}*` : '';
    const defaultButtons = [
      [{ text: '☕ Кафе / Кофейня' }, { text: '🍽 Ресторан' }],
      [{ text: '🍺 Бар / Паб' }, { text: '🍕 Фастфуд / Пиццерия' }],
      [{ text: '💆 Салон красоты / Спа' }, { text: '🏋 Фитнес / Спорт' }],
      [{ text: '🛒 Ритейл / Магазин' }],
    ];
    const keyboard = curVal
      ? [[{ text: `✅ Оставить: ${curVal}` }], ...defaultButtons]
      : defaultButtons;

    bot.sendMessage(
      chatId,
      `🍽 *Тип бизнеса / Ниша:*\n` +
      `Выберите подходящую категорию из кнопок ниже или введите свой вариант:` +
      hint,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard,
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
  } else if (step === 'revoo_city') {
    const curVal = session.revooData.city;
    const hint = curVal ? `\n\n_Текущий определенный город:_ *${curVal}*` : '';
    const keyboard = curVal ? [[{ text: `✅ Оставить: ${curVal}` }]] : undefined;

    bot.sendMessage(
      chatId,
      `🌆 *Город:*\n` +
      `В каком городе находится ваше заведение? (Например: *Дананг*, *Дубай*, *Москва*, *Алматы*):` +
      hint,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard
          ? { keyboard, resize_keyboard: true, one_time_keyboard: true }
          : { remove_keyboard: true },
      }
    );
  }
  // DUPLICATE CHECK PROMPT
  else if (step === 'revoo_duplicate_detected') {
    const ex = session.matchedVenue.data;
    bot.sendMessage(
      chatId,
      `⚠️ *Обнаружено похожее заведение в системе!*\n\n` +
      `• *Название:* ${ex.name || '—'}\n` +
      `• *Город:* ${ex.city || '—'}\n` +
      `• *Адрес:* ${ex.address || '—'}\n` +
      `• *Телефон:* ${ex.phone || '—'}\n\n` +
      `Вы хотите объединить новые данные с существующим заведением или изменить введенное название?`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [
            [{ text: '🔗 Объединить с существующим заведением' }],
            [{ text: '✏️ Ввести другое название заведения' }],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
  } else if (step === 'revoo_address') {
    const curVal = session.revooData.address;
    const hint = curVal ? `\n\n_Текущий найденный адрес:_ *${curVal}*` : '';
    const keyboard = curVal
      ? [[{ text: `✅ Оставить: ${curVal}` }], [{ text: '⏩ Пропустить' }]]
      : [[{ text: '⏩ Пропустить' }]];

    bot.sendMessage(
      chatId,
      `📍 *Адрес заведения:*\n` +
      `Укажите точный адрес или нажмите *⏩ Пропустить*:` +
      hint,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard,
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
  } else if (step === 'revoo_maps_url') {
    const curVal = session.revooData.maps_url;
    const hint = curVal ? `\n\n_Текущая ссылка:_ *${curVal}*` : '';
    const keyboard = curVal
      ? [[{ text: `✅ Оставить ссылку` }], [{ text: '⏩ Пропустить' }]]
      : [[{ text: '⏩ Пропустить' }]];

    bot.sendMessage(
      chatId,
      `🌐 *Ссылка на Google Maps / 2ГИС / Яндекс Карты:*\n` +
      `Вставьте ссылку на профиль заведения на картах или нажмите *⏩ Пропустить*:` +
      hint,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard,
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
  } else if (step === 'revoo_contact_name') {
    bot.sendMessage(
      chatId,
      `👤 *Контактное лицо:*\n` +
      `Как вас зовут (имя и фамилия)?`,
      { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
    );
  } else if (step === 'revoo_user_role') {
    bot.sendMessage(
      chatId,
      `💼 *Ваша роль в заведении:*\n` +
      `Выберите ваш статус из кнопок ниже:`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [
            [{ text: '👑 Собственник / Владелец' }, { text: '👔 Менеджер / Управляющий' }],
            [{ text: '💼 Стафф / Персонал' }],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
  } else if (step === 'revoo_phone') {
    const curVal = session.revooData.phone;
    const hint = curVal ? `\n\n_Текущий найденный телефон:_ *${curVal}*` : '';
    const keyboard = curVal ? [[{ text: `✅ Оставить: ${curVal}` }]] : undefined;

    bot.sendMessage(
      chatId,
      `📞 *Телефон или Telegram handle:*\n` +
      `Укажите номер телефона или ваш @username для связи:` +
      hint,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard
          ? { keyboard, resize_keyboard: true, one_time_keyboard: true }
          : { remove_keyboard: true },
      }
    );
  } else if (step === 'revoo_rates') {
    bot.sendMessage(
      chatId,
      `📊 *Регулярные скидки Revoo (Базовый ➔ Средний ➔ Макс):*\n\n` +
      `Выберите готовый вариант процентов или введите свой (например: *5% ➔ 10% ➔ 15%*):`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [
            [{ text: '5% Базовый ➔ 10% Средний ➔ 15% Макс' }],
            [{ text: '10% Базовый ➔ 15% Средний ➔ 20% Макс' }],
            [{ text: '5% Базовый ➔ 15% Средний ➔ 25% Макс' }],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
  } else if (step === 'revoo_deposit') {
    bot.sendMessage(
      chatId,
      `💳 *Сумма депозита для фиксации VIP скидки (если есть):*\n\n` +
      `Укажите сумму депозита или нажмите *⏩ Пропустить (без депозита)*:`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [
            [{ text: '500 000 VND (~$20)' }, { text: '1 000 000 VND (~$40)' }],
            [{ text: '2 000 000 VND (~$80)' }],
            [{ text: '⏩ Пропустить (без депозита)' }],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
  } else if (step === 'revoo_time_limit') {
    bot.sendMessage(
      chatId,
      `⏱ *Временной интервал сгорания скидки / повторного визита:*\n\n` +
      `Через сколько дней без визитов уровень/скидка сгорает?`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [
            [{ text: '7 дней' }, { text: '14 дней' }],
            [{ text: '30 дней' }, { text: '90 дней' }],
            [{ text: '⏩ Пропустить (без ограничения)' }],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
  }
  // 2. GIFTX CONFIRMATION STAGE
  else if (step === 'giftx_confirm_data') {
    const r = session.revooData;
    bot.sendMessage(
      chatId,
      `✅ *Этап 1 (Revoo) завершён!*\n\n` +
      `🎁 *ЭТАП 2: Настройка GiftX (3 Уровня подарков)*\n\n` +
      `Использовать общие данные заведения из Revoo?\n\n` +
      `• *Название:* ${r.venue_name}\n` +
      `• *Ниша:* ${r.niche}\n` +
      `• *Город:* ${r.city}\n` +
      `• *Адрес:* ${r.address || '—'}\n` +
      `• *Карты:* ${r.maps_url || '—'}`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [
            [{ text: '✅ Да, использовать данные Revoo' }],
            [{ text: '✏️ Ввести другие данные для GiftX' }],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
  }
  // 3. GIFTX FULL STEPS
  else if (step === 'giftx_venue_name') {
    bot.sendMessage(
      chatId,
      `🎁 *GiftX — Название заведения:*\n` +
      `Введите название для каталога GiftX:`,
      { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
    );
  } else if (step === 'giftx_niche') {
    bot.sendMessage(
      chatId,
      `🎁 *GiftX — Ниша заведения:*\n` +
      `Укажите нишу или категорию бизнеса для GiftX:`,
      { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
    );
  } else if (step === 'giftx_city') {
    bot.sendMessage(
      chatId,
      `🎁 *GiftX — Город:*\n` +
      `Укажите город:`,
      { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
    );
  } else if (step === 'giftx_address') {
    bot.sendMessage(
      chatId,
      `🎁 *GiftX — Адрес:*\n` +
      `Укажите адрес или нажмите *⏩ Пропустить*:`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [[{ text: '⏩ Пропустить' }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
  } else if (step === 'giftx_maps_url') {
    bot.sendMessage(
      chatId,
      `🎁 *GiftX — Ссылка на карты:*\n` +
      `Укажите ссылку или нажмите *⏩ Пропустить*:`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [[{ text: '⏩ Пропустить' }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
  }
  // 4. GIFTX 3-TIER OFFERS SETTINGS
  else if (step === 'giftx_silver') {
    bot.sendMessage(
      chatId,
      `🥈 *GiftX — 1. Серебряный подарок (для всех новых гостей):*\n\n` +
      `Выберите вариант, введите свой или нажмите *⏩ Пропустить*:`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [
            [{ text: '☕ Бесплатный кофе / напиток' }, { text: '🍰 Десерт в подарок' }],
            [{ text: '🏷 Скидка 10% на чек' }],
            [{ text: '⏩ Пропустить (без серебряного подарка)' }],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
  } else if (step === 'giftx_gold') {
    bot.sendMessage(
      chatId,
      `🥇 *GiftX — 2. Золотой подарок (при чеке или 2-м визите):*\n\n` +
      `Выберите вариант, введите свой или нажмите *⏩ Пропустить*:`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [
            [{ text: '🍸 Фирменный коктейль' }, { text: '🍕 Закуска / Пицца в подарок' }],
            [{ text: '🏷 Скидка 20% на чек' }],
            [{ text: '⏩ Пропустить (без золотого подарка)' }],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
  } else if (step === 'giftx_platinum') {
    bot.sendMessage(
      chatId,
      `💎 *GiftX — 3. Платиновый подарок (за VIP / депозит / 5 визитов):*\n\n` +
      `Выберите вариант, введите свой или нажмите *⏩ Пропустить*:`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [
            [{ text: '🍾 Бутылка вина / Шампанское' }, { text: '🥩 Сертификат на 500k VND ($20)' }],
            [{ text: '👑 VIP обслуживание' }],
            [{ text: '⏩ Пропустить (без платинового подарка)' }],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
  } else if (step === 'confirm') {
    sendSummaryAndConfirm(chatId, session);
  }
}

// ─── SUMMARY BUILDER ───────────────────────────────────────────────────────
function buildFullMarkdownSummary(session) {
  const r = session.revooData;
  const g = session.giftxData;
  const google = session.googleData;
  const isMergedStr = session.isMerged ? ` *(Объединено с ID: \`${session.existingVenueId}\`)*` : '';

  const googleSection = google && (google.rating || google.workingHours || google.reviewsCount)
    ? `⭐ *GOOGLE MAPS ДАННЫЕ*\n` +
      (google.rating ? `• *Рейтинг:* ${google.rating} (${google.reviewsCount || 'отзывы'})\n` : '') +
      (google.workingHours ? `• *Часы работы:* ${google.workingHours}\n` : '') +
      `\n`
    : '';

  return (
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📋 *ЗАЯВКА НА ПОДКЛЮЧЕНИЕ REVOO + GIFTX*${isMergedStr}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `👤 *КОНТАКТНЫЕ ДАННЫЕ*\n` +
    `• *Имя:* ${r.contact_name || '—'}\n` +
    `• *Роль в заведении:* ${r.user_role || '—'}\n` +
    `• *Телефон/Связь:* ${r.phone || '—'}\n\n` +
    googleSection +
    `🟢 *ПЛАТФОРМА 1: REVOO (Лояльность)*\n` +
    `• *Название:* ${r.venue_name}\n` +
    `• *Ниша:* ${r.niche}\n` +
    `• *Город:* ${r.city}\n` +
    `• *Адрес:* ${r.address || '—'}\n` +
    `• *Карты:* ${r.maps_url || '—'}\n` +
    `• *Проценты скидки:* ${r.rates || '5% ➔ 10% ➔ 15%'}\n` +
    `• *Депозит для VIP скидки:* ${r.deposit || '— (не задан)'}\n` +
    `• *Период сгорания скидки:* ${r.time_limit || '— (без ограничений)'}\n\n` +
    `🎁 *ПЛАТФОРМА 2: GIFTX (3 уровня подарков)*\n` +
    `• *Название в GiftX:* ${g.venue_name || r.venue_name}\n` +
    `• *Город/Адрес:* ${g.city || r.city}, ${g.address || r.address || '—'}\n` +
    `• *🥈 Серебряный подарок:* ${g.silver_gift || '— (пропущено)'}\n` +
    `• *🥇 Золотой подарок:* ${g.gold_gift || '— (пропущено)'}\n` +
    `• *💎 Платиновый подарок:* ${g.platinum_gift || '— (пропущено)'}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
  );
}

function sendSummaryAndConfirm(chatId, session) {
  const summary = buildFullMarkdownSummary(session);
  bot.sendMessage(
    chatId,
    `*Проверьте данные вашей двухплатформенной заявки:*\n\n${summary}\n\nВсё верно?`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        keyboard: [
          [{ text: '✅ Подтвердить и отправить заявку' }],
          [{ text: '✏️ Начать онбординг заново' }],
          [{ text: '❌ Отмена' }],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    }
  );
}

// ─── SAVE TO DB & EXPORT FOR GIFTX (DRAFT / MODERATION FLOW) ────────────────
async function saveOnboardingToDatabaseAndExport(session, fromUser) {
  const r = session.revooData;
  const g = session.giftxData;
  const summaryMd = buildFullMarkdownSummary(session);

  const userInfo = fromUser.username
    ? `@${fromUser.username}`
    : `${fromUser.first_name || ''} ${fromUser.last_name || ''}`.trim();

  const leadId = `lead_${Date.now()}`;
  const venueId = session.isMerged && session.existingVenueId
    ? session.existingVenueId
    : `venue_${Date.now()}`;

  const payload = {
    leadId,
    venueId,
    status: 'pending_approval',
    isMerged: session.isMerged,
    googlePlace: session.googleData || null,
    createdAt: new Date().toISOString(),
    user: {
      id: fromUser.id,
      username: fromUser.username || null,
      fullName: `${fromUser.first_name || ''} ${fromUser.last_name || ''}`.trim(),
    },
    revoo: {
      name: r.venue_name,
      niche: r.niche,
      city: r.city,
      address: r.address || '',
      mapsUrl: r.maps_url || '',
      contactName: r.contact_name,
      userRole: r.user_role || '',
      phone: r.phone,
      rates: r.rates || '',
      deposit: r.deposit || '',
      timeLimit: r.time_limit || '',
    },
    giftx: {
      name: g.venue_name || r.venue_name,
      niche: g.niche || r.niche,
      city: g.city || r.city,
      address: g.address || r.address || '',
      mapsUrl: g.maps_url || r.maps_url || '',
      silverGift: g.silver_gift || '',
      goldGift: g.gold_gift || '',
      platinumGift: g.platinum_gift || '',
    },
    exportMarkdown: summaryMd,
  };

  pendingLeads[leadId] = payload;

  // Save Draft Lead in Firestore
  if (db) {
    try {
      await db.collection('leads').doc(leadId).set({
        ...payload,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`✅ Draft lead saved in Firestore: ${leadId}`);
    } catch (e) {
      console.error('❌ Firestore lead save error:', e.message);
    }
  }

  // Send Inline Moderation Keyboard to Admin
  const adminMarkup = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Одобрить и активировать', callback_data: `approve_${leadId}` },
        ],
        [
          { text: '💬 Уточнить данные', callback_data: `clarify_${leadId}` },
          { text: '❌ Отклонить', callback_data: `reject_${leadId}` },
        ],
      ],
    },
  };

  if (ADMIN_CHAT_IDS.size > 0) {
    for (const admId of ADMIN_CHAT_IDS) {
      try {
        await bot.sendMessage(
          admId,
          `🔔 *НОВАЯ ЗАЯВКА НА МОДЕРАЦИЮ*\n\n${summaryMd}\n\n👤 *От:* ${userInfo} (Telegram ID: \`${fromUser.id}\`)\n🆔 *ID Заявки:* \`${leadId}\``,
          { parse_mode: 'Markdown', ...adminMarkup }
        );
      } catch (e) {
        console.error('Admin notification error:', e.message);
      }
    }
  } else {
    console.log('⚠️ No ADMIN_CHAT_IDS registered yet. Pending lead:', leadId);
  }

  return leadId;
}

// ─── ADMIN ACTIONS HANDLERS (APPROVE / REJECT / CLARIFY) ─────────────────────
async function approveLead(leadId, adminChatId) {
  const lead = pendingLeads[leadId] || (db ? (await db.collection('leads').doc(leadId).get()).data() : null);
  if (!lead) return false;

  const { venueId, revoo, giftx, user, exportMarkdown, googlePlace } = lead;

  if (db) {
    try {
      await db.collection('venues').doc(venueId).set(
        {
          name: revoo.name,
          niche: revoo.niche,
          city: revoo.city,
          address: revoo.address || '',
          mapsUrl: revoo.mapsUrl || '',
          contactName: revoo.contactName,
          phone: revoo.phone,
          status: 'active',
          googlePlace: googlePlace || null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          source: 'telegram_bot_dual_onboarding',
          giftxOffer: {
            title: giftx.silverGift || '',
            condition: '',
          },
        },
        { merge: true }
      );

      await db.collection('leads').doc(leadId).set(
        { status: 'approved', approvedAt: admin.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      );

      await db.collection('giftx_exports').doc(venueId).set({
        ...giftx,
        revooVenueId: venueId,
        contactPhone: revoo.phone,
        contactName: revoo.contactName,
        telegramUser: user.username ? `@${user.username}` : user.fullName,
        markdownExport: exportMarkdown,
        exportedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`✅ Approved and activated venue in Firestore: ${venueId}`);

      // ─── SUPABASE POSTGRESQL SYNC (GIFTX DATABASE) ───
      try {
        const syncRes = await syncLeadToSupabase({
          leadId: venueId,
          venueId: venueId,
          revoo,
          giftx: {
            name: giftx.name || revoo.name,
            niche: giftx.niche || revoo.niche,
            city: giftx.city || revoo.city,
            address: giftx.address || revoo.address,
            maps_url: giftx.mapsUrl || revoo.mapsUrl,
            offers: {
              silver: giftx.silverGift,
              gold: giftx.goldGift,
              platinum: giftx.platinumGift,
            },
          },
          google: googlePlace,
          contact: {
            name: revoo.contactName,
            phone: revoo.phone,
            role: revoo.userRole,
          },
          telegramUser: user,
        });

        if (syncRes && syncRes.giftxUrl) {
          await db.collection('venues').doc(venueId).set(
            { giftxUrl: syncRes.giftxUrl, isHybridEnabled: true },
            { merge: true }
          );
        }
      } catch (syncErr) {
        console.warn('⚠️ Supabase sync warning:', syncErr.message);
      }
    } catch (e) {
      console.error('❌ Firestore approve error:', e.message);
    }
  }

  delete pendingLeads[leadId];

  const baseUrl = process.env.PUBLIC_URL || 'https://www.friendlycode.fun';
  const venueUrl = `${baseUrl}/test?id=${venueId}`;
  const adminUrl = `${baseUrl}/admin/#/venues`;
  const guestDashboardUrl = `${baseUrl}/guest-dashboard`;

  try {
    await bot.sendMessage(
      adminChatId,
      `✅ *ЗАЯВКА ОДОБРЕНА И АКТИВИРОВАНА*\n\nЗаведение *"${revoo.name}"* (\`${venueId}\`) успешно зарегистрировано и активировано в Revoo & GiftX.`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🌐 Страница заведения', url: venueUrl }],
            [{ text: '📊 Панель управления (Admin)', url: adminUrl }]
          ]
        }
      }
    );
  } catch (e) {
    console.error('Admin notify error:', e.message);
  }

  try {
    await bot.sendMessage(
      user.id,
      `🎉 *Ваша заявка одобрена!*\n\n` +
      `Заведение *"${revoo.name}"* успешно зарегистрировано и активировано в системе *Revoo & GiftX*.\n\n` +
      `Нажмите кнопку ниже для перехода к странице заведения или в личный кабинет:`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '⭐ Открыть страницу заведения', url: venueUrl }],
            [{ text: '📱 Личный кабинет', url: guestDashboardUrl }]
          ]
        }
      }
    );
  } catch (e) {
    console.error('User notify error:', e.message);
  }

  return true;
}

async function rejectLead(leadId, adminChatId) {
  const lead = pendingLeads[leadId] || (db ? (await db.collection('leads').doc(leadId).get()).data() : null);
  if (!lead) return false;

  if (db) {
    try {
      await db.collection('leads').doc(leadId).set(
        { status: 'rejected', rejectedAt: admin.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      );
    } catch (e) {
      console.error('❌ Firestore reject error:', e.message);
    }
  }

  delete pendingLeads[leadId];

  try {
    await bot.sendMessage(
      adminChatId,
      `❌ *ЗАЯВКА ОТКЛОНЕНА*\n\nЗаявка на заведение *"${lead.revoo.name}"* была отклонена.`,
      { parse_mode: 'Markdown' }
    );
  } catch (e) {}

  try {
    await bot.sendMessage(
      lead.user.id,
      `❌ *Информация по заявке*\n\n` +
      `К сожалению, ваша заявка на регистрацию заведения *"${lead.revoo.name}"* не была одобрена.\n\n` +
      `Если у вас есть вопросы, вы можете связаться с менеджером: @${ADMIN_USERNAME}`,
      { parse_mode: 'Markdown' }
    );
  } catch (e) {}

  return true;
}

// ─── CALLBACK QUERY HANDLER (INLINE BUTTONS) ───────────────────────────────
bot.on('callback_query', async (query) => {
  const data = query.data || '';
  const chatId = query.message.chat.id;

  if (data.startsWith('approve_')) {
    const leadId = data.replace('approve_', '');
    await approveLead(leadId, chatId);
    try { await bot.answerCallbackQuery(query.id, { text: '✅ Заявка одобрена!' }); } catch (e) {}
  } else if (data.startsWith('reject_')) {
    const leadId = data.replace('reject_', '');
    await rejectLead(leadId, chatId);
    try { await bot.answerCallbackQuery(query.id, { text: '❌ Заявка отклонена' }); } catch (e) {}
  } else if (data.startsWith('clarify_')) {
    const leadId = data.replace('clarify_', '');
    adminState[chatId] = { action: 'awaiting_clarification_text', leadId };
    bot.sendMessage(
      chatId,
      `💬 *Уточнение данных у клиента*\n\n` +
      `Введите текст вопроса для клиента. Он будет немедленно доставлен пользователю в Telegram:`,
      { parse_mode: 'Markdown' }
    );
    try { await bot.answerCallbackQuery(query.id, { text: '💬 Напишите текст вопроса клиенту' }); } catch (e) {}
  }
});

// ─── COMMAND HANDLERS ──────────────────────────────────────────────────────

bot.onText(/\/start(?:\s+(.+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const param = (match[1] || '').trim();

  delete sessions[chatId];

  isUserAdmin(chatId, msg.from ? msg.from.username : null);

  const welcomeText =
    `🚀 *Добро пожаловать в Revoo & GiftX!*\n\n` +
    `Мы объединили 2 мощных инструмента развития бизнеса в единый гибридный сервис:\n\n` +
    `🟢 *Revoo* — Программа лояльности и кешбэк без карт и устаревших приложений. Гости сканируют QR за столом и возвращаются чаще.\n\n` +
    `🎁 *GiftX* — Кросс-маркетинговый движок обмена подарками. Привлечение новых клиентов из соседних заведений без бюджета на рекламу.\n\n` +
    `👇 *Выберите нужное действие в меню ниже:*`;

  sendWelcomeMessage(chatId, welcomeText, msg.from);

  if (param === 'demo') {
    setTimeout(() => {
      bot.sendMessage(
        chatId,
        `🎮 *Демо гибридной страницы Revoo & GiftX*\n\n` +
        `Нажмите кнопку ниже, чтобы открыть интерактивную страницу заведения:`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🎮 Открыть Демо (Revoo & GiftX)', web_app: { url: DEMO_WEB_APP_URL } }]
            ]
          }
        }
      );
    }, 600);
  } else if (param === 'onboarding' || param === 'connect') {
    setTimeout(async () => {
      sessions[chatId] = newSession();
      await askCurrentStep(chatId, sessions[chatId]);
    }, 600);
  } else if (param.startsWith('auth_') || param.startsWith('gauth_')) {
    const isGoogle = param.startsWith('gauth_');
    const venueId = param.split('_')[1] || 'demo';
    const baseUrl = process.env.PUBLIC_URL || 'https://www.revoo.win';
    
    const targetUrl = isGoogle 
      ? `${baseUrl}/google-thank-you?venueId=${venueId}` 
      : `${baseUrl}/thank-you?venueId=${venueId}`;

    const btnText = isGoogle 
      ? '⭐ Забрать бонус в Google Maps' 
      : '🎁 Перейти к вашей скидке';

    const msgText = isGoogle
      ? `✅ *Спасибо, вы авторизованы!*\n\nНажмите кнопку ниже для перехода на страницу получения бонуса Google Maps:`
      : `✅ *Спасибо, вы авторизованы!*\n\nНажмите кнопку ниже для перехода на вашу персональную страницу скидки:`;

    setTimeout(() => {
      bot.sendMessage(chatId, msgText, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: btnText, url: targetUrl }]
          ]
        }
      });
    }, 600);
  } else {
    const baseUrl = process.env.PUBLIC_URL || 'https://www.friendlycode.fun';
    setTimeout(() => {
      bot.sendMessage(
        chatId,
        `📱 *Перейти на платформу Revoo:*\n\nВы можете зайти в свой Личный Кабинет или протестировать Демо-версию:`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📱 Открыть Личный Кабинет', url: `${baseUrl}/guest-dashboard` }],
              [{ text: '🎮 Открыть Демо (Revoo & GiftX)', web_app: { url: DEMO_WEB_APP_URL } }]
            ]
          }
        }
      );
    }, 600);
  }
});

bot.onText(/\/demo/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    `🎮 *Демо гибридной страницы Revoo & GiftX*\n\n` +
    `Нажмите кнопку ниже, чтобы открыть интерактивную страницу заведения:`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎮 Открыть Демо (Revoo & GiftX)', web_app: { url: DEMO_WEB_APP_URL } }]
        ]
      }
    }
  );
});

bot.onText(/\/admin (.+)/, (msg, match) => {
  if (match[1] === 'register') {
    ADMIN_CHAT_IDS.add(msg.chat.id);
    if (msg.from && msg.from.username) ADMIN_USERNAMES.add(msg.from.username.toLowerCase());
    sendMainMenu(msg.chat.id, `✅ Ваш chat_id \`${msg.chat.id}\` зарегистрирован как администратор.`, msg.from);
    console.log(`Admin registered: ${msg.chat.id}`);
  }
});

// ─── TEXT MESSAGE & MENU HANDLERS ──────────────────────────────────────────
bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;

  const chatId = msg.chat.id;
  const text = msg.text.trim();

  // A. ADMIN INPUT: CLARIFICATION QUESTION FOR USER
  if (isUserAdmin(chatId, msg.from ? msg.from.username : null) && adminState[chatId] && adminState[chatId].action === 'awaiting_clarification_text') {
    const { leadId } = adminState[chatId];
    delete adminState[chatId];

    const lead = pendingLeads[leadId] || (db ? (await db.collection('leads').doc(leadId).get()).data() : null);
    if (lead && lead.user && lead.user.id) {
      userClarificationState[lead.user.id] = { leadId };
      try {
        await bot.sendMessage(
          lead.user.id,
          `❓ *Уточнение по вашей заявке от менеджера Revoo & GiftX:*\n\n` +
          `"${text}"\n\n` +
          `💬 *Пожалуйста, ответьте прямо в этот чат, чтобы передать информацию менеджеру.*`,
          { parse_mode: 'Markdown' }
        );
        bot.sendMessage(chatId, `📤 *Вопрос отправлен клиенту (${lead.revoo ? lead.revoo.name : 'Заведение'})!* Ожидаем ответ...`, { parse_mode: 'Markdown' });
      } catch (e) {
        bot.sendMessage(chatId, `⚠️ Не удалось отправить сообщение клиенту: ${e.message}`);
      }
    } else {
      bot.sendMessage(chatId, `⚠️ Заявка \`${leadId}\` не найдена.`, { parse_mode: 'Markdown' });
    }
    return;
  }

  // A2. ADMIN INPUT: ADDING NEW ADMIN
  if (isUserAdmin(chatId, msg.from ? msg.from.username : null) && adminState[chatId] && adminState[chatId].action === 'awaiting_new_admin_input') {
    delete adminState[chatId];
    const input = text.trim().replace('@', '');
    if (/^\d+$/.test(input)) {
      ADMIN_CHAT_IDS.add(parseInt(input, 10));
    } else {
      ADMIN_USERNAMES.add(input.toLowerCase());
    }
    sendMainMenu(chatId, `✅ Администратор \`@${input}\` успешно добавлен!`, msg.from);
    return;
  }

  // B. USER INPUT: REPLY TO CLARIFICATION QUESTION
  if (userClarificationState[chatId]) {
    const { leadId } = userClarificationState[chatId];
    delete userClarificationState[chatId];

    const lead = pendingLeads[leadId] || (db ? (await db.collection('leads').doc(leadId).get()).data() : null);
    const venueName = lead && lead.revoo ? lead.revoo.name : 'Заведение';

    const adminMarkup = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Одобрить и активировать', callback_data: `approve_${leadId}` }],
          [{ text: '💬 Уточнить ещё', callback_data: `clarify_${leadId}` }, { text: '❌ Отклонить', callback_data: `reject_${leadId}` }],
        ],
      },
    };

    for (const admId of ADMIN_CHAT_IDS) {
      try {
        await bot.sendMessage(
          admId,
          `📩 *ПОЛУЧЕН ОТВЕТ ОТ КЛИЕНТА (${venueName})*\n\n` +
          `💬 *Ответ клиента:* "${text}"\n\n` +
          `🆔 *ID Заявки:* \`${leadId}\``,
          { parse_mode: 'Markdown', ...adminMarkup }
        );
      } catch (e) {}
    }

    bot.sendMessage(
      chatId, 
      `✅ *Спасибо! Ваш ответ передан менеджеру.* Скоро мы с вами свяжемся.`, 
      { 
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📱 Открыть Личный Кабинет', url: 'https://www.friendlycode.fun/guest-dashboard' }],
            [{ text: '🎮 Открыть Демо', web_app: { url: DEMO_WEB_APP_URL } }]
          ]
        }
      }
    );
    return;
  }

  // 1. MAIN NAVIGATION BUTTONS (DEMO & ADD)
  const normText = text.replace(/[\uFE0F\u200B]/g, '').trim().toLowerCase();

  const isDemo = normText.includes('демо') || normText.includes('demo');
  const isAdd = normText.includes('добавить') || normText.includes('подключить') || normText.includes('подать заявку') || normText.includes('add');
  const isProducts = normText.includes('о продуктах') || normText.includes('продукты');
  const isContact = normText.includes('связаться') || normText.includes('менеджер');
  const isHelp = normText.includes('помощь') || normText.includes('faq');

  if (isDemo) {
    bot.sendMessage(
      chatId,
      `🎮 *Демо гибридной страницы Revoo & GiftX*\n\n` +
      `Вы можете открыть интерактивную страницу заведения прямо в Telegram:\n` +
      `🔗 [Открыть Demo UI](${DEMO_WEB_APP_URL})`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎮 Открыть ДЕМО (Revoo & GiftX)', web_app: { url: DEMO_WEB_APP_URL } }]
          ]
        }
      }
    );
    return;
  }

  if (isAdd) {
    sessions[chatId] = newSession();
    await askCurrentStep(chatId, sessions[chatId]);
    return;
  }

  if (isProducts) {
    sendMainMenu(
      chatId,
      `🟢 *REVOO — Программа лояльности*\n` +
      `• Персональный кешбэк и смарт-динамические скидки.\n` +
      `• Быстрая идентификация гостя за 3 секунды без скачивания приложений.\n` +
      `• Рост повторных визитов до +35%.\n\n` +
      `🎁 *GIFTX — Партнёрский кросс-маркетинг*\n` +
      `• Гость оплачивает чек у вас и получает сертификат на подарок у партнёра.\n` +
      `• Получайте поток готовых клиентов от партнёров без расходов на таргетинг.\n\n` +
      `Для подключения нажмите *🚀 ДОБАВИТЬ* 👇`,
      msg.from
    );
    return;
  }

  if (isContact) {
    sendMainMenu(
      chatId,
      `📲 *Прямой контакт менеджера в Telegram:*\n` +
      `@sherlockdxb\n\n` +
      `Напишите нам напрямую по любым вопросам интеграции и тарифов.`,
      msg.from
    );
    return;
  }

  if (isHelp) {
    sendMainMenu(
      chatId,
      `❓ *Частые вопросы и помощь:*\n\n` +
      `1️⃣ *Как запустить демо?*\n` +
      `Нажмите на кнопку *🎮 ДЕМО* в нижнем меню.\n\n` +
      `2️⃣ *Как оставить заявку на заведение?*\n` +
      `Нажмите *🚀 ДОБАВИТЬ* и ответьте на вопросы 2 этапов.\n\n` +
      `3️⃣ *Нужно ли скачивать приложение?*\n` +
      `Нет, всё работает через веб-страницы и Telegram.`,
      msg.from
    );
    return;
  }

  // 2. ADMIN EXCLUSIVE CONTROL BUTTONS
  const isModeration = normText.includes('модераци') || normText.includes('заявки');
  const isStats = normText.includes('статистик');
  const isRoles = normText.includes('ролями') || normText.includes('управление ролями');

  if (isModeration || isStats || isRoles) {
    if (!isUserAdmin(chatId, msg.from ? msg.from.username : null)) {
      bot.sendMessage(
        chatId,
        `ℹ️ *Информация об управлении заведением*\n\n` +
        `Управление заведением, персоналом и подарками доступно владельцам и администраторам заведений исключительно через веб-интерфейсы:\n\n` +
        `🟢 *Revoo UI* — Управление скидками, кешбэком и информацией Revoo\n` +
        `🎁 *GiftX UI* — Управление 3 уровнями подарков и акциями GiftX\n\n` +
        `_Данный раздел управления в боте предназначен только для системных администраторов платформы._`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🟢 Открыть Revoo UI', url: DEMO_WEB_APP_URL }],
              [{ text: '🎁 Открыть GiftX UI', url: 'https://gift-x.vercel.app' }]
            ]
          }
        }
      );
      return;
    }

    if (isModeration) {
      let pendingList = [];
      if (db) {
        try {
          const snap = await db.collection('leads').where('status', '==', 'pending_approval').get();
          snap.forEach((doc) => pendingList.push(doc.data()));
        } catch (e) {
          console.error('Error fetching leads:', e.message);
        }
      }
      if (pendingList.length === 0) {
        pendingList = Object.values(pendingLeads);
      }

      if (pendingList.length === 0) {
        sendMainMenu(chatId, `🎉 *Заявок на модерации нет.* Все поступающие заведения обработаны.`, msg.from);
        return;
      }

      bot.sendMessage(chatId, `📋 *Найдено заявок на модерации: ${pendingList.length}*`, { parse_mode: 'Markdown' });

      for (const lead of pendingList) {
        const leadId = lead.leadId || lead.venueId;
        const adminMarkup = {
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ Одобрить и активировать', callback_data: `approve_${leadId}` }],
              [{ text: '💬 Уточнить данные', callback_data: `clarify_${leadId}` }, { text: '❌ Отклонить', callback_data: `reject_${leadId}` }],
            ],
          },
        };
        await bot.sendMessage(chatId, lead.exportMarkdown || `Заявка ${leadId}`, { parse_mode: 'Markdown', ...adminMarkup });
      }
      return;
    }

    if (isStats) {
      let activeVenuesCount = 0;
      let totalLeadsCount = 0;
      let giftxExportsCount = 0;

      if (db) {
        try {
          const vSnap = await db.collection('venues').get();
          activeVenuesCount = vSnap.size;
          const lSnap = await db.collection('leads').get();
          totalLeadsCount = lSnap.size;
          const gSnap = await db.collection('giftx_exports').get();
          giftxExportsCount = gSnap.size;
        } catch (e) {}
      }

      sendMainMenu(
        chatId,
        `📊 *СТАТИСТИКА ЭКОСИСТЕМЫ REVOO & GIFTX*\n\n` +
        `🟢 *Активных заведений (Revoo):* \`${activeVenuesCount}\`\n` +
        `🎁 *Экспортировано для GiftX:* \`${giftxExportsCount}\`\n` +
        `📋 *Всего заявок (Leads):* \`${totalLeadsCount}\`\n\n` +
        `🔥 *Синхронизация с Firestore:* \`ОК (Подключено)\``,
        msg.from
      );
      return;
    }

    if (isRoles) {
      const adminsStr = Array.from(ADMIN_USERNAMES).map((u) => `@${u}`).join(', ');
      adminState[chatId] = { action: 'awaiting_new_admin_input' };
      bot.sendMessage(
        chatId,
        `👥 *Управление администраторами Revoo & GiftX*\n\n` +
        `• *Суперадмин:* @sherlockdxb\n` +
        `• *Текущие администраторы:* ${adminsStr}\n` +
        `• *Ваш Chat ID:* \`${chatId}\`\n\n` +
        `💬 *Чтобы добавить нового администратора, напишите его @username или Telegram ID в ответ на это сообщение:*`,
        { parse_mode: 'Markdown' }
      );
      return;
    }
  }

  // 2. ONBOARDING SESSION INPUT HANDLER
  const session = sessions[chatId];
  if (!session) {
    sendMainMenu(chatId, `Используйте меню ниже для навигации или нажмите *🚀 Подключить Revoo + GiftX*.`);
    return;
  }

  const isSkip = text === '⏩ Пропустить';

  // --- STAGE 0: GOOGLE MAPS LINK PARSING ---
  if (session.step === 'revoo_maps_url_initial') {
    if (isSkip || text.toLowerCase().includes('пропустить')) {
      session.step = 'revoo_venue_name';
      await askCurrentStep(chatId, session);
      return;
    }

    if (/^https?:\/\//i.test(text) || text.includes('maps') || text.includes('goo.gl') || text.includes('2gis') || text.includes('yandex')) {
      const statusMsg = await bot.sendMessage(
        chatId,
        `🔍 *Анализируем ссылку и получаем данные из Google Maps...*`,
        { parse_mode: 'Markdown' }
      ).catch(() => null);

      try {
        const parsed = await parseGooglePlace(text);
        if (statusMsg) {
          bot.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
        }

        if (parsed && parsed.success) {
          session.googleData = {
            rating: parsed.rating,
            reviewsCount: parsed.reviewsCount,
            workingHours: parsed.workingHours,
            photoUrl: parsed.photoUrl,
            canonicalUrl: parsed.canonicalUrl || text,
          };
          if (parsed.name) session.revooData.venue_name = parsed.name;
          if (parsed.niche) session.revooData.niche = parsed.niche;
          if (parsed.city) session.revooData.city = parsed.city;
          if (parsed.address) session.revooData.address = parsed.address;
          if (parsed.phone) session.revooData.phone = parsed.phone;
          session.revooData.maps_url = parsed.canonicalUrl || text;

          session.step = 'google_preview_confirm';
          await askCurrentStep(chatId, session);
          return;
        }
      } catch (err) {
        console.warn('Error during Google Maps link parsing:', err.message);
      }

      session.revooData.maps_url = text;
      bot.sendMessage(chatId, `📍 Ссылка сохранена! Давайте заполним данные заведения:`);
      session.step = 'revoo_venue_name';
      await askCurrentStep(chatId, session);
      return;
    }

    // If text entered instead of URL, treat as name
    session.revooData.venue_name = text;
    session.step = 'revoo_niche';
    await askCurrentStep(chatId, session);
    return;
  }

  // --- STAGE 0.5: GOOGLE PREVIEW CONFIRMATION ---
  if (session.step === 'google_preview_confirm') {
    if (text.includes('Всё верно') || text.includes('продолжить')) {
      // Check deduplication
      const existing = await findExistingVenue(session.revooData.venue_name, session.revooData.city, session.revooData.phone);
      if (existing) {
        session.matchedVenue = existing;
        session.step = 'revoo_duplicate_detected';
        await askCurrentStep(chatId, session);
        return;
      }
      session.step = 'revoo_contact_name';
      await askCurrentStep(chatId, session);
      return;
    } else {
      session.step = 'revoo_venue_name';
      await askCurrentStep(chatId, session);
      return;
    }
  }

  // --- STAGE 1: REVOO STEP-BY-STEP (WITH PRE-FILL SUPPORT) ---
  if (session.step === 'revoo_venue_name') {
    session.revooData.venue_name = extractUserInputValue(text, session.revooData.venue_name);
    session.step = 'revoo_niche';
    await askCurrentStep(chatId, session);
    return;
  }

  if (session.step === 'revoo_niche') {
    session.revooData.niche = extractUserInputValue(text, session.revooData.niche);
    session.step = 'revoo_city';
    await askCurrentStep(chatId, session);
    return;
  }

  if (session.step === 'revoo_city') {
    session.revooData.city = extractUserInputValue(text, session.revooData.city);

    // PERFORM DEDUPLICATION CHECK
    const existing = await findExistingVenue(session.revooData.venue_name, session.revooData.city, null);
    if (existing) {
      session.matchedVenue = existing;
      session.step = 'revoo_duplicate_detected';
      await askCurrentStep(chatId, session);
      return;
    }

    session.step = 'revoo_address';
    await askCurrentStep(chatId, session);
    return;
  }

  // HANDLER FOR DUPLICATE DETECTION PROMPT
  if (session.step === 'revoo_duplicate_detected') {
    if (text.includes('Объединить')) {
      session.isMerged = true;
      session.existingVenueId = session.matchedVenue.id;
      const ex = session.matchedVenue.data;
      if (ex.address && !session.revooData.address) session.revooData.address = ex.address;
      if (ex.mapsUrl && !session.revooData.maps_url) session.revooData.maps_url = ex.mapsUrl;

      bot.sendMessage(
        chatId,
        `🔗 *Выбрано объединение.* Данные будут привязаны к карточке заведения \`${session.existingVenueId}\`.`,
        { parse_mode: 'Markdown' }
      );
      session.step = 'revoo_contact_name';
      await askCurrentStep(chatId, session);
    } else {
      session.isMerged = false;
      session.existingVenueId = null;
      session.matchedVenue = null;
      session.step = 'revoo_venue_name';
      bot.sendMessage(chatId, `Хорошо, давайте укажем другое название:`);
      await askCurrentStep(chatId, session);
    }
    return;
  }

  if (session.step === 'revoo_address') {
    session.revooData.address = isSkip ? '' : extractUserInputValue(text, session.revooData.address);
    if (session.revooData.maps_url) {
      session.step = 'revoo_contact_name';
    } else {
      session.step = 'revoo_maps_url';
    }
    await askCurrentStep(chatId, session);
    return;
  }

  if (session.step === 'revoo_maps_url') {
    session.revooData.maps_url = isSkip ? '' : extractUserInputValue(text, session.revooData.maps_url);
    session.step = 'revoo_contact_name';
    await askCurrentStep(chatId, session);
    return;
  }

  if (session.step === 'revoo_contact_name') {
    session.revooData.contact_name = text;
    session.step = 'revoo_user_role';
    await askCurrentStep(chatId, session);
    return;
  }

  if (session.step === 'revoo_user_role') {
    session.revooData.user_role = text;
    session.step = 'revoo_phone';
    await askCurrentStep(chatId, session);
    return;
  }

  if (session.step === 'revoo_phone') {
    session.revooData.phone = extractUserInputValue(text, session.revooData.phone);

    // Secondary phone-based deduplication check if not merged yet
    if (!session.isMerged) {
      const existingByPhone = await findExistingVenue(null, null, session.revooData.phone);
      if (existingByPhone) {
        session.matchedVenue = existingByPhone;
        session.step = 'revoo_duplicate_detected';
        await askCurrentStep(chatId, session);
        return;
      }
    }

    session.step = 'revoo_rates';
    await askCurrentStep(chatId, session);
    return;
  }

  if (session.step === 'revoo_rates') {
    session.revooData.rates = text;
    session.step = 'revoo_deposit';
    await askCurrentStep(chatId, session);
    return;
  }

  if (session.step === 'revoo_deposit') {
    session.revooData.deposit = isSkip || text.includes('Пропустить') ? '— (без депозита)' : text;
    session.step = 'revoo_time_limit';
    await askCurrentStep(chatId, session);
    return;
  }

  if (session.step === 'revoo_time_limit') {
    session.revooData.time_limit = isSkip || text.includes('Пропустить') ? '— (без ограничения)' : text;
    session.step = 'giftx_confirm_data';
    await askCurrentStep(chatId, session);
    return;
  }

  // --- TRANSITION TO GIFTX ---
  if (session.step === 'giftx_confirm_data') {
    if (text === '✅ Да, использовать данные Revoo' || text.includes('Да')) {
      session.giftxData.same_as_revoo = true;
      session.giftxData.venue_name = session.revooData.venue_name;
      session.giftxData.niche = session.revooData.niche;
      session.giftxData.city = session.revooData.city;
      session.giftxData.address = session.revooData.address;
      session.giftxData.maps_url = session.revooData.maps_url;
      // Skip to GiftX 3-Tier Offers (Silver)
      session.step = 'giftx_silver';
      await askCurrentStep(chatId, session);
    } else {
      session.giftxData.same_as_revoo = false;
      session.step = 'giftx_venue_name';
      await askCurrentStep(chatId, session);
    }
    return;
  }

  // --- STAGE 2: GIFTX CUSTOM DATA ---
  if (session.step === 'giftx_venue_name') {
    session.giftxData.venue_name = text;
    session.step = 'giftx_niche';
    await askCurrentStep(chatId, session);
    return;
  }

  if (session.step === 'giftx_niche') {
    session.giftxData.niche = text;
    session.step = 'giftx_city';
    await askCurrentStep(chatId, session);
    return;
  }

  if (session.step === 'giftx_city') {
    session.giftxData.city = text;
    session.step = 'giftx_address';
    await askCurrentStep(chatId, session);
    return;
  }

  if (session.step === 'giftx_address') {
    session.giftxData.address = isSkip ? '' : text;
    session.step = 'giftx_maps_url';
    await askCurrentStep(chatId, session);
    return;
  }

  if (session.step === 'giftx_maps_url') {
    session.giftxData.maps_url = isSkip ? '' : text;
    session.step = 'giftx_silver';
    await askCurrentStep(chatId, session);
    return;
  }

  // --- STAGE 2: GIFTX 3-TIER OFFERS ---
  if (session.step === 'giftx_silver') {
    session.giftxData.silver_gift = isSkip || text.includes('Пропустить') ? '— (пропущено)' : text;
    session.step = 'giftx_gold';
    await askCurrentStep(chatId, session);
    return;
  }

  if (session.step === 'giftx_gold') {
    session.giftxData.gold_gift = isSkip || text.includes('Пропустить') ? '— (пропущено)' : text;
    session.step = 'giftx_platinum';
    await askCurrentStep(chatId, session);
    return;
  }

  if (session.step === 'giftx_platinum') {
    session.giftxData.platinum_gift = isSkip || text.includes('Пропустить') ? '— (пропущено)' : text;
    session.step = 'confirm';
    await askCurrentStep(chatId, session);
    return;
  }

  // --- CONFIRMATION HANDLER ---
  if (session.step === 'confirm') {
    if (text === '✅ Подтвердить и отправить заявку' || text.includes('Подтвердить')) {
      bot.sendMessage(
        chatId,
        `⏳ *Сохраняем данные и отправляем заявку...*`,
        { parse_mode: 'Markdown' }
      );

      const venueId = await saveOnboardingToDatabaseAndExport(session, msg.from);

      const baseUrl = process.env.PUBLIC_URL || 'https://www.friendlycode.fun';
      const venueUrl = `${baseUrl}/test?id=${venueId}`;
      const dashboardUrl = `${baseUrl}/guest-dashboard`;

      sendMainMenu(
        chatId,
        `🎉 *Заявка успешно отправлена!*\n\n` +
        `Ваше заведение зарегистрировано в *Revoo & GiftX*.\n` +
        `🆔 *ID Записи:* \`${venueId}\`\n\n` +
        `Нажмите кнопку ниже, чтобы открыть страницу заведения или перейти в личный кабинет:`,
        msg.from
      );

      bot.sendMessage(chatId, `📱 *Ссылки для быстрого перехода:*`, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📱 Открыть страницу заведения', url: venueUrl }],
            [{ text: '📊 Личный кабинет', url: dashboardUrl }]
          ]
        }
      });

      delete sessions[chatId];
    } else if (text === '✏️ Начать онбординг заново' || text.includes('заново')) {
      sessions[chatId] = newSession();
      await askCurrentStep(chatId, sessions[chatId]);
    } else {
      delete sessions[chatId];
      sendMainMenu(chatId, `Заявка отменена. Вы можете начать заново в любой момент.`);
    }
  }
});

console.log('🤖 Revoo & GiftX Hybrid Bot успешно запущен...');
console.log(`📬 Уведомления администратору: @${ADMIN_USERNAME}`);
