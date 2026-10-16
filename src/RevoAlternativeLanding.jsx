import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBolt, 
  faMapMarkerAlt, 
  faStar, 
  faCheckCircle, 
  faTimesCircle, 
  faExclamationTriangle, 
  faSearch, 
  faChevronDown, 
  faChevronLeft, 
  faChevronRight, 
  faArrowRight, 
  faShieldHalved, 
  faUtensils, 
  faCut, 
  faStethoscope, 
  faSpa, 
  faMobileScreen, 
  faChartLine, 
  faCoins, 
  faFire, 
  faStore, 
  faUserCheck,
  faCheck,
  faXmark
} from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp, faTelegram } from '@fortawesome/free-brands-svg-icons';
import { useNavigate } from 'react-router-dom';
import PngBattery from './PngBattery';
import B2BContactModal from './B2BContactModal';
import LanguageSwitcher from './LanguageSwitcher';
import ProfitCalculator from './ProfitCalculator';
import OutrichRevenueWidget from './OutrichRevenueWidget';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// 🚀 Индекса рекламной независимости (Ad Independence Index) Component

// 🌍 Multi-language Dictionary Helper for RevoAlternativeLanding (/maps)
const getT = (lang = 'ru') => {
  const isEn = lang === 'en';
  const isVi = lang === 'vi';
  const isTr = lang === 'tr';
  const isAr = lang === 'ar';
  const isUk = lang === 'uk';
  const isKa = lang === 'ka';

  const t = {
    // Ad Independence Index Widget
    indexBadge: isEn ? "⚡ OUTRICH PROPRIETARY METRIC" : isVi ? "⚡ CHỈ SỐ ĐỘC LẬP OUTRICH" : isTr ? "⚡ OUTRICH ÖZEL METRİK" : "⚡ ФИРМЕННАЯ МЕТРИКА OUTRICH",
    indexTitle: isEn ? "Business Ad Independence Index" : isVi ? "Chỉ số độc lập quảng cáo doanh nghiệp" : isTr ? "İşletme Reklam Bağımsızlık Endeksi" : "Индекс рекламной независимости бизнеса",
    indexDesc: isEn ? "Shows the percentage of clients coming on autopilot without target or PPC ad spend. With Outrich, your business elevates this index from 0% to 100%." : isVi ? "Hiển thị tỷ lệ khách hàng đến tự động mà không cần chi tiêu quảng cáo target/PPC. Với Outrich, doanh nghiệp tăng chỉ số từ 0% lên 100%." : "Показывает долю клиентов, приходящих на автопилоте без вливаний в таргет и контекст. С Outrich ваш бизнес повышает этот индекс с 0% до 100%.",
    currIndex: isEn ? "Current Index:" : isVi ? "Chỉ số hiện tại:" : "Текущий индекс:",
    organicsVsAds: isEn ? "Organic vs Paid Ads" : isVi ? "Tự nhiên vs Quảng cáo" : "Органика vs Реклама",
    scale0: isEn ? "0% — Ad Addiction (Risk)" : isVi ? "0% — Phụ thuộc quảng cáo" : "0% — Рекламная игла (Риск)",
    scale50: isEn ? "50% — Transition Phase" : isVi ? "50% — Giai đoạn chuyển tiếp" : "50% — Переходный этап",
    scale100: isEn ? "100% — Full Google Maps Autopilot" : isVi ? "100% — Tự động hóa Google Maps" : "100% — Полный автопилот Google Maps",
    status0Title: isEn ? "Index 0% (Before Outrich Activation):" : isVi ? "Chỉ số 0% (Trước khi kích hoạt):" : "Индекс 0% (До активации Outrich):",
    status0Desc: isEn ? "You are completely dependent on daily ad budgets or unpredictable word of mouth. Turn off ads — leads drop to zero." : isVi ? "Bạn phụ thuộc hoàn toàn vào ngân sách quảng cáo hàng ngày. Tắt quảng cáo — khách hàng giảm về 0." : "Вы полностью зависимы от ежедневного бюджета на рекламу или случайного сарафана. Выключили таргет — заявки рухнули до нуля.",
    status100Title: isEn ? "Index 100% (After Outrich Activation):" : isVi ? "Chỉ số 100% (Sau khi kích hoạt Outrich):" : "Индекс 100% (После активации Outrich):",
    status100Desc: isEn ? "Your profile in TOP-3 Local Pack captures hot neighborhood demand 24/7 on autopilot without paying a single cent for clicks." : isVi ? "Hồ sơ TOP-3 Local Pack của bạn thu hút nhu cầu nóng 24/7 tự động mà không tốn 1 xu chi phí click." : "Профиль в ТОП-3 Local Pack забирает горячий спрос в районе. Клиенты идут 24/7 на автопилоте без единого цента расходов на клики.",

    // Nav Bar
    auditBtn: isEn ? "FREE AI-AUDIT" : isVi ? "AUDIT AI MIỄN PHÍ" : isTr ? "ÜCRETSİZ AI-DENETİMİ" : "БЕСПЛАТНЫЙ AI-АУДИТ",
    
    // Hero Section
    fomoQuestion: isEn ? "How many leads will your business get if you turn off ads tomorrow?" : isVi ? "Doanh nghiệp của bạn nhận bao nhiêu khách nếu tắt quảng cáo vào ngày mai?" : "Сколько заявок получит Ваш бизнес, если завтра отключить рекламу?",
    fomoSub: isEn ? "For 90% of entrepreneurs, the answer is 0 leads, because they rely on ad addiction or word of mouth. Google Maps brings clients on autopilot without ad spend." : isVi ? "Đối với 90% chủ doanh nghiệp, câu trả lời là 0 khách. Google Maps mang lại khách hàng tự động mà không cần ngân sách quảng cáo." : "Для 90% предпринимателей ответ — 0 заявок, потому что они сидят на «игле» платного трафика или надеются на непредсказуемый «сарафан». Google Maps приносит клиентов на автопилоте без вложений в рекламу.",
    heroCta: isEn ? "⚡ RUN FREE AI AUDIT" : isVi ? "⚡ CHẠY AUDIT AI MIỄN PHÍ" : isTr ? "⚡ ÜCRETSİZ AI AUDIT BAŞLAT" : "⚡ ЗАПУСТИТЬ AI-АУДИТ БЕСПЛАТНО",

    // Block 2 (iPhone)
    mobileHeader: isEn ? "NEW ERA OF LOCAL MARKETING" : isVi ? "KỶ NGUYÊN MỚI MARKETING ĐỊA PHƯƠNG" : "НОВАЯ ЭРА ЛОКАЛЬНОГО МАРКЕТИНГА",
    mobileTitle: isEn ? "Forget traditional social media. Google Maps is your primary sales engine." : isVi ? "Quên mạng xã hội đi. Google Maps là cỗ máy bán hàng chính của bạn." : "Забудьте про соцсети. Google Maps — это ваш главный продающий Instagram.",
    mod1Title: isEn ? "AI Auto-Posting every 48h" : isVi ? "Tự động đăng bài AI mỗi 48h" : "AI-Автопостинг каждые 48ч",
    mod1Sub: isEn ? "100% EXIF-GPS tagged photos & menu" : isVi ? "100% ảnh & thực đơn gắn thẻ EXIF-GPS" : "100% EXIF-GPS гео-метки и меню",
    mod2Title: isEn ? "Smart AI Review Replies 24/7" : isVi ? "Trả lời đánh giá AI thông minh 24/7" : "Умные автоответы на отзывы",
    mod2Sub: isEn ? "Automatic SEO keywords injection" : isVi ? "Tự động chèn từ khóa SEO" : "Вшивание SEO-ключей 24/7",
    mod3Title: isEn ? "AI Reputation Shield" : isVi ? "Lá chắn uy tín AI" : "ИИ-Щит Репутации",
    mod3Sub: isEn ? "Negative feedback intercept & 1★ removal" : isVi ? "Chặn phản hồi xấu & Gỡ 1★ giả" : "Перехват негатива & Снос 1★ фейков",

    // Takeaway Banner
    takeawayTitle: isEn ? "⚡ KEY ANALYTICS TAKEAWAY:" : isVi ? "⚡ KẾT LUẬN PHÂN TÍCH CHÍNH:" : "⚡ КЛЮЧЕВОЙ ВЫВОД АНАЛИТИКИ:",
    takeawayText: isEn ? "Google Maps users have already decided to buy. You don't need to hard sell — just welcome them to your venue!" : isVi ? "Người dùng Google Maps đã quyết định mua hàng. Bạn không cần bán hàng — chỉ cần đón tiếp họ!" : "Пользователи Google Maps уже приняли решение о покупке. Им не нужно «продавать» — их нужно просто принять в вашем заведении!",
    takeawayBadge: isEn ? "🚀 70X HIGHER REVENUE" : isVi ? "🚀 DOANH THU CAO GẤP 70 LẦN" : "🚀 70X ВЫШЕ ВЫРУЧКА",

    // Why Now / Urgency Block
    whyNowBadge: isEn ? "⚡ BEAT COMPETITORS: WINDOW OF OPPORTUNITY" : isVi ? "⚡ VƯỢT ĐỐI THỦ: CƠ HỘI VÀNG" : "⚡ ОПЕРЕДИТЕ КОНКУРЕНТОВ: ОКНО ВОЗМОЖНОСТЕЙ",
    whyNowTitle: isEn ? "Why NOW is the time to lock in TOP-3 in your area while competitors sleep?" : isVi ? "Tại sao BÂY GIỜ là lúc chiếm TOP-3 khu vực khi đối thủ đang ngủ?" : "Почему именно СЕЙЧАС нужно забрать ТОП-3 района, пока конкуренты спят?",
    whyNowSub: isEn ? "While 90% of venues in your district drain ad budgets, Google algorithms are redistributing local search market share right now." : isVi ? "Trong khi 90% địa điểm lãng phí ngân sách, thuật toán Google đang phân chia lại thị phần địa phương ngay bây giờ." : "Пока 90% заведений в вашем районе надеются на старый сарафан или сливают бюджеты в рекламу, алгоритмы Google заново делят локальный рынок.",

    // Market Facts
    fact1Title: isEn ? "Purchase without website click" : isVi ? "Mua hàng không qua website" : "Покупка без перехода на сайт",
    fact1Desc: isEn ? "68% of local searchers make calls or visits directly from Google Maps cards without opening websites." : isVi ? "68% người tìm kiếm địa phương gọi điện hoặc đến trực tiếp từ Google Maps." : "По данным исследований Google, 68% локальных клиентов совершают звонок или визит прямо из карточки Google Maps.",
    fact2Title: isEn ? "AI Recommendations 2026" : isVi ? "Khuyến nghị AI 2026" : "ИИ-Рекомендации 2026",
    fact2Desc: isEn ? "ChatGPT and Gemini draw recommendations strictly from active TOP-3 Google Maps profiles." : isVi ? "ChatGPT và Gemini chỉ đề xuất các hồ sơ TOP-3 Google Maps đang hoạt động." : "ИИ-ассистенты вытягивают рекомендации ТОЛЬКО из профилей ТОП-3 Google Maps, имеющих регулярную активность.",
    fact3Title: isEn ? "Monopoly Barrier Effect" : isVi ? "Hiệu ứng rào cản độc quyền" : "Монопольный барьер",
    fact3Desc: isEn ? "Early AI-autopilot adopters build cumulative Google ranking signals that competitors cannot catch up to for years." : isVi ? "Các doanh nghiệp tiên phong tích lũy xếp hạng Google mà đối thủ khó vượt qua." : "Заведения, первые включившие ИИ-автопилот, накапливают историю поведенческих факторов Google."
  };

  return t;
};

const AdIndependenceIndexWidget = () => {
  const [val, setVal] = useState(0);
  const widgetRef = useRef(null);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.25 }
    );
    if (widgetRef.current) observer.observe(widgetRef.current);
    return () => observer.disconnect();
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;
    let current = 0;
    const duration = 2400; // 2.4s smooth animation
    const intervalTime = 20;
    const steps = duration / intervalTime;
    const increment = 100 / steps;

    const timer = setInterval(() => {
      current += increment;
      if (current >= 100) {
        setVal(100);
        clearInterval(timer);
      } else {
        setVal(Math.floor(current));
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [hasStarted]);

  const getColor = (v) => {
    if (v < 40) return '#EA4335';
    if (v < 75) return '#FBBC05';
    if (v < 96) return '#10B981';
    return '#00FF66';
  };

  const currentColor = getColor(val);

  return (
    <div ref={widgetRef} className="my-10 bg-[#1A1C20] border-2 border-white/20 rounded-3xl p-6 sm:p-10 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden text-left">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 border-b border-white/10 pb-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#00FF66]/15 border border-[#00FF66]/40 text-[#00FF66] text-xs font-mono font-bold uppercase tracking-wider">
            ⚡ ФИРМЕННАЯ МЕТРИКА OUTRICH
          </div>
          <h3 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Индекс рекламной независимости бизнеса
          </h3>
          <p className="text-sm sm:text-base text-white/80 font-medium leading-relaxed">
            Показывает долю клиентов, приходящих на автопилоте без вливаний в таргет и контекст. С Outrich ваш бизнес повышает этот индекс с <strong className="text-[#EA4335]">0%</strong> до <strong className="text-[#00FF66]">100%</strong>.
          </p>
        </div>

        {/* Live Animated Big Counter Box */}
        <div className="flex items-center gap-4 bg-black/80 px-6 sm:px-8 py-5 rounded-3xl border border-white/20 flex-shrink-0 shadow-2xl">
          <div className="text-right">
            <span className="text-xs font-mono text-white/80 block uppercase">Текущий индекс:</span>
            <span className="text-xs font-mono text-white/70 block">Органика vs Реклама</span>
          </div>
          <span 
            className="text-5xl sm:text-7xl font-black font-mono transition-colors duration-200"
            style={{ 
              color: currentColor, 
              textShadow: val >= 96 ? '0 0 35px rgba(0,255,102,0.9)' : `0 0 20px ${currentColor}88` 
            }}
          >
            {val}%
          </span>
        </div>
      </div>

      {/* Progress Scale Meter */}
      <div className="space-y-3 mb-8">
        <div className="flex justify-between text-xs sm:text-sm font-mono font-bold text-white/80">
          <span>Без Outrich (0% — Полная зависимость):</span>
          <span style={{ color: currentColor }}>
            {val < 96 ? `Рост независимости: ${val}%` : '100% Автономность трафика (OUTRICH REVO)'}
          </span>
        </div>

        <div className="w-full bg-black/90 h-6 rounded-full overflow-hidden p-1 border border-white/20 relative shadow-inner">
          <div 
            className="h-full rounded-full transition-all duration-150 relative flex items-center justify-end pr-2"
            style={{ 
              width: `${val}%`, 
              backgroundColor: currentColor,
              boxShadow: val >= 96 ? '0 0 25px #00FF66' : `0 0 15px ${currentColor}`
            }}
          >
            {val > 15 && (
              <span className="text-xs font-mono font-black text-black uppercase tracking-widest">
                {val}%
              </span>
            )}
          </div>
        </div>

        <div className="flex justify-between text-xs font-mono text-white/70 pt-1">
          <span className="text-[#EA4335] font-bold">0% — Рекламная игла (Риск)</span>
          <span className="text-[#FBBC05] font-bold">50% — Переходный этап</span>
          <span className="text-[#00FF66] font-bold">100% — Полный автопилот Google Maps</span>
        </div>
      </div>

      {/* 2-Column Status Comparison Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-black/60 border border-[#EA4335]/40 flex items-start gap-3.5">
          <span className="text-2xl">⚠️</span>
          <div>
            <h5 className="font-bold text-white text-sm sm:text-base">Индекс 0% (До активации Outrich):</h5>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed mt-1">
              Вы полностью зависимы от ежедневного бюджета на рекламу или случайного сарафана. Выключили таргет — заявки рухнули до нуля.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#00FF66]/10 border border-[#00FF66]/40 flex items-start gap-3.5">
          <span className="text-2xl">🚀</span>
          <div>
            <h5 className="font-bold text-white text-sm sm:text-base">Индекс 100% (После активации Outrich):</h5>
            <p className="text-xs sm:text-sm text-white/90 leading-relaxed mt-1">
              Профиль в ТОП-3 Local Pack забирает горячий спрос в районе. Клиенты идут 24/7 на автопилоте без единого цента расходов на клики.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const RevoAlternativeLanding = () => {
  const { i18n } = useTranslation();
  const lang = i18n.language?.substring(0, 2) || 'ru';
  const navigate = useNavigate();
  
  // Navigation & Modal States
  const [scrolled, setScrolled] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  
  // Hero Niche Slider state
  const [activeNicheIdx, setActiveNicheIdx] = useState(0);

  // Battery Cycle State (Identical to existing identity)
  const [batteryDiscount, setBatteryDiscount] = useState(20);
  const [displayEnergy, setDisplayEnergy] = useState(100);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(null);

  // Validator Block States (Taken from GoogleMapsRankChecker)
  const [valStep, setValStep] = useState('input'); // input, loading, result, success
  const [valInput, setValInput] = useState('');
  const [valPlaceDetails, setValPlaceDetails] = useState(null);
  const [valHealthScore, setValHealthScore] = useState(0);
  const [valProgress, setValProgress] = useState(0);
  const [valContactInfo, setValContactInfo] = useState('');
  const [valSubmitting, setValSubmitting] = useState(false);
  const [valSearching, setValSearching] = useState(false);

  // Final Form Capture States
  const [formName, setFormName] = useState('');
  const [formNiche, setFormNiche] = useState('Ресторан');
  const [formLocation, setFormLocation] = useState('');
  const [formMessenger, setFormMessenger] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);

  const autocompleteRef = useRef(null);
  const valInputRef = useRef(null);
  const auditSectionRef = useRef(null);
  const heroSectionRef = useRef(null);

  // Scroll watcher for Header & Sticky Bottom CTA Bar
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setScrolled(scrollY > 50);
      setShowStickyBar(scrollY > 450);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Battery Energy Cycle
  useEffect(() => {
    const cycle = [
      { energy: 100, discount: 20 },
      { energy: 50, discount: 15 },
      { energy: 25, discount: 10 },
      { energy: 10, discount: 5 }
    ];
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % cycle.length;
      setDisplayEnergy(cycle[index].energy);
      setBatteryDiscount(cycle[index].discount);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  // Niche Cards data for Hero Slider (1 featured slide per view)
  const nicheCards = [
    {
      id: 'restaurants',
      icon: faUtensils,
      title: '🍽 Рестораны & Кафе',
      stat: '92% людей',
      statLabel: 'ищут еду через локальные гео-запросы',
      text: 'Пользователи вбивают «сырники рядом» или «стейкхаус». Это самый высокий транзакционный интент в общепите. Если вас нет в ТОП-3 Local Pack — вы теряете до 80% всех горячих чеков района.',
      badge: 'Высокий чек',
      metricPercent: 92,
      metricLabel: 'Поисковый интент гостей',
      color: '#00FF66'
    },
    {
      id: 'barbershops',
      icon: faCut,
      title: '✂️ Барбершопы & Салоны',
      stat: 'До 40 клиентов',
      statLabel: 'в неделю отдаются соседям из-за отсутствия в выдаче',
      text: 'Клиент ищет услугу «на сегодня в радиусе 2 км». Если карточка не в ТОП-3 Google — кресла остаются пустыми в середине недели. Сгорающая скидка ⚡ Revo мгновенно закрывает "тихие часы".',
      badge: 'Локальный пик',
      metricPercent: 85,
      metricLabel: 'Загрузка "тихих часов"',
      color: '#4285F4'
    },
    {
      id: 'clinics',
      icon: faStethoscope,
      title: '🩺 Клиники & Стоматологии',
      stat: 'Рейтинг 4.9+',
      statLabel: 'формирует 95% первичных онлайн-записей',
      text: 'Первичный прием формируется из Поиска. Люди ищут решение конкретной боли и выбирают профили с топовыми позициями и свежими положительными отзывами.',
      badge: 'Макс. LTV',
      metricPercent: 95,
      metricLabel: 'Доверие пациентов к ТОП-3',
      color: '#FBBC05'
    },
    {
      id: 'masters',
      icon: faSpa,
      title: '💆‍♂️ Выездные мастера & СПА',
      stat: '0$ За веб-сайт',
      statLabel: '100% автономный сайт на базе профиля Google',
      text: 'Google Business Profile — это ваш автономный сайт, который индексируется алгоритмами без необходимости тратить тысячи долларов на программистов.',
      badge: '100% Автономность',
      metricPercent: 100,
      metricLabel: 'Органический охват локации',
      color: '#10B981'
    }
  ];

  const handleValInputChange = (e) => {
    setValInput(e.target.value);
  };

  // Google Places Autocomplete Initialization for Validator Block (Safe Non-Freezing Setup)
  useEffect(() => {
    let isMounted = true;
    let timer = null;

    const setupAutocomplete = () => {
      if (!isMounted) return;
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        timer = setTimeout(setupAutocomplete, 500);
        return;
      }
      if (valInputRef.current && !autocompleteRef.current) {
        try {
          autocompleteRef.current = new window.google.maps.places.Autocomplete(valInputRef.current, {
            fields: ['place_id', 'name', 'rating', 'user_ratings_total', 'website', 'formatted_address'],
            types: ['establishment']
          });

          autocompleteRef.current.addListener('place_changed', () => {
            if (!isMounted || !autocompleteRef.current) return;
            try {
              const place = autocompleteRef.current.getPlace();
              if (place && (place.place_id || place.name)) {
                if (place.name) setValInput(place.name);
                setValPlaceDetails(place);
                runAuditAnalysis(place);
              }
            } catch (err) {
              console.error('Google Autocomplete place error:', err);
            }
          });
        } catch (e) {
          console.warn('Autocomplete init warning:', e);
        }
      }
    };

    if (valStep === 'input') {
      setupAutocomplete();
    }

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [valStep]);

  // Validator Search Submit Handler
  const handleValSearchSubmit = async (e) => {
    if (e) e.preventDefault();
    const query = valInput.trim();
    if (!query) return;

    setValSearching(true);

    if (query.includes('maps.app.goo.gl') || query.includes('google.com/maps') || query.includes('http://') || query.includes('https://')) {
      const mockPlace = {
        name: 'Заведение по ссылке',
        formatted_address: query,
        rating: 4.2,
        user_ratings_total: 45,
        website: ''
      };
      setValPlaceDetails(mockPlace);
      setValSearching(false);
      runAuditAnalysis(mockPlace);
      return;
    }

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const placeName = item.name || item.display_name.split(',')[0] || query;
        const mockPlace = {
          name: placeName,
          formatted_address: item.display_name,
          rating: 4.3,
          user_ratings_total: 58,
          website: ''
        };
        setValPlaceDetails(mockPlace);
        setValSearching(false);
        runAuditAnalysis(mockPlace);
        return;
      }
    } catch (err) {
      console.error('Geocoding fallback error:', err);
    }

    const fallbackPlace = {
      name: query,
      formatted_address: `${query}, Local Business Profile`,
      rating: 4.1,
      user_ratings_total: 34,
      website: ''
    };
    setValPlaceDetails(fallbackPlace);
    setValSearching(false);
    runAuditAnalysis(fallbackPlace);
  };

  const runAuditAnalysis = (place) => {
    setValStep('loading');
    let score = 70;
    const rating = parseFloat(place.rating) || 0;
    const reviews = parseInt(place.user_ratings_total) || 0;
    
    if (rating >= 4.7) score += 10;
    else if (rating < 4.5) score -= 15;

    if (reviews >= 50) score += 5;
    else score -= 10;

    if (place.website) score += 5;
    else score -= 5;
    
    score -= 20; // Deep SEO penalty to trigger lead action
    score -= Math.floor(Math.random() * 8);
    if (score < 10) score = 10;

    setValHealthScore(score);

    let curr = 0;
    const interval = setInterval(() => {
      curr += 5;
      setValProgress(curr);
      if (curr >= 100) {
        clearInterval(interval);
        setTimeout(() => setValStep('result'), 300);
      }
    }, 120);
  };

  const handleValLeadSubmit = async (e) => {
    e.preventDefault();
    if (!valContactInfo.trim()) return;

    setValSubmitting(true);
    try {
      await addDoc(collection(db, 'leads_b2b_audit'), {
        contact: valContactInfo,
        placeName: valPlaceDetails?.name || 'Unknown',
        placeAddress: valPlaceDetails?.formatted_address || '',
        placeRating: valPlaceDetails?.rating || 0,
        placeReviews: valPlaceDetails?.user_ratings_total || 0,
        healthScore: valHealthScore,
        timestamp: serverTimestamp(),
        source: 'revo_alt_validator'
      });
      setValStep('success');
    } catch (error) {
      console.error('Error saving lead:', error);
      alert('Произошла ошибка при отправке. Пожалуйста, попробуйте еще раз.');
    }
    setValSubmitting(false);
  };

  // Final Form Submit Handler (Block 9)
  const handleFinalFormSubmit = async (e) => {
    e.preventDefault();
    if (!formMessenger.trim()) return;

    setFormSubmitting(true);
    try {
      await addDoc(collection(db, 'leads_b2b_audit'), {
        placeName: formName || 'Не указано',
        niche: formNiche,
        location: formLocation || 'Не указано',
        contact: formMessenger,
        timestamp: serverTimestamp(),
        source: 'revo_alt_final_form'
      });
      setFormSuccess(true);
    } catch (error) {
      console.error('Error saving final form:', error);
      alert('Ошибка при отправке формы. Пожалуйста, повторите попытку.');
    }
    setFormSubmitting(false);
  };

  const scrollToAudit = () => {
    if (auditSectionRef.current) {
      auditSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    } else {
      setIsContactModalOpen(true);
    }
  };

  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } }
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white font-sans selection:bg-[#00FF66]/30 overflow-x-hidden relative">
      
      {/* Ambient OLED Blurs (Google Maps Night Mode Palette: #121212, #4285F4, #EA4335, #00FF66) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#4285F4]/10 blur-[140px] rounded-full" />
        <div className="absolute top-[35%] right-[-10%] w-[600px] h-[600px] bg-[#00FF66]/10 blur-[160px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[20%] w-[700px] h-[700px] bg-[#EA4335]/5 blur-[150px] rounded-full" />
      </div>

      {/* ── TOP NAVIGATION ── */}
      <nav className={`fixed top-0 left-0 w-full z-50 px-4 sm:px-8 py-4 transition-all duration-300 ${scrolled ? 'bg-[#121212]/95 backdrop-blur-2xl border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.8)] py-3' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src="/revoo-logo.png" className={`transition-all duration-300 ${scrolled ? 'h-7' : 'h-9'} object-contain mix-blend-screen opacity-90 drop-shadow-[0_0_12px_rgba(0,255,102,0.4)]`} alt="REVO Logo" />
            <span className="hidden sm:inline-block text-xs font-mono font-bold text-[#00FF66] bg-[#00FF66]/10 px-2.5 py-1 rounded-full border border-[#00FF66]/30 uppercase tracking-widest">
              LOCAL DOMINANCE
            </span>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <button 
              onClick={scrollToAudit}
              className="bg-[#00FF66] hover:bg-[#10B981] text-black px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider shadow-[0_0_20px_rgba(0,255,102,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FontAwesomeIcon icon={faBolt} />
              <span className="hidden xs:inline">БЕСПЛАТНЫЙ</span> AI-АУДИТ
            </button>
          </div>
        </div>
      </nav>

      {/* 🟢 БЛОК 1: HERO-ЭКРАН С FOMO-СЛАЙДЕРОМ */}
      <section ref={heroSectionRef} className="relative min-h-[92vh] flex flex-col justify-end pt-28 pb-12 px-4 sm:px-6 z-10 border-b border-white/10 overflow-hidden">
        {/* Background: Night Mode Interactive Google Map visual */}
        <div className="absolute inset-0 z-0 bg-[#121212]">
          <div 
            className="absolute inset-0 opacity-40 mix-blend-luminosity scale-105"
            style={{
              backgroundImage: 'url(/assets/emirates-golf.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'brightness(0.5) contrast(1.3)'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/80 to-transparent" />
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, #4285F4 1px, transparent 1px)', backgroundSize: '36px 36px' }} />

          {/* Competitor Dimmed Red Pins */}
          <div className="absolute top-[28%] left-[20%] opacity-40 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-[#EA4335]/30 border border-[#EA4335] flex items-center justify-center text-[#EA4335] text-xs shadow-[0_0_15px_rgba(234,67,53,0.5)]">
              <FontAwesomeIcon icon={faMapMarkerAlt} />
            </div>
            <span className="text-xs font-mono text-white/80 block mt-1 bg-black/60 px-1.5 rounded">Конкурент #12</span>
          </div>

          <div className="absolute top-[35%] right-[22%] opacity-40 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-[#EA4335]/30 border border-[#EA4335] flex items-center justify-center text-[#EA4335] text-xs shadow-[0_0_15px_rgba(234,67,53,0.5)]">
              <FontAwesomeIcon icon={faMapMarkerAlt} />
            </div>
            <span className="text-xs font-mono text-white/80 block mt-1 bg-black/60 px-1.5 rounded">Конкурент #8</span>
          </div>

          {/* Revo Core Green Pin */}
          <div className="absolute top-[30%] left-[50%] -translate-x-1/2 z-20">
            <motion.div 
              animate={{ y: [-6, 6, -6] }} 
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="flex flex-col items-center cursor-pointer"
              onClick={scrollToAudit}
            >
              <div className="px-3 py-1 rounded-full bg-[#00FF66] text-black font-black text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(0,255,102,0.9)] flex items-center gap-1 mb-1">
                <FontAwesomeIcon icon={faBolt} /> ⚡ REVO #1 TOP-3
              </div>
              <div className="w-12 h-12 rounded-full bg-[#00FF66]/20 border-2 border-[#00FF66] flex items-center justify-center text-[#00FF66] text-xl shadow-[0_0_35px_rgba(0,255,102,0.8)]">
                <FontAwesomeIcon icon={faMapMarkerAlt} />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Bottom Sheet Drawer UI Element (Google Maps Drawer Style) */}
        <div className="max-w-5xl mx-auto w-full z-10 relative">
          <motion.div 
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="bg-[#1E2024]/95 border border-white/10 rounded-t-[36px] sm:rounded-[36px] p-6 sm:p-10 backdrop-blur-2xl shadow-[0_-15px_50px_rgba(0,0,0,0.8)] relative overflow-hidden"
          >
            {/* Handlebar indicator for drawer style */}
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 text-left space-y-4">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EA4335]/20 border border-[#EA4335]/40 text-[#EA4335] text-xs font-mono font-bold uppercase tracking-wider animate-pulse">
                  <FontAwesomeIcon icon={faExclamationTriangle} /> ГЛАВНЫЙ ВОПРОС ВЛАДЕЛЬЦУ БИЗНЕСА
                </div>
                
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                  Сколько заявок получит Ваш бизнес, если завтра <span className="text-[#EA4335] underline decoration-[#EA4335]/50 underline-offset-4">отключить рекламу</span>?
                </h1>
                
                <p className="text-white/80 text-sm sm:text-base font-medium leading-relaxed">
                  Для <strong className="text-[#EA4335]">90% предпринимателей</strong> ответ — <strong className="text-[#EA4335]">0 заявок</strong>, потому что они сидят на «игле» платного трафика или надеются на непредсказуемый «сарафан». Google Maps приносит клиентов на автопилоте <strong className="text-[#00FF66]">без вложений в рекламу</strong> и является самым надежным объектом инвестиций в трафик.
                </p>

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button 
                    onClick={scrollToAudit}
                    className="bg-[#00FF66] hover:bg-[#10B981] text-black font-black uppercase tracking-wider text-sm py-4 px-8 rounded-full transition-all shadow-[0_0_30px_rgba(0,255,102,0.4)] hover:scale-105 active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    <FontAwesomeIcon icon={faBolt} /> ⚡ ЗАПУСТИТЬ AI-АУДИТ БЕСПЛАТНО
                  </button>
                </div>
              </div>

              {/* Battery Showcase Integration */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center bg-black/40 border border-white/5 rounded-3xl p-5 relative">
                <div className="mb-2 px-4 py-1 rounded-full bg-[#00FF66]/10 border border-[#00FF66]/30 text-xs font-mono font-bold text-[#00FF66] uppercase tracking-wider">
                  🔋 REVO DYNAMIC BATTERY STATUS
                </div>
                <div className="w-full max-w-xs">
                  <PngBattery discount={batteryDiscount} />
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-white/80 font-mono">
                  <span>Энергия мотивации:</span>
                  <span className="font-bold text-[#00FF66]">{displayEnergy}%</span>
                  <span className="text-white/70">|</span>
                  <span>Скидка:</span>
                  <span className="font-bold text-[#00FF66]">{batteryDiscount}%</span>
                </div>
              </div>
            </div>

            {/* Interactive Niche Carousel (1 Full-Width Card per View) */}
            <div className="mt-8 pt-6 border-t border-white/10">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                <div>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#00FF66]">
                    🎯 Выберите вашу нишу (Готовые кейсы роста):
                  </h3>
                  <span className="text-xs text-white/80 font-mono">
                    Слайд {activeNicheIdx + 1} из {nicheCards.length}
                  </span>
                </div>

                {/* Dots & Nav controls */}
                <div className="flex items-center gap-4">
                  <div className="flex gap-1.5">
                    {nicheCards.map((_, dotIdx) => (
                      <button
                        key={dotIdx}
                        onClick={() => setActiveNicheIdx(dotIdx)}
                        className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${dotIdx === activeNicheIdx ? 'w-6 bg-[#00FF66] shadow-[0_0_10px_rgba(0,255,102,0.8)]' : 'w-2 bg-white/20 hover:bg-white/40'}`}
                      />
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => setActiveNicheIdx((prev) => (prev === 0 ? nicheCards.length - 1 : prev - 1))}
                      className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-white flex items-center justify-center text-xs transition-colors cursor-pointer"
                    >
                      <FontAwesomeIcon icon={faChevronLeft} />
                    </button>
                    <button 
                      onClick={() => setActiveNicheIdx((prev) => (prev + 1) % nicheCards.length)}
                      className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-white flex items-center justify-center text-xs transition-colors cursor-pointer"
                    >
                      <FontAwesomeIcon icon={faChevronRight} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Full Width Featured Card Showcase */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={nicheCards[activeNicheIdx].id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.35, ease: 'easeInOut' }}
                  className="bg-[#181A1D] border-2 border-[#00FF66]/40 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-[0_0_35px_rgba(0,255,102,0.15)] text-left"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                    <div className="lg:col-span-7 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                          <FontAwesomeIcon icon={nicheCards[activeNicheIdx].icon} className="text-[#00FF66]" />
                          {nicheCards[activeNicheIdx].title}
                        </span>
                        <span className="text-xs font-mono font-bold bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/30 px-3 py-1 rounded-full uppercase tracking-wider">
                          {nicheCards[activeNicheIdx].badge}
                        </span>
                      </div>

                      <div className="text-sm sm:text-base font-black text-[#00FF66]">
                        {nicheCards[activeNicheIdx].stat} <span className="text-white/80 font-normal">{nicheCards[activeNicheIdx].statLabel}</span>
                      </div>

                      <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-medium">
                        {nicheCards[activeNicheIdx].text}
                      </p>
                    </div>

                    {/* Google Maps Authentic GBP Rating & Local Pack Card */}
                    <div className="lg:col-span-5 bg-[#121417] border-2 border-white/15 rounded-2xl p-5 flex flex-col justify-between space-y-4 text-left shadow-2xl relative overflow-hidden">
                      {/* Google Maps Header */}
                      <div className="flex justify-between items-center border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#4285F4]/20 border border-[#4285F4] flex items-center justify-center text-[#4285F4] text-xs font-bold">
                            G
                          </div>
                          <span className="text-xs font-mono font-bold text-[#4285F4]">Google Business Profile</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-[#00FF66] bg-[#00FF66]/10 px-2 py-0.5 rounded border border-[#00FF66]/30">
                          🏆 #1 в ТОП-3
                        </span>
                      </div>

                      {/* Google Rating Stars Section */}
                      <div className="bg-black/50 p-3.5 rounded-xl border border-white/10 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-mono text-white/70">Рейтинг заведения:</span>
                          <span className="text-xs font-mono font-bold text-[#00FF66]">{nicheCards[activeNicheIdx].metricLabel}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-black font-mono text-white">4.9</span>
                            <div className="flex text-[#FBBC05] text-sm gap-0.5">
                              <FontAwesomeIcon icon={faStar} />
                              <FontAwesomeIcon icon={faStar} />
                              <FontAwesomeIcon icon={faStar} />
                              <FontAwesomeIcon icon={faStar} />
                              <FontAwesomeIcon icon={faStar} />
                            </div>
                          </div>
                          <span className="text-xl font-black font-mono text-[#00FF66]">
                            {nicheCards[activeNicheIdx].metricPercent}%
                          </span>
                        </div>
                      </div>

                      {/* Position Rank Comparison Snippet */}
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="p-2.5 rounded-xl bg-black/40 border border-[#EA4335]/30">
                          <span className="text-[#EA4335] font-bold block mb-0.5">❌ Без REVO</span>
                          <span className="text-white/80 block text-xs">Позиция: #18 место</span>
                          <span className="text-white/70 block text-xs">Охват: ~15% клиентов</span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-[#00FF66]/10 border border-[#00FF66]/40">
                          <span className="text-[#00FF66] font-bold block mb-0.5">⚡ REVO ТОП-3</span>
                          <span className="text-white font-bold block text-xs">Позиция: #1 В РАЙОНЕ</span>
                          <span className="text-[#00FF66] font-bold block text-xs">Охват: {nicheCards[activeNicheIdx].metricPercent}% всех кликов</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Niche Selector Tabs Navigation Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                {nicheCards.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveNicheIdx(i)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center gap-2 cursor-pointer ${i === activeNicheIdx ? 'bg-[#00FF66]/20 border-[#00FF66] text-[#00FF66] shadow-[0_0_15px_rgba(0,255,102,0.2)]' : 'bg-black/30 border-white/5 text-white/80 hover:bg-white/5 hover:text-white'}`}
                  >
                    <FontAwesomeIcon icon={c.icon} className="text-xs" />
                    <span className="truncate">{c.title.split(' ')[1]}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 🟢 БЛОК 2: GOOGLE MAPS КАК НОВЫЙ INSTAGRAM */}
      <section className="py-20 px-4 sm:px-6 relative z-10 border-b border-white/10 bg-[#181A1D]/60">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Visual: Ultra-Realistic iPhone 16 Pro Titanium Mockup */}
            <motion.div 
              initial="hidden" 
              whileInView="visible" 
              variants={fadeInUp} 
              viewport={{ once: true }}
              className="lg:col-span-5 flex justify-center"
            >
              <div className="w-full max-w-[340px] min-h-[660px] bg-[#16171A] border-[7px] border-[#2E3137] rounded-[52px] p-3.5 shadow-[0_0_60px_rgba(0,0,0,0.95),0_0_25px_rgba(0,255,102,0.15)] relative overflow-hidden text-left flex flex-col justify-between">
                
                {/* iOS Top Bar: Time, Dynamic Island, Battery */}
                <div className="flex justify-between items-center px-3 pt-1 pb-2 relative z-20">
                  <span className="text-xs font-mono font-bold text-white">9:41</span>
                  {/* Dynamic Island Pill */}
                  <div className="w-20 h-4 bg-black rounded-full border border-white/10 flex items-center justify-end pr-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00FF66] animate-pulse" />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-white">
                    <span>5G</span>
                    <span>🔋</span>
                  </div>
                </div>

                {/* Google Maps Search Bar in iOS App */}
                <div className="bg-[#24272D] p-2.5 rounded-2xl border border-white/10 mb-2.5 flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-[#EA4335] text-xs">📍</span>
                    <span className="text-xs font-bold text-white truncate">Gastro Bar & Lounge</span>
                  </div>
                  <span className="text-xs font-mono bg-[#00FF66]/20 text-[#00FF66] px-2 py-0.5 rounded font-bold border border-[#00FF66]/40">
                    #1 TOP-3
                  </span>
                </div>

                {/* GBP Header Inside iPhone Screen */}
                <div className="bg-[#1E2024] p-3 rounded-2xl border border-white/10 mb-2.5 space-y-1 shadow-md">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-[#4285F4] font-bold bg-[#4285F4]/15 px-2 py-0.5 rounded">
                      Google Business Profile
                    </span>
                    <span className="text-xs font-mono text-[#00FF66] font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66] animate-ping" />
                      Live 24/7
                    </span>
                  </div>
                  <h4 className="font-extrabold text-white text-base">Gastro Bar & Lounge</h4>
                  <div className="flex items-center gap-1.5 text-xs text-[#FBBC05] font-bold">
                    <span>4.9</span>
                    <div className="flex text-[#FBBC05] text-xs gap-0.5">
                      <FontAwesomeIcon icon={faStar} />
                      <FontAwesomeIcon icon={faStar} />
                      <FontAwesomeIcon icon={faStar} />
                      <FontAwesomeIcon icon={faStar} />
                      <FontAwesomeIcon icon={faStar} />
                    </div>
                    <span className="text-white/80 text-xs ml-1">(240+ отзывов)</span>
                  </div>
                </div>

                {/* Live Feed Image Card */}
                <div className="relative rounded-2xl overflow-hidden h-36 border border-[#00FF66]/40 group shadow-lg mb-2.5">
                  <img src="/assets/emirates-golf.jpg" alt="Live Feed Post" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                  <div className="absolute top-2 left-2 bg-[#00FF66] text-black text-[11px] font-black uppercase px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(0,255,102,0.8)]">
                    ⚡ SPECIAL OFFER -15%
                  </div>
                  <div className="absolute bottom-2 left-2 text-left">
                    <p className="text-xs font-bold text-white">Авторский сет «Стейк & Коктейль»</p>
                    <p className="text-[11px] text-white/80">📍 GEO-tagged • 150m от вас</p>
                  </div>
                </div>

                {/* 3 Interactive Feature Modules Inside iPhone */}
                <div className="space-y-2">
                  {/* Module 1: AI Auto-Posting */}
                  <div className="bg-[#1E2024] p-2.5 rounded-2xl border border-white/10 flex items-center justify-between text-left shadow-md">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#00FF66]/20 border border-[#00FF66] flex items-center justify-center text-[#00FF66] text-xs flex-shrink-0">
                        <FontAwesomeIcon icon={faBolt} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white leading-tight">AI-Автопостинг каждые 48ч</p>
                        <p className="text-[11px] text-white/70">100% EXIF-GPS гео-метки и меню</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-[#00FF66] bg-[#00FF66]/10 px-2 py-0.5 rounded border border-[#00FF66]/30 flex-shrink-0">
                      Active
                    </span>
                  </div>

                  {/* Module 2: Auto Responses to Reviews */}
                  <div className="bg-[#1E2024] p-2.5 rounded-2xl border border-white/10 flex items-center justify-between text-left shadow-md">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#4285F4]/20 border border-[#4285F4] flex items-center justify-center text-[#4285F4] text-xs flex-shrink-0">
                        💬
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white leading-tight">Умные автоответы на отзывы</p>
                        <p className="text-[11px] text-white/70">Вшивание SEO-ключей 24/7</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-[#4285F4] bg-[#4285F4]/10 px-2 py-0.5 rounded border border-[#4285F4]/30 flex-shrink-0">
                      Auto-SEO
                    </span>
                  </div>

                  {/* Module 3: Reputation Shield & Penalty Appeals */}
                  <div className="bg-[#1E2024] p-2.5 rounded-2xl border border-white/10 flex items-center justify-between text-left shadow-md">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#FBBC05]/20 border border-[#FBBC05] flex items-center justify-center text-[#FBBC05] text-xs flex-shrink-0">
                        🛡
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white leading-tight">ИИ-Щит Репутации</p>
                        <p className="text-[11px] text-white/70">Перехват негатива & Снос 1★ фейков</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-[#FBBC05] bg-[#FBBC05]/10 px-2 py-0.5 rounded border border-[#FBBC05]/30 flex-shrink-0">
                      Shielded
                    </span>
                  </div>
                </div>

                {/* iOS Bottom Home Bar */}
                <div className="w-32 h-1 bg-white/40 rounded-full mx-auto mt-3 mb-0.5" />
              </div>
            </motion.div>

            {/* Content Column */}
            <motion.div 
              initial="hidden" 
              whileInView="visible" 
              variants={fadeInUp} 
              viewport={{ once: true }}
              className="lg:col-span-7 text-left space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#4285F4]/10 border border-[#4285F4]/30 text-[#4285F4] text-xs font-mono font-bold uppercase tracking-wider">
                <FontAwesomeIcon icon={faMobileScreen} /> НОВАЯ ЭРА ЛОКАЛЬНОГО МАРКЕТИНГА
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Забудьте про соцсети. Google Maps — это ваш главный продающий Instagram.
              </h2>

              <p className="text-white/70 text-base leading-relaxed font-medium">
                Большинство заведений тратят тысячи долларов на SMM-специалистов для соцсетей, где их видят только старые подписчики. Мы переносим всю силу контента туда, где люди принимают решение о покупке за 3 секунды.
              </p>

              <div className="space-y-4 pt-2">
                <div className="p-5 rounded-2xl bg-[#1E2024] border border-white/10 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#00FF66]/20 border border-[#00FF66]/40 flex items-center justify-center text-[#00FF66] text-lg flex-shrink-0 mt-0.5">
                    📸
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base mb-1">Бесконечный живой лендинг</h4>
                    <p className="text-xs text-white/80 leading-relaxed">ИИ на постоянной основе публикует в вашей карточке GBP обновления, сторис-посты, акции, новинки меню и GEO-тегированные фото высокого качества.</p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#1E2024] border border-white/10 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#4285F4]/20 border border-[#4285F4]/40 flex items-center justify-center text-[#4285F4] text-lg flex-shrink-0 mt-0.5">
                    ⚙️
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base mb-1">Магия алгоритмов Google</h4>
                    <p className="text-xs text-white/80 leading-relaxed">Google обожает активные профили. Постоянные обновления показывают поисковому роботу, что заведение «живое», поднимая вас в <strong className="text-white">ТОП-3 выдачи (Local Pack)</strong>.</p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#1E2024] border border-white/10 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#FBBC05]/20 border border-[#FBBC05]/40 flex items-center justify-center text-[#FBBC05] text-lg flex-shrink-0 mt-0.5">
                    👑
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base mb-1">Доминирование в районе</h4>
                    <p className="text-xs text-white/80 leading-relaxed">ТОП-3 выдачи Google забирает <strong className="text-[#00FF66]">более 80% всех реальных клиентов</strong> в вашем районе. Все остальные 20 заведений делят между собой оставшиеся крохи.</p>
                  </div>
                </div>
              </div>

              {/* Redesigned Premium Channel Conversion Comparison Infographic */}
              <div className="mt-10 bg-[#121417] border-2 border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
                {/* Header Banner */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-4">
                  <div>
                    <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#00FF66] bg-[#00FF66]/10 px-3 py-1 rounded-full border border-[#00FF66]/30 inline-block mb-1">
                      📊 СРАВНИТЕЛЬНАЯ АНАЛИТИКА КАНАЛОВ
                    </span>
                    <h3 className="text-lg sm:text-xl font-extrabold text-white">
                      Почему конверсия из Google Maps в 70 раз выше, чем в соцсетях?
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-white/80 bg-black/60 px-3 py-1.5 rounded-xl border border-white/10">
                    🎯 ИНТЕНТ ПОКУПАТЕЛЯ
                  </span>
                </div>

                {/* 2-Column Visual Cards Comparison Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* CARD 1: SMM / Instagram / Target */}
                  <div className="bg-[#1A1C20] border border-[#EA4335]/30 rounded-2xl p-5 sm:p-6 space-y-4 relative overflow-hidden">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono font-bold text-[#EA4335] bg-[#EA4335]/10 px-2.5 py-1 rounded border border-[#EA4335]/30 uppercase">
                        ❌ Соцсети & Таргет SMM
                      </span>
                      <span className="text-xs font-mono text-white/70">Пассивный интерес</span>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl sm:text-5xl font-black font-mono text-[#EA4335]">1.2%</span>
                      <span className="text-xs font-bold text-white/80">конверсия в визит</span>
                    </div>

                    <p className="text-xs text-white/80 leading-relaxed">
                      Пользователь <strong>листает ленту от скуки</strong>. Он не планировал покупать услугу прямо сейчас. 99% пролистывают вашу рекламу дальше.
                    </p>

                    {/* Progress Meter Bar */}
                    <div className="space-y-1 pt-2">
                      <div className="flex justify-between text-xs font-mono text-white/80">
                        <span>Эффективность клика</span>
                        <span className="text-[#EA4335] font-bold">1.2% из 100%</span>
                      </div>
                      <div className="w-full bg-black/60 h-3 rounded-full overflow-hidden p-0.5 border border-white/10">
                        <div className="w-[8%] h-full bg-[#EA4335] rounded-full" />
                      </div>
                    </div>

                    <div className="text-xs font-mono text-[#EA4335] bg-[#EA4335]/10 p-2.5 rounded-xl border border-[#EA4335]/20 flex items-center gap-2">
                      <span>💸</span>
                      <span>Сжигание бюджета без гарантии визита</span>
                    </div>
                  </div>

                  {/* CARD 2: Google Maps Local Pack */}
                  <div className="bg-[#1A231C] border-2 border-[#00FF66]/50 rounded-2xl p-5 sm:p-6 space-y-4 relative overflow-hidden shadow-[0_0_30px_rgba(0,255,102,0.15)]">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono font-bold text-[#00FF66] bg-[#00FF66]/10 px-2.5 py-1 rounded border border-[#00FF66]/30 uppercase">
                        ⚡ Google Maps ТОП-3 Local Pack
                      </span>
                      <span className="text-xs font-mono text-[#00FF66] font-bold animate-pulse">🔥 Горячий интент</span>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl sm:text-5xl font-black font-mono text-[#00FF66] drop-shadow-[0_0_15px_rgba(0,255,102,0.5)]">84.0%</span>
                      <span className="text-xs font-bold text-[#00FF66]">конверсия в визит</span>
                    </div>

                    <p className="text-xs text-white/80 leading-relaxed">
                      Клиент <strong>сам ищет услугу рядом с вами прямо сейчас</strong> с деньгами в руках. Ему нужен только адрес и подтверждение качества.
                    </p>

                    {/* Progress Meter Bar */}
                    <div className="space-y-1 pt-2">
                      <div className="flex justify-between text-xs font-mono text-white/70">
                        <span>Эффективность клика</span>
                        <span className="text-[#00FF66] font-bold">84% из 100% (Лидер локации)</span>
                      </div>
                      <div className="w-full bg-black/60 h-3 rounded-full overflow-hidden p-0.5 border border-[#00FF66]/40">
                        <motion.div 
                          initial={{ width: 0 }}
                          whileInView={{ width: '84%' }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          className="h-full bg-gradient-to-r from-[#00FF66] via-[#10B981] to-[#00FF66] rounded-full shadow-[0_0_12px_rgba(0,255,102,0.9)]" 
                        />
                      </div>
                    </div>

                    <div className="text-xs font-mono text-[#00FF66] bg-[#00FF66]/10 p-2.5 rounded-xl border border-[#00FF66]/30 flex items-center gap-2">
                      <span>💎</span>
                      <span className="font-bold">0$ за клик — Долгосрочный актив бизнеса</span>
                    </div>
                  </div>

                </div>

                {/* High-Impact Highlighted Takeaway Banner */}
                <div className="p-6 rounded-3xl bg-gradient-to-r from-[#00FF66]/20 via-[#1A231C] to-[#00FF66]/10 border-2 border-[#00FF66] shadow-[0_0_35px_rgba(0,255,102,0.25)] flex flex-col md:flex-row justify-between items-start md:items-center gap-5 text-left relative overflow-hidden">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#00FF66]/20 border-2 border-[#00FF66] text-2xl flex items-center justify-center text-[#00FF66] shadow-[0_0_20px_rgba(0,255,102,0.6)] flex-shrink-0 mt-0.5">
                      💡
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-mono font-black text-[#00FF66] uppercase tracking-widest block">
                        ⚡ КЛЮЧЕВОЙ ВЫВОД АНАЛИТИКИ:
                      </span>
                      <p className="text-sm sm:text-base lg:text-lg font-bold text-white leading-relaxed">
                        Пользователи Google Maps <strong className="text-[#00FF66] underline decoration-[#00FF66]/60 underline-offset-4">уже приняли решение о покупке</strong>. Им не нужно «продавать» — их нужно просто принять в вашем заведении!
                      </p>
                    </div>
                  </div>

                  <div className="flex-shrink-0 self-stretch md:self-center flex items-center justify-center">
                    <span className="text-xs sm:text-sm font-black font-mono text-[#00FF66] bg-[#00FF66]/20 px-5 py-3 rounded-2xl border-2 border-[#00FF66] shadow-[0_0_25px_rgba(0,255,102,0.5)] whitespace-nowrap tracking-wider">
                      🚀 70X ВЫШЕ ВЫРУЧКА
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* 🟢 БЛОК 3: СНЯТИЕ ИЛЛЮЗИЙ И ПРОБЛЕМА (МОСТИК К REVO) */}
      <section className="py-20 px-4 sm:px-6 relative z-10 border-b border-white/10 bg-[#121212]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EA4335]/10 border border-[#EA4335]/30 text-[#EA4335] text-xs font-mono font-bold uppercase tracking-wider mb-4">
              <FontAwesomeIcon icon={faExclamationTriangle} /> ДИАГНОСТИКА УТЕЧКИ ТРАФИКА
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              «Мы уже настраивали Google Business Profile, но клиентов не было». Знакомо?
            </h2>
            <p className="text-white/80 text-base max-w-2xl mx-auto mt-4">
              Вы платили SEO-шникам за однократное заполнение профиля, но получили только статичные просмотры в аналитике и пустой зал.
            </p>
          </div>

          {/* Lost Revenue Calculator Widget Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#1E2024] border border-[#EA4335]/30 rounded-3xl p-6 sm:p-10 shadow-[0_0_40px_rgba(234,67,53,0.15)] relative overflow-hidden">
            <div className="lg:col-span-6 text-left space-y-6">
              <h3 className="text-2xl font-bold text-white">Почему обычная карточка на Картах больше не приносит денег?</h3>
              
              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  <span className="w-8 h-8 rounded-full bg-[#EA4335]/20 border border-[#EA4335] text-[#EA4335] font-bold flex items-center justify-center text-sm flex-shrink-0">1</span>
                  <div>
                    <h4 className="font-bold text-white text-base">Профиль «застыл в прошлом»</h4>
                    <p className="text-xs text-white/80 leading-relaxed mt-1">Если вы не публикуете контент каждые 2–3 дня, алгоритмы Google опускают вас вниз выдачи, считая заведение неактивным.</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <span className="w-8 h-8 rounded-full bg-[#EA4335]/20 border border-[#EA4335] text-[#EA4335] font-bold flex items-center justify-center text-sm flex-shrink-0">2</span>
                  <div>
                    <h4 className="font-bold text-white text-base">Нулевая мотивация (Zero Reason to Act)</h4>
                    <p className="text-xs text-white/80 leading-relaxed mt-1">Пользователь находит ваш профиль, видит обычную справочную информацию... и закрывает вкладку. <strong className="text-white">У него нет причины заказать прямо сейчас.</strong></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Red Counter Indicator Box */}
            <div className="lg:col-span-6 flex flex-col items-center justify-center bg-black/60 border border-[#EA4335]/40 rounded-2xl p-8 relative">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#EA4335] mb-2">ЕЖЕМЕСЯЧНАЯ СКРЫТАЯ УТЕЧКА ВЫРУЧКИ</span>
              <div className="text-4xl sm:text-6xl font-black font-mono text-[#EA4335] drop-shadow-[0_0_20px_rgba(234,67,53,0.6)] mb-2">
                - $4,500 <span className="text-xl font-normal text-white/70">/мес</span>
              </div>
              <div className="inline-block bg-[#EA4335]/20 text-[#EA4335] text-xs font-mono font-bold px-3 py-1 rounded-full border border-[#EA4335]/40 mb-4">
                Статус карточки: "No Activity for 30 Days"
              </div>
              <p className="text-xs text-white/80 text-center max-w-xs">
                Столько вы отдаете прямым конкурентам в вашем районе, пока ваш профиль не активен.
              </p>
            </div>
          </div>

          {/* Visual Leaky Revenue Funnel Diagram Infographic */}
          <div className="mt-8 p-6 rounded-3xl bg-[#1E2024] border border-[#EA4335]/30 space-y-3 text-left">
            <h4 className="text-sm sm:text-base font-extrabold uppercase text-[#00FF66] tracking-wider mb-3 flex items-center gap-2">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-[#EA4335]" /> ПОЧЕМУ ВСЕ ЗАЯВКИ ПОЛУЧАЮТ ЛИДЕРЫ ТОП 3:
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-black/50 border border-white/10">
                <span className="text-xs font-mono font-bold text-white/70 block mb-1">01. ПОИСК В РАЙОНЕ</span>
                <span className="text-xl font-black text-white block">1,000 запросов</span>
                <span className="text-xs font-medium text-white/80 block mt-1">Клиенты ищут заведение рядом</span>
              </div>

              <div className="p-4 rounded-2xl bg-black/50 border border-[#00FF66]/30">
                <span className="text-xs font-mono font-bold text-[#00FF66] block mb-1">02. LOCAL PACK TOP-3</span>
                <span className="text-xl font-black text-[#00FF66] block">800 кликов (80%)</span>
                <span className="text-xs font-medium text-white/80 block mt-1">Забирают 3 первых места</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#EA4335]/10 border border-[#EA4335]/30">
                <span className="text-xs font-mono font-bold text-[#EA4335] block mb-1">03. НЕАКТИВНЫЙ ПРОФИЛЬ</span>
                <span className="text-xl font-black text-[#EA4335] block">50 кликов (5%)</span>
                <span className="text-xs font-medium text-white/80 block mt-1">Делят остальные 20 заведений</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#EA4335]/20 border border-[#EA4335] shadow-[0_0_20px_rgba(234,67,53,0.3)]">
                <span className="text-xs font-mono font-bold text-white block mb-1">04. ПОТЕРЯ ВЫРУЧКИ</span>
                <span className="text-xl font-black text-[#EA4335] block">-$4,500 /мес</span>
                <span className="text-xs font-medium text-white/90 block mt-1">Уходит прямым конкурентам</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🟢 БЛОК 3.5: ФОМО-БЛОК — РЕКЛАМНАЯ ИГЛА VS НАДЕЖНЫЙ АКТИВ GOOGLE MAPS */}
      <section className="py-20 px-4 sm:px-6 relative z-10 border-b border-white/10 bg-[#15171A]">
        <div className="max-w-7xl mx-auto">
          {/* Main Thesis Banner */}
          <motion.div 
            initial="hidden" 
            whileInView="visible" 
            variants={fadeInUp} 
            viewport={{ once: true }}
            className="bg-gradient-to-r from-[#00FF66]/20 via-[#1E2024] to-[#4285F4]/20 border-2 border-[#00FF66]/40 rounded-3xl p-6 sm:p-12 text-center relative overflow-hidden shadow-[0_0_50px_rgba(0,255,102,0.2)] mb-14"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#00FF66]/20 border border-[#00FF66]/40 text-[#00FF66] text-xs font-mono font-bold uppercase tracking-wider mb-6 animate-pulse">
              <FontAwesomeIcon icon={faBolt} /> ⚡ ОПЕРЕДИТЕ КОНКУРЕНТОВ: ОКНО ВОЗМОЖНОСТЕЙ
            </div>

            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight max-w-4xl mx-auto">
              Почему именно <span className="text-[#00FF66] underline decoration-[#00FF66]/50 underline-offset-8">СЕЙЧАС</span> нужно забрать ТОП-3 района, пока конкуренты спят?
            </h2>

            <p className="text-white/90 text-base sm:text-xl max-w-3xl mx-auto mt-6 font-medium leading-relaxed">
              Пока 90% заведений в вашем районе надеются на старый сарафан или сливают бюджеты в рекламу, <strong className="text-[#00FF66]">алгоритмы Google заново делят локальный рынок</strong>. Заняв лидерство в ТОП-3 сегодня, вы блокируете горячий трафик района для конкурентов на годы вперед.
            </p>

            {/* 3 Real Market Facts Cards Grid */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              <div className="p-5 rounded-2xl bg-black/60 border border-white/10 space-y-2">
                <span className="text-xs font-mono font-bold text-[#00FF66] bg-[#00FF66]/10 px-2.5 py-1 rounded border border-[#00FF66]/30 inline-block">
                  📊 68% ZERO-CLICK
                </span>
                <h4 className="font-bold text-white text-sm sm:text-base">Покупка без перехода на сайт</h4>
                <p className="text-xs text-white/70 leading-relaxed">
                  По данным исследований Google, 68% локальных клиентов совершают звонок или визит прямо из карточки Google Maps, вообще не открывая сайты.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-black/60 border border-white/10 space-y-2">
                <span className="text-xs font-mono font-bold text-[#4285F4] bg-[#4285F4]/10 px-2.5 py-1 rounded border border-[#4285F4]/30 inline-block">
                  🤖 ChatGPT & GEMINI
                </span>
                <h4 className="font-bold text-white text-sm sm:text-base">ИИ-Рекомендации 2026</h4>
                <p className="text-xs text-white/70 leading-relaxed">
                  ИИ-ассистенты вытягивают рекомендации ТОЛЬКО из профилей ТОП-3 Google Maps, имеющих регулярную активность и динамические отзывы.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-black/60 border border-white/10 space-y-2">
                <span className="text-xs font-mono font-bold text-[#FBBC05] bg-[#FBBC05]/10 px-2.5 py-1 rounded border border-[#FBBC05]/30 inline-block">
                  🏰 НАКОПИТЕЛЬНЫЙ ЭФФЕКТ
                </span>
                <h4 className="font-bold text-white text-sm sm:text-base">Монопольный барьер</h4>
                <p className="text-xs text-white/70 leading-relaxed">
                  Заведения, первые включившие ИИ-автопилот, накапливают историю поведенческих факторов Google, опередить которую позже почти невозможно.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Индекса рекламной независимости Widget */}
          <AdIndependenceIndexWidget />

          {/* Side-by-Side Comparison: Paid Ads Addiction vs. Google Maps Asset */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left">
            {/* Model A: Paid Ads Addiction */}
            <div className="bg-[#1E2024] border border-[#EA4335]/40 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl hover:border-[#EA4335]/80 transition-colors">
              <div className="flex justify-between items-center mb-6">
                <span className="text-xs font-mono font-bold bg-[#EA4335]/20 text-[#EA4335] border border-[#EA4335]/40 px-3 py-1 rounded-full uppercase tracking-wider">
                  ❌ ТАРГЕТ / PPC / САРАФАН
                </span>
                <span className="text-xs font-mono text-white/80">Риск и нестабильность</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">
                «Рекламная игла и сарафан»
              </h3>

              <p className="text-sm text-white/80 leading-relaxed mb-6">
                Вы сжигаете бюджеты на таргет или сидите в ожидании непредсказуемых рекомендаций. В обоих случаях у вашего бизнеса нет собственного управляемого актива.
              </p>

              <div className="space-y-3 font-mono text-sm">
                <div className="p-4 rounded-xl bg-black/50 border border-white/10 flex justify-between items-center">
                  <span className="text-white/70">Затраты на клик:</span>
                  <span className="text-[#EA4335] font-bold">$15 – $45 /лид (растут)</span>
                </div>
                <div className="p-4 rounded-xl bg-black/50 border border-white/10 flex justify-between items-center">
                  <span className="text-white/70">Заявки при выключении бюджета:</span>
                  <span className="text-[#EA4335] font-bold">0 заявок (Мгновенный ноль)</span>
                </div>
                <div className="p-4 rounded-xl bg-black/50 border border-white/10 flex justify-between items-center">
                  <span className="text-white/70">Накопленный капитал в трафике:</span>
                  <span className="text-[#EA4335] font-bold">0$ (Сгорел в рекламе)</span>
                </div>
              </div>
            </div>

            {/* Model B: Google Maps Traffic Asset */}
            <div className="bg-[#1E2024] border-2 border-[#00FF66]/50 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-[0_0_40px_rgba(0,255,102,0.15)] hover:border-[#00FF66] transition-colors">
              <div className="flex justify-between items-center mb-6">
                <span className="text-xs font-mono font-bold bg-[#00FF66]/20 text-[#00FF66] border border-[#00FF66]/40 px-3 py-1 rounded-full uppercase tracking-wider">
                  ⚡ GOOGLE MAPS (OUTRICH / REVO)
                </span>
                <span className="text-xs font-mono text-[#00FF66] font-bold">Надежный актив</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">
                «Автономный трафиковый актив»
              </h3>

              <p className="text-sm text-white/80 leading-relaxed mb-6">
                Вы инвестируете в капитализацию собственного профиля. Карточка забирает горячий Поиск и приносит клиентов без постоянного бюджета.
              </p>

              <div className="space-y-3 font-mono text-sm">
                <div className="p-4 rounded-xl bg-black/50 border border-[#00FF66]/30 flex justify-between items-center">
                  <span className="text-white/70">Затраты на каждый клик:</span>
                  <span className="text-[#00FF66] font-bold">0$ (Органический поиск)</span>
                </div>
                <div className="p-4 rounded-xl bg-black/50 border border-[#00FF66]/30 flex justify-between items-center">
                  <span className="text-white/70">Заявки при $0 рекламном бюджете:</span>
                  <span className="text-[#00FF66] font-bold">Непрерывный поток 24/7</span>
                </div>
                <div className="p-4 rounded-xl bg-black/50 border border-[#00FF66]/30 flex justify-between items-center">
                  <span className="text-white/70">Накопленный капитал в трафике:</span>
                  <span className="text-[#00FF66] font-bold">ТОП-3 Место в районе (Бессрочно)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🟢 БЛОК 4: ЭКОСИСТЕМА REVO И МЕХАНИКА РАБОТЫ */}
      <section className="py-20 px-4 sm:px-6 relative z-10 border-b border-white/10 bg-[#181A1D]/80">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#00FF66]/10 border border-[#00FF66]/30 text-[#00FF66] text-xs font-mono font-bold uppercase tracking-wider mb-4">
              <FontAwesomeIcon icon={faBolt} /> ИННОВАЦИОННЫЙ ДВИЖОК REVO
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Мы создали Revo, чтобы превратить просмотры в Google в мгновенные прямые продажи.
            </h2>
            <p className="text-white/70 text-base max-w-3xl mx-auto mt-4 font-medium">
              Revo — это система, которая сначала забирает клиента из Поиска Google за счет бесконечного контента и SEO, а затем заставляет его прийти к вам <strong className="text-[#00FF66]">здесь и сейчас</strong>.
            </p>
          </div>

          {/* Flow Diagram (3 Steps Flow Schematic) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <div className="bg-[#1E2024] border border-white/10 p-6 rounded-3xl text-left relative overflow-hidden group hover:border-[#00FF66]/50 transition-colors">
              <div className="text-3xl font-black text-[#00FF66] mb-3">01</div>
              <h4 className="font-bold text-white text-lg mb-2">AI Instagram-Mode & SEO</h4>
              <p className="text-xs text-white/80 leading-relaxed mb-4">Публикация акций, новостей, меню и гео-фото на автопилоте каждые 48 часов.</p>
              <div className="text-xs font-mono text-[#00FF66] bg-[#00FF66]/10 px-2.5 py-1 rounded inline-block">Захват Поиска</div>
            </div>

            <div className="bg-[#1E2024] border border-[#00FF66]/40 p-6 rounded-3xl text-left relative overflow-hidden group shadow-[0_0_25px_rgba(0,255,102,0.1)]">
              <div className="text-3xl font-black text-[#00FF66] mb-3">02</div>
              <h4 className="font-bold text-white text-lg mb-2">Revo Dynamic Engine</h4>
              <p className="text-xs text-white/80 leading-relaxed mb-4">Клиент получает сгорающую скидку ⚡ «Здесь и сейчас» (🔋 Revo Battery Status).</p>
              <div className="text-xs font-mono text-[#00FF66] bg-[#00FF66]/10 px-2.5 py-1 rounded inline-block">Мгновенный визит</div>
            </div>

            <div className="bg-[#1E2024] border border-white/10 p-6 rounded-3xl text-left relative overflow-hidden group hover:border-[#00FF66]/50 transition-colors">
              <div className="text-3xl font-black text-[#00FF66] mb-3">03</div>
              <h4 className="font-bold text-white text-lg mb-2">Direct Sales & Retention</h4>
              <p className="text-xs text-white/80 leading-relaxed mb-4">Прямой расчет без комиссий + Возврат клиента на следующий день.</p>
              <div className="text-xs font-mono text-[#00FF66] bg-[#00FF66]/10 px-2.5 py-1 rounded inline-block">100% Выручка</div>
            </div>
          </div>

          {/* 4 Technology Components Detailed Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            <div className="p-6 rounded-2xl bg-[#121212] border border-white/10">
              <h5 className="font-bold text-white text-base mb-2 text-[#00FF66]">1. ИИ-Автопилот Google</h5>
              <p className="text-xs text-white/80 leading-relaxed">Наш ИИ настраивает профиль под точечные микро-запросы («сложное окрашивание», «авторские коктейли») и держит профиль в ТОП-3 за счет постоянного автопостинга.</p>
            </div>

            <div className="p-6 rounded-2xl bg-[#121212] border border-white/10">
              <h5 className="font-bold text-white text-base mb-2 text-[#00FF66]">2. Триггер срочности</h5>
              <p className="text-xs text-white/80 leading-relaxed">Кликая по ссылке ⚡ Revo, клиент попадает в ваше меню и видит сгорающую скидку (🔋 Revo Battery Status). Человек принимает решение мгновенно.</p>
            </div>

            <div className="p-6 rounded-2xl bg-[#121212] border border-white/10">
              <h5 className="font-bold text-white text-base mb-2 text-[#00FF66]">3. Прямая экономика</h5>
              <p className="text-xs text-white/80 leading-relaxed">Заказ или бронирование оформляется напрямую. Клиент рассчитывается с вами на кассе или с курьером. Вы не платите ни цента комиссии с чека.</p>
            </div>

            <div className="p-6 rounded-2xl bg-[#121212] border border-white/10">
              <h5 className="font-bold text-white text-base mb-2 text-[#00FF66]">4. ИИ-Щит Репутации</h5>
              <p className="text-xs text-white/80 leading-relaxed">Перехват плохих оценок внутри Revo-меню до их попадания на Карты + авто-подача апелляций на снос фейковых отзывов 1–2 звезды.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 🟢 БЛОК 4.5: КАК УСТРОЕНА СИСТЕМА REVO (ПЕТЛЯ FOMO И УДЕРЖАНИЯ КЛИЕНТОВ) */}
      <section className="py-20 px-4 sm:px-6 relative z-10 border-b border-white/10 bg-[#121212]">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#00FF66]/10 border border-[#00FF66]/30 text-[#00FF66] text-xs font-mono font-bold uppercase tracking-wider mb-4">
              <FontAwesomeIcon icon={faBolt} /> ЛОГИКА ЭКОСИСТЕМЫ REVO
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Как устроена наша система: От первого поиска в Google до бесконечных повторных визитов
            </h2>
            <p className="text-white/80 text-base max-w-3xl mx-auto mt-4 font-medium">
              4-этапная замкнутая петля конверсии, объединяющая алгоритмы ИИ, психологию неприятия потерь (Нобелевская премия) и авто-воронку сбора отзывов.
            </p>
          </div>

          {/* 4-Step Vector Infographic Pipeline */}
          <div className="relative">
            {/* Horizontal Connecting Neon Line (Desktop view) */}
            <div className="hidden lg:block absolute top-[90px] left-[10%] right-[10%] h-1 bg-gradient-to-r from-[#4285F4] via-[#00FF66] to-[#FBBC05] z-0 opacity-40 rounded-full" />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10 text-left">
              
              {/* STEP 1 */}
              <div className="bg-[#1E2024] border border-white/10 p-6 rounded-3xl flex flex-col justify-between relative overflow-hidden group hover:border-[#4285F4]/60 transition-all shadow-xl">
                <div>
                  {/* Step 1 Visual Banner */}
                  <div className="relative w-full h-40 rounded-2xl overflow-hidden mb-5 border border-white/10 group-hover:border-[#4285F4]/50 transition-all bg-black/40 shadow-inner">
                    <img src="/step1_ai_search.png" alt="1. Видимость в Google & ChatGPT" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1E2024] via-transparent to-transparent" />
                  </div>

                  <div className="flex justify-between items-start mb-4">
                    <span className="w-12 h-12 rounded-2xl bg-[#4285F4]/20 border border-[#4285F4] text-[#4285F4] font-black text-xl flex items-center justify-center shadow-[0_0_15px_rgba(66,133,244,0.4)]">
                      01
                    </span>
                    <span className="text-xs font-mono font-bold bg-[#4285F4]/10 text-[#4285F4] border border-[#4285F4]/30 px-2.5 py-1 rounded-full uppercase">
                      🔍 SEARCH & AI RECOM
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-lg mb-2">
                    1. Видимость в Google & ChatGPT
                  </h3>

                  <p className="text-xs text-white/70 leading-relaxed mb-4">
                    Мы настраиваем глубокую видимость и регулярную активность вашего бизнеса на Google Maps. Благодаря постоянным авто-обновлениям заведение рекомендуют поисковые роботы и ИИ-ассистенты (<strong className="text-[#4285F4]">ChatGPT, Google Gemini</strong>).
                  </p>
                </div>

                {/* Infographic Widget 1 */}
                <div className="bg-black/60 border border-white/10 p-3 rounded-2xl text-xs font-mono space-y-1 mt-2">
                  <div className="flex justify-between text-white/80">
                    <span>Индекс видимости AI:</span>
                    <span className="text-[#4285F4] font-bold">TOP-3 (#1)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#00FF66] font-bold">
                    <FontAwesomeIcon icon={faCheck} className="text-xs" />
                    <span>ChatGPT & Google Recommended</span>
                  </div>
                </div>
              </div>

              {/* STEP 2 */}
              <div className="bg-[#1E2024] border border-[#00FF66]/40 p-6 rounded-3xl flex flex-col justify-between relative overflow-hidden group hover:border-[#00FF66] transition-all shadow-[0_0_30px_rgba(0,255,102,0.1)]">
                <div>
                  {/* Step 2 Visual Banner */}
                  <div className="relative w-full h-40 rounded-2xl overflow-hidden mb-5 border border-white/10 group-hover:border-[#00FF66]/50 transition-all bg-black/40 shadow-inner">
                    <img src="/step2_gift_timer.png" alt="2. Подарок в карточке профиля" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1E2024] via-transparent to-transparent" />
                  </div>

                  <div className="flex justify-between items-start mb-4">
                    <span className="w-12 h-12 rounded-2xl bg-[#00FF66]/20 border border-[#00FF66] text-[#00FF66] font-black text-xl flex items-center justify-center shadow-[0_0_15px_rgba(0,255,102,0.4)]">
                      02
                    </span>
                    <span className="text-xs font-mono font-bold bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/30 px-2.5 py-1 rounded-full uppercase">
                      ⏳ 24H URGENCY TIMER
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-lg mb-2">
                    2. Подарок в карточке профиля
                  </h3>

                  <p className="text-xs text-white/70 leading-relaxed mb-4">
                    Клиент переходит в карточку вашего профиля и получает уникальную скидку <strong className="text-[#00FF66]">⚡ Revo</strong>, которая действует строго 24 часа. Счётчик времени включается автоматически.
                  </p>
                </div>

                {/* Infographic Widget 2 */}
                <div className="bg-black/60 border border-[#00FF66]/30 p-3 rounded-2xl text-xs font-mono space-y-1 mt-2">
                  <div className="flex justify-between text-white/80">
                    <span>Таймер активности:</span>
                    <span className="text-[#00FF66] font-bold animate-pulse">23:59:59 ч.</span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div className="w-full h-full bg-[#00FF66] animate-pulse" />
                  </div>
                </div>
              </div>

              {/* STEP 3 */}
              <div className="bg-[#1E2024] border border-[#FBBC05]/40 p-6 rounded-3xl flex flex-col justify-between relative overflow-hidden group hover:border-[#FBBC05] transition-all shadow-xl">
                <div>
                  {/* Step 3 Visual Banner */}
                  <div className="relative w-full h-40 rounded-2xl overflow-hidden mb-5 border border-white/10 group-hover:border-[#FBBC05]/50 transition-all bg-black/40 shadow-inner">
                    <img src="/step3_fomo_nobel.png" alt="3. Мгновенный визит по FOMO" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1E2024] via-transparent to-transparent" />
                  </div>

                  <div className="flex justify-between items-start mb-4">
                    <span className="w-12 h-12 rounded-2xl bg-[#FBBC05]/20 border border-[#FBBC05] text-[#FBBC05] font-black text-xl flex items-center justify-center shadow-[0_0_15px_rgba(251,188,5,0.4)]">
                      03
                    </span>
                    <span className="text-xs font-mono font-bold bg-[#FBBC05]/10 text-[#FBBC05] border border-[#FBBC05]/30 px-2.5 py-1 rounded-full uppercase">
                      🧠 FOMO (LOSS AVERSION)
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-lg mb-2">
                    3. Мгновенный визит по FOMO
                  </h3>

                  <p className="text-xs text-white/70 leading-relaxed mb-4">
                    Под воздействием психологического триггера <strong className="text-white">FOMO (Неприятие потерь)</strong> — эффекта, за исследование которого была присуждена <strong className="text-[#FBBC05]">Нобелевская премия по экономике</strong> — клиент прибегает к вам, чтобы не упустить сгорающую выгоду.
                  </p>
                </div>

                {/* Infographic Widget 3 */}
                <div className="bg-black/60 border border-[#FBBC05]/30 p-3 rounded-2xl text-xs font-mono space-y-1 mt-2">
                  <div className="flex justify-between text-[#FBBC05]">
                    <span>Нобелевский эффект:</span>
                    <span className="font-bold">Loss Aversion</span>
                  </div>
                  <div className="text-xs text-white/80">Мгновенный визит «Здесь и сейчас»</div>
                </div>
              </div>

              {/* STEP 4 */}
              <div className="bg-[#1E2024] border border-[#00FF66]/50 p-6 rounded-3xl flex flex-col justify-between relative overflow-hidden group hover:border-[#00FF66] transition-all shadow-[0_0_30px_rgba(0,255,102,0.15)]">
                <div>
                  {/* Step 4 Visual Banner */}
                  <div className="relative w-full h-40 rounded-2xl overflow-hidden mb-5 border border-white/10 group-hover:border-[#00FF66]/50 transition-all bg-black/40 shadow-inner">
                    <img src="/step4_retention_review.png" alt="4. Отзыв ➔ Продление ➔ Постоянный гость" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1E2024] via-transparent to-transparent" />
                  </div>

                  <div className="flex justify-between items-start mb-4">
                    <span className="w-12 h-12 rounded-2xl bg-[#00FF66]/20 border border-[#00FF66] text-[#00FF66] font-black text-xl flex items-center justify-center shadow-[0_0_15px_rgba(0,255,102,0.4)]">
                      04
                    </span>
                    <span className="text-xs font-mono font-bold bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/30 px-2.5 py-1 rounded-full uppercase">
                      🔄 MAX RETENTION & LTV
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-lg mb-2">
                    4. Отзыв ➔ Продление ➔ Постоянный гость
                  </h3>

                  <p className="text-xs text-white/70 leading-relaxed mb-4">
                    При визите Revo предлагает гостю оставить 5★ отзыв на Картах. За отзыв система <strong className="text-[#00FF66]">продлевает скидку еще на несколько дней</strong>, закрепляя привычку возвращаться и кардинально растит <strong className="text-[#00FF66]">Retention Rate</strong>.
                  </p>
                </div>

                {/* Infographic Widget 4 */}
                <div className="bg-black/60 border border-[#00FF66]/30 p-3 rounded-2xl text-xs font-mono space-y-1 mt-2">
                  <div className="flex justify-between text-white/80">
                    <span>Петля возврата:</span>
                    <span className="text-[#00FF66] font-bold">Retention +300%</span>
                  </div>
                  <div className="flex items-center gap-1 text-[#FBBC05] text-xs">
                    <FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} />
                    <span className="text-white/80 ml-1">5★ На Картах</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* 🟢 БЛОК 5: 3 ПРОСТЫХ ШАГА К ТОП-3 (ПОРЕВОЛЮЦИОННЫЙ GPS ПАЙПЛАЙН) */}
      <section className="py-24 px-4 sm:px-6 relative z-10 border-b border-white/10 bg-gradient-to-b from-[#121212] via-[#15181C] to-[#121212] overflow-hidden">
        
        {/* Ambient background glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-[#00FF66]/5 blur-[160px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto relative z-10">
          
          {/* Header Banner */}
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#00FF66]/15 border border-[#00FF66]/40 text-[#00FF66] text-xs font-mono font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(0,255,102,0.2)]">
              <FontAwesomeIcon icon={faChartLine} /> 🎯 ГЛАВНЫЙ МАРШРУТ УСПЕХА
            </div>

            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight max-w-3xl mx-auto">
              Начать получать клиентов из Google — <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00FF66] via-[#10B981] to-[#00FF66]">проще, чем заварить кофе</span>
            </h2>

            <p className="text-white/80 text-base sm:text-xl max-w-2xl mx-auto font-medium leading-relaxed">
              Вам не нужно нанимать программистов, менять персонал или разбираться в SEO. Все 100% технических настроек мы берем на себя <strong className="text-white">«под ключ» за 48 часов</strong>.
            </p>
          </div>

          {/* 3 Step Interactive Visual Cards Stack */}
          <div className="space-y-6 relative">
            
            {/* Connecting Neon Flow Indicator (Desktop) */}
            <div className="hidden md:block absolute left-[43px] top-12 bottom-12 w-1 bg-gradient-to-b from-[#4285F4] via-[#FBBC05] to-[#00FF66] z-0 opacity-40 rounded-full" />

            {/* ШАГ 1 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="relative z-10 bg-[#1A1C20] border-2 border-[#4285F4]/40 hover:border-[#4285F4] rounded-3xl p-6 sm:p-8 transition-all duration-300 shadow-[0_0_30px_rgba(66,133,244,0.1)] hover:shadow-[0_0_40px_rgba(66,133,244,0.25)] group text-left"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 border-b border-white/10 pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#4285F4]/20 border-2 border-[#4285F4] text-[#4285F4] font-black font-mono text-2xl flex items-center justify-center shadow-[0_0_20px_rgba(66,133,244,0.5)] group-hover:scale-110 transition-transform">
                    01
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold text-[#4285F4] bg-[#4285F4]/10 border border-[#4285F4]/30 px-2.5 py-0.5 rounded uppercase">
                      📍 ДЕЙСТВИЕ: 30 СЕКУНД
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                      ШАГ 1: Подайте заявку и получите бесплатный AI-Скан
                    </h3>
                  </div>
                </div>
                <span className="text-xs font-mono text-white/80 bg-black/60 px-3 py-1.5 rounded-xl border border-white/10">
                  Занимает 30 сек
                </span>
              </div>

              <p className="text-sm sm:text-base text-white/80 leading-relaxed font-medium">
                Вы отправляете нам название или ссылку на ваше заведение в Google Maps. Наш ИИ за 15 секунд сканирует профиль, находит скрытые утечки клиентов и строит персональную стратегию локального доминирования.
              </p>

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2 text-xs font-mono text-[#4285F4]">
                <span>✓ Без обязательств</span>
                <span>•</span>
                <span>✓ Без доступа к администраторским правам</span>
              </div>
            </motion.div>

            {/* ШАГ 2 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="relative z-10 bg-[#1A1C20] border-2 border-[#FBBC05]/40 hover:border-[#FBBC05] rounded-3xl p-6 sm:p-8 transition-all duration-300 shadow-[0_0_30px_rgba(251,188,5,0.1)] hover:shadow-[0_0_40px_rgba(251,188,5,0.25)] group text-left"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 border-b border-white/10 pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#FBBC05]/20 border-2 border-[#FBBC05] text-[#FBBC05] font-black font-mono text-2xl flex items-center justify-center shadow-[0_0_20px_rgba(251,188,5,0.5)] group-hover:scale-110 transition-transform">
                    02
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold text-[#FBBC05] bg-[#FBBC05]/10 border border-[#FBBC05]/30 px-2.5 py-0.5 rounded uppercase">
                      ⚙️ НАСТРОЙКА: 48 ЧАСОВ
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                      ШАГ 2: Мы запускаем автопилот и упаковку под ключ
                    </h3>
                  </div>
                </div>
                <span className="text-xs font-mono text-[#FBBC05] bg-[#FBBC05]/10 px-3 py-1.5 rounded-xl border border-[#FBBC05]/30 font-bold">
                  100% Под ключ
                </span>
              </div>

              <p className="text-sm sm:text-base text-white/80 leading-relaxed font-medium">
                Мы оцифровываем ваше меню/прайс, прошиваем карточку высокочастотными гео-ключами, подключаем POS-интеграцию и активируем авто-постинг со сгорающими скидками <strong className="text-[#00FF66]">⚡ Revo Battery Status</strong>.
              </p>

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2 text-xs font-mono text-[#FBBC05]">
                <span>✓ Полная автономность</span>
                <span>•</span>
                <span>✓ Ваш персонал работает в привычном режиме</span>
              </div>
            </motion.div>

            {/* ШАГ 3 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative z-10 bg-[#1A231C] border-2 border-[#00FF66]/60 hover:border-[#00FF66] rounded-3xl p-6 sm:p-8 transition-all duration-300 shadow-[0_0_40px_rgba(0,255,102,0.2)] hover:shadow-[0_0_60px_rgba(0,255,102,0.35)] group text-left"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 border-b border-white/10 pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#00FF66]/20 border-2 border-[#00FF66] text-[#00FF66] font-black font-mono text-2xl flex items-center justify-center shadow-[0_0_25px_rgba(0,255,102,0.7)] group-hover:scale-110 transition-transform">
                    03
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold text-[#00FF66] bg-[#00FF66]/10 border border-[#00FF66]/30 px-2.5 py-0.5 rounded uppercase">
                      🏆 РЕЗУЛЬТАТ: ТОП-3 GOOGLE MAPS
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                      ШАГ 3: Забирайте горячий Поиск и растите чистую прибыль
                    </h3>
                  </div>
                </div>
                <span className="text-xs font-mono text-[#00FF66] bg-[#00FF66]/20 px-3 py-1.5 rounded-xl border border-[#00FF66]/40 font-bold animate-pulse">
                  +300% Органический рост
                </span>
              </div>

              <p className="text-sm sm:text-base text-white/90 leading-relaxed font-medium">
                Заведение взлетает в <strong className="text-[#00FF66]">ТОП-3 Local Pack</strong> вашего района. Вы получаете рост органического трафика до <strong className="text-[#00FF66]">+300%</strong> и прирост чистой прибыли до <strong className="text-[#00FF66]">+45%</strong> без комиссии агрегаторам.
              </p>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2 text-xs font-mono text-[#00FF66] font-bold">
                <span>💰 100% Выручки в вашу кассу</span>
                <span>•</span>
                <span>💎 Бессрочный цифровой актив</span>
              </div>
            </motion.div>

          </div>

          {/* Action CTA Button Below Pipeline */}
          <div className="mt-12 text-center">
            <button 
              onClick={scrollToAudit}
              className="bg-[#00FF66] hover:bg-[#10B981] text-black font-black uppercase tracking-wider text-sm sm:text-base py-5 px-10 rounded-full transition-all shadow-[0_0_35px_rgba(0,255,102,0.6)] hover:scale-105 active:scale-95 inline-flex items-center gap-3 cursor-pointer"
            >
              <FontAwesomeIcon icon={faBolt} /> ⚡ НАЧАТЬ ШАГ 1: ПОЛУЧИТЬ БЕСПЛАТНЫЙ AI-АУДИТ
            </button>
          </div>

        </div>
      </section>

      {/* 🟢 БЛОК 6: ОТЗЫВЫ ВЛАДЕЛЬЦЕВ БИЗНЕСА (SOCIAL PROOF) */}
      <section className="py-20 px-4 sm:px-6 relative z-10 border-b border-white/10 bg-[#181A1D]/60">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FBBC05]/10 border border-[#FBBC05]/30 text-[#FBBC05] text-xs font-mono font-bold uppercase tracking-wider mb-4">
              <FontAwesomeIcon icon={faStar} /> 100% ПОДТВЕРЖДЕННЫЕ КЕЙСЫ
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Они уже забрали ТОП-3 в своих районах и вышли из кабалы агрегаторов
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            {/* Review 1 */}
            <div className="bg-[#1E2024] border border-white/10 p-6 sm:p-8 rounded-3xl flex flex-col justify-between relative shadow-xl">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex text-[#FBBC05] gap-1 text-sm">
                    <FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} />
                  </div>
                  <span className="text-xs font-mono text-[#00FF66] bg-[#00FF66]/10 px-2 py-0.5 rounded border border-[#00FF66]/30">Verified GBP Owner</span>
                </div>
                <p className="text-xs text-white/80 leading-relaxed italic mb-6">
                  «Раньше мы отдавали Deliveroo почти 30% с каждого заказа только за то, чтобы нас видели. После запуска Revo наш Google-профиль превратился в полноценную витрину. ИИ постоянно выкладывает фото наших рибаев с гео-тегами. За второй месяц прямые заказы из Google Maps выросли на 45%, и мы перестали кормить агрегаторы».
                </p>
              </div>
              <div className="pt-4 border-t border-white/10">
                <h4 className="font-bold text-white text-sm">🍽 Марк</h4>
                <p className="text-xs text-white/80">Управляющий стейк-хауса (Дубай Marina)</p>
              </div>
            </div>

            {/* Review 2 */}
            <div className="bg-[#1E2024] border border-white/10 p-6 sm:p-8 rounded-3xl flex flex-col justify-between relative shadow-xl">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex text-[#FBBC05] gap-1 text-sm">
                    <FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} />
                  </div>
                  <span className="text-xs font-mono text-[#00FF66] bg-[#00FF66]/10 px-2 py-0.5 rounded border border-[#00FF66]/30">Verified GBP Owner</span>
                </div>
                <p className="text-xs text-white/80 leading-relaxed italic mb-6">
                  «У нас была обычная карточка на Картах, но пустые кресла в середине недели всё равно оставались. Revo запустил динамическую скидку на "тихие часы". Мужики открывают Карты, видят наш маркер ⚡, понимают, что прямо сейчас скидка 15%, и бронируют кресло за 10 секунд. Загрузка выросла до 90%».
                </p>
              </div>
              <div className="pt-4 border-t border-white/10">
                <h4 className="font-bold text-white text-sm">✂️ Алекс</h4>
                <p className="text-xs text-white/80">Владелец сети барбершопов (Майами)</p>
              </div>
            </div>

            {/* Review 3 */}
            <div className="bg-[#1E2024] border border-white/10 p-6 sm:p-8 rounded-3xl flex flex-col justify-between relative shadow-xl">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex text-[#FBBC05] gap-1 text-sm">
                    <FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} />
                  </div>
                  <span className="text-xs font-mono text-[#00FF66] bg-[#00FF66]/10 px-2 py-0.5 rounded border border-[#00FF66]/30">Verified GBP Owner</span>
                </div>
                <p className="text-xs text-white/80 leading-relaxed italic mb-6">
                  «Нам часто прилетали фейковые 1-звездочные отзывы от конкурентов, из-за чего рейтинг падал до 4.3 и записи рушились. Revo не просто публикует наши посты, он в фоновом режиме через апелляции снес 4 неадекватных отзыва за месяц и поднял наш рейтинг до 4.9. Теперь мы на 1-м месте в поиске района».
                </p>
              </div>
              <div className="pt-4 border-t border-white/10">
                <h4 className="font-bold text-white text-sm">🩺 Д-р Елена</h4>
                <p className="text-xs text-white/80">Главный врач косметологии</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🟢 БЛОК 7: SEO-ОПТИМИЗИРОВАННЫЙ Q&A (ЧАСТЫЕ ВОПРОСЫ) */}
      <section className="py-20 px-4 sm:px-6 relative z-10 border-b border-white/10 bg-[#121212]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#4285F4]/10 border border-[#4285F4]/30 text-[#4285F4] text-xs font-mono font-bold uppercase tracking-wider mb-4">
              <FontAwesomeIcon icon={faSearch} /> PEOPLE ALSO ASK (GOOGLE FAQ)
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Ответы на главные вопросы владельцев бизнеса
            </h2>
          </div>

          <div className="space-y-4 text-left">
            {[
              {
                q: "Q1: Нужно ли мне или моему персоналу обучаться работе с Revo?",
                a: "Нет. Система полностью автономна. ИИ сам генерирует посты, выкладывает меню и оптимизирует профиль для Поиска Google в вашем регионе. Ваши сотрудники просто принимают заказы или гостей, как обычно."
              },
              {
                q: "Q2: Берете ли вы комиссию с заказов или бронирований клиентов?",
                a: "Никаких комиссий. В отличие от платформ доставки и сервисов записи, вы платите только фиксированную абонентскую плату за софт. Все 100% денег от клиентов идут напрямую в вашу кассу."
              },
              {
                q: "Q3: Как именно Revo помогает удерживать место в ТОП-3 Google Maps?",
                a: "Алгоритмы Google ранжируют профили по активности. Revo автоматически превращает ваш GBP в активный аналог Instagram: публикует новости, обновляет позиции меню, внедряет EXIF-GPS данные в фото и отвечает на отзывы с SEO-ключами. Это даёт Google сигнал, что вы — лидер локации."
              },
              {
                q: "Q4: А если у меня уже есть сайт или страница в соцсетях?",
                a: "Revo не заменяет ваш сайт, а работает как сверхбыстрый конвертер на самом верхнем этапе — в момент, когда пользователь ищет услугу или блюдо в Поиске Google. Ссылка ⚡ Revo ведет клиента напрямую в динамическое меню без долгих загрузок тяжело верстанных сайтов."
              },
              {
                q: "Q5: Как работает перехват плохих отзывов?",
                a: "Если гость остался недоволен сервисом, он оставляет отзыв внутри электронного меню Revo. Система перехватывает сигнал, отправляет уведомление управляющему лично, но не публикует негатив на Google Картах, давая вам возможность решить вопрос с клиентом лично."
              }
            ].map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="bg-[#1E2024] border border-white/10 rounded-2xl overflow-hidden transition-colors">
                  <button 
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-5 sm:p-6 text-left font-bold text-white text-base sm:text-lg flex justify-between items-center gap-4 cursor-pointer hover:bg-white/5"
                  >
                    <span>{faq.q}</span>
                    <FontAwesomeIcon icon={faChevronDown} className={`text-xs transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#00FF66]' : 'text-white/70'}`} />
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }} 
                        animate={{ height: 'auto', opacity: 1 }} 
                        exit={{ height: 0, opacity: 0 }}
                        className="px-5 sm:px-6 pb-6 text-sm text-white/70 leading-relaxed border-t border-white/5 pt-4"
                      >
                        {faq.a}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 🟢 БЛОК 8: КАРТИНА КАТАСТРОФЫ VS ТРИУМФ (STORYBRAND FAILURE & SUCCESS) */}
      <section className="py-20 px-4 sm:px-6 relative z-10 border-b border-white/10 bg-[#181A1D]/80">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Разделение дорог: Где ваш бизнес окажется через 30 дней?
            </h2>
            <p className="text-white/80 text-base max-w-2xl mx-auto mt-4">
              Прямо сейчас вы стоите перед выбором. Рынок в вашем районе не будет ждать — ваши конкуренты уже ищут способы забрать трафик из Google Поиска.
            </p>
          </div>

          {/* Split Screen UI */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left">
            {/* Scenario 1: Catastrophe */}
            <div className="bg-[#1E2024] border border-[#EA4335]/40 rounded-3xl p-6 sm:p-10 shadow-[0_0_40px_rgba(234,67,53,0.15)] relative overflow-hidden">
              <div className="inline-block bg-[#EA4335]/20 text-[#EA4335] text-xs font-mono font-bold px-3 py-1 rounded-full border border-[#EA4335]/40 mb-4">
                💥 СЦЕНАРИЙ 1: КАРТИНА КАТАСТРОФЫ
              </div>
              <h3 className="text-xl font-bold text-white mb-4">(Если вы оставите всё как есть)</h3>
              
              <ul className="space-y-4 text-xs text-white/70 leading-relaxed">
                <li className="flex items-start gap-3">
                  <FontAwesomeIcon icon={faXmark} className="text-[#EA4335] text-base mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="text-white block font-bold mb-0.5">Кабала и слив маржи:</strong>
                    Вы продолжаете отдавать от 25% до 35% за каждый чек агрегаторам и службам доставки, работая ради покрытия их комиссий.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <FontAwesomeIcon icon={faXmark} className="text-[#EA4335] text-base mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="text-white block font-bold mb-0.5">Скрытая утечка клиентов:</strong>
                    Сотни людей ежедневно вбивают в Google Поиск ваши услуги, но алгоритмы уводят их к соседям. Вы продолжаете терять до $4,500 чистой прибыли каждый месяц.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <FontAwesomeIcon icon={faXmark} className="text-[#EA4335] text-base mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="text-white block font-bold mb-0.5">Захват района конкурентами:</strong>
                    Пока вы думаете, более быстрые заведения внедряют технологии ИИ-автопилота и забирают ТОП-3 выдачи Google Maps навсегда.
                  </div>
                </li>
              </ul>
            </div>

            {/* Scenario 2: Triumph */}
            <div className="bg-[#1E2024] border border-[#00FF66]/50 rounded-3xl p-6 sm:p-10 shadow-[0_0_40px_rgba(0,255,102,0.2)] relative overflow-hidden">
              <div className="inline-block bg-[#00FF66]/20 text-[#00FF66] text-xs font-mono font-bold px-3 py-1 rounded-full border border-[#00FF66]/40 mb-4">
                🏆 СЦЕНАРИЙ 2: КАРТИНА ТРИУМФА
              </div>
              <h3 className="text-xl font-bold text-white mb-4">(Если вы активируете Revo сегодня)</h3>

              <ul className="space-y-4 text-xs text-white/80 leading-relaxed">
                <li className="flex items-start gap-3">
                  <FontAwesomeIcon icon={faCheck} className="text-[#00FF66] text-base mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="text-white block font-bold mb-0.5">Абсолютное доминирование в Поиске:</strong>
                    Ваш профиль вылетает в <strong className="text-[#00FF66]">ТОП-3 Google Maps</strong> в вашем районе. Ваше заведение забирает 80% всего органического трафика.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <FontAwesomeIcon icon={faCheck} className="text-[#00FF66] text-base mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="text-white block font-bold mb-0.5">Конвертер «Здесь и Сейчас»:</strong>
                    Символ ⚡ Revo и динамическая скидка мгновенно превращают пользователей Поиска в платящих гостей.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <FontAwesomeIcon icon={faCheck} className="text-[#00FF66] text-base mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="text-white block font-bold mb-0.5">Прямые деньги и своя база:</strong>
                    Все 100% выручки идут в вашу кассу, а контакты гостей сохраняются в вашей собственной базе.
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* FOMO Urgency Warning Block */}
          <div className="mt-10 p-6 rounded-2xl bg-[#EA4335]/10 border border-[#EA4335]/30 text-left flex items-start gap-4">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-[#EA4335] text-2xl mt-1 flex-shrink-0" />
            <p className="text-xs text-white/80 leading-relaxed">
              <strong className="text-[#EA4335] uppercase tracking-wider block mb-1">⚠️ ФАКТОР СРОЧНОСТИ (FOMO TRIGGER):</strong>
              В каждом районе мы подключаем <strong className="text-white">не более 3 заведений одной категории</strong> (например, только 3 барбершопа или 3 ресторана в одном микрорайоне), чтобы обеспечить им эксклюзивное доминирование в ТОП-3 выдачи Google. Если ваш прямой конкурент подаст заявку раньше вас — ваш район будет заблокирован для подключения.
            </p>
          </div>
        </div>
      </section>

      {/* 🟢 БЛОК 9: ФИНАЛЬНЫЙ CALL TO ACTION И БЛОК ВАЛИДАТОРА МЕСТ GOOGLE MAPS */}
      <section ref={auditSectionRef} className="py-20 px-4 sm:px-6 relative z-10 border-b border-white/10 bg-[#121212]">
        <div className="max-w-5xl mx-auto">
          
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Включите Revo сегодня — заберите ТОП-3 в вашем районе уже в первый месяц
            </h2>
            <p className="text-white/80 text-base max-w-xl mx-auto mt-3">
              Не отдавайте своих клиентов конкурентам. Запустите бесплатный AI-скан прямо сейчас.
            </p>
          </div>

          {/* Outrich 3-Step Audit & Lost Revenue Potential Module */}
          <div className="mb-16">
            <OutrichRevenueWidget />
          </div>

          {/* Interactive ROI & Lost Revenue Potential Calculator Module */}
          <div className="mb-12">
            <ProfitCalculator onOpenContactModal={() => setIsContactModalOpen(true)} />
          </div>

          {/* Interactive Capture Form (Search Bar Google Styled Card) */}
          <div className="bg-[#1E2024] border border-[#00FF66]/40 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden text-left">
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Бесплатный AI-Скан регионального доминирования</h3>
            <p className="text-xs text-white/80 mb-6">Заполните форму, и мы забронируем ваш микрорайон для эксклюзивного подключения.</p>

            {formSuccess ? (
              <div className="text-center py-8">
                <FontAwesomeIcon icon={faCheckCircle} className="text-5xl text-[#00FF66] mb-4" />
                <h4 className="text-2xl font-bold text-white mb-2">СПАСИБО! ЗАЯВКА УСПЕШНО ЗАРЕГИСТРИРОВАНА</h4>
                <p className="text-sm text-white/70">Мы свяжемся с вами в течение 15 минут для подтверждения бронирования района.</p>
              </div>
            ) : (
              <form onSubmit={handleFinalFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-white/80 mb-1.5">1. Название заведения / Мастера:</label>
                    <input 
                      type="text" 
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Например: Barbershop Revo"
                      className="w-full bg-black/60 border border-white/20 rounded-2xl p-4 text-white text-xs focus:outline-none focus:border-[#00FF66]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-white/80 mb-1.5">2. Ниша:</label>
                    <select 
                      value={formNiche}
                      onChange={(e) => setFormNiche(e.target.value)}
                      className="w-full bg-black/60 border border-white/20 rounded-2xl p-4 text-white text-xs focus:outline-none focus:border-[#00FF66]"
                    >
                      <option value="Ресторан">Ресторан / Кафе / Бар</option>
                      <option value="Барбершоп">Барбершоп / Салон красоты</option>
                      <option value="Клиника">Клиника / Стоматология</option>
                      <option value="Мастер">Выездной мастер / СПА</option>
                      <option value="Другое">Другое</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-white/80 mb-1.5">3. Локация (Город / Район):</label>
                    <input 
                      type="text" 
                      required
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      placeholder="Например: Москва, Центральный район"
                      className="w-full bg-black/60 border border-white/20 rounded-2xl p-4 text-white text-xs focus:outline-none focus:border-[#00FF66]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-white/80 mb-1.5">4. WhatsApp / Telegram:</label>
                    <input 
                      type="text" 
                      required
                      value={formMessenger}
                      onChange={(e) => setFormMessenger(e.target.value)}
                      placeholder="+7 (999) 000-00-00 или @username"
                      className="w-full bg-black/60 border border-white/20 rounded-2xl p-4 text-white text-xs focus:outline-none focus:border-[#00FF66]"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={formSubmitting}
                  className="w-full bg-[#00FF66] hover:bg-[#10B981] text-black font-black uppercase tracking-wider text-sm py-5 px-8 rounded-full transition-all shadow-[0_0_35px_rgba(0,255,102,0.5)] hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer mt-4"
                >
                  {formSubmitting ? (
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faBolt} /> ⚡ ЗАПУСТИТЬ AI-АУДИТ И ВКЛЮЧИТЬ REVO
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* 🟢 STICKY BOTTOM CTA BAR (Mobile-First Rule: lower 1/3 of screen) */}
      <AnimatePresence>
        {showStickyBar && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-[#121212]/95 backdrop-blur-2xl border-t border-white/10 shadow-[0_-10px_30px_rgba(0,0,0,0.9)] flex items-center justify-center"
          >
            <div className="max-w-md w-full flex items-center gap-3">
              <button 
                onClick={scrollToAudit}
                className="w-full bg-[#00FF66] hover:bg-[#10B981] text-black font-black uppercase tracking-wider text-xs sm:text-sm py-4 px-6 rounded-full transition-all shadow-[0_0_25px_rgba(0,255,102,0.6)] animate-pulse flex items-center justify-center gap-2 cursor-pointer"
              >
                <FontAwesomeIcon icon={faBolt} /> ⚡ ПОЛУЧИТЬ БЕСПЛАТНЫЙ AI-АУДИТ
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Contact */}
      <B2BContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default RevoAlternativeLanding;
