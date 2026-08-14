const TelegramBot = require('node-telegram-bot-api');

// ─── CONFIG ────────────────────────────────────────────────────────────────
const BOT_TOKEN = '8750420325:AAHThiUpAMViiQuCUC5pYxr3RIgUswLLkBE';
const ADMIN_USERNAME = 'sherlockdxb';

let ADMIN_CHAT_ID = null;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ─── PERSISTENT BOTTOM MENU ────────────────────────────────────────────────
const MAIN_MENU = {
  reply_markup: {
    keyboard: [
      [{ text: '📝 Подать заявку' }, { text: 'ℹ️ О продуктах' }],
      [{ text: '📞 Связаться с менеджером' }, { text: '❓ Помощь' }],
    ],
    resize_keyboard: true,
    persistent: true,
  },
};

function sendMainMenu(chatId, text) {
  return bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...MAIN_MENU });
}

// ─── STATE MACHINE ─────────────────────────────────────────────────────────
const sessions = {};

function newSession() {
  return {
    step: 'product',
    data: {
      product: null,
      venue_name: null,
      niche: null,
      city: null,
      address: null,
      contact_name: null,
      phone: null,
      website: null,
      notes: null,
    },
  };
}

// ─── HELPERS ───────────────────────────────────────────────────────────────
function productLabel(p) {
  const map = { revoo: '🟢 Revoo', giftx: '🎁 GiftX', both: '🟢 Revoo + 🎁 GiftX' };
  return map[p] || p;
}

function buildSummary(data) {
  return (
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📋 *НОВАЯ ЗАЯВКА НА ПОДКЛЮЧЕНИЕ*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📦 *Продукт:* ${productLabel(data.product)}\n` +
    `🏠 *Название заведения:* ${data.venue_name}\n` +
    `🍽 *Ниша:* ${data.niche}\n` +
    `🌆 *Город:* ${data.city}\n` +
    `📍 *Адрес:* ${data.address || '—'}\n` +
    `👤 *Контактное лицо:* ${data.contact_name}\n` +
    `📞 *Телефон / Telegram:* ${data.phone}\n` +
    `🌐 *Сайт / Соцсети:* ${data.website || '—'}\n` +
    `💬 *Доп. информация:* ${data.notes || '—'}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━`
  );
}

async function sendToAdmin(summary, fromUser) {
  if (!ADMIN_CHAT_ID) {
    console.warn('⚠️  ADMIN_CHAT_ID not set!');
    console.log('ЗАЯВКА:\n', summary);
    return false;
  }
  const userInfo = fromUser.username
    ? `@${fromUser.username}`
    : `${fromUser.first_name || ''} ${fromUser.last_name || ''}`.trim();

  await bot.sendMessage(
    ADMIN_CHAT_ID,
    `${summary}\n\n👤 *От:* ${userInfo} (id: \`${fromUser.id}\`)`,
    { parse_mode: 'Markdown' }
  );
  return true;
}

// ─── STEP PROMPTS ──────────────────────────────────────────────────────────
function askProduct(chatId) {
  bot.sendMessage(chatId,
    `👋 *Выберите, какое приложение вас интересует:*`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🟢 Revoo — программа лояльности', callback_data: 'product:revoo' }],
          [{ text: '🎁 GiftX — кросс-маркетинг с подарками', callback_data: 'product:giftx' }],
          [{ text: '🚀 Оба приложения (Revoo + GiftX)', callback_data: 'product:both' }],
        ],
      },
    }
  );
}

function askNext(chatId, session) {
  const step = session.step;

  if (step === 'venue_name') {
    bot.sendMessage(chatId, `🏠 *Название заведения*\n\nКак называется ваше заведение?`, { parse_mode: 'Markdown' });
  } else if (step === 'niche') {
    bot.sendMessage(chatId,
      `🍽 *Ниша / тип бизнеса*\n\nВыберите подходящее или напишите своё:`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '☕ Кафе', callback_data: 'niche:Кафе' },
              { text: '🍽 Ресторан', callback_data: 'niche:Ресторан' },
            ],
            [
              { text: '🍺 Бар / Паб', callback_data: 'niche:Бар / Паб' },
              { text: '🍕 Фастфуд', callback_data: 'niche:Фастфуд' },
            ],
            [
              { text: '💆 Салон красоты', callback_data: 'niche:Салон красоты' },
              { text: '🏋 Фитнес', callback_data: 'niche:Фитнес' },
            ],
            [
              { text: '🛒 Ритейл / Магазин', callback_data: 'niche:Ритейл / Магазин' },
              { text: '✍️ Другое', callback_data: 'niche:__other__' },
            ],
          ],
        },
      }
    );
  } else if (step === 'city') {
    bot.sendMessage(chatId, `🌆 *Город*\n\nВ каком городе находится ваше заведение?`, { parse_mode: 'Markdown' });
  } else if (step === 'address') {
    bot.sendMessage(chatId, `📍 *Адрес*\n\nУкажите адрес заведения _(или нажмите /skip для пропуска)_:`, { parse_mode: 'Markdown' });
  } else if (step === 'contact_name') {
    bot.sendMessage(chatId, `👤 *Контактное лицо*\n\nКак вас зовут (имя и фамилия)?`, { parse_mode: 'Markdown' });
  } else if (step === 'phone') {
    bot.sendMessage(chatId, `📞 *Телефон или Telegram*\n\nУкажите номер телефона или ваш Telegram username:`, { parse_mode: 'Markdown' });
  } else if (step === 'website') {
    bot.sendMessage(chatId, `🌐 *Сайт / Инстаграм / 2ГИС*\n\nЕсть ли у вас сайт или страница в соцсетях? _(или /skip)_`, { parse_mode: 'Markdown' });
  } else if (step === 'notes') {
    bot.sendMessage(chatId, `💬 *Дополнительная информация*\n\nКоличество точек, вопросы, пожелания... _(или /skip)_`, { parse_mode: 'Markdown' });
  } else if (step === 'confirm') {
    const summary = buildSummary(session.data);
    bot.sendMessage(chatId,
      `*Проверьте вашу заявку:*\n\n${summary}\n\nВсё верно?`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Отправить заявку', callback_data: 'confirm:yes' },
              { text: '✏️ Исправить', callback_data: 'confirm:no' },
            ],
          ],
        },
      }
    );
  }
}

const STEP_ORDER = ['product', 'venue_name', 'niche', 'city', 'address', 'contact_name', 'phone', 'website', 'notes', 'confirm'];

function nextStep(current) {
  const idx = STEP_ORDER.indexOf(current);
  return STEP_ORDER[idx + 1] || 'done';
}

// ─── /start ────────────────────────────────────────────────────────────────
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  sessions[chatId] = newSession();
  sendMainMenu(chatId,
    `🚀 *Revoo & GiftX — Подключение*\n\n` +
    `Этот бот поможет вам оставить заявку на установку приложений для вашего бизнеса.\n\n` +
    `Займёт всего *2 минуты* ⚡`
  );
  setTimeout(() => askProduct(chatId), 1000);
});

// ─── MENU BUTTON HANDLERS ──────────────────────────────────────────────────
bot.onText(/^📝 Подать заявку$/, (msg) => {
  const chatId = msg.chat.id;
  sessions[chatId] = newSession();
  bot.sendMessage(chatId, `Отлично! Давайте начнём заявку 👇`, { parse_mode: 'Markdown' });
  setTimeout(() => askProduct(chatId), 600);
});

bot.onText(/^ℹ️ О продуктах$/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId,
    `*🟢 REVOO — Программа лояльности*\n` +
    `Накопительная система скидок и депозитов для вашего заведения. Гости получают скидку за каждый визит — без карт и приложения.\n\n` +
    `*🎁 GIFTX — Кросс-маркетинг с подарками*\n` +
    `При оплате чека в партнёрском заведении клиент получает подарок от другого заведения. Привлечение новой аудитории без рекламного бюджета.\n\n` +
    `Хотите подключить? Нажмите *📝 Подать заявку* 👇`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/^📞 Связаться с менеджером$/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `📲 *Наш менеджер в Telegram:*\n@${ADMIN_USERNAME}\n\nНапишите напрямую — ответим в течение часа в рабочее время.`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/^❓ Помощь$/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `*Как это работает?*\n\n` +
    `1️⃣ Нажмите *📝 Подать заявку*\n` +
    `2️⃣ Ответьте на несколько вопросов о вашем заведении\n` +
    `3️⃣ Проверьте данные и отправьте заявку\n` +
    `4️⃣ Наш менеджер свяжется с вами\n\n` +
    `По вопросам: @${ADMIN_USERNAME}`,
    { parse_mode: 'Markdown' }
  );
});

// ─── /admin ────────────────────────────────────────────────────────────────
bot.onText(/\/admin (.+)/, (msg, match) => {
  if (match[1] === 'register') {
    ADMIN_CHAT_ID = msg.chat.id;
    bot.sendMessage(msg.chat.id, `✅ Ваш chat_id \`${msg.chat.id}\` зарегистрирован. Теперь вы получаете все заявки.`, { parse_mode: 'Markdown' });
    console.log(`Admin registered: ${msg.chat.id}`);
  }
});

// ─── /skip ─────────────────────────────────────────────────────────────────
bot.onText(/\/skip/, (msg) => {
  const chatId = msg.chat.id;
  const session = sessions[chatId];
  if (!session) return;

  const skippableSteps = ['address', 'website', 'notes'];
  if (skippableSteps.includes(session.step)) {
    session.data[session.step] = '—';
    session.step = nextStep(session.step);
    askNext(chatId, session);
  }
});

// ─── TEXT INPUT ────────────────────────────────────────────────────────────
bot.on('message', (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;
  // Ignore bottom menu button presses (handled above)
  const menuTexts = ['📝 Подать заявку', 'ℹ️ О продуктах', '📞 Связаться с менеджером', '❓ Помощь'];
  if (menuTexts.includes(msg.text)) return;

  const chatId = msg.chat.id;
  const session = sessions[chatId];
  if (!session) {
    sendMainMenu(chatId, `Используйте кнопки меню ниже или нажмите /start для начала.`);
    return;
  }

  const step = session.step;
  const text = msg.text.trim();
  const textSteps = ['venue_name', 'city', 'address', 'contact_name', 'phone', 'website', 'notes'];

  if (step === 'niche') {
    session.data.niche = text;
    session.step = nextStep(step);
    askNext(chatId, session);
    return;
  }

  if (textSteps.includes(step)) {
    session.data[step] = text;
    session.step = nextStep(step);
    askNext(chatId, session);
  }
});

// ─── INLINE CALLBACKS ──────────────────────────────────────────────────────
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  const session = sessions[chatId];

  await bot.answerCallbackQuery(query.id);

  if (!session) {
    bot.sendMessage(chatId, 'Сессия устарела. Нажмите 📝 Подать заявку.');
    return;
  }

  if (data.startsWith('product:')) {
    const product = data.split(':')[1];
    session.data.product = product;
    session.step = nextStep('product');
    bot.sendMessage(chatId, `Отлично! Выбрано: *${productLabel(product)}* 🎉`, { parse_mode: 'Markdown' });
    setTimeout(() => askNext(chatId, session), 600);
    return;
  }

  if (data.startsWith('niche:')) {
    const niche = data.split(':').slice(1).join(':');
    if (niche === '__other__') {
      bot.sendMessage(chatId, `✏️ Напишите вашу нишу:`, { parse_mode: 'Markdown' });
      return;
    }
    session.data.niche = niche;
    session.step = nextStep('niche');
    askNext(chatId, session);
    return;
  }

  if (data.startsWith('confirm:')) {
    const answer = data.split(':')[1];
    if (answer === 'yes') {
      const summary = buildSummary(session.data);
      const sent = await sendToAdmin(summary, query.from);
      sendMainMenu(chatId,
        `✅ *Заявка отправлена!*\n\nСпасибо! Наш менеджер свяжется с вами в ближайшее время.\n\n📱 @${ADMIN_USERNAME}`
      );
      if (!sent) {
        bot.sendMessage(chatId, `⚠️ _admin_chat_id не настроен. Свяжитесь с @${ADMIN_USERNAME} напрямую._`, { parse_mode: 'Markdown' });
      }
      delete sessions[chatId];
    } else {
      sessions[chatId] = newSession();
      bot.sendMessage(chatId, `Хорошо, давайте начнём заново:`);
      setTimeout(() => askProduct(chatId), 500);
    }
    return;
  }
});

console.log('🤖 Revoo Leads Bot запущен...');
console.log(`📬 Заявки будут отправляться: @${ADMIN_USERNAME}`);
console.log(`ℹ️  Для активации: отправьте боту /admin register`);
