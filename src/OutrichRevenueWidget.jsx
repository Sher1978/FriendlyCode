import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSearch, 
  faMapMarkerAlt, 
  faChevronDown, 
  faCheckCircle, 
  faArrowRight, 
  faBolt, 
  faChartLine, 
  faBuilding, 
  faUsers, 
  faTimesCircle, 
  faExclamationTriangle, 
  faPaperPlane, 
  faCheck, 
  faShieldHalved,
  faStar
} from '@fortawesome/free-solid-svg-icons';
import { calculateProfileScore } from './logic/scoreCalculator';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const scanStepsRu = [
    { label: "Подключение к Google Maps API & ИИ-сканеру...", detail: "Инициализация данных профиля" },
    { label: "Проверка объема и рейтинга отзывов...", detail: "Анализ частоты и ключевых слов в 5★ отзывах" },
    { label: "Сканирование медиа-контента и фото...", detail: "Проверка наличия панорам и снимков высокого качества" },
    { label: "Аудит GEO-метатегов и микроразметки...", detail: "Проверка корректности гео-структуры для поисковиков" },
    { label: "Проверка индексации в ChatGPT & Gemini...", detail: "Оценка видимости компании в ИИ-выдаче" }
];

const NICHES = [
    { id: 'horeca', labelRu: 'Ресторан / Кафе / Бары', avgCheck: 25, baseLeads: 120 },
    { id: 'auto_repair', labelRu: 'Ремонт автомобилей / СТО', avgCheck: 150, baseLeads: 40 },
    { id: 'tire_wash', labelRu: 'Шиномонтаж / Мойка', avgCheck: 30, baseLeads: 150 },
    { id: 'plumbing', labelRu: 'Услуги сантехника', avgCheck: 80, baseLeads: 50 },
    { id: 'electrician', labelRu: 'Услуги электрика', avgCheck: 70, baseLeads: 50 },
    { id: 'hvac', labelRu: 'Ремонт кондиционеров / Вентиляция', avgCheck: 120, baseLeads: 40 },
    { id: 'appliances', labelRu: 'Ремонт бытовой техники', avgCheck: 60, baseLeads: 60 },
    { id: 'visa', labelRu: 'Оформление виз / Документов', avgCheck: 200, baseLeads: 25 },
    { id: 'legal', labelRu: 'Юридические услуги', avgCheck: 300, baseLeads: 20 },
    { id: 'accounting', labelRu: 'Бухгалтерские услуги', avgCheck: 150, baseLeads: 25 },
    { id: 'beauty', labelRu: 'Салон красоты / Парикмахерская', avgCheck: 45, baseLeads: 90 },
    { id: 'nails', labelRu: 'Маникюр / Педикюр', avgCheck: 30, baseLeads: 110 },
    { id: 'spa', labelRu: 'SPA / Массаж', avgCheck: 65, baseLeads: 50 },
    { id: 'dentist', labelRu: 'Стоматология', avgCheck: 180, baseLeads: 35 },
    { id: 'medical', labelRu: 'Медицинский центр / Клиника', avgCheck: 100, baseLeads: 60 },
    { id: 'fitness', labelRu: 'Фитнес-клуб / Йога', avgCheck: 60, baseLeads: 70 },
    { id: 'flowers', labelRu: 'Цветочный магазин', avgCheck: 40, baseLeads: 80 },
    { id: 'pets', labelRu: 'Зоомагазин / Ветклиника', avgCheck: 50, baseLeads: 60 },
    { id: 'real_estate', labelRu: 'Недвижимость / Риелторы', avgCheck: 1500, baseLeads: 8 },
    { id: 'construction', labelRu: 'Строительство / Ремонт квартир', avgCheck: 2500, baseLeads: 5 },
    { id: 'other', labelRu: 'Другое', avgCheck: 100, baseLeads: 40 },
];

const SLIDER_TEXTS_RU = [
    "Google дает в выдачу только ТОП-3 заведения в локальном поиске. Они забирают 80% бесплатных клиентов.",
    "Около 30% искавших бизнес на карте приходят в тот же день. С Outrich их количество достигает 57%.",
    "Узнайте упущенную выгоду вашего бизнеса из-за потери локального трафика в 2026 году."
];

const OutrichRevenueWidget = () => {
    // UI States
    const [activeStep, setActiveStep] = useState(1);
    const [sliderIndex, setSliderIndex] = useState(0);

    // Form Data States
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBusiness, setSelectedBusiness] = useState('');
    const [extractedAddress, setExtractedAddress] = useState('');
    const [detectedCity, setDetectedCity] = useState('');
    const [nicheId, setNicheId] = useState('other');
    const [population, setPopulation] = useState(500000);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearchingMap, setIsSearchingMap] = useState(false);
    const [searchError, setSearchError] = useState(false);
    
    // Lead Capture
    const [contact, setContact] = useState('');
    const [leadName, setLeadName] = useState('');
    const [submitStatus, setSubmitStatus] = useState('idle'); // idle, loading, success, error

    // Scanning & Score
    const [scanStep, setScanStep] = useState(0);
    const [completedScanSteps, setCompletedScanSteps] = useState([]);
    const [userLoc, setUserLoc] = useState(null);

    useEffect(() => {
        fetch('https://get.geojs.io/v1/ip/geo.json')
            .then(res => res.json())
            .then(data => {
                if (data.latitude && data.longitude) {
                    setUserLoc({ lat: parseFloat(data.latitude), lon: parseFloat(data.longitude) });
                }
            })
            .catch(() => {});
    }, []);
    
    // Google Maps Profile Real-Time Metadata States
    const [googleRating, setGoogleRating] = useState('4.2');
    const [googleReviewsTotal, setGoogleReviewsTotal] = useState(35);
    const [profileHealthScore, setProfileHealthScore] = useState(23);
    const [hasWebsite, setHasWebsite] = useState(false);
    const [ownerResponseStatus, setOwnerResponseStatus] = useState('2 из 5 отзывов без ответа владельца');
    
    // Analysis States
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [results, setResults] = useState(null);

    // Auto-slider for step 1
    useEffect(() => {
        if (activeStep !== 1) return;
        const interval = setInterval(() => {
            setSliderIndex((prev) => (prev + 1) % SLIDER_TEXTS_RU.length);
        }, 4000);
        return () => clearInterval(interval);
    }, [activeStep]);

    const formatMoney = (val) => {
        return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
    };

    const roundTo50 = (val) => Math.round(val / 50) * 50;

    const calculateRevenue = () => {
        const niche = NICHES.find(n => n.id === nicheId) || NICHES[NICHES.length - 1];
        const popBase = population / 500000;
        const popMultiplier = Math.max(0.3, Math.min(3.5, Math.pow(popBase, 0.6)));

        const conversionRate = 0.48;
        const monthlyLeadsLost = Math.round(niche.baseLeads * popMultiplier);
        const rawMonthlyLoss = monthlyLeadsLost * niche.avgCheck * conversionRate;
        const monthlyRevenueLoss = roundTo50(rawMonthlyLoss);

        const multipliers = [0.85, 1.25, 1.15, 1.1, 1.05, 1.0];
        const chartData = multipliers.map(m => roundTo50(monthlyRevenueLoss * m));
        const total6MoLoss = roundTo50(chartData.reduce((a, b) => a + b, 0));

        const numRating = parseFloat(googleRating) || 4.2;
        const numReviews = parseInt(googleReviewsTotal) || 35;
        const ownerOk = !ownerResponseStatus.toLowerCase().includes('без ответа');

        const scoreRes = calculateProfileScore({
            rating: numRating,
            reviewsTotal: numReviews,
            hasWebsite: hasWebsite,
            ownerResponseOk: ownerOk,
            hasGeoMeta: false,
        });

        const computedHealthScore = scoreRes.score;
        const visibilityScore = Math.min(62, Math.max(20, computedHealthScore));

        setResults({
            monthlyLoss: monthlyRevenueLoss,
            total6MoLoss: total6MoLoss,
            leadsLost: monthlyLeadsLost,
            chartData,
            address: extractedAddress || "Центральный район, главная улица",
            rating: googleRating || "4.2",
            reviews: numReviews,
            healthScore: computedHealthScore,
            visibilityScore,
            deductions: scoreRes.deductions
        });
    };

    const proceedToStep2 = (name, address, detectedNiche, city, rating, reviewsCount, healthScore, hasWeb, ownerResponse) => {
        setSelectedBusiness(name);
        setExtractedAddress(address);
        if (city) setDetectedCity(city);
        if (rating) setGoogleRating(rating);
        if (reviewsCount) setGoogleReviewsTotal(reviewsCount);
        if (healthScore) setProfileHealthScore(healthScore);
        if (typeof hasWeb === 'boolean') setHasWebsite(hasWeb);
        if (ownerResponse) setOwnerResponseStatus(ownerResponse);
        
        if (detectedNiche && NICHES.some(n => n.id === detectedNiche)) {
            setNicheId(detectedNiche);
        } else {
            const text = `${name} ${address}`.toLowerCase();
            const matched = NICHES.find(n => {
                if (n.id === 'other') return false;
                const terms = n.labelRu.toLowerCase().split(/[\s\/,]+/);
                return terms.some(t => t.length > 3 && text.includes(t));
            });
            if (matched) {
                setNicheId(matched.id);
            }
        }
        setActiveStep(2);
        setSearchResults([]);
    };

    const handleSearchSubmit = async (e) => {
        if (e) e.preventDefault();
        const query = searchQuery.trim();
        if (!query) return;

        setSearchError(false);
        setIsSearchingMap(true);

        try {
            let url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=3&addressdetails=1`;
            if (userLoc) {
                url += `&lat=${userLoc.lat}&lon=${userLoc.lon}`;
            }
            const res = await fetch(url);
            const data = await res.json();
            
            if (data && data.length > 0) {
                const formatted = data.map((item) => ({
                    name: item.name || item.display_name.split(',')[0],
                    address: item.display_name
                }));
                setSearchResults(formatted);
                if (formatted.length === 1) {
                    proceedToStep2(formatted[0].name, formatted[0].address);
                }
            } else {
                // Fallback to direct text if nominatim returned nothing
                proceedToStep2(query, `${query}, Local Business`);
            }
        } catch (error) {
            console.error("Geocoding error:", error);
            proceedToStep2(query, `${query}, Local Business`);
        } finally {
            setIsSearchingMap(false);
        }
    };

    const handleConfirmData = () => {
        setActiveStep(3);
        setIsAnalyzing(true);
        setScanStep(0);
        setCompletedScanSteps([]);
        calculateRevenue();

        let currentS = 0;
        const interval = setInterval(() => {
            setScanStep((prev) => {
                if (prev < scanStepsRu.length - 1) {
                    setCompletedScanSteps((done) => [...done, prev]);
                    return prev + 1;
                } else {
                    setCompletedScanSteps((done) => [...done, prev]);
                    clearInterval(interval);
                    setTimeout(() => {
                        setIsAnalyzing(false);
                    }, 800);
                    return prev;
                }
            });
        }, 700);
    };

    const handleLeadSubmit = async (e) => {
        e.preventDefault();
        if (!contact.trim()) return;

        setSubmitStatus('loading');
        try {
            await addDoc(collection(db, 'leads_b2b_audit'), {
                name: leadName || 'Не указано',
                contact,
                business: selectedBusiness || searchQuery || 'Поиск бизнеса',
                address: extractedAddress,
                niche: nicheId,
                population,
                monthlyLoss: results?.monthlyLoss || 0,
                total6MoLoss: results?.total6MoLoss || 0,
                healthScore: results?.healthScore || 0,
                timestamp: serverTimestamp(),
                source: 'outrich_revenue_widget'
            });
            setSubmitStatus('success');
        } catch (err) {
            console.error('Lead error:', err);
            setSubmitStatus('error');
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col gap-4 text-left font-sans">
            
            {/* Step 1: Input / Search */}
            <div className={`bg-[#181A1D] rounded-3xl border ${activeStep === 1 ? 'border-[#00FF66] shadow-[0_0_30px_rgba(0,255,102,0.2)]' : 'border-white/10 opacity-70'} overflow-hidden transition-all duration-500`}>
                <div 
                    className={`p-5 sm:p-6 flex items-center justify-between cursor-pointer ${activeStep > 1 ? 'hover:bg-white/5' : ''}`}
                    onClick={() => activeStep > 1 && setActiveStep(1)}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm transition-colors ${activeStep === 1 ? 'bg-[#00FF66] text-black shadow-[0_0_15px_rgba(0,255,102,0.8)]' : 'bg-white/10 text-white'}`}>
                            1
                        </div>
                        <div>
                            <h3 className="font-bold text-white uppercase tracking-wider text-sm sm:text-base">
                                1. FIND BUSINESS (ПОИСК БИЗНЕСА)
                            </h3>
                            {activeStep > 1 && (
                                <p className="text-xs text-white/50 truncate max-w-xs">
                                    {selectedBusiness || searchQuery}
                                </p>
                            )}
                        </div>
                    </div>
                    {activeStep > 1 && <FontAwesomeIcon icon={faChevronDown} className="text-white/40 text-sm" />}
                </div>

                <AnimatePresence initial={false}>
                    {activeStep === 1 && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-5 sm:p-6 pt-0 space-y-4">
                                <div className="h-14 sm:h-12 relative overflow-hidden bg-black/40 rounded-2xl p-3 border border-white/5">
                                    <AnimatePresence mode="wait">
                                        <motion.p
                                            key={sliderIndex}
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: -20, opacity: 0 }}
                                            transition={{ duration: 0.5 }}
                                            className="text-xs sm:text-sm text-white/80 font-medium absolute inset-0 px-4 flex items-center gap-2"
                                        >
                                            <FontAwesomeIcon icon={faBolt} className="text-[#00FF66]" />
                                            <span>{SLIDER_TEXTS_RU[sliderIndex]}</span>
                                        </motion.p>
                                    </AnimatePresence>
                                </div>

                                <form onSubmit={handleSearchSubmit} className="space-y-3">
                                    <div className="relative">
                                        <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-base" />
                                        <input
                                            type="text"
                                            required
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Business name & city (or Maps link) / Название и город..."
                                            className="w-full bg-black/60 border border-white/20 focus:border-[#00FF66] rounded-2xl pl-12 pr-4 py-4 text-sm sm:text-base text-white placeholder-white/40 focus:outline-none transition-all"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSearchingMap}
                                        className="w-full bg-[#00FF66] hover:bg-[#10B981] text-black font-black text-sm py-4 rounded-2xl uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,255,102,0.4)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                    >
                                        <span>{isSearchingMap ? 'ПОИСК НА КАРТАХ...' : 'FIND PROFILE ->'}</span>
                                        {!isSearchingMap && <FontAwesomeIcon icon={faArrowRight} />}
                                    </button>
                                </form>

                                <button
                                    type="button"
                                    onClick={() => {
                                        if (searchQuery.trim()) {
                                            proceedToStep2(searchQuery.trim(), `${searchQuery.trim()}, Local Business`);
                                        } else {
                                            proceedToStep2('Ваш бизнес', 'Центральный район, Ваша локация');
                                        }
                                    }}
                                    className="w-full bg-white/5 hover:bg-white/10 text-white/80 font-mono text-xs py-3.5 rounded-2xl border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <FontAwesomeIcon icon={faMapMarkerAlt} className="text-[#00FF66]" />
                                    <span>📍 Pick on map manually (Указать вручную)</span>
                                </button>

                                {searchResults.length > 0 && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-4 space-y-2 bg-black/60 p-3 rounded-2xl border border-white/10"
                                    >
                                        <p className="text-[11px] text-white/50 uppercase font-mono mb-2">Выберите ваше заведение:</p>
                                        {searchResults.map((res, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => proceedToStep2(res.name, res.address)}
                                                className="w-full text-left bg-white/5 hover:bg-white/10 p-3 rounded-xl border border-white/5 hover:border-[#00FF66]/40 transition-all flex items-start gap-3 group cursor-pointer"
                                            >
                                                <FontAwesomeIcon icon={faMapMarkerAlt} className="text-[#00FF66] mt-1 group-hover:scale-110 transition-transform" />
                                                <div className="overflow-hidden">
                                                    <p className="text-white text-sm font-bold group-hover:text-[#00FF66] transition-colors">{res.name}</p>
                                                    <p className="text-white/50 text-xs truncate">{res.address}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Step 2: Data Confirmation */}
            <div className={`bg-[#181A1D] rounded-3xl border ${activeStep === 2 ? 'border-[#00FF66] shadow-[0_0_30px_rgba(0,255,102,0.2)]' : 'border-white/10 opacity-70'} overflow-hidden transition-all duration-500 ${activeStep < 2 ? 'pointer-events-none opacity-40' : ''}`}>
                <div 
                    className={`p-5 sm:p-6 flex items-center justify-between cursor-pointer ${activeStep > 2 ? 'hover:bg-white/5' : ''}`}
                    onClick={() => activeStep > 2 && setActiveStep(2)}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm transition-colors ${activeStep === 2 ? 'bg-[#00FF66] text-black shadow-[0_0_15px_rgba(0,255,102,0.8)]' : activeStep > 2 ? 'bg-white/10 text-white' : 'bg-white/5 text-white/30'}`}>
                            {activeStep > 2 ? <FontAwesomeIcon icon={faCheck} /> : '2'}
                        </div>
                        <div>
                            <h3 className="font-bold text-white uppercase tracking-wider text-sm sm:text-base">
                                2. CONFIRM DATA (ПОДТВЕРЖДЕНИЕ ДАННЫХ)
                            </h3>
                            {activeStep > 2 && (
                                <p className="text-xs text-white/50 truncate max-w-xs">
                                    {NICHES.find(n => n.id === nicheId)?.labelRu || '...'} • {population.toLocaleString()} чел.
                                </p>
                            )}
                        </div>
                    </div>
                    {activeStep > 2 && <FontAwesomeIcon icon={faChevronDown} className="text-white/40 text-sm" />}
                </div>

                <AnimatePresence initial={false}>
                    {activeStep === 2 && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-5 sm:p-6 pt-0 space-y-5">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-mono font-bold uppercase text-white/60 mb-1.5 block">Компания:</label>
                                            <input
                                                type="text"
                                                value={selectedBusiness}
                                                onChange={(e) => setSelectedBusiness(e.target.value)}
                                                className="w-full bg-black/60 border border-white/20 rounded-2xl px-4 py-3.5 text-xs text-white focus:outline-none focus:border-[#00FF66]"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-mono font-bold uppercase text-white/60 mb-1.5 block">Адрес:</label>
                                            <input
                                                type="text"
                                                value={extractedAddress}
                                                onChange={(e) => setExtractedAddress(e.target.value)}
                                                className="w-full bg-black/60 border border-white/20 rounded-2xl px-4 py-3.5 text-xs text-white focus:outline-none focus:border-[#00FF66]"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-mono font-bold uppercase text-white/60 mb-1.5 block">Категория бизнеса в Google Maps:</label>
                                        <select 
                                            value={nicheId}
                                            onChange={(e) => setNicheId(e.target.value)}
                                            className="w-full bg-black/60 border border-white/20 rounded-2xl px-4 py-3.5 text-xs text-white focus:outline-none focus:border-[#00FF66]"
                                        >
                                            {NICHES.map(n => (
                                                <option key={n.id} value={n.id}>{n.labelRu}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-2 pt-2">
                                        <div className="flex justify-between items-center text-xs font-mono">
                                            <span className="text-white/60">Население города:</span>
                                            <span className="text-[#00FF66] font-bold">
                                                {population >= 5000000 ? '5M+ человек' : `${population.toLocaleString('ru-RU')} чел.`}
                                            </span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="50000" 
                                            max="5000000" 
                                            step="50000"
                                            value={population}
                                            onChange={(e) => setPopulation(Number(e.target.value))}
                                            className="w-full accent-[#00FF66] h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handleConfirmData}
                                    className="w-full bg-[#00FF66] hover:bg-[#10B981] text-black font-black text-sm py-4 rounded-2xl uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,255,102,0.4)] flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <FontAwesomeIcon icon={faBolt} />
                                    <span>НАЧАТЬ АНАЛИЗ (10 СЕК)</span>
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Step 3: Analysis Results */}
            <div className={`bg-[#181A1D] rounded-3xl border ${activeStep === 3 ? 'border-[#00FF66] shadow-[0_0_30px_rgba(0,255,102,0.2)]' : 'border-white/10 opacity-70'} overflow-hidden transition-all duration-500 ${activeStep < 3 ? 'pointer-events-none opacity-40' : ''}`}>
                <div className="p-5 sm:p-6 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm transition-colors ${activeStep === 3 ? 'bg-[#00FF66] text-black shadow-[0_0_15px_rgba(0,255,102,0.8)]' : 'bg-white/5 text-white/30'}`}>
                        3
                    </div>
                    <h3 className="font-bold text-white uppercase tracking-wider text-sm sm:text-base">
                        3. ANALYSIS DATA (РЕЗУЛЬТАТЫ АНАЛИЗА)
                    </h3>
                </div>

                <AnimatePresence initial={false}>
                    {activeStep === 3 && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-5 sm:p-6 pt-0">
                                {isAnalyzing ? (
                                    <div className="py-8 space-y-6 text-center">
                                        <div className="space-y-3">
                                            <div className="inline-flex items-center gap-2 text-[10px] bg-[#00FF66]/10 border border-[#00FF66]/40 px-3 py-1 rounded-full text-[#00FF66] font-mono font-bold uppercase">
                                                <div className="w-2 h-2 rounded-full bg-[#00FF66] animate-pulse" />
                                                <span>ИИ-СКАНЕР В РЕАЛЬНОМ ВРЕМЕНИ</span>
                                            </div>
                                            <h3 className="text-xl sm:text-2xl font-black text-white uppercase">
                                                «{selectedBusiness || 'Профиль бизнеса'}»
                                            </h3>
                                            <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden p-0.5 max-w-md mx-auto">
                                                <div
                                                    className="h-full bg-[#00FF66] rounded-full transition-all duration-300"
                                                    style={{ width: `${((scanStep + 1) / scanStepsRu.length) * 100}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-3 bg-black/50 border border-white/10 rounded-2xl p-4 sm:p-5 max-w-xl mx-auto text-left">
                                            {scanStepsRu.map((st, idx) => {
                                                const isDone = completedScanSteps.includes(idx);
                                                const isCurrent = scanStep === idx && !isDone;
                                                return (
                                                    <div
                                                        key={idx}
                                                        className={`flex items-start gap-3 p-2.5 rounded-xl transition-all duration-300 ${
                                                            isCurrent ? 'bg-[#00FF66]/10 border border-[#00FF66]/40' : isDone ? 'bg-white/5 opacity-80' : 'opacity-40'
                                                        }`}
                                                    >
                                                        <div className="mt-0.5 flex-shrink-0">
                                                            {isDone ? (
                                                                <FontAwesomeIcon icon={faCheckCircle} className="text-[#00FF66]" />
                                                            ) : isCurrent ? (
                                                                <div className="w-4 h-4 rounded-full border-2 border-[#00FF66] border-t-transparent animate-spin" />
                                                            ) : (
                                                                <div className="w-4 h-4 rounded-full border border-white/30" />
                                                            )}
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <p className={`text-xs sm:text-sm font-mono font-bold ${isCurrent ? 'text-[#00FF66]' : isDone ? 'text-white' : 'text-white/50'}`}>
                                                                {st.label}
                                                            </p>
                                                            <p className="text-[10px] text-white/50 font-mono">{st.detail}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : results ? (
                                    <div className="space-y-6">
                                        {/* Audit Verdict Banner */}
                                        <div className="space-y-4 bg-black/60 border-2 border-[#00FF66]/40 rounded-2xl p-5 shadow-[0_0_30px_rgba(0,255,102,0.15)]">
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-4">
                                                <div>
                                                    <h4 className="text-xl sm:text-2xl font-black text-white uppercase">
                                                        «{selectedBusiness || 'Профиль бизнеса'}»
                                                    </h4>
                                                    <p className="text-xs text-white/50 font-mono">{results.address}</p>
                                                </div>
                                                <div className="bg-[#1E2024] border border-[#00FF66]/40 px-4 py-2 rounded-xl flex items-center gap-2">
                                                    <span className="text-[#FBBC05] text-lg">⭐</span>
                                                    <span className="font-mono font-bold text-white text-base">{results.rating}</span>
                                                    <span className="text-xs text-white/50 font-mono">({results.reviews} отзывов)</span>
                                                </div>
                                            </div>

                                            {/* Score Display */}
                                            <div className="p-4 rounded-xl bg-[#121212] border border-[#00FF66]/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                                                <div className="flex items-baseline gap-3">
                                                    <span className="text-5xl font-black font-mono text-[#00FF66]">
                                                        {results.healthScore}%
                                                    </span>
                                                    <div>
                                                        <span className="text-xs font-mono text-white/60 block uppercase">
                                                            Индекс видимости Google GBP
                                                        </span>
                                                        <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#00FF66]/20 text-[#00FF66] border border-[#00FF66]/40">
                                                            ТРЕБУЕТСЯ ИИ-ОПТИМИЗАЦИЯ
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right text-xs font-mono">
                                                    <p className="text-[#EA4335] font-bold">🚨 ВНЕ TOP-3 GOOGLE MAPS</p>
                                                    <p className="text-white/40 text-[11px]">Потеря трафика категории: ~{100 - results.healthScore}%</p>
                                                </div>
                                            </div>

                                            {/* Deductions list */}
                                            {results.deductions && (
                                                <div className="bg-black/40 border border-[#EA4335]/30 rounded-xl p-3 space-y-2">
                                                    <p className="text-[10px] font-mono text-[#EA4335] uppercase font-bold">📉 РАСШИФРОВКА ШТРАФОВ (ОТ 100%):</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {results.deductions.map((d, i) => (
                                                            <span key={i} className="inline-flex items-center gap-1.5 bg-[#EA4335]/10 border border-[#EA4335]/30 text-white/80 text-[11px] font-mono px-2.5 py-1 rounded-lg">
                                                                <span className="font-bold text-[#EA4335]">-{d.points} б.</span>
                                                                <span>{d.labelRu}</span>
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Financial Loss estimation */}
                                        <div className="text-center space-y-2 bg-[#EA4335]/10 border border-[#EA4335]/40 rounded-3xl p-6 shadow-[0_0_30px_rgba(234,67,53,0.15)]">
                                            <p className="text-[#EA4335] font-mono text-xs uppercase font-bold">🚨 Упущенная выручка (за 6 месяцев):</p>
                                            <h2 className="text-4xl sm:text-6xl font-black text-white font-mono tracking-tight drop-shadow-[0_0_20px_rgba(234,67,53,0.5)]">
                                                {formatMoney(results.total6MoLoss)}
                                            </h2>
                                            <p className="text-white/70 text-xs">
                                                Вы теряете около ~{results.leadsLost} клиентов ежемесячно из-за отсутствия в ТОП-3.
                                            </p>
                                        </div>

                                        {/* Lead Capture Form */}
                                        <div className="space-y-3 bg-[#1E2024] border border-white/10 p-5 rounded-2xl">
                                            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                                <FontAwesomeIcon icon={faPaperPlane} className="text-[#00FF66]" />
                                                <span>ПОЛУЧИТЬ ПОЛНЫЙ PDF-ОТЧЕТ И ПЛАН РОСТА</span>
                                            </h4>

                                            {submitStatus === 'success' ? (
                                                <div className="bg-[#00FF66]/10 border border-[#00FF66]/40 rounded-xl p-5 text-center space-y-2">
                                                    <FontAwesomeIcon icon={faCheckCircle} className="text-4xl text-[#00FF66]" />
                                                    <h5 className="text-lg font-bold text-white">ОТЧЕТ СФОРМИРОВАН И ОТПРАВЛЕН!</h5>
                                                    <p className="text-xs text-white/70">Наш ИИ-ассистент отправит материалы в мессенджер в течение 5 минут.</p>
                                                </div>
                                            ) : (
                                                <form onSubmit={handleLeadSubmit} className="space-y-3">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        <input
                                                            type="text"
                                                            value={leadName}
                                                            onChange={(e) => setLeadName(e.target.value)}
                                                            placeholder="Ваше Имя"
                                                            className="bg-black/60 border border-white/20 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#00FF66]"
                                                        />
                                                        <input
                                                            type="text"
                                                            required
                                                            value={contact}
                                                            onChange={(e) => setContact(e.target.value)}
                                                            placeholder="WhatsApp / Telegram / Телефон"
                                                            className="bg-black/60 border border-white/20 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#00FF66]"
                                                        />
                                                    </div>
                                                    <button
                                                        type="submit"
                                                        disabled={submitStatus === 'loading'}
                                                        className="w-full bg-[#00FF66] hover:bg-[#10B981] text-black font-black text-xs py-4 rounded-xl uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,255,102,0.4)] flex items-center justify-center gap-2 cursor-pointer"
                                                    >
                                                        {submitStatus === 'loading' ? 'ОТПРАВКА...' : 'ПОЛУЧИТЬ PDF-ОТЧЕТ В WHATSAPP / TELEGRAM'}
                                                    </button>
                                                </form>
                                            )}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default OutrichRevenueWidget;
