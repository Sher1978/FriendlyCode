/**
 * Revoo AI-Concierge Floating Widget
 * Embeddable script for partner websites.
 * 
 * Usage:
 * <script src="https://www.revoo.win/widget.js" data-venue-id="YOUR_VENUE_ID" data-color="#00FF41" defer></script>
 */
(function() {
  'use strict';

  // Read configuration from script tag
  const currentScript = document.currentScript || document.querySelector('script[data-venue-id]');
  const venueId = currentScript ? currentScript.getAttribute('data-venue-id') : 'test_borderrun_pattaya';
  const venueName = (currentScript && currentScript.getAttribute('data-venue-name')) || 'Бовиза Ранум';
  const primaryColor = (currentScript && currentScript.getAttribute('data-color')) || '#00FF41';
  const position = (currentScript && currentScript.getAttribute('data-position')) || 'right'; // 'right' or 'left'
  const apiUrl = (currentScript && currentScript.getAttribute('data-api-url')) || 'https://asia-south1-bot-lab-21910.cloudfunctions.net/conciergeChatHttp';
  const bookingUrl = (currentScript && currentScript.getAttribute('data-booking-url')) || `https://bot-lab-21910.web.app/?v=${venueId}&source=partner_widget`;

  // Avoid multiple initializations
  if (window.__REVOO_WIDGET_INITIALIZED__) return;
  window.__REVOO_WIDGET_INITIALIZED__ = true;

  // Inject Styles
  const style = document.createElement('style');
  style.id = 'revoo-widget-styles';
  style.textContent = `
    .revoo-widget-container {
      position: fixed;
      bottom: 24px;
      ${position}: 24px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      box-sizing: border-box;
    }
    .revoo-widget-container * {
      box-sizing: border-box;
    }
    /* Launcher Button */
    .revoo-launcher-btn {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, ${primaryColor} 0%, #007AFF 100%);
      color: #000;
      border: none;
      outline: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 28px rgba(0, 255, 65, 0.35), 0 4px 12px rgba(0,0,0,0.5);
      transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      position: relative;
    }
    .revoo-launcher-btn:hover {
      transform: scale(1.08) translateY(-2px);
      box-shadow: 0 12px 32px rgba(0, 255, 65, 0.5);
    }
    .revoo-launcher-btn:active {
      transform: scale(0.95);
    }
    .revoo-launcher-icon {
      width: 28px;
      height: 28px;
      fill: #000000;
      transition: transform 0.2s ease;
    }
    .revoo-badge-pulse {
      position: absolute;
      top: 0;
      right: 0;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #00FF41;
      border: 2px solid #000;
      box-shadow: 0 0 10px #00FF41;
      animation: revoo-pulse 2s infinite;
    }
    @keyframes revoo-pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 255, 65, 0.7); }
      70% { transform: scale(1.1); box-shadow: 0 0 0 8px rgba(0, 255, 65, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 255, 65, 0); }
    }
    /* Chat Dialog Card */
    .revoo-chat-window {
      position: absolute;
      bottom: 74px;
      ${position}: 0;
      width: 380px;
      height: 580px;
      max-height: calc(100vh - 110px);
      background: rgba(18, 18, 20, 0.95);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 24px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(0, 255, 65, 0.12);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      opacity: 0;
      visibility: hidden;
      transform: translateY(20px) scale(0.95);
      transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .revoo-chat-window.revoo-open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0) scale(1);
    }
    /* Header */
    .revoo-chat-header {
      padding: 16px 20px;
      background: rgba(28, 28, 30, 0.9);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .revoo-header-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .revoo-avatar {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: linear-gradient(135deg, ${primaryColor} 0%, #007AFF 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      color: #000;
      font-size: 18px;
    }
    .revoo-title-wrap h4 {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      color: #FFFFFF;
      letter-spacing: -0.2px;
    }
    .revoo-title-wrap .revoo-status {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.55);
      margin-top: 2px;
    }
    .revoo-status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #00FF41;
      box-shadow: 0 0 6px #00FF41;
    }
    .revoo-close-btn {
      background: rgba(255, 255, 255, 0.08);
      border: none;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      color: rgba(255, 255, 255, 0.7);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      transition: background 0.15s;
    }
    .revoo-close-btn:hover {
      background: rgba(255, 255, 255, 0.18);
      color: #FFF;
    }
    /* Message Stream */
    .revoo-messages-area {
      flex: 1;
      padding: 18px 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .revoo-msg {
      max-width: 82%;
      padding: 12px 16px;
      border-radius: 18px;
      font-size: 13px;
      line-height: 1.45;
      word-break: break-word;
    }
    .revoo-msg-bot {
      align-self: flex-start;
      background: #1C1C1E;
      color: #E5E5E7;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-bottom-left-radius: 4px;
    }
    .revoo-msg-user {
      align-self: flex-end;
      background: linear-gradient(135deg, #007AFF 0%, #0056B3 100%);
      color: #FFFFFF;
      border-bottom-right-radius: 4px;
    }
    .revoo-typing {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 10px 14px;
      background: #1C1C1E;
      border-radius: 16px;
      align-self: flex-start;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .revoo-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: ${primaryColor};
      animation: revoo-bounce 1.4s infinite ease-in-out both;
    }
    .revoo-dot:nth-child(1) { animation-delay: -0.32s; }
    .revoo-dot:nth-child(2) { animation-delay: -0.16s; }
    @keyframes revoo-bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
    /* Quick Chips */
    .revoo-chips-row {
      padding: 6px 14px 10px 14px;
      display: flex;
      gap: 6px;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .revoo-chips-row::-webkit-scrollbar { display: none; }
    .revoo-chip {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: rgba(255, 255, 255, 0.85);
      border-radius: 20px;
      padding: 6px 12px;
      font-size: 11px;
      white-space: nowrap;
      cursor: pointer;
      transition: all 0.15s;
    }
    .revoo-chip:hover {
      background: rgba(0, 255, 65, 0.15);
      border-color: ${primaryColor};
      color: #FFF;
    }
    /* Input Form */
    .revoo-input-area {
      padding: 12px 14px;
      background: #18181A;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .revoo-input-field {
      flex: 1;
      background: #121214;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      padding: 10px 14px;
      color: #FFF;
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s;
    }
    .revoo-input-field:focus {
      border-color: ${primaryColor};
    }
    .revoo-send-btn {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      background: ${primaryColor};
      border: none;
      color: #000;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.2s;
    }
    .revoo-send-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    /* Mobile full screen */
    @media (max-width: 480px) {
      .revoo-widget-container {
        bottom: 16px;
        ${position}: 16px;
      }
      .revoo-chat-window {
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        width: 100vw;
        height: 100vh;
        max-height: 100vh;
        border-radius: 0;
        border: none;
      }
    }
  `;
  document.head.appendChild(style);

  // Build Container
  const container = document.createElement('div');
  container.className = 'revoo-widget-container';
  container.innerHTML = `
    <!-- Floating Launcher -->
    <button class="revoo-launcher-btn" id="revooLauncherBtn" aria-label="Открыть AI-Консьерж">
      <span class="revoo-badge-pulse"></span>
      <svg class="revoo-launcher-icon" viewBox="0 0 24 24">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
      </svg>
    </button>

    <!-- Chat Dialog -->
    <div class="revoo-chat-window" id="revooChatWindow">
      <div class="revoo-chat-header">
        <div class="revoo-header-info">
          <div class="revoo-avatar">🤖</div>
          <div class="revoo-title-wrap">
            <h4 id="revooVenueName">${venueName} • AI-Консьерж</h4>
            <div class="revoo-status">
              <span class="revoo-status-dot"></span>
              <span>В сети 24/7 • Ответ за 2 сек</span>
            </div>
          </div>
        </div>
        <button class="revoo-close-btn" id="revooCloseBtn" aria-label="Закрыть">✕</button>
      </div>

      <div class="revoo-messages-area" id="revooMessages">
        <div class="revoo-msg revoo-msg-bot">
          Здравствуйте! Я официальный цифровой AI-консьерж «${venueName}». Отвечу на любые вопросы по бордер-ранам, документам, точкам сбора или помогу забронировать рейс!
        </div>
      </div>

      <!-- Direct Booking CTA Bar -->
      <a href="${bookingUrl}" target="_blank" style="display: flex; align-items: center; justify-content: space-between; margin: 4px 14px 6px 14px; padding: 10px 14px; background: linear-gradient(135deg, rgba(0, 255, 65, 0.15) 0%, rgba(0, 122, 255, 0.15) 100%); border: 1px solid rgba(0, 255, 65, 0.35); border-radius: 12px; text-decoration: none; color: #FFF; font-size: 12px; font-weight: 600; transition: all 0.2s;">
        <span style="display: flex; align-items: center; gap: 8px;">
          <span>🚌</span>
          <span>Выбрать рейс и место онлайн</span>
        </span>
        <span style="color: ${primaryColor}; font-weight: bold;">→</span>
      </a>

      <!-- Quick Prompt Chips -->
      <div class="revoo-chips-row" id="revooChips">
        <button class="revoo-chip" data-prompt="Какие документы нужны для поездки?">📄 Документы</button>
        <button class="revoo-chip" data-prompt="Откуда забирает трансфер?">🚐 Точки сбора</button>
        <button class="revoo-chip" data-prompt="Сколько стоит выезд и что включено?">💰 Тарифы и обед</button>
        <button class="revoo-chip" data-prompt="Берете ли вы клиентов с оверстеем?">🛂 Оверстей</button>
      </div>

      <div class="revoo-input-area">
        <input type="text" class="revoo-input-field" id="revooInput" placeholder="Напишите вопрос или выберите дату...">
        <button class="revoo-send-btn" id="revooSendBtn" aria-label="Отправить">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  // Elements
  const launcherBtn = document.getElementById('revooLauncherBtn');
  const chatWindow = document.getElementById('revooChatWindow');
  const closeBtn = document.getElementById('revooCloseBtn');
  const messagesArea = document.getElementById('revooMessages');
  const inputField = document.getElementById('revooInput');
  const sendBtn = document.getElementById('revooSendBtn');
  const chipsRow = document.getElementById('revooChips');

  let chatHistory = [];
  let isOpen = false;

  function toggleChat(force) {
    isOpen = typeof force === 'boolean' ? force : !isOpen;
    if (isOpen) {
      chatWindow.classList.add('revoo-open');
      inputField.focus();
    } else {
      chatWindow.classList.remove('revoo-open');
    }
  }

  launcherBtn.addEventListener('click', () => toggleChat());
  closeBtn.addEventListener('click', () => toggleChat(false));

  function formatMarkdown(text) {
    if (!text) return '';
    let esc = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Bold **text**
    esc = esc.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

    // Bullet lists
    esc = esc.replace(/(?:^|\n)[•\-*]\s+(.+)/g, '<br>• $1');

    // Numbered lists
    esc = esc.replace(/(?:^|\n)(\d+\.)\s+(.+)/g, '<br><b>$1</b> $2');

    // Line breaks
    esc = esc.replace(/\n/g, '<br>');
    return esc.replace(/^<br>/, '');
  }

  function appendMessage(text, sender) {
    const msg = document.createElement('div');
    msg.className = `revoo-msg revoo-msg-${sender}`;
    if (sender === 'bot') {
      msg.innerHTML = formatMarkdown(text);
    } else {
      msg.textContent = text;
    }
    messagesArea.appendChild(msg);
    messagesArea.scrollTop = messagesArea.scrollHeight;
    chatHistory.push({ role: sender === 'user' ? 'user' : 'assistant', text });
  }

  function showTyping() {
    const typing = document.createElement('div');
    typing.className = 'revoo-typing';
    typing.id = 'revooTyping';
    typing.innerHTML = '<span class="revoo-dot"></span><span class="revoo-dot"></span><span class="revoo-dot"></span>';
    messagesArea.appendChild(typing);
    messagesArea.scrollTop = messagesArea.scrollHeight;
  }

  function removeTyping() {
    const typing = document.getElementById('revooTyping');
    if (typing) typing.remove();
  }

  // Fallback intelligent simulator if backend Cloud Function is not responding or local
  function getLocalFallback(userText) {
    const t = userText.toLowerCase();
    if (t.includes('документ') || t.includes('паспорт') || t.includes('фото')) {
      return "Для поездки обязателен оригинал загранпаспорта сроком действия от 6 месяцев, минимум 2 чистые страницы для штампов и 2 цветных фото 3x4 см. Все документы координатор перепроверяет перед посадкой!";
    }
    if (t.includes('пикап') || t.includes('забор') || t.includes('откуда') || t.includes('где') || t.includes('отел') || t.includes('сбор')) {
      return "Бесплатный трансфер забирает пассажиров прямо от кондоминиумов и отелей в центральных районах, а также от Central Festival. Точное время подачи минивэна согласуем с вами накануне вечером.";
    }
    if (t.includes('оверстей') || t.includes('штраф') || t.includes('просроч')) {
      return "С небольшим оверстеем (до 7 дней) выезжать можно без проблем — штраф 500 бат/день официально оплачивается в окне иммиграции на границе. Главное — предупредите координатора при бронировании!";
    }
    if (t.includes('включен') || t.includes('обед') || t.includes('сбор') || t.includes('еда')) {
      return "В стоимость VIP-поездки входит: комфортабельный трансфер на новом минивэне с кондиционером, пограничные сборы, вип-коридор без очередей, горячий обед и питьевая вода на всем маршруте.";
    }
    if (t.includes('цен') || t.includes('стоим') || t.includes('тариф') || t.includes('рейс')) {
      return "Бордер-ран в Камбоджу: Базовый пакет — 2 900 ฿, VIP Всё включено — 3 800 ฿. Виза-ран в Пенанг на 2 дня — 7 500 ฿. Выезды ежедневные в 06:00 утра!";
    }
    return "Спасибо за вопрос! Вы можете выбрать желаемое направление и дату, или оставить номер телефона, и наш диспетчер свяжется с вами в течение 5 минут для подтверждения брони.";
  }

  async function sendMessage(textToSend) {
    const text = (textToSend || inputField.value).trim();
    if (!text) return;

    appendMessage(text, 'user');
    inputField.value = '';
    showTyping();

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueId: venueId,
          message: text,
          chatHistory: chatHistory.slice(-6)
        })
      });

      removeTyping();

      if (response.ok) {
        const data = await response.json();
        appendMessage(data.reply || data.text || getLocalFallback(text), 'bot');
      } else {
        appendMessage(getLocalFallback(text), 'bot');
      }
    } catch (e) {
      removeTyping();
      appendMessage(getLocalFallback(text), 'bot');
    }
  }

  sendBtn.addEventListener('click', () => sendMessage());
  inputField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  // Handle Quick Chips
  chipsRow.addEventListener('click', (e) => {
    const btn = e.target.closest('.revoo-chip');
    if (!btn) return;
    const prompt = btn.getAttribute('data-prompt');
    if (prompt) sendMessage(prompt);
  });
})();
