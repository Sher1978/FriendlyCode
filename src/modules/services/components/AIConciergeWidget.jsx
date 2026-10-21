import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCommentDots, 
  faTimes, 
  faPaperPlane, 
  faSpinner, 
  faRobot,
  faCalendarAlt,
  faFire
} from '@fortawesome/free-solid-svg-icons';

export const AIConciergeWidget = ({ venue, onOpenBooking }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: `Здравствуйте! Я цифровой консьерж ${venue?.name || 'заведения'}. Чем могу помочь? Могу подсказать по ценам, парковке или подобрать свободное окно со скидкой!`
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const quickPrompts = [
    "Какие цены на услуги?",
    "Где припарковаться?",
    "Свободные окна сегодня со скидкой",
    "Можно ли с собакой?"
  ];

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMsg = { id: Date.now(), sender: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Build chat history
      const history = messages.slice(-6).map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        text: m.text
      }));

      // Call Cloud Function or fallback intelligent responder
      const res = await fetch('/conciergeChatHttp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueId: venue?.id || 'default_venue',
          message: text,
          chatHistory: history
        })
      }).catch(() => null);

      let botReply = '';
      if (res && res.ok) {
        const data = await res.json();
        botReply = data.reply;
      } else {
        // High-fidelity local simulation if backend function is not running locally
        botReply = simulateLocalConciergeResponse(text, venue);
      }

      setMessages(prev => [
        ...prev,
        { id: Date.now() + 1, sender: 'bot', text: botReply }
      ]);
    } catch (err) {
      console.warn('AI Concierge error:', err);
      setMessages(prev => [
        ...prev,
        { 
          id: Date.now() + 1, 
          sender: 'bot', 
          text: 'Спасибо за вопрос! Вы можете выбрать удобное время со скидкой прямо в расписании на этой странице.' 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Launcher Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-[#00FF41] to-[#007AFF] text-black flex items-center justify-center shadow-xl shadow-[#00FF41]/20 hover:scale-105 active:scale-95 transition-all"
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
              >
                <FontAwesomeIcon icon={faTimes} className="text-xl" />
              </motion.div>
            ) : (
              <motion.div
                key="open"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="relative flex items-center justify-center"
              >
                <FontAwesomeIcon icon={faCommentDots} className="text-2xl" />
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#FF9933] border-2 border-black animate-pulse" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Chat Window Dialog */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 right-4 sm:right-6 z-40 w-[calc(100vw-2rem)] sm:w-96 max-h-[520px] h-[500px] bg-[#141416]/95 border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl"
          >
            {/* Header */}
            <div className="p-3.5 bg-[#1C1C1E] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#00FF41]/20 text-[#00FF41] flex items-center justify-center border border-[#00FF41]/30">
                  <FontAwesomeIcon icon={faRobot} className="text-sm" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white leading-tight">
                    AI-Консьерж 24/7
                  </div>
                  <div className="text-[10px] text-[#00FF41] flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00FF41] animate-pulse" />
                    <span>Онлайн · Отвечает за 2 сек</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-white/40 hover:text-white p-1 text-sm"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs scrollbar-thin">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                      msg.sender === 'user'
                        ? 'bg-[#00FF41] text-black font-medium rounded-br-none shadow-md'
                        : 'bg-[#1C1C1E] text-white/90 border border-white/10 rounded-bl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="p-3 rounded-2xl bg-[#1C1C1E] border border-white/10 text-white/50 flex items-center gap-2 text-xs">
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin text-[#00FF41]" />
                    <span>Печатает ответ...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts Carousel */}
            <div className="px-3 pb-2 pt-1 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSendMessage(prompt)}
                  className="shrink-0 px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-white/70 whitespace-nowrap transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-[#18181A] border-t border-white/10 flex items-center gap-2">
              <input
                type="text"
                placeholder="Напишите вопрос или время..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 bg-[#121214] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#00FF41]"
              />
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isLoading}
                className="w-8 h-8 rounded-xl bg-[#00FF41] disabled:opacity-40 text-black flex items-center justify-center shrink-0 transition-all font-bold"
              >
                <FontAwesomeIcon icon={faPaperPlane} className="text-xs" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Fallback intelligent simulator if running locally without backend cloud function
function simulateLocalConciergeResponse(text, venue) {
  const t = text.toLowerCase();
  const name = venue?.name || 'заведении';

  if (t.includes('парковк') || t.includes('машин') || t.includes('проезд')) {
    return `Парковка в ${name} расположена прямо перед входом и во внутреннем дворе. Если шлагбаум закрыт — наберите администратора, мы сразу откроем!`;
  }
  if (t.includes('собак') || t.includes('животн') || t.includes('кошк')) {
    return `Мы pet-friendly! С воспитанными собаками небольших пород к нам можно без проблем. Ждем вас вместе с питомцем.`;
  }
  if (t.includes('цен') || t.includes('стоим') || t.includes('прайс')) {
    return `Наши цены начинаются от 1 000 ₽. Вы можете выбрать любую услугу в списке выше — в дневные часы (с 12:00 до 16:00) действуют динамические скидки до -30%!`;
  }
  if (t.includes('скидк') || t.includes('окн') || t.includes('сегодня') || t.includes('время')) {
    return `Сегодня и в ближайшие дни есть свободные окна со скидкой до 25%! Нажмите на услугу и выберите время со значком пламени (🔥) — скидка применится автоматически.`;
  }
  return `Будем рады видеть вас в ${name}! Выберите желаемую услугу в списке выше, укажите удобное время, и мы забронируем за вами визит без всякой предоплаты.`;
}
