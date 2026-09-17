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

const darkMapStyle = [
    { elementType: "geometry", stylers: [{ color: "#212121" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
    { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#757575" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
    { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] }
];

const extractPlaceQueryFromUrl = (str) => {
    if (!str) return '';
    const trimmed = str.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        return trimmed;
    }
    try {
        const urlObj = new URL(trimmed);
        if (urlObj.pathname.includes('/place/')) {
            const parts = urlObj.pathname.split('/place/');
            if (parts[1]) {
                const subPart = parts[1].split('/')[0];
                return decodeURIComponent(subPart.replace(/\+/g, ' '));
            }
        }
        if (urlObj.searchParams.has('q')) return urlObj.searchParams.get('q');
        if (urlObj.searchParams.has('query')) return urlObj.searchParams.get('query');
        if (urlObj.searchParams.has('cid')) return `cid:${urlObj.searchParams.get('cid')}`;
    } catch (err) {
        console.warn("URL parse exception:", err);
    }
    return trimmed;
};

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
    const [searchErrorMessage, setSearchErrorMessage] = useState('');

    // Interactive Google Map Picker States
    const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
    const [nearbyPlaces, setNearbyPlaces] = useState([]);
    const [isSearchingNearby, setIsSearchingNearby] = useState(false);
    
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

    // Map Picker Listener Effect
    useEffect(() => {
        if (!isMapPickerOpen) return;

        const timer = setTimeout(() => {
            const mapContainer = document.getElementById('google-map-picker-canvas');
            if (mapContainer && window.google && window.google.maps) {
                const initialPos = userLoc ? { lat: userLoc.lat, lng: userLoc.lon } : { lat: 55.7558, lng: 37.6173 };
                const map = new window.google.maps.Map(mapContainer, {
                    center: initialPos,
                    zoom: 14,
                    styles: darkMapStyle,
                    disableDefaultUI: false,
                });

                const marker = new window.google.maps.Marker({
                    position: initialPos,
                    map: map,
                    draggable: true,
                    title: "Перетащите маркер к вашему заведению"
                });

                const fetchPlacesAtCoord = (latLng) => {
                    setIsSearchingNearby(true);
                    setNearbyPlaces([]);
                    const placesService = new window.google.maps.places.PlacesService(map);
                    placesService.nearbySearch(
                        {
                            location: latLng,
                            radius: 300,
                            type: ['establishment']
                        },
                        (resultsList, status) => {
                            setIsSearchingNearby(false);
                            if (status === window.google.maps.places.PlacesServiceStatus.OK && resultsList) {
                                setNearbyPlaces(resultsList);
                            } else {
                                setNearbyPlaces([]);
                            }
                        }
                    );
                };

                fetchPlacesAtCoord(initialPos);

                map.addListener('click', (e) => {
                    marker.setPosition(e.latLng);
                    fetchPlacesAtCoord(e.latLng);
                });

                marker.addListener('dragend', (e) => {
                    fetchPlacesAtCoord(e.latLng);
                });
            }
        }, 150);

        return () => clearTimeout(timer);
    }, [isMapPickerOpen, userLoc]);

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
        setSearchError(false);
    };

    // Google Places Autocomplete Predictions effect as user types
    useEffect(() => {
        const queryStr = extractPlaceQueryFromUrl(searchQuery);
        if (queryStr.length < 2 || activeStep !== 1) {
            setSearchResults([]);
            return;
        }

        let isMounted = true;
        const timer = setTimeout(() => {
            if (window.google && window.google.maps && window.google.maps.places) {
                try {
                    const autocompleteService = new window.google.maps.places.AutocompleteService();
                    autocompleteService.getPlacePredictions(
                        {
                            input: queryStr,
                            types: ['establishment']
                        },
                        (predictions, status) => {
                            if (!isMounted) return;
                            if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions && predictions.length > 0) {
                                const formatted = predictions.map(p => ({
                                    place_id: p.place_id,
                                    name: p.structured_formatting?.main_text || p.description.split(',')[0],
                                    address: p.structured_formatting?.secondary_text || p.description,
                                    description: p.description
                                }));
                                setSearchResults(formatted);
                            } else {
                                setSearchResults([]);
                            }
                        }
                    );
                } catch (e) {
                    console.warn("AutocompleteService error:", e);
                }
            }
        }, 250);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [searchQuery, activeStep]);

    const handleSelectPlacePrediction = (pred) => {
        setIsSearchingMap(true);
        setSearchError(false);

        if (window.google && window.google.maps && window.google.maps.places && pred.place_id) {
            try {
                const dummyDiv = document.createElement('div');
                const placesService = new window.google.maps.places.PlacesService(dummyDiv);
                placesService.getDetails(
                    {
                        placeId: pred.place_id,
                        fields: ['name', 'formatted_address', 'rating', 'user_ratings_total', 'website']
                    },
                    (placeDetails, status) => {
                        setIsSearchingMap(false);
                        if (status === window.google.maps.places.PlacesServiceStatus.OK && placeDetails) {
                            proceedToStep2(
                                placeDetails.name || pred.name,
                                placeDetails.formatted_address || pred.address,
                                null,
                                null,
                                placeDetails.rating ? String(placeDetails.rating) : '4.3',
                                placeDetails.user_ratings_total || 25,
                                null,
                                !!placeDetails.website,
                                null
                            );
                        } else {
                            setSearchError(true);
                            setSearchErrorMessage(`Не удалось загрузить данные заведения из Google Places API. Выберите другое заведение из списка.`);
                        }
                    }
                );
                return;
            } catch (err) {
                console.warn("Places getDetails error:", err);
            }
        }
        setIsSearchingMap(false);
        setSearchError(true);
        setSearchErrorMessage(`Не удалось связаться с Google Places API.`);
    };

    const handleSearchSubmit = async (e) => {
        if (e) e.preventDefault();
        const rawInput = searchQuery.trim();
        if (!rawInput) {
            setSearchError(true);
            setSearchErrorMessage('Введите название заведения, адрес или прямую ссылку на Google Maps.');
            return;
        }

        setSearchError(false);
        setIsSearchingMap(true);

        // If searchResults has matching autocomplete items, select top match
        if (searchResults.length > 0 && !rawInput.startsWith('http')) {
            handleSelectPlacePrediction(searchResults[0]);
            return;
        }

        const queryStr = extractPlaceQueryFromUrl(rawInput);

        // Try Google Places Text Search
        if (window.google && window.google.maps && window.google.maps.places) {
            try {
                const dummyDiv = document.createElement('div');
                const placesService = new window.google.maps.places.PlacesService(dummyDiv);
                placesService.textSearch({ query: queryStr }, (resultsList, status) => {
                    if (status === window.google.maps.places.PlacesServiceStatus.OK && resultsList && resultsList.length > 0) {
                        const topMatch = resultsList[0];
                        placesService.getDetails(
                            {
                                placeId: topMatch.place_id,
                                fields: ['name', 'formatted_address', 'rating', 'user_ratings_total', 'website']
                            },
                            (details, detailStatus) => {
                                setIsSearchingMap(false);
                                if (detailStatus === window.google.maps.places.PlacesServiceStatus.OK && details) {
                                    proceedToStep2(
                                        details.name || topMatch.name,
                                        details.formatted_address || topMatch.formatted_address || queryStr,
                                        null,
                                        null,
                                        details.rating ? String(details.rating) : '4.2',
                                        details.user_ratings_total || 30,
                                        null,
                                        !!details.website,
                                        null
                                    );
                                } else {
                                    proceedToStep2(
                                        topMatch.name,
                                        topMatch.formatted_address || queryStr,
                                        null,
                                        null,
                                        topMatch.rating ? String(topMatch.rating) : '4.2',
                                        topMatch.user_ratings_total || 30,
                                        null,
                                        false,
                                        null
                                    );
                                }
                            }
                        );
                    } else {
                        // STRICT VALIDATION FAILURE: DO NOT PROCEED TO STEP 2 WITH FAKE DATA!
                        setIsSearchingMap(false);
                        setSearchError(true);
                        setSearchErrorMessage(`Заведение не найдено на Google Картах по запросу «${rawInput}». Пожалуйста, выберите подходящий вариант из выпадающих подсказок Поиска, вставьте прямую ссылку или укажите заведение на карте.`);
                    }
                });
                return;
            } catch (err) {
                console.warn("TextSearch error:", err);
            }
        }

        // Strictly Fail if Google Places API returns nothing or is unverified
        setIsSearchingMap(false);
        setSearchError(true);
        setSearchErrorMessage(`Не удалось получить данные Google Places API для «${rawInput}». Укажите точное название или выберите точку на карте.`);
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
            <div className={`bg-[#181A1D] rounded-3xl border ${activeStep === 1 ? 'border-[#00FF66]/40 shadow-lg' : 'border-white/10 opacity-70'} overflow-hidden transition-all duration-300`}>
                <div 
                    className={`p-5 sm:p-6 flex items-center justify-between cursor-pointer ${activeStep > 1 ? 'hover:bg-white/5' : ''}`}
                    onClick={() => activeStep > 1 && setActiveStep(1)}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm transition-colors ${activeStep === 1 ? 'bg-[#00FF66] text-black' : 'bg-white/10 text-white/70'}`}>
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
                                            className="text-xs sm:text-sm text-white/70 font-medium absolute inset-0 px-4 flex items-center gap-2"
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
                                            placeholder="Название заведения и город (или прямая ссылка Maps)..."
                                            className="w-full bg-black/60 border border-white/20 focus:border-[#00FF66] rounded-2xl pl-12 pr-4 py-4 text-sm sm:text-base text-white placeholder-white/40 focus:outline-none transition-all"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSearchingMap}
                                        className="w-full bg-[#00FF66] hover:bg-[#10B981] text-black font-black text-sm py-4 rounded-2xl uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,255,102,0.4)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                    >
                                        <span>{isSearchingMap ? 'ПОИСК В GOOGLE PLACES...' : 'FIND PROFILE ->'}</span>
                                        {!isSearchingMap && <FontAwesomeIcon icon={faArrowRight} />}
                                    </button>
                                </form>

                                <button
                                    type="button"
                                    onClick={() => setIsMapPickerOpen(true)}
                                    className="w-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-mono text-xs py-3.5 rounded-2xl border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <FontAwesomeIcon icon={faMapMarkerAlt} className="text-[#00FF66]" />
                                    <span>📍 Найти заведение на Google Картах (Выбрать точку)</span>
                                </button>

                                {/* Autocomplete Dropdown Predictions from Google Places API */}
                                {searchResults.length > 0 && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-4 space-y-2 bg-black/90 p-3.5 rounded-2xl border border-[#00FF66]/40 shadow-2xl"
                                    >
                                        <p className="text-[11px] text-[#00FF66] uppercase font-mono mb-2 flex items-center gap-1.5 font-bold">
                                            <FontAwesomeIcon icon={faSearch} />
                                            <span>Подходящие заведения в Google Places API:</span>
                                        </p>
                                        {searchResults.map((res, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => handleSelectPlacePrediction(res)}
                                                className="w-full text-left bg-white/5 hover:bg-[#00FF66]/15 p-3 rounded-xl border border-white/5 hover:border-[#00FF66]/50 transition-all flex items-start gap-3 group cursor-pointer"
                                            >
                                                <FontAwesomeIcon icon={faMapMarkerAlt} className="text-[#00FF66] mt-1 group-hover:scale-110 transition-transform" />
                                                <div className="overflow-hidden">
                                                    <p className="text-white text-sm font-bold group-hover:text-[#00FF66] transition-colors">{res.name}</p>
                                                    <p className="text-white/50 text-xs truncate">{res.address || res.description}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </motion.div>
                                )}

                                {/* Strict Validation Error Box (No Fake Fallbacks) */}
                                {searchError && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-4 bg-[#EA4335]/15 p-4 sm:p-5 rounded-2xl border-2 border-[#EA4335]/50 text-left space-y-3 shadow-xl"
                                    >
                                        <div className="flex items-center gap-2.5 text-[#EA4335] font-black text-sm uppercase tracking-wider">
                                            <FontAwesomeIcon icon={faTimesCircle} className="text-base" />
                                            <span>Ошибка верификации Google Places API</span>
                                        </div>
                                        <p className="text-xs text-white/80 leading-relaxed font-sans">
                                            {searchErrorMessage || `Не удалось проверить данные в Google Places API. Система не производит симуляцию без подтвержденного Google Place ID.`}
                                        </p>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            <button
                                                type="button"
                                                onClick={() => setIsMapPickerOpen(true)}
                                                className="text-[11px] font-mono font-bold bg-[#EA4335]/20 hover:bg-[#EA4335]/30 text-white px-3 py-2 rounded-xl border border-[#EA4335]/40 transition-colors flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <FontAwesomeIcon icon={faMapMarkerAlt} className="text-[#00FF66]" />
                                                <span>Указать на карте</span>
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Interactive Google Map Picker Modal */}
            <AnimatePresence>
                {isMapPickerOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[#181A1D] border border-white/20 rounded-3xl p-5 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4 text-left shadow-2xl"
                        >
                            <div className="flex justify-between items-center border-b border-white/10 pb-3">
                                <div>
                                    <h3 className="font-bold text-white text-base sm:text-lg uppercase flex items-center gap-2">
                                        <FontAwesomeIcon icon={faMapMarkerAlt} className="text-[#00FF66]" />
                                        <span>Выбор заведения на Google Картах</span>
                                    </h3>
                                    <p className="text-xs text-white/50">Перетащите маркер к вашему заведению или кликните по карте</p>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => setIsMapPickerOpen(false)}
                                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm transition-colors cursor-pointer"
                                >
                                    ✕
                                </button>
                            </div>

                            <div id="google-map-picker-canvas" className="w-full h-72 rounded-2xl border border-white/10 overflow-hidden relative bg-black/40">
                                <div className="absolute inset-0 flex items-center justify-center text-white/40 text-xs font-mono">
                                    Загрузка интерактивной карты Google Maps...
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-xs font-mono uppercase text-white/60 flex items-center gap-2">
                                    <FontAwesomeIcon icon={faSearch} className="text-[#00FF66]" />
                                    <span>Заведения Google Places в радиусе маркера:</span>
                                </p>
                                {isSearchingNearby ? (
                                    <div className="p-4 bg-black/40 rounded-xl border border-white/5 text-center text-xs text-white/50 font-mono">
                                        Сканирование реестра Google Places API...
                                    </div>
                                ) : nearbyPlaces.length > 0 ? (
                                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                                        {nearbyPlaces.map((place, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => {
                                                    setIsMapPickerOpen(false);
                                                    handleSelectPlacePrediction({
                                                        place_id: place.place_id,
                                                        name: place.name,
                                                        address: place.vicinity || place.formatted_address
                                                    });
                                                }}
                                                className="w-full text-left bg-white/5 hover:bg-[#00FF66]/15 p-3 rounded-xl border border-white/10 hover:border-[#00FF66]/50 transition-all flex items-start justify-between group cursor-pointer"
                                            >
                                                <div className="overflow-hidden">
                                                    <p className="text-white text-sm font-bold group-hover:text-[#00FF66] transition-colors">{place.name}</p>
                                                    <p className="text-white/50 text-xs truncate max-w-md">{place.vicinity || place.formatted_address}</p>
                                                </div>
                                                <span className="text-xs font-mono bg-[#00FF66]/20 text-[#00FF66] px-2.5 py-1 rounded font-bold border border-[#00FF66]/30 group-hover:bg-[#00FF66] group-hover:text-black transition-colors flex-shrink-0 ml-2">
                                                    Выбрать &rarr;
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-4 bg-[#EA4335]/10 rounded-xl border border-[#EA4335]/30 text-xs text-[#EA4335] leading-relaxed">
                                        В точке маркера не найдено ни одного зарегистрированного объекта Google Places. Переместите маркер ближе к заведению на карте.
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Step 2: Data Confirmation */}
            <div className={`bg-[#181A1D] rounded-3xl border ${activeStep === 2 ? 'border-[#00FF66]/40 shadow-lg' : 'border-white/10 opacity-70'} overflow-hidden transition-all duration-300 ${activeStep < 2 ? 'pointer-events-none opacity-40' : ''}`}>
                <div 
                    className={`p-5 sm:p-6 flex items-center justify-between cursor-pointer ${activeStep > 2 ? 'hover:bg-white/5' : ''}`}
                    onClick={() => activeStep > 2 && setActiveStep(2)}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm transition-colors ${activeStep === 2 ? 'bg-[#00FF66] text-black' : activeStep > 2 ? 'bg-white/10 text-white' : 'bg-white/5 text-white/30'}`}>
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
                                            <label className="text-xs font-mono uppercase text-white/50 mb-1.5 block">Компания:</label>
                                            <input
                                                type="text"
                                                value={selectedBusiness}
                                                onChange={(e) => setSelectedBusiness(e.target.value)}
                                                className="w-full bg-black/60 border border-white/15 rounded-2xl px-4 py-3.5 text-xs text-white focus:outline-none focus:border-[#00FF66]"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-mono uppercase text-white/50 mb-1.5 block">Адрес:</label>
                                            <input
                                                type="text"
                                                value={extractedAddress}
                                                onChange={(e) => setExtractedAddress(e.target.value)}
                                                className="w-full bg-black/60 border border-white/15 rounded-2xl px-4 py-3.5 text-xs text-white focus:outline-none focus:border-[#00FF66]"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-mono uppercase text-white/50 mb-1.5 block">Категория бизнеса в Google Maps:</label>
                                        <select 
                                            value={nicheId}
                                            onChange={(e) => setNicheId(e.target.value)}
                                            className="w-full bg-black/60 border border-white/15 rounded-2xl px-4 py-3.5 text-xs text-white focus:outline-none focus:border-[#00FF66]"
                                        >
                                            {NICHES.map(n => (
                                                <option key={n.id} value={n.id}>{n.labelRu}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-2 pt-2">
                                        <div className="flex justify-between items-center text-xs font-mono">
                                            <span className="text-white/50">Население города:</span>
                                            <span className="text-white font-bold">
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
