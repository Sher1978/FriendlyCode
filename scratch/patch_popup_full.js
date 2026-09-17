import fs from 'fs';

const path = 'c:/Sher_AI_Studio/projects/FriendlyCode/src/GbpDashboard.jsx';

let code = fs.readFileSync(path, 'utf8');

// 1. Add states and handlers right after const [isImportingForce, setIsImportingForce] = useState(false);
const stateTarget = "  const [isImportingForce, setIsImportingForce] = useState(false);";

const newStatesAndHandlers = `  const [isImportingForce, setIsImportingForce] = useState(false);

  // --- VENUE DETAILS POPUP & REVIEWS MANAGEMENT STATES ---
  const [popupTab, setPopupTab] = useState('reviews'); // 'reviews' | 'posts' | 'buttons'
  const [reviewFilter, setReviewFilter] = useState('all'); // 'all' | 'unanswered' | 'negative' | 'positive'
  const [replyTextMap, setReplyTextMap] = useState({});
  const [aiGeneratingReviewId, setAiGeneratingReviewId] = useState(null);
  const [isSubmittingReplyId, setIsSubmittingReplyId] = useState(null);

  const [reviewsList, setReviewsList] = useState([
    {
      id: 'rev-1',
      author: 'Александр В.',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80',
      rating: 5,
      date: 'Вчера',
      platform: 'google',
      text: 'Отличное место! Кофе всегда свежей обжарки, атмосфера супер, десерты вкуснейшие. Отдельное спасибо бариста за качественное обслуживание!',
      reply: 'Спасибо огромное за отзыв, Александр! Нам очень приятно, что вам всё понравилось. Всегда рады видеть вас снова!',
      replyDate: 'Вчера',
      isResponded: true
    },
    {
      id: 'rev-2',
      author: 'Мария К.',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80',
      rating: 2,
      date: '3 дня назад',
      platform: 'google',
      text: 'Долго ждали заказ (около 25 минут), хотя людей в зале было немного. Кофе принесли уже остывшим.',
      reply: null,
      replyDate: null,
      isResponded: false
    },
    {
      id: 'rev-3',
      author: 'Дмитрий С.',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=80&q=80',
      rating: 5,
      date: 'Неделю назад',
      platform: 'yandex',
      text: 'Очень уютно, стильный интерьер и быстрый Wi-Fi. Отличное место для работы с ноутбуком!',
      reply: 'Дмитрий, благодарны за обратную связь! Рады, что вам комфортно у нас работать.',
      replyDate: '5 дней назад',
      isResponded: true
    },
    {
      id: 'rev-4',
      author: 'Елена П.',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=80&q=80',
      rating: 4,
      date: '2 недели назад',
      platform: 'google',
      text: 'Вкусный раф и матча, но хотелось бы больше выбор веганских десертов.',
      reply: null,
      replyDate: null,
      isResponded: false
    }
  ]);

  // --- POSTS STATE ---
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostText, setNewPostText] = useState('');
  const [newPostType, setNewPostType] = useState('news');
  const [isPublishingPost, setIsPublishingPost] = useState(false);
  const [postsList, setPostsList] = useState([
    {
      id: 'post-1',
      title: '☕ Новое сезонное меню спешелти рафов!',
      type: 'offer',
      date: '5 дней назад',
      text: 'Попробуйте наш лавандовый раф и фисташковый латте. Торопитесь, предложение ограничено!',
      status: 'Опубликовано'
    }
  ]);

  // --- REVIEW MANAGEMENT HANDLERS ---
  const handleGenerateAiReply = (review) => {
    setAiGeneratingReviewId(review.id);
    showToast('🧠 ИИ Ревизор генерирует вежливый ответ...');
    setTimeout(() => {
      let aiDraft = '';
      if (review.rating <= 3) {
        aiDraft = \`Здравствуйте, \${review.author}! Приносим искренние извинения за задержку заказа. Мы уже провели беседу со сменой бариста и подкорректировали тайминги. Пожалуйста, напишите нам в личные сообщения или при следующем визите покажите этот ответ — мы угостим вас горячим напитком и десертом за наш счет, чтобы загладить впечатление!\`;
      } else {
        aiDraft = \`Здравствуйте, \${review.author}! Огромное спасибо за ваш отзыв и высокую оценку заведения "\${businessName}". Нам очень приятно! Обязательно учтем ваши пожелания. Ждем вас снова!\`;
      }
      setReplyTextMap(prev => ({ ...prev, [review.id]: aiDraft }));
      setAiGeneratingReviewId(null);
      showToast('✨ Ответ от ИИ Ревизора сгенерирован!');
    }, 1200);
  };

  const handleSendReply = (reviewId) => {
    const replyContent = replyTextMap[reviewId];
    if (!replyContent || !replyContent.trim()) {
      showToast('⚠️ Введите текст ответа перед отправкой!');
      return;
    }
    setIsSubmittingReplyId(reviewId);
    showToast('📤 Отправка ответа в Google Maps...');
    setTimeout(() => {
      setReviewsList(prev => prev.map(r => {
        if (r.id === reviewId) {
          return {
            ...r,
            reply: replyContent.trim(),
            replyDate: 'Только что',
            isResponded: true
          };
        }
        return r;
      }));
      setIsSubmittingReplyId(null);
      showToast('✅ Ответ успешно опубликован на Картах!');
    }, 1000);
  };

  const handleCreatePost = () => {
    if (!newPostTitle.trim() || !newPostText.trim()) {
      showToast('⚠️ Заполните заголовок и текст новости!');
      return;
    }
    setIsPublishingPost(true);
    showToast('🚀 Публикация новости на Картах...');
    setTimeout(() => {
      const created = {
        id: \`post-\${Date.now()}\`,
        title: newPostTitle.trim(),
        type: newPostType,
        date: 'Только что',
        text: newPostText.trim(),
        status: 'Опубликовано'
      };
      setPostsList(prev => [created, ...prev]);
      setNewPostTitle('');
      setNewPostText('');
      setIsPublishingPost(false);
      showToast('🎉 Новость успешно опубликована на Google Картах!');
    }, 1200);
  };`;

if (!code.includes(stateTarget)) {
  console.error("State target line not found");
  process.exit(1);
}

code = code.replace(stateTarget, newStatesAndHandlers);

// 2. Replace showVenuePopup modal JSX
const popupRegex = /\{\/\* VENUE POPUP \*\/\}[\s\S]*?\{\/\* TOP BAR: SCENARIO SELECTOR/;

const newPopupJsx = `{/* VENUE POPUP */}
        <AnimatePresence>
          {showVenuePopup && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#090A0F]/90 backdrop-blur-md"
              onClick={() => setShowVenuePopup(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 w-full max-w-3xl shadow-2xl relative max-h-[90vh] flex flex-col"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <span>📑 Разделы карточки</span>
                      <span className="text-sm font-normal text-blue-400">({businessName})</span>
                    </h3>
                    <p className="text-xs text-slate-400">Управление отзывами, постами и интерактивными кнопками заведения</p>
                  </div>
                  <button onClick={() => setShowVenuePopup(false)} className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-full transition">
                    ✕
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 mt-4 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                  <button
                    onClick={() => setPopupTab('reviews')}
                    className={\`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 \${
                      popupTab === 'reviews' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white'
                    }\`}
                  >
                    <span>💬 Отзывы (\${reviewsList.length})</span>
                  </button>
                  <button
                    onClick={() => setPopupTab('posts')}
                    className={\`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 \${
                      popupTab === 'posts' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-slate-400 hover:text-white'
                    }\`}
                  >
                    <span>📢 Новости & Посты (\${postsList.length})</span>
                  </button>
                  <button
                    onClick={() => setPopupTab('buttons')}
                    className={\`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 \${
                      popupTab === 'buttons' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-white'
                    }\`}
                  >
                    <span>🔗 Кнопки & Ссылки</span>
                  </button>
                </div>

                {/* Tab Content Area */}
                <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-4">
                  
                  {/* TAB 1: REVIEWS MANAGEMENT */}
                  {popupTab === 'reviews' && (
                    <div className="space-y-4">
                      {/* Rating Header Banner */}
                      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                          <div className="text-3xl font-black text-amber-400">4.0 ⭐</div>
                          <div>
                            <div className="text-xs font-bold text-white">Средний рейтинг на Картах</div>
                            <div className="text-[11px] text-slate-400">Всего отзывов: {reviewsList.length} | Без ответа: <span className="text-amber-400 font-bold">{reviewsList.filter(r => !r.isResponded).length}</span></div>
                          </div>
                        </div>

                        {/* Filters */}
                        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px]">
                          <button
                            onClick={() => setReviewFilter('all')}
                            className={\`px-2.5 py-1 rounded-lg font-bold transition \${reviewFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}\`}
                          >
                            Все
                          </button>
                          <button
                            onClick={() => setReviewFilter('unanswered')}
                            className={\`px-2.5 py-1 rounded-lg font-bold transition \${reviewFilter === 'unanswered' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white'}\`}
                          >
                            ⏳ Без ответа
                          </button>
                          <button
                            onClick={() => setReviewFilter('negative')}
                            className={\`px-2.5 py-1 rounded-lg font-bold transition \${reviewFilter === 'negative' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'text-slate-400 hover:text-white'}\`}
                          >
                            ⚠️ &lt; 4★
                          </button>
                          <button
                            onClick={() => setReviewFilter('positive')}
                            className={\`px-2.5 py-1 rounded-lg font-bold transition \${reviewFilter === 'positive' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-white'}\`}
                          >
                            ⭐ 5★
                          </button>
                        </div>
                      </div>

                      {/* Review Cards */}
                      {reviewsList
                        .filter(r => {
                          if (reviewFilter === 'unanswered') return !r.isResponded;
                          if (reviewFilter === 'negative') return r.rating < 4;
                          if (reviewFilter === 'positive') return r.rating === 5;
                          return true;
                        })
                        .map(rev => (
                          <div key={rev.id} className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <img src={rev.avatar} alt={rev.author} className="w-10 h-10 rounded-full object-cover border border-slate-600" />
                                <div>
                                  <div className="font-bold text-sm text-white flex items-center gap-2">
                                    <span>{rev.author}</span>
                                    <span className={\`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase \${rev.platform === 'google' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}\`}>
                                      {rev.platform === 'google' ? 'Google' : 'Яндекс'}
                                    </span>
                                  </div>
                                  <div className="text-xs text-amber-400 font-bold mt-0.5">
                                    {'⭐'.repeat(rev.rating)} <span className="text-slate-400 font-normal text-[11px] ml-1">({rev.date})</span>
                                  </div>
                                </div>
                              </div>

                              <div>
                                {rev.isResponded ? (
                                  <span className="px-3 py-1 rounded-xl text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                                    <span>✅ Отвечен</span>
                                  </span>
                                ) : (
                                  <span className="px-3 py-1 rounded-xl text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-1">
                                    <span>⏳ Требует ответа</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            <p className="text-sm text-slate-200 bg-slate-900/50 p-3 rounded-xl border border-slate-800/80">
                              "{rev.text}"
                            </p>

                            {/* Existing Reply Block */}
                            {rev.isResponded && (
                              <div className="bg-blue-950/30 border border-blue-800/40 p-3 rounded-xl ml-4 space-y-1">
                                <div className="text-[11px] font-bold text-blue-400 flex items-center justify-between">
                                  <span>💬 Ваш ответ (Владелец заведения):</span>
                                  <span className="text-slate-500 font-normal">{rev.replyDate}</span>
                                </div>
                                <p className="text-xs text-blue-100 italic">{rev.reply}</p>
                              </div>
                            )}

                            {/* Reply Input & AI Revizor Button */}
                            {(!rev.isResponded || replyTextMap[rev.id] !== undefined) && (
                              <div className="space-y-2 pt-2 border-t border-slate-700/40">
                                <textarea
                                  value={replyTextMap[rev.id] || ''}
                                  onChange={(e) => setReplyTextMap({ ...replyTextMap, [rev.id]: e.target.value })}
                                  placeholder="Напишите ответ на отзыв или нажмите 'Сгенерировать ответ ИИ'..."
                                  rows={2}
                                  className="w-full bg-slate-950/70 border border-slate-700 text-xs text-white rounded-xl p-3 outline-none focus:border-blue-500 transition"
                                />

                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <button
                                    onClick={() => handleGenerateAiReply(rev)}
                                    disabled={aiGeneratingReviewId === rev.id}
                                    className="px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 font-bold rounded-xl text-xs transition flex items-center gap-1.5 disabled:opacity-50"
                                  >
                                    <span>✨ {aiGeneratingReviewId === rev.id ? 'ИИ Ревизор думает...' : 'Сгенерировать ответ ИИ'}</span>
                                  </button>

                                  <button
                                    onClick={() => handleSendReply(rev.id)}
                                    disabled={isSubmittingReplyId === rev.id}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-blue-600/20 disabled:opacity-50"
                                  >
                                    <span>📤 {isSubmittingReplyId === rev.id ? 'Отправка...' : 'Опубликовать ответ'}</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}

                  {/* TAB 2: POSTS & NEWS */}
                  {popupTab === 'posts' && (
                    <div className="space-y-4">
                      {/* Create Post Card */}
                      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                        <h4 className="font-bold text-sm text-white flex items-center gap-2">
                          <span>➕ Создать новую новость или акцию</span>
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="md:col-span-2">
                            <input
                              type="text"
                              value={newPostTitle}
                              onChange={(e) => setNewPostTitle(e.target.value)}
                              placeholder="Заголовок (например: Скидка 20% на спешелти кофе!)"
                              className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 outline-none focus:border-purple-500"
                            />
                          </div>
                          <div>
                            <select
                              value={newPostType}
                              onChange={(e) => setNewPostType(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 outline-none"
                            >
                              <option value="news">Новость</option>
                              <option value="offer">Акция / Оффер</option>
                              <option value="event">Событие</option>
                            </select>
                          </div>
                        </div>

                        <textarea
                          value={newPostText}
                          onChange={(e) => setNewPostText(e.target.value)}
                          placeholder="Текст новости или детали акции..."
                          rows={2}
                          className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-xl p-3 outline-none focus:border-purple-500"
                        />

                        <div className="flex justify-end">
                          <button
                            onClick={handleCreatePost}
                            disabled={isPublishingPost}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50"
                          >
                            <span>🚀 {isPublishingPost ? 'Публикация...' : 'Опубликовать на Картах'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Published Posts Feed */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Опубликованные посты</h4>
                        {postsList.map(post => (
                          <div key={post.id} className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/60 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="font-bold text-sm text-white flex items-center gap-2">
                                <span>{post.title}</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase font-bold">
                                  {post.type === 'offer' ? 'Акция' : post.type === 'event' ? 'Событие' : 'Новость'}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400">{post.date}</span>
                            </div>
                            <p className="text-xs text-slate-300">{post.text}</p>
                            <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                              <span>✅ Status: {post.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: BUTTONS & LINKS */}
                  {popupTab === 'buttons' && (
                    <div className="space-y-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                      <h4 className="font-bold text-sm text-white">🔗 Управление кнопками карточки заведения</h4>
                      <p className="text-xs text-slate-400">Настройте прямой переход по кнопкам в карточке на Google и Яндекс Картах.</p>

                      <div className="space-y-3 pt-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">Ссылка на меню / Заказ</label>
                          <div className="flex gap-2">
                            <input
                              type="url"
                              value={menuLink}
                              onChange={(e) => setMenuLink(e.target.value)}
                              placeholder="https://svoicafe.ae/menu"
                              className="flex-1 bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                            />
                            <button
                              onClick={() => showToast('✅ Ссылка на меню сохранена!')}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition"
                            >
                              Сохранить
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">Прямой WhatsApp / Чат для брони</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="https://wa.me/97141234567"
                              className="flex-1 bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                            />
                            <button
                              onClick={() => showToast('✅ Ссылка на чат сохранена!')}
                              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition"
                            >
                              Сохранить
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TOP BAR: SCENARIO SELECTOR`;

code = code.replace(popupRegex, newPopupJsx);

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully updated GbpDashboard.jsx with full Review & Popup UI!");
