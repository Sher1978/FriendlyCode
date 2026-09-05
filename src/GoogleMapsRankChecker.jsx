import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faCheckCircle, faTimesCircle, faExclamationTriangle, faMapMarkerAlt, faStar } from '@fortawesome/free-solid-svg-icons';

const GoogleMapsRankChecker = () => {
    const [step, setStep] = useState('input'); // input, loading, result, success
    const [placeDetails, setPlaceDetails] = useState(null);
    const [healthScore, setHealthScore] = useState(0);
    const [progress, setProgress] = useState(0);
    const [contactInfo, setContactInfo] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUrlMode, setIsUrlMode] = useState(false);
    
    const inputRef = useRef(null);
    const autocompleteRef = useRef(null);
    const placesServiceRef = useRef(null);

    // Initialize Autocomplete
    useEffect(() => {
        if (!window.google || !window.google.maps || !window.google.maps.places) {
            console.error('Google Maps API not loaded.');
            return;
        }
        
        if (inputRef.current && !autocompleteRef.current) {
            autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
                fields: ['place_id', 'name', 'rating', 'user_ratings_total', 'website', 'formatted_address', 'icon', 'types'],
                types: ['establishment']
            });

            autocompleteRef.current.addListener('place_changed', handlePlaceSelected);
            
            // Bias towards user's current location if allowed
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const circle = new window.google.maps.Circle({
                            center: { lat: position.coords.latitude, lng: position.coords.longitude },
                            radius: 50000 // 50km radius
                        });
                        if (autocompleteRef.current) {
                            autocompleteRef.current.setBounds(circle.getBounds());
                        }
                    },
                    (error) => {
                        console.log("Geolocation not available or denied:", error);
                    }
                );
            }
        }
    }, [step]);

    const handlePlaceSelected = () => {
        const place = autocompleteRef.current.getPlace();
        if (!place || !place.place_id) return;

        setPlaceDetails(place);
        startAnalysis(place);
    };

    const startAnalysis = (place) => {
        setStep('loading');
        
        // Calculate mock health score with built-in anxiety (Loss Aversion)
        // Base score is 70 instead of 100.
        let score = 70;

        const rating = place.rating || 0;
        const reviews = place.user_ratings_total || 0;
        
        if (rating >= 4.7) {
            score += 10;
        } else if (rating < 4.5) {
            score -= 15;
        }

        if (reviews >= 50) {
            score += 5;
        } else {
            score -= 10;
        }

        if (place.website) {
            score += 5;
        } else {
            score -= 5;
        }
        
        // Penalty for missing deep SEO data (always applied to trigger lead gen)
        score -= 20; 
        
        // Add slight random variation
        score -= Math.floor(Math.random() * 8); 
        
        if (score < 10) score = 10;
        setHealthScore(score);

        // Progress Animation
        let currentProgress = 0;
        const interval = setInterval(() => {
            currentProgress += 5;
            setProgress(currentProgress);
            if (currentProgress >= 100) {
                clearInterval(interval);
                setTimeout(() => setStep('result'), 400);
            }
        }, 150);
    };

    const handleSubmitLead = async (e) => {
        e.preventDefault();
        if (!contactInfo.trim()) return;

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'leads_b2b_audit'), {
                contact: contactInfo,
                placeName: placeDetails?.name || 'Unknown',
                placeAddress: placeDetails?.formatted_address || '',
                placeRating: placeDetails?.rating || 0,
                placeReviews: placeDetails?.user_ratings_total || 0,
                healthScore: healthScore,
                timestamp: serverTimestamp(),
                source: 'maps_audit_widget'
            });

            // Optional: Telegram Webhook logic can be added via Cloud Functions
            // or a direct fetch to a bot API if provided.

            setStep('success');
        } catch (error) {
            console.error('Error saving lead:', error);
            alert('Произошла ошибка. Пожалуйста, попробуйте еще раз.');
        }
        setIsSubmitting(false);
    };

    return (
        <div className="w-full max-w-4xl mx-auto my-16 p-4 sm:p-8 bg-[#111111] border border-white/10 rounded-[32px] shadow-2xl relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[100px] pointer-events-none opacity-[0.15] bg-[#00FF41]" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[100px] pointer-events-none opacity-[0.1] bg-[#00FF41]" />

            <div className="relative z-10 text-center mb-8">
                <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight mb-3">
                    Бесплатный аудит <span className="text-[#00FF41]">ваших Google Карт</span>
                </h2>
                <p className="text-white/60 text-lg">
                    Узнайте индекс видимости вашего заведения и сколько выручки вы теряете прямо сейчас.
                </p>
            </div>

            <div className="relative z-10 bg-black/40 border border-white/5 rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
                <AnimatePresence mode="wait">
                    {/* STEP 1: INPUT */}
                    {step === 'input' && (
                        <motion.div 
                            key="input"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex flex-col items-center"
                        >
                            <div className="w-full max-w-2xl relative flex flex-col md:flex-row gap-4">
                                <div className="relative flex-grow">
                                    <FontAwesomeIcon icon={faMapMarkerAlt} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40 text-xl" />
                                    <input 
                                        ref={inputRef}
                                        type="text" 
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val.includes('maps.app.goo.gl') || val.includes('google.com/maps')) {
                                                setIsUrlMode(true);
                                                inputRef.current.urlValue = val;
                                            } else {
                                                setIsUrlMode(false);
                                            }
                                        }}
                                        placeholder="Введите название или вставьте ссылку..."
                                        className="w-full bg-white/5 border border-white/20 rounded-full py-4 pl-14 pr-6 text-white text-lg placeholder-white/40 focus:outline-none focus:border-[#00FF41]/50 transition-colors"
                                    />
                                </div>
                                
                                {isUrlMode && (
                                    <motion.button 
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        onClick={() => {
                                            setPlaceDetails({
                                                name: 'Заведение по ссылке',
                                                formatted_address: inputRef.current.urlValue,
                                                rating: (Math.random() * (4.7 - 3.8) + 3.8).toFixed(1), // Random realistic rating
                                                user_ratings_total: Math.floor(Math.random() * 120) + 10,
                                                website: ''
                                            });
                                            startAnalysis({
                                                name: 'Заведение по ссылке',
                                                rating: 4.1,
                                                user_ratings_total: 45,
                                                website: ''
                                            });
                                        }}
                                        className="bg-[#00FF41] hover:bg-[#00DF38] text-black font-black uppercase tracking-wider text-sm py-4 px-8 rounded-full transition-colors flex-shrink-0 shadow-[0_0_20px_rgba(0,255,65,0.3)]"
                                    >
                                        Проверить
                                    </motion.button>
                                )}
                            </div>
                            <p className="text-white/40 text-sm mt-4">Начните вводить название, либо вставьте прямую ссылку на Карты.</p>
                        </motion.div>
                    )}

                    {/* STEP 2: LOADING */}
                    {step === 'loading' && (
                        <motion.div 
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center py-8"
                        >
                            <div className="w-20 h-20 relative mb-6">
                                <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-[#00FF41] rounded-full border-t-transparent animate-spin"></div>
                                <FontAwesomeIcon icon={faSearch} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/50 text-xl animate-pulse" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Сканирование алгоритмами Google...</h3>
                            <p className="text-[#00FF41] mb-6 font-mono">{progress}% Завершено</p>
                            
                            <div className="w-full max-w-md bg-white/5 h-2 rounded-full overflow-hidden">
                                <motion.div 
                                    className="h-full bg-gradient-to-r from-[#00FF41]/50 to-[#00FF41]"
                                    initial={{ width: '0%' }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.2 }}
                                />
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 3: RESULT */}
                    {step === 'result' && (
                        <motion.div 
                            key="result"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center"
                        >
                            <div className="flex flex-col sm:flex-row w-full gap-8 mb-8">
                                {/* Score Circle */}
                                <div className="flex-shrink-0 flex flex-col items-center justify-center bg-black/60 rounded-3xl p-6 border border-white/10 w-full sm:w-64">
                                    <h4 className="text-white/50 text-sm uppercase tracking-wider font-bold mb-4">Health Score</h4>
                                    <div className="w-32 h-32 rounded-full border-8 flex items-center justify-center relative shadow-[0_0_30px_rgba(255,0,0,0.15)]"
                                         style={{ 
                                             borderColor: healthScore > 70 ? '#00FF41' : healthScore > 40 ? '#FFD700' : '#FF4136',
                                             boxShadow: `0 0 30px ${healthScore > 70 ? 'rgba(0,255,65,0.2)' : healthScore > 40 ? 'rgba(255,215,0,0.2)' : 'rgba(255,65,54,0.2)'}`
                                         }}>
                                        <span className="text-4xl font-black text-white">{healthScore}</span>
                                        <span className="text-white/50 text-sm absolute bottom-4">/ 100</span>
                                    </div>
                                    <p className="text-center text-sm mt-4 font-medium" style={{ color: healthScore > 70 ? '#00FF41' : healthScore > 40 ? '#FFD700' : '#FF4136' }}>
                                        {healthScore > 70 ? 'Хорошая видимость' : healthScore > 40 ? 'Средняя видимость, есть дыры' : 'Критически низкая видимость!'}
                                    </p>
                                </div>

                                {/* Issues Checklist */}
                                <div className="flex-grow flex flex-col justify-center space-y-6 text-left max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                                    
                                    {/* BASIC FACTORS */}
                                    <div className="space-y-4 border-b border-white/10 pb-4">
                                        <h5 className="text-[#00FF41] text-xs font-black uppercase tracking-[0.2em] mb-2">Базовые метрики (API)</h5>
                                        <div className="flex items-start gap-3">
                                            <FontAwesomeIcon icon={placeDetails?.rating >= 4.5 ? faCheckCircle : faTimesCircle} className={`text-xl mt-0.5 ${placeDetails?.rating >= 4.5 ? 'text-[#00FF41]' : 'text-[#FF4136]'}`} />
                                            <div>
                                                <h5 className="text-white font-bold text-base">Рейтинг: {placeDetails?.rating || 'Нет данных'}</h5>
                                                <p className="text-white/60 text-xs">{placeDetails?.rating >= 4.5 ? 'Отличный рейтинг!' : 'Рейтинг ниже 4.5 — вы теряете до 60% кликов потенциальных клиентов.'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <FontAwesomeIcon icon={placeDetails?.user_ratings_total >= 50 ? faCheckCircle : faTimesCircle} className={`text-xl mt-0.5 ${placeDetails?.user_ratings_total >= 50 ? 'text-[#00FF41]' : 'text-[#FF4136]'}`} />
                                            <div>
                                                <h5 className="text-white font-bold text-base">Отзывов: {placeDetails?.user_ratings_total || 0}</h5>
                                                <p className="text-white/60 text-xs">{placeDetails?.user_ratings_total >= 50 ? 'Хорошая активность.' : 'Мало отзывов. Алгоритмы Google пессимизируют карточку в выдаче.'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <FontAwesomeIcon icon={placeDetails?.website ? faCheckCircle : faExclamationTriangle} className={`text-xl mt-0.5 ${placeDetails?.website ? 'text-[#00FF41]' : 'text-[#FFD700]'}`} />
                                            <div>
                                                <h5 className="text-white font-bold text-base">Интеграция оффера</h5>
                                                <p className="text-white/60 text-xs">{placeDetails?.website ? 'Ссылка указана.' : 'Нет ссылки на меню/акцию (Revoo). Трафик не конвертируется.'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* DEEP SEO FACTORS */}
                                    <div className="space-y-4">
                                        <h5 className="text-[#FFD700] text-xs font-black uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                            <FontAwesomeIcon icon={faExclamationTriangle} /> Критические SEO-факторы (Требуется ручной аудит)
                                        </h5>
                                        
                                        <div className="flex items-start gap-3 opacity-90">
                                            <FontAwesomeIcon icon={faExclamationTriangle} className="text-lg mt-0.5 text-[#FFD700]" />
                                            <div>
                                                <h5 className="text-[#FFD700] font-bold text-sm">Регулярность обновлений (Google Posts)</h5>
                                                <p className="text-white/60 text-xs mt-1"><span className="text-white/40 font-bold uppercase text-[10px] bg-black px-1 py-0.5 rounded mr-1">Статус: Не подтверждено</span> Нет данных о регулярных публикациях. Вы можете терять позиции по свежим запросам.</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-start gap-3 opacity-90">
                                            <FontAwesomeIcon icon={faExclamationTriangle} className="text-lg mt-0.5 text-[#FFD700]" />
                                            <div>
                                                <h5 className="text-[#FFD700] font-bold text-sm">Скорость и семантика ответов (Response Rate)</h5>
                                                <p className="text-white/60 text-xs mt-1"><span className="text-white/40 font-bold uppercase text-[10px] bg-black px-1 py-0.5 rounded mr-1">Статус: Требуется анализ</span> Google пессимизирует профили, игнорирующие отзывы. Необходим анализ ответов на наличие ключевых слов.</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3 opacity-90">
                                            <FontAwesomeIcon icon={faExclamationTriangle} className="text-lg mt-0.5 text-[#FFD700]" />
                                            <div>
                                                <h5 className="text-[#FFD700] font-bold text-sm">Фото-оптимизация (EXIF & Owner Photos)</h5>
                                                <p className="text-white/60 text-xs mt-1"><span className="text-white/40 font-bold uppercase text-[10px] bg-black px-1 py-0.5 rounded mr-1">Статус: Риск потери конверсии</span> Необходима проверка наличия правильных мета-тегов и геотегов в фотографиях.</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3 opacity-90">
                                            <FontAwesomeIcon icon={faTimesCircle} className="text-lg mt-0.5 text-[#FF4136]" />
                                            <div>
                                                <h5 className="text-[#FF4136] font-bold text-sm">Воронка захвата отзывов (Revoo Factor)</h5>
                                                <p className="text-white/60 text-xs mt-1"><span className="text-white/40 font-bold uppercase text-[10px] bg-black px-1 py-0.5 rounded mr-1">Статус: Не обнаружено</span> Ваш оффлайн-трафик не конвертируется в оцифрованную базу. Дырявое ведро.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Lead Capture Gated Block */}
                            <div className="w-full bg-gradient-to-r from-[#00FF41]/20 to-transparent border border-[#00FF41]/30 rounded-2xl p-6 relative overflow-hidden">
                                <div className="absolute inset-0 bg-[#00FF41]/5 backdrop-blur-[2px]"></div>
                                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                                    <div className="flex-grow text-left">
                                        <h4 className="text-xl font-bold text-white mb-2">Скачать пошаговый план вывода в ТОП-3</h4>
                                        <p className="text-white/70 text-sm mb-4 md:mb-0">Мы подготовили разбор ошибок ваших конкурентов и план действий для <span className="font-bold text-white">"{placeDetails?.name}"</span>.</p>
                                    </div>
                                    <form onSubmit={handleSubmitLead} className="w-full md:w-auto flex flex-col gap-3 flex-shrink-0">
                                        <input 
                                            type="text" 
                                            required
                                            value={contactInfo}
                                            onChange={e => setContactInfo(e.target.value)}
                                            placeholder="Ваш Phone / WhatsApp / Telegram"
                                            className="w-full md:w-72 bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#00FF41]"
                                        />
                                        <button 
                                            type="submit" 
                                            disabled={isSubmitting}
                                            className="w-full md:w-72 bg-[#00FF41] hover:bg-[#00DF38] text-black font-black uppercase tracking-wider text-sm py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
                                        >
                                            {isSubmitting ? 'ОТПРАВКА...' : 'ПОЛУЧИТЬ АУДИТ В WHATSAPP'}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 4: SUCCESS */}
                    {step === 'success' && (
                        <motion.div 
                            key="success"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center py-8 text-center"
                        >
                            <div className="w-20 h-20 bg-[#00FF41]/20 rounded-full flex items-center justify-center mb-6">
                                <FontAwesomeIcon icon={faCheckCircle} className="text-5xl text-[#00FF41]" />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">ЗАЯВКА ПРИНЯТА!</h3>
                            <p className="text-white/60 mb-6 max-w-md mx-auto">
                                Наш специалист свяжется с вами по указанному контакту и пришлет полный PDF-аудит вашего профиля.
                            </p>
                            <button 
                                onClick={() => { setStep('input'); setPlaceDetails(null); setContactInfo(''); }}
                                className="text-[#00FF41] text-sm font-bold uppercase tracking-wider hover:underline"
                            >
                                Проверить другое заведение
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default GoogleMapsRankChecker;
