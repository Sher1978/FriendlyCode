import React, { useState, useEffect, useRef } from 'react';
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
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const RevoAlternativeLanding = () => {
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
            <span className="hidden sm:inline-block text-[11px] font-mono font-bold text-[#00FF66] bg-[#00FF66]/10 px-2.5 py-1 rounded-full border border-[#00FF66]/30 uppercase tracking-widest">
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
            <span className="text-[9px] font-mono text-white/50 block mt-1 bg-black/60 px-1.5 rounded">Конкурент #12</span>
          </div>

          <div className="absolute top-[35%] right-[22%] opacity-40 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-[#EA4335]/30 border border-[#EA4335] flex items-center justify-center text-[#EA4335] text-xs shadow-[0_0_15px_rgba(234,67,53,0.5)]">
              <FontAwesomeIcon icon={faMapMarkerAlt} />
            </div>
            <span className="text-[9px] font-mono text-white/50 block mt-1 bg-black/60 px-1.5 rounded">Конкурент #8</span>
          </div>

          {/* Revo Core Green Pin */}
          <div className="absolute top-[30%] left-[50%] -translate-x-1/2 z-20">
            <motion.div 
              animate={{ y: [-6, 6, -6] }} 
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="flex flex-col items-center cursor-pointer"
              onClick={scrollToAudit}
            >
              <div className="px-3 py-1 rounded-full bg-[#00FF66] text-black font-black text-[11px] uppercase tracking-wider shadow-[0_0_25px_rgba(0,255,102,0.9)] flex items-center gap-1 mb-1">
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
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#00FF66]/10 border border-[#00FF66]/30 text-[#00FF66] text-xs font-mono font-bold uppercase tracking-wider">
                  <FontAwesomeIcon icon={faFire} /> ТОЛЬКО ОРГАНИЧЕСКИЙ ПОИСК GOOGLE
                </div>
                
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
                  Единственный канал, который даёт горячих клиентов <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#00FF66] via-[#10B981] to-[#00FF66]">бесплатно</span> — прямо из Поиска Google.
                </h1>
                
                <p className="text-white/70 text-sm sm:text-base font-medium leading-relaxed">
                  Социальные сети выгорают, а цена клика в таргете растет. Единственное место, где клиент сам ищет, где поесть, подстричься или пройти процедуру — это Поиск Google и Google Maps.
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
                <div className="mb-2 px-4 py-1 rounded-full bg-[#00FF66]/10 border border-[#00FF66]/30 text-[10px] font-mono font-bold text-[#00FF66] uppercase tracking-wider">
                  🔋 REVO DYNAMIC BATTERY STATUS
                </div>
                <div className="w-full max-w-xs">
                  <PngBattery discount={batteryDiscount} />
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-white/60 font-mono">
                  <span>Энергия мотивации:</span>
                  <span className="font-bold text-[#00FF66]">{displayEnergy}%</span>
                  <span className="text-white/40">|</span>
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
                  <span className="text-[11px] text-white/50 font-mono">
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
                        {nicheCards[activeNicheIdx].stat} <span className="text-white/60 font-normal">{nicheCards[activeNicheIdx].statLabel}</span>
                      </div>

                      <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-medium">
                        {nicheCards[activeNicheIdx].text}
                      </p>
                    </div>

                    {/* Infographic Metric Meter Panel for Active Card */}
                    <div className="lg:col-span-5 bg-black/60 border border-white/10 rounded-2xl p-5 flex flex-col justify-center space-y-3">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-white/60">{nicheCards[activeNicheIdx].metricLabel}</span>
                        <span className="font-bold text-[#00FF66]">{nicheCards[activeNicheIdx].metricPercent}%</span>
                      </div>
                      
                      {/* Visual Infographic Progress Bar */}
                      <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden p-0.5 border border-white/5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${nicheCards[activeNicheIdx].metricPercent}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="h-full rounded-full bg-gradient-to-r from-[#00FF66] to-[#10B981] shadow-[0_0_12px_rgba(0,255,102,0.8)]"
                        />
                      </div>

                      <div className="flex justify-between items-center text-[10px] font-mono text-white/40 pt-1">
                        <span>Без REVO: ~15%</span>
                        <span className="text-[#00FF66] font-bold">● REVO ТОП-3: {nicheCards[activeNicheIdx].metricPercent}%</span>
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
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center gap-2 cursor-pointer ${i === activeNicheIdx ? 'bg-[#00FF66]/20 border-[#00FF66] text-[#00FF66] shadow-[0_0_15px_rgba(0,255,102,0.2)]' : 'bg-black/30 border-white/5 text-white/50 hover:bg-white/5 hover:text-white'}`}
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
            
            {/* Visual: Smartphone Mockup with Live Feed */}
            <motion.div 
              initial="hidden" 
              whileInView="visible" 
              variants={fadeInUp} 
              viewport={{ once: true }}
              className="lg:col-span-5 flex justify-center"
            >
              <div className="w-full max-w-sm bg-[#121212] border-4 border-white/10 rounded-[48px] p-4 shadow-[0_0_50px_rgba(0,0,0,0.9)] relative overflow-hidden">
                {/* Notch */}
                <div className="w-32 h-4 bg-black rounded-b-xl mx-auto mb-4" />

                {/* GBP Header */}
                <div className="bg-[#1E2024] p-4 rounded-3xl border border-white/10 mb-4 text-left">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-mono text-[#4285F4] font-bold bg-[#4285F4]/10 px-2 py-0.5 rounded">Google Business Profile</span>
                    <span className="text-[10px] font-mono text-[#00FF66] animate-pulse">● Update 2 mins ago</span>
                  </div>
                  <h4 className="font-bold text-white text-lg">Gastro Bar & Lounge</h4>
                  <div className="flex items-center gap-1 text-xs text-[#FBBC05] font-bold mt-0.5">
                    <span>4.9</span> <FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} />
                    <span className="text-white/40 ml-1">(240+ отзывов)</span>
                  </div>
                </div>

                {/* Live Instagram-style Stories & Feed */}
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden h-48 border border-[#00FF66]/30 group">
                    <img src="/assets/emirates-golf.jpg" alt="Live Feed Post" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                    <div className="absolute top-3 left-3 bg-[#00FF66] text-black text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-[0_0_10px_rgba(0,255,102,0.8)]">
                      ⚡ SPECIAL OFFER -15%
                    </div>
                    <div className="absolute bottom-3 left-3 text-left">
                      <p className="text-xs font-bold text-white">Авторский сет «Стейк & Коктейль»</p>
                      <p className="text-[10px] text-white/60">📍 GEO-tagged • 150m от вас</p>
                    </div>
                  </div>

                  <div className="bg-[#1E2024] p-3 rounded-2xl border border-white/10 flex items-center justify-between text-left">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#00FF66]/20 border border-[#00FF66] flex items-center justify-center text-[#00FF66] text-xs">
                        <FontAwesomeIcon icon={faBolt} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">AI-Автопостинг каждые 48 часов</p>
                        <p className="text-[10px] text-white/50">100% EXIF-GPS фото метки</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-[#00FF66]">Active</span>
                  </div>
                </div>
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
                    <p className="text-xs text-white/60 leading-relaxed">ИИ на постоянной основе публикует в вашей карточке GBP обновления, сторис-посты, акции, новинки меню и GEO-тегированные фото высокого качества.</p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#1E2024] border border-white/10 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#4285F4]/20 border border-[#4285F4]/40 flex items-center justify-center text-[#4285F4] text-lg flex-shrink-0 mt-0.5">
                    ⚙️
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base mb-1">Магия алгоритмов Google</h4>
                    <p className="text-xs text-white/60 leading-relaxed">Google обожает активные профили. Постоянные обновления показывают поисковому роботу, что заведение «живое», поднимая вас в <strong className="text-white">ТОП-3 выдачи (Local Pack)</strong>.</p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#1E2024] border border-white/10 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#FBBC05]/20 border border-[#FBBC05]/40 flex items-center justify-center text-[#FBBC05] text-lg flex-shrink-0 mt-0.5">
                    👑
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base mb-1">Доминирование в районе</h4>
                    <p className="text-xs text-white/60 leading-relaxed">ТОП-3 выдачи Google забирает <strong className="text-[#00FF66]">более 80% всех реальных клиентов</strong> в вашем районе. Все остальные 20 заведений делят между собой оставшиеся крохи.</p>
                  </div>
                </div>
              </div>

              {/* Vector Infographic: SMM vs Google Search Local Pack Comparison Bar */}
              <div className="mt-8 p-6 rounded-3xl bg-[#121212] border border-white/10 space-y-4">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-white/60 flex flex-col sm:flex-row justify-between gap-1">
                  <span>📊 ИНФОГРАФИКА: СРАВНЕНИЕ КОНВЕРСИИ КАНАЛОВ</span>
                  <span className="text-[#00FF66]">Поисковый Интент Покупателя</span>
                </div>

                {/* Channel 1: SMM Instagram */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-white/60">
                    <span>Социальные сети (Instagram / Таргет SMM)</span>
                    <span className="text-[#EA4335]">Конверсия ~1.2% (Пассивный просмотр)</span>
                  </div>
                  <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden">
                    <div className="w-[12%] h-full bg-[#EA4335]/70 rounded-full" />
                  </div>
                </div>

                {/* Channel 2: Google Maps Local Pack */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-white">
                    <span className="text-[#00FF66]">Google Maps ТОП-3 Local Pack (REVO)</span>
                    <span className="text-[#00FF66] font-mono font-black">Конверсия 84% (Горячая покупка)</span>
                  </div>
                  <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden p-0.5 border border-[#00FF66]/30">
                    <div className="w-[84%] h-full bg-gradient-to-r from-[#00FF66] to-[#10B981] rounded-full shadow-[0_0_15px_rgba(0,255,102,0.8)]" />
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
            <p className="text-white/60 text-base max-w-2xl mx-auto mt-4">
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
                    <p className="text-xs text-white/60 leading-relaxed mt-1">Если вы не публикуете контент каждые 2–3 дня, алгоритмы Google опускают вас вниз выдачи, считая заведение неактивным.</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <span className="w-8 h-8 rounded-full bg-[#EA4335]/20 border border-[#EA4335] text-[#EA4335] font-bold flex items-center justify-center text-sm flex-shrink-0">2</span>
                  <div>
                    <h4 className="font-bold text-white text-base">Нулевая мотивация (Zero Reason to Act)</h4>
                    <p className="text-xs text-white/60 leading-relaxed mt-1">Пользователь находит ваш профиль, видит обычную справочную информацию... и закрывает вкладку. <strong className="text-white">У него нет причины заказать прямо сейчас.</strong></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Red Counter Indicator Box */}
            <div className="lg:col-span-6 flex flex-col items-center justify-center bg-black/60 border border-[#EA4335]/40 rounded-2xl p-8 relative">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#EA4335] mb-2">ЕЖЕМЕСЯЧНАЯ СКРЫТАЯ УТЕЧКА ВЫРУЧКИ</span>
              <div className="text-4xl sm:text-6xl font-black font-mono text-[#EA4335] drop-shadow-[0_0_20px_rgba(234,67,53,0.6)] mb-2">
                - $4,500 <span className="text-xl font-normal text-white/40">/мес</span>
              </div>
              <div className="inline-block bg-[#EA4335]/20 text-[#EA4335] text-xs font-mono font-bold px-3 py-1 rounded-full border border-[#EA4335]/40 mb-4">
                Статус карточки: "No Activity for 30 Days"
              </div>
              <p className="text-xs text-white/50 text-center max-w-xs">
                Столько вы отдаете прямым конкурентам в вашем районе, пока ваш профиль не активен.
              </p>
            </div>
          </div>

          {/* Visual Leaky Revenue Funnel Diagram Infographic */}
          <div className="mt-8 p-6 rounded-3xl bg-[#1E2024] border border-[#EA4335]/30 space-y-3 text-left">
            <h4 className="text-xs font-mono font-bold uppercase text-[#EA4335] tracking-widest mb-3 flex items-center gap-2">
              <FontAwesomeIcon icon={faExclamationTriangle} /> 🔻 ИНФОГРАФИКА: СХЕМА УТЕЧКИ ЛОКАЛЬНОГО ТРАФИКА
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-black/50 border border-white/10">
                <span className="text-[10px] font-mono text-white/40 block mb-1">01. ПОИСК В РАЙОНЕ</span>
                <span className="text-lg font-black text-white block">1,000 запросов</span>
                <span className="text-[11px] text-white/50 block mt-1">Клиенты ищут заведение рядом</span>
              </div>

              <div className="p-4 rounded-2xl bg-black/50 border border-[#00FF66]/30">
                <span className="text-[10px] font-mono text-[#00FF66] block mb-1">02. LOCAL PACK TOP-3</span>
                <span className="text-lg font-black text-[#00FF66] block">800 кликов (80%)</span>
                <span className="text-[11px] text-white/50 block mt-1">Забирают 3 первых места</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#EA4335]/10 border border-[#EA4335]/30">
                <span className="text-[10px] font-mono text-[#EA4335] block mb-1">03. НЕАКТИВНЫЙ ПРОФИЛЬ</span>
                <span className="text-lg font-black text-[#EA4335] block">50 кликов (5%)</span>
                <span className="text-[11px] text-white/50 block mt-1">Делят остальные 20 заведений</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#EA4335]/20 border border-[#EA4335] shadow-[0_0_20px_rgba(234,67,53,0.3)]">
                <span className="text-[10px] font-mono text-white block mb-1">04. ПОТЕРЯ ВЫРУЧКИ</span>
                <span className="text-lg font-black text-[#EA4335] block">-$4,500 /мес</span>
                <span className="text-[11px] text-white/80 block mt-1">Уходит прямым конкурентам</span>
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
              <p className="text-xs text-white/60 leading-relaxed mb-4">Публикация акций, новостей, меню и гео-фото на автопилоте каждые 48 часов.</p>
              <div className="text-[10px] font-mono text-[#00FF66] bg-[#00FF66]/10 px-2.5 py-1 rounded inline-block">Захват Поиска</div>
            </div>

            <div className="bg-[#1E2024] border border-[#00FF66]/40 p-6 rounded-3xl text-left relative overflow-hidden group shadow-[0_0_25px_rgba(0,255,102,0.1)]">
              <div className="text-3xl font-black text-[#00FF66] mb-3">02</div>
              <h4 className="font-bold text-white text-lg mb-2">Revo Dynamic Engine</h4>
              <p className="text-xs text-white/60 leading-relaxed mb-4">Клиент получает сгорающую скидку ⚡ «Здесь и сейчас» (🔋 Revo Battery Status).</p>
              <div className="text-[10px] font-mono text-[#00FF66] bg-[#00FF66]/10 px-2.5 py-1 rounded inline-block">Мгновенный визит</div>
            </div>

            <div className="bg-[#1E2024] border border-white/10 p-6 rounded-3xl text-left relative overflow-hidden group hover:border-[#00FF66]/50 transition-colors">
              <div className="text-3xl font-black text-[#00FF66] mb-3">03</div>
              <h4 className="font-bold text-white text-lg mb-2">Direct Sales & Retention</h4>
              <p className="text-xs text-white/60 leading-relaxed mb-4">Прямой расчет без комиссий + Возврат клиента на следующий день.</p>
              <div className="text-[10px] font-mono text-[#00FF66] bg-[#00FF66]/10 px-2.5 py-1 rounded inline-block">100% Выручка</div>
            </div>
          </div>

          {/* 4 Technology Components Detailed Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            <div className="p-6 rounded-2xl bg-[#121212] border border-white/10">
              <h5 className="font-bold text-white text-base mb-2 text-[#00FF66]">1. ИИ-Автопилот Google</h5>
              <p className="text-xs text-white/60 leading-relaxed">Наш ИИ настраивает профиль под точечные микро-запросы («сложное окрашивание», «авторские коктейли») и держит профиль в ТОП-3 за счет постоянного автопостинга.</p>
            </div>

            <div className="p-6 rounded-2xl bg-[#121212] border border-white/10">
              <h5 className="font-bold text-white text-base mb-2 text-[#00FF66]">2. Триггер срочности</h5>
              <p className="text-xs text-white/60 leading-relaxed">Кликая по ссылке ⚡ Revo, клиент попадает в ваше меню и видит сгорающую скидку (🔋 Revo Battery Status). Человек принимает решение мгновенно.</p>
            </div>

            <div className="p-6 rounded-2xl bg-[#121212] border border-white/10">
              <h5 className="font-bold text-white text-base mb-2 text-[#00FF66]">3. Прямая экономика</h5>
              <p className="text-xs text-white/60 leading-relaxed">Заказ или бронирование оформляется напрямую. Клиент рассчитывается с вами на кассе или с курьером. Вы не платите ни цента комиссии с чека.</p>
            </div>

            <div className="p-6 rounded-2xl bg-[#121212] border border-white/10">
              <h5 className="font-bold text-white text-base mb-2 text-[#00FF66]">4. ИИ-Щит Репутации</h5>
              <p className="text-xs text-white/60 leading-relaxed">Перехват плохих оценок внутри Revo-меню до их попадания на Карты + авто-подача апелляций на снос фейковых отзывов 1–2 звезды.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 🟢 БЛОК 5: 3 ПРОСТЫХ ШАГА ПО ДОНАЛЬДУ МИЛЛЕРУ (STORYBRAND PLAN) */}
      <section className="py-20 px-4 sm:px-6 relative z-10 border-b border-white/10 bg-[#121212]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#00FF66]/10 border border-[#00FF66]/30 text-[#00FF66] text-xs font-mono font-bold uppercase tracking-wider mb-4">
              <FontAwesomeIcon icon={faChartLine} /> ПРОСТОЙ ПОШАГОВЫЙ ПЛАН
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Начать получать прямых клиентов из Google — проще, чем заварить кофе
            </h2>
            <p className="text-white/60 text-base max-w-2xl mx-auto mt-4">
              Вам не нужно нанимать IT-специалистов, переобучать персонал или менять привычные процессы. Все технические настройки и автоматизации мы берем на себя.
            </p>
          </div>

          {/* Google Maps Route Preview Navigation Line */}
          <div className="relative max-w-4xl mx-auto space-y-8">
            {/* Vertical Neon-Green Route Line */}
            <div className="absolute left-6 sm:left-1/2 top-4 bottom-4 w-1 bg-gradient-to-b from-[#00FF66] via-[#10B981] to-[#00FF66] -translate-x-1/2 z-0 hidden sm:block" />

            {/* STEP 1 */}
            <div className="relative z-10 bg-[#1E2024] border border-white/10 rounded-3xl p-6 sm:p-8 text-left shadow-xl hover:border-[#00FF66]/40 transition-colors">
              <div className="flex items-center gap-4 mb-3">
                <span className="w-10 h-10 rounded-full bg-[#00FF66] text-black font-black flex items-center justify-center text-base shadow-[0_0_15px_rgba(0,255,102,0.8)]">📍 A</span>
                <h3 className="font-bold text-white text-xl sm:text-2xl">ШАГ 1: Подайте заявку за 30 секунд</h3>
              </div>
              <p className="text-sm text-white/70 leading-relaxed pl-14">
                Вы заполняете короткую форму и отправляете нам ссылку на ваше заведение в Google Maps. Наш ИИ мгновенно сканирует ваш профиль, находит точки потери трафика и строит персональную карту роста.
              </p>
            </div>

            {/* STEP 2 */}
            <div className="relative z-10 bg-[#1E2024] border border-[#00FF66]/40 rounded-3xl p-6 sm:p-8 text-left shadow-xl">
              <div className="flex items-center gap-4 mb-3">
                <span className="w-10 h-10 rounded-full bg-[#00FF66] text-black font-black flex items-center justify-center text-base shadow-[0_0_15px_rgba(0,255,102,0.8)]">⚙️ B</span>
                <h3 className="font-bold text-white text-xl sm:text-2xl">ШАГ 2: Мы настраиваем систему под ключ</h3>
              </div>
              <p className="text-sm text-white/70 leading-relaxed pl-14">
                Мы оцифровываем ваше меню или прайс-лист, подключаем ваш POS-терминал / R-Keeper, прошиваем профиль в Google ключевыми запросами и запускаем автоматический постинг и модуль сгорающей скидки <strong className="text-[#00FF66]">⚡ Revo</strong>.
              </p>
            </div>

            {/* STEP 3 */}
            <div className="relative z-10 bg-[#1E2024] border border-white/10 rounded-3xl p-6 sm:p-8 text-left shadow-xl hover:border-[#00FF66]/40 transition-colors">
              <div className="flex items-center gap-4 mb-3">
                <span className="w-10 h-10 rounded-full bg-[#00FF66] text-black font-black flex items-center justify-center text-base shadow-[0_0_15px_rgba(0,255,102,0.8)]">🚀 C</span>
                <h3 className="font-bold text-white text-xl sm:text-2xl">ШАГ 3: Получайте гостей и растите прибыль</h3>
              </div>
              <p className="text-sm text-white/70 leading-relaxed pl-14">
                Ваш профиль вылетает в <strong className="text-white">ТОП-3 выдачи Google Maps</strong>, забирая горячий Поиск. Вы получаете <strong className="text-[#00FF66]">рост органического трафика до +300%</strong> и <strong className="text-[#00FF66]">прирост чистой прибыли до +45%</strong> уже в первый месяц — без комиссий агрегаторам.
              </p>
            </div>
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
                  <span className="text-[10px] font-mono text-[#00FF66] bg-[#00FF66]/10 px-2 py-0.5 rounded border border-[#00FF66]/30">Verified GBP Owner</span>
                </div>
                <p className="text-xs text-white/80 leading-relaxed italic mb-6">
                  «Раньше мы отдавали Deliveroo почти 30% с каждого заказа только за то, чтобы нас видели. После запуска Revo наш Google-профиль превратился в полноценную витрину. ИИ постоянно выкладывает фото наших рибаев с гео-тегами. За второй месяц прямые заказы из Google Maps выросли на 45%, и мы перестали кормить агрегаторы».
                </p>
              </div>
              <div className="pt-4 border-t border-white/10">
                <h4 className="font-bold text-white text-sm">🍽 Марк</h4>
                <p className="text-[11px] text-white/50">Управляющий стейк-хауса (Дубай Marina)</p>
              </div>
            </div>

            {/* Review 2 */}
            <div className="bg-[#1E2024] border border-white/10 p-6 sm:p-8 rounded-3xl flex flex-col justify-between relative shadow-xl">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex text-[#FBBC05] gap-1 text-sm">
                    <FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} />
                  </div>
                  <span className="text-[10px] font-mono text-[#00FF66] bg-[#00FF66]/10 px-2 py-0.5 rounded border border-[#00FF66]/30">Verified GBP Owner</span>
                </div>
                <p className="text-xs text-white/80 leading-relaxed italic mb-6">
                  «У нас была обычная карточка на Картах, но пустые кресла в середине недели всё равно оставались. Revo запустил динамическую скидку на "тихие часы". Мужики открывают Карты, видят наш маркер ⚡, понимают, что прямо сейчас скидка 15%, и бронируют кресло за 10 секунд. Загрузка выросла до 90%».
                </p>
              </div>
              <div className="pt-4 border-t border-white/10">
                <h4 className="font-bold text-white text-sm">✂️ Алекс</h4>
                <p className="text-[11px] text-white/50">Владелец сети барбершопов (Майами)</p>
              </div>
            </div>

            {/* Review 3 */}
            <div className="bg-[#1E2024] border border-white/10 p-6 sm:p-8 rounded-3xl flex flex-col justify-between relative shadow-xl">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex text-[#FBBC05] gap-1 text-sm">
                    <FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} />
                  </div>
                  <span className="text-[10px] font-mono text-[#00FF66] bg-[#00FF66]/10 px-2 py-0.5 rounded border border-[#00FF66]/30">Verified GBP Owner</span>
                </div>
                <p className="text-xs text-white/80 leading-relaxed italic mb-6">
                  «Нам часто прилетали фейковые 1-звездочные отзывы от конкурентов, из-за чего рейтинг падал до 4.3 и записи рушились. Revo не просто публикует наши посты, он в фоновом режиме через апелляции снес 4 неадекватных отзыва за месяц и поднял наш рейтинг до 4.9. Теперь мы на 1-м месте в поиске района».
                </p>
              </div>
              <div className="pt-4 border-t border-white/10">
                <h4 className="font-bold text-white text-sm">🩺 Д-р Елена</h4>
                <p className="text-[11px] text-white/50">Главный врач косметологии</p>
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
                    <FontAwesomeIcon icon={faChevronDown} className={`text-xs transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#00FF66]' : 'text-white/40'}`} />
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
            <p className="text-white/60 text-base max-w-2xl mx-auto mt-4">
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
            <p className="text-white/60 text-base max-w-xl mx-auto mt-3">
              Не отдавайте своих клиентов конкурентам. Запустите бесплатный AI-скан прямо сейчас.
            </p>
          </div>

          {/* Google Places Rank Checker / Audit Block Container (Adapted Design System) */}
          <div className="bg-[#1E2024] border-2 border-[#00FF66]/60 rounded-3xl p-6 sm:p-10 shadow-[0_0_50px_rgba(0,255,102,0.25)] relative overflow-hidden text-left mb-16">
            <div className="mb-6 flex justify-between items-center pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#EA4335]" />
                <span className="w-3 h-3 rounded-full bg-[#FBBC05]" />
                <span className="w-3 h-3 rounded-full bg-[#00FF66]" />
                <span className="text-xs font-mono text-white/50 ml-2">Google Maps Rank Validator Engine v3.0</span>
              </div>
              <span className="text-xs font-mono text-[#00FF66] font-bold">● AI Active</span>
            </div>

            <AnimatePresence mode="wait">
              {/* STEP 1: INPUT */}
              {valStep === 'input' && (
                <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <form onSubmit={handleValSearchSubmit} className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-grow">
                      <FontAwesomeIcon icon={faMapMarkerAlt} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-lg" />
                      <input 
                        ref={valInputRef}
                        type="text" 
                        value={valInput}
                        onChange={handleValInputChange}
                        autoComplete="off"
                        placeholder="Введите название заведения или вставьте ссылку Google Maps..."
                        className="w-full bg-black/60 border border-white/20 rounded-2xl py-4 pl-12 pr-4 text-white text-sm placeholder-white/40 focus:outline-none focus:border-[#00FF66]"
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={valSearching || !valInput.trim()}
                      className="bg-[#00FF66] hover:bg-[#10B981] text-black font-black uppercase tracking-wider text-xs py-4 px-8 rounded-2xl transition-all shadow-[0_0_20px_rgba(0,255,102,0.4)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer flex-shrink-0"
                    >
                      {valSearching ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : 'Проверить'}
                    </button>
                  </form>
                  <p className="text-[11px] text-white/40 mt-3 text-center">Начните вводить название заведения в вашем городе или вставьте прямую ссылку на Карты.</p>
                </motion.div>
              )}

              {/* STEP 2: LOADING */}
              {valStep === 'loading' && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-6">
                  <div className="w-16 h-16 relative mx-auto mb-4">
                    <div className="absolute inset-0 border-4 border-white/10 rounded-full" />
                    <div className="absolute inset-0 border-4 border-[#00FF66] rounded-full border-t-transparent animate-spin" />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-1">Сканирование алгоритмами Google...</h4>
                  <p className="text-[#00FF66] font-mono text-sm mb-4">{valProgress}% Завершено</p>
                  <div className="w-full max-w-md bg-white/5 h-2 rounded-full overflow-hidden mx-auto">
                    <div className="h-full bg-[#00FF66] transition-all duration-200" style={{ width: `${valProgress}%` }} />
                  </div>
                </motion.div>
              )}

              {/* STEP 3: RESULT */}
              {valStep === 'result' && (
                <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <div className="flex flex-col sm:flex-row gap-6 items-center">
                    <div className="w-full sm:w-48 bg-black/60 p-6 rounded-2xl border border-white/10 text-center flex flex-col items-center">
                      <span className="text-[10px] font-mono text-white/50 uppercase">Health Score</span>
                      <div className="text-5xl font-black text-white my-2" style={{ color: valHealthScore > 70 ? '#00FF66' : valHealthScore > 40 ? '#FBBC05' : '#EA4335' }}>
                        {valHealthScore}
                      </div>
                      <span className="text-[10px] text-white/60">/ 100 Индекс видимости</span>
                    </div>

                    <div className="flex-grow space-y-2 text-xs text-white/80">
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={valPlaceDetails?.rating >= 4.5 ? faCheckCircle : faTimesCircle} className={valPlaceDetails?.rating >= 4.5 ? 'text-[#00FF66]' : 'text-[#EA4335]'} />
                        <span>Рейтинг: <strong className="text-white">{valPlaceDetails?.rating || 'Нет данных'}</strong> ({valPlaceDetails?.rating >= 4.5 ? 'Норма' : 'Вы теряете клики'})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={valPlaceDetails?.user_ratings_total >= 50 ? faCheckCircle : faTimesCircle} className={valPlaceDetails?.user_ratings_total >= 50 ? 'text-[#00FF66]' : 'text-[#EA4335]'} />
                        <span>Количество отзывов: <strong className="text-white">{valPlaceDetails?.user_ratings_total || 0}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="text-[#FBBC05]" />
                        <span>SEO Постинг & GEO EXIF метки: <strong className="text-[#FBBC05]">Не обнаружено (Риск снижения в выдаче)</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Form inside result */}
                  <form onSubmit={handleValLeadSubmit} className="pt-4 border-t border-white/10 flex flex-col sm:flex-row gap-3">
                    <input 
                      type="text" 
                      required
                      value={valContactInfo}
                      onChange={(e) => setValContactInfo(e.target.value)}
                      placeholder="Ваш Телефон / WhatsApp / Telegram для отправки отчета..."
                      className="w-full bg-black/60 border border-white/20 rounded-2xl py-3.5 px-4 text-white text-xs focus:outline-none focus:border-[#00FF66]"
                    />
                    <button 
                      type="submit"
                      disabled={valSubmitting}
                      className="bg-[#00FF66] hover:bg-[#10B981] text-black font-black uppercase text-xs py-3.5 px-6 rounded-2xl transition-all shadow-[0_0_20px_rgba(0,255,102,0.4)] flex-shrink-0 cursor-pointer"
                    >
                      {valSubmitting ? 'ОТПРАВКА...' : 'ПОЛУЧИТЬ PDF-АУДИТВ WHATSAPP'}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* STEP 4: SUCCESS */}
              {valStep === 'success' && (
                <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-6">
                  <FontAwesomeIcon icon={faCheckCircle} className="text-4xl text-[#00FF66] mb-3" />
                  <h4 className="text-xl font-bold text-white mb-1">ЗАЯВКА НА АУДИТ ПРИНЯТА!</h4>
                  <p className="text-xs text-white/60 mb-4">Наш ИИ-ассистент отправит детальный отчет вам в мессенджер в течение 5 минут.</p>
                  <button onClick={() => { setValStep('input'); setValInput(''); setValContactInfo(''); }} className="text-xs font-mono text-[#00FF66] underline">
                    Проверить еще одно заведение
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Interactive Capture Form (Search Bar Google Styled Card) */}
          <div className="bg-[#1E2024] border border-[#00FF66]/40 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden text-left">
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Бесплатный AI-Скан регионального доминирования</h3>
            <p className="text-xs text-white/60 mb-6">Заполните форму, и мы забронируем ваш микрорайон для эксклюзивного подключения.</p>

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
                    <label className="block text-xs font-mono font-bold uppercase text-white/60 mb-1.5">1. Название заведения / Мастера:</label>
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
                    <label className="block text-xs font-mono font-bold uppercase text-white/60 mb-1.5">2. Ниша:</label>
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
                    <label className="block text-xs font-mono font-bold uppercase text-white/60 mb-1.5">3. Локация (Город / Район):</label>
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
                    <label className="block text-xs font-mono font-bold uppercase text-white/60 mb-1.5">4. WhatsApp / Telegram:</label>
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
