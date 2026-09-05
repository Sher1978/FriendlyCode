import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowRight, faBolt, faHandPointer, faChartLine, faMicrochip, 
  faShieldHalved, faCheck, faXmark, faTriangleExclamation, 
  faLocationDot, faStar, faCoins, faUsers, faStore, faMobileScreen,
  faEyeSlash, faUserSlash, faChevronDown
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import PngBattery from './PngBattery';
import B2BContactModal from './B2BContactModal';
import LanguageSwitcher from './LanguageSwitcher';
import LegalModal from './LegalModal';
import GoogleMapsRankChecker from './GoogleMapsRankChecker';

const RevooB2BV2 = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [scrolled, setScrolled] = useState(false);
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [legalModalTab, setLegalModalTab] = useState(null);
    
    // Battery Simulation
    const [batteryDiscount, setBatteryDiscount] = useState(20);
    const [displayEnergy, setDisplayEnergy] = useState(100);
    const [openFaqIndex, setOpenFaqIndex] = useState(null);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

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
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const fadeInUp = {
        hidden: { opacity: 0, y: 40 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
    };

    return (
        <div className="min-h-screen bg-[#000000] text-white font-sans selection:bg-[#D4AF37]/30 overflow-x-hidden">
            {/* Ambient OLED Blurs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-amber-900/10 blur-[130px] rounded-full" />
                <div className="absolute top-[40%] right-[-10%] w-[600px] h-[600px] bg-[#D4AF37]/10 blur-[150px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[20%] w-[700px] h-[700px] bg-[#00FF41]/5 blur-[120px] rounded-full" />
            </div>

            {/* Navigation */}
            <nav className={`fixed top-0 left-0 w-full z-50 px-6 py-4 transition-all duration-500 ${scrolled ? 'bg-black/90 backdrop-blur-3xl border-b border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.5)]' : ''}`}>
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex-shrink-0 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <img src="/revoo-logo.png" className={`transition-all duration-500 ${scrolled ? 'h-8' : 'h-10'} object-contain mix-blend-screen opacity-90`} alt="REVOO Logo" />
                    </div>
                    <div className="flex items-center gap-3">
                        <LanguageSwitcher />
                        <button 
                            onClick={() => setIsContactModalOpen(true)}
                            className="bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] text-black px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-105 active:scale-95 transition-all"
                        >
                            {t('b2b2_nav_cta', 'ПОДКЛЮЧИТЬ МОЙ БИЗНЕС')}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Блок 1: Главный экран (The Hook) */}
            <section className="relative min-h-[95vh] flex items-center pt-32 pb-20 px-6 z-10 border-b border-white/5 overflow-hidden">
                {/* Hero Google Maps Background */}
                <div className="absolute inset-0 z-0 bg-black">
                    <div 
                        className="absolute inset-0 opacity-50 mix-blend-luminosity"
                        style={{
                            backgroundImage: 'url(/assets/emirates-golf.jpg)',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            filter: 'contrast(1.2) brightness(0.8)'
                        }}
                    />
                    {/* Tech Gradients for readability and aesthetic */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-[#0A0A0A]" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-black/60 to-transparent md:w-2/3" />
                    
                    {/* Subtle grid overlay to enhance tech feel */}
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, #D4AF37 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                </div>

                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full z-10">
                    <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="text-left">
                        {/* Breadcrumbs */}
                        <div className="flex items-center gap-2 text-xs font-mono text-white/50 mb-4">
                            <span className="hover:text-white cursor-pointer transition-colors" onClick={() => navigate('/')}>{t('bc_home', 'Главная')}</span>
                            <span className="text-white/20">/</span>
                            <span className="hover:text-white cursor-pointer transition-colors" onClick={() => navigate('/b2b')}>{t('bc_b2b', 'B2B Решения')}</span>
                            <span className="text-white/20">/</span>
                            <span className="text-[#D4AF37] font-bold">{t('bc_local_domination', 'Система Локального Доминирования')}</span>
                        </div>

                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest text-[#00FF41] mb-6 backdrop-blur-md">
                            <FontAwesomeIcon icon={faChartLine} />
                            {t('b2b2_hero_tag', 'Система локального доминирования')}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight leading-snug">
                            {t('b2b2_hero_h1', 'Хватит сливать бюджет на рекламу. Превратите Google Карты в бесконечный поток постоянных гостей.')}
                        </h1>
                        <p className="text-base md:text-lg text-white/70 font-medium mb-10 max-w-xl leading-relaxed">
                            {t('b2b2_hero_sub', 'В 2026 году таргетинг стоит космических денег, а баннеры вызывают баннеровую слепоту. Мы внедряем Систему Локального Доминирования: выводим ваш бизнес в Топ Google Картах, оцифровываем каждый визит и заставляем клиентов возвращаться снова и снова — без затрат на платную рекламу.')}
                        </p>
                        <motion.button
                            whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(212, 175, 55, 0.4)" }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsContactModalOpen(true)}
                            className="bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] text-black px-8 py-4.5 rounded-full font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 w-full sm:w-auto shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                        >
                            {t('b2b2_hero_cta', 'ПОДКЛЮЧИТЬ МОЙ БИЗНЕС')}
                        </motion.button>
                    </motion.div>

                    {/* Battery Showcase from RevooB2B */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className="relative h-[400px] w-full flex items-center justify-center perspective-[1000px]"
                    >
                        <motion.div 
                            className="absolute inset-[20%] rounded-full blur-[100px] z-0 transition-colors duration-300"
                            style={{ backgroundColor: displayEnergy > 50 ? 'rgba(0,255,65,0.3)' : displayEnergy > 20 ? 'rgba(255,204,0,0.3)' : 'rgba(255,59,48,0.3)' }}
                        />
                        <div className="relative w-full max-w-sm flex flex-col items-center drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] z-20">
                            {/* VIP Status Control Pill */}
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 1, duration: 1 }}
                                className="mb-6 px-5 py-2 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 backdrop-blur-xl shadow-[0_0_15px_rgba(212,175,55,0.1)]"
                            >
                                <span className="text-[10px] md:text-[11px] font-black text-[#D4AF37] uppercase tracking-[0.2em]">
                                    VIP Status Control
                                </span>
                            </motion.div>
                            <PngBattery discount={batteryDiscount} />
                        </div>
                        <motion.div 
                            className="absolute -right-4 md:-right-10 top-20 bg-[#1C1C1E]/80 backdrop-blur-md border border-[#D4AF37]/30 p-4 rounded-xl shadow-2xl flex flex-col gap-1 z-30"
                            animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                        >
                            <span className="text-[#D4AF37] text-[10px] uppercase font-mono tracking-widest">{t('b2b_hud_energy', 'MOTIVATION')}</span>
                            <motion.span 
                                key={displayEnergy} 
                                initial={{ opacity: 0, scale: 0.8 }} 
                                animate={{ opacity: 1, scale: 1 }} 
                                className="text-3xl font-black font-mono tracking-tighter" 
                                style={{ color: displayEnergy === 100 ? '#00FF41' : displayEnergy === 50 ? '#FFD700' : displayEnergy === 25 ? '#FF8800' : '#FF3131' }}
                            >
                                {displayEnergy}%
                            </motion.span>
                        </motion.div>
                        <motion.div 
                            className="absolute left-0 md:-left-20 bottom-10 md:bottom-24 bg-[#1C1C1E]/80 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl z-30 min-w-[140px]"
                            animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
                        >
                            <span className="text-white/40 text-[10px] uppercase font-mono tracking-widest block mb-1">Status</span>
                            <motion.span 
                                key={displayEnergy} 
                                initial={{ opacity: 0, x: -10 }} 
                                animate={{ opacity: 1, x: 0 }} 
                                className="text-sm font-bold uppercase tracking-wider block"
                                style={{ color: displayEnergy === 100 ? '#00FF41' : displayEnergy === 50 ? '#FFD700' : displayEnergy === 25 ? '#FF8800' : '#FF3131' }}
                            >
                                {displayEnergy === 100 ? t('b2b_status_max', 'Max Engagement') : displayEnergy === 50 ? t('b2b_status_warning', 'Warning') : displayEnergy === 25 ? t('b2b_status_risk', 'Risk of Churn') : t('b2b_status_critical', 'Critical')}
                            </motion.span>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            <GoogleMapsRankChecker />

            {/* Блок 2: Проблема (The Problem) */}
            <section className="py-24 px-6 relative z-10 border-b border-white/5">
                <div className="max-w-7xl mx-auto text-center mb-16">
                    <motion.h2 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-4xl font-extrabold uppercase tracking-tight mb-6 text-[#FF3B30] leading-tight"
                    >
                        {t('b2b2_prob_h2', 'Ваш профиль на картах — это дырявое ведро.')}
                    </motion.h2>
                    <p className="text-white/60 text-base md:text-xl max-w-3xl mx-auto font-medium leading-relaxed">
                        {t('b2b2_prob_desc', 'Каждый день туристы и местные жители ищут, где поесть или отдохнуть прямо сейчас. Они открывают Google Карты. Но что происходит дальше?')}
                    </p>
                </div>

                <div className="max-w-6xl mx-auto mb-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    {/* Leaky Bucket Graphic from existing landing */}
                    <motion.div 
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        className="relative rounded-[48px] overflow-hidden bg-black aspect-square flex items-center justify-center p-2 border border-white/5 shadow-2xl group"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-transparent z-0 opacity-40 group-hover:opacity-60 transition-opacity" />
                        <img 
                            src="/leaky-bucket-black.png" 
                            alt="Leaky Bucket" 
                            className="w-full h-full object-cover relative z-10 drop-shadow-[0_20px_60px_rgba(255,59,48,0.2)] scale-110 group-hover:scale-105 transition-transform duration-1000"
                        />
                    </motion.div>

                    <div className="flex flex-col gap-6">
                        <div className="p-8 rounded-[32px] bg-white/5 border border-white/5 backdrop-blur-xl hover:bg-white/10 transition-colors relative overflow-hidden group">
                            <div className="absolute -right-4 top-1/2 -translate-y-1/2 text-white/5 text-[120px] group-hover:text-white/10 transition-colors pointer-events-none">
                                <FontAwesomeIcon icon={faEyeSlash} />
                            </div>
                            <h4 className="text-white text-xl font-black mb-2 leading-none flex items-center gap-3 relative z-10">
                                <FontAwesomeIcon icon={faEyeSlash} className="text-red-500" />
                                {t('b2b2_prob_1_title', 'Невидимки для клиентов')}
                            </h4>
                            <p className="text-white/60 text-sm leading-relaxed relative z-10">{t('b2b2_prob_1_desc', 'Вы находитесь на 10-й позиции, и весь горячий поисковый трафик забирают конкуренты.')}</p>
                        </div>
                        <div className="p-8 rounded-[32px] bg-white/5 border border-white/5 backdrop-blur-xl hover:bg-white/10 transition-colors relative overflow-hidden group">
                            <div className="absolute -right-4 top-1/2 -translate-y-1/2 text-white/5 text-[120px] group-hover:text-white/10 transition-colors pointer-events-none">
                                <FontAwesomeIcon icon={faUserSlash} />
                            </div>
                            <h4 className="text-white text-xl font-black mb-2 leading-none flex items-center gap-3 relative z-10">
                                <FontAwesomeIcon icon={faUserSlash} className="text-red-500" />
                                {t('b2b2_prob_2_title', 'Случайные гости')}
                            </h4>
                            <p className="text-white/60 text-sm leading-relaxed relative z-10">{t('b2b2_prob_2_desc', 'Те, кто случайно зашел к вам, уходят навсегда, оставляя вас без повторных продаж.')}</p>
                        </div>
                        <div className="p-8 rounded-[32px] bg-white/5 border border-white/5 backdrop-blur-xl hover:bg-red-500/10 transition-colors relative overflow-hidden group">
                            <div className="absolute -right-4 top-1/2 -translate-y-1/2 text-red-500/10 text-[120px] group-hover:text-red-500/20 transition-colors pointer-events-none">
                                <FontAwesomeIcon icon={faStar} />
                            </div>
                            <h4 className="text-[#FF3B30] text-xl font-black mb-2 leading-none flex items-center gap-3 relative z-10">
                                <div className="flex items-center gap-1 text-red-500">
                                    <span className="text-xl font-black font-mono mt-0.5">1</span>
                                    <FontAwesomeIcon icon={faStar} className="text-lg" />
                                </div>
                                {t('b2b2_prob_3_title', 'Токсичный негатив')}
                            </h4>
                            <p className="text-white/60 text-sm leading-relaxed relative z-10">{t('b2b2_prob_3_desc', 'Любая мелочь может превратиться в гневный отзыв, который на месяцы обрушит ваш рейтинг в поиске.')}</p>
                        </div>
                    </div>
                </div>

                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    className="max-w-3xl mx-auto p-8 rounded-[32px] bg-gradient-to-r from-red-500/10 to-transparent border border-red-500/20 backdrop-blur-xl flex items-center gap-6 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
                    <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-500 text-xl shadow-[0_0_20px_rgba(255,59,48,0.2)]">
                        <FontAwesomeIcon icon={faTriangleExclamation} />
                    </div>
                    <div className="text-left">
                        <span className="block text-[10px] font-black uppercase tracking-[0.3em] text-red-500/60 mb-1">{t('b2b_diag_attention', 'ВНИМАНИЕ')}</span>
                        <p className="text-white text-lg font-bold leading-tight">
                            {t('b2b2_prob_summary', 'Традиционное ведение карт больше не работает. Вам мало просто «быть на точке». Вам нужна управляемая система захвата и удержания.')}
                        </p>
                    </div>
                </motion.div>
            </section>

            {/* Блок 2.1: Катастрофа без нас (The Stakes) */}
            <section className="py-24 px-6 relative z-10 border-b border-red-500/10 bg-[#1a0505]/50">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <motion.div initial="hidden" whileInView="visible" variants={fadeInUp} viewport={{ once: true }}>
                        <h2 className="text-3xl md:text-4xl font-extrabold uppercase tracking-tight mb-8 text-white leading-tight">
                            {t('b2b2_stakes_h2', 'Что будет, если оставить всё как есть?')}
                        </h2>
                        <ul className="space-y-6">
                            {[
                                { title: 'Деньги утекают сквозь пальцы', desc: 'Вы продолжаете терять выручку, пока случайные прохожие из Google Карт покупают кофе один раз и навсегда уходят к вашим соседям.' },
                                { title: 'Рейтинг падает на глазах', desc: 'Один недовольный гость пишет гневный отзыв — и алгоритмы Google опускают вас в выдаче ниже плинтуса, потому что у вас нет защитного фильтра репутации.' },
                                { title: 'Вы рабы скидок и агрегаторов', desc: 'Попытки удержать людей через бумажные карты или купоны съедают маржу, но не возвращают гостя в заведение. Бизнес работает в ноль.' }
                            ].map((item, i) => (
                                <li key={i} className="flex gap-4 items-start">
                                    <div className="mt-1 w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 flex-shrink-0">
                                        <FontAwesomeIcon icon={faXmark} className="text-xs" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-white text-lg mb-1">{t(`b2b2_stakes_${i}_title`, item.title)}</h4>
                                        <p className="text-white/60 text-sm leading-relaxed">{t(`b2b2_stakes_${i}_desc`, item.desc)}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                    
                    <motion.div 
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="rounded-[40px] overflow-hidden border border-red-500/20 shadow-[0_0_50px_rgba(255,59,48,0.15)] relative h-[500px]"
                    >
                        <img src="/b2b_frustrated_owner.png" alt="Frustrated Owner" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1a0505] via-transparent to-transparent" />
                    </motion.div>
                </div>
            </section>

            {/* Блок 3: Роль Проводника (The Guide) */}
            <section className="py-24 px-6 relative z-10 border-b border-white/5 overflow-hidden">
                <div className="max-w-5xl mx-auto relative">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="bg-[#1C1C1E]/60 border border-white/10 p-10 md:p-16 rounded-[48px] backdrop-blur-2xl shadow-[0_0_80px_rgba(0,0,0,0.5)] relative overflow-hidden group"
                    >
                        {/* Architectural Typography Background */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-1000 z-0">
                            <div className="text-[120px] md:text-[200px] font-black leading-[0.8] font-mono text-white text-center whitespace-nowrap tracking-tighter mix-blend-overlay rotate-[-5deg] scale-125">
                                ARCHITECTURE<br/>INFRASTRUCTURE<br/>RETENTION
                            </div>
                        </div>
                        
                        {/* High-tech Blueprint Grid overlay */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.04] z-0" 
                             style={{ 
                                 backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', 
                                 backgroundSize: '30px 30px' 
                             }} 
                        />

                        <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#D4AF37]/15 blur-[100px] rounded-full pointer-events-none z-0" />
                        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#00FF41]/10 blur-[100px] rounded-full pointer-events-none z-0" />
                        
                        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-8 text-white leading-tight relative z-10 drop-shadow-xl">
                            <span className="text-[#D4AF37]">{t('b2b2_guide_h2_part1', 'Мы не просто SMM-агентство.')}</span> <br/>
                            {t('b2b2_guide_h2_part2', 'Мы — архитекторы вашей репутации и возвращаемости.')}
                        </h2>
                        <p className="text-white/80 text-lg md:text-xl font-medium leading-relaxed relative z-10 max-w-3xl drop-shadow-md">
                            {t('b2b2_guide_desc', 'Забудьте о разрозненных подрядчиках, которые обещают «поднять охваты». Мы объединили органическое продвижение на Google Картах с мощной IT-инфраструктурой. Наша технология берет анонимного поискового гостя, приводит его к вам в заведение прямо сегодня и превращает в постоянного фаната, который сам защищает ваш рейтинг.')}
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Блок 4: План действий (The Plan) */}
            <section className="py-24 px-6 relative z-10 border-b border-white/5 bg-black/40">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-3xl md:text-4xl font-extrabold uppercase tracking-tight mb-4 text-white">
                            {t('b2b2_plan_h2', 'Как работает Система Локального Доминирования')}
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            { icon: faLocationDot, title: 'Захват в поиске (Google Maps)', desc: 'Мы оптимизируем ваш профиль и настраиваем точки касания. Когда клиент находит вас в поиске, он видит мощный оффер: «Забери подарок на первый визит».' },
                            { icon: faBolt, title: 'Мгновенный визит (Zero Friction)', desc: 'Клиент кликает по ссылке и попадает в веб-среду Revo. Никаких скачиваний! Он видит таймер: подарок сгорит через 24 часа. Это заставляет его прийти к вам прямо сейчас.' },
                            { icon: faStar, title: 'Генерация 5-звёзд (Review Gating)', desc: 'После визита система опрашивает гостя. Довольных отправляет ставить 5 звезд на Google Карты, а негатив перехватывает и отправляет лично в Telegram администратору.' },
                            { icon: faChartLine, title: 'Бесконечный возврат (Retention)', desc: 'Клиент вовлекается в геймификацию (тающую скидку-батарею), которая заставляет его возвращаться снова и снова, увеличивая ваш LTV.' }
                        ].map((step, i) => (
                            <motion.div 
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                viewport={{ once: true }}
                                className="bg-[#1C1C1E]/50 rounded-[32px] p-8 border border-white/5 backdrop-blur-xl relative"
                            >
                                <div className="absolute top-0 right-0 p-6 text-[80px] font-black text-white/[0.03] leading-none select-none">
                                    0{i+1}
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] text-xl mb-6 shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                                    <FontAwesomeIcon icon={step.icon} />
                                </div>
                                <h3 className="text-xl font-black text-white mb-4 leading-tight">{step.title}</h3>
                                <p className="text-white/60 text-sm leading-relaxed relative z-10">{step.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Блок 5: Секретное оружие (The Product) */}
            <section className="py-24 px-6 relative z-10 border-b border-white/5">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <motion.div 
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="rounded-[40px] overflow-hidden border border-[#D4AF37]/30 bg-[#1C1C1E]/90 p-8 shadow-[0_0_50px_rgba(212,175,55,0.15)] flex flex-col justify-between min-h-[500px] relative group"
                        style={{ 
                            backgroundImage: 'linear-gradient(rgba(28, 28, 30, 0.85), rgba(28, 28, 30, 0.95)), url(/assets/emirates-golf.jpg)', 
                            backgroundSize: 'cover', 
                            backgroundPosition: 'center' 
                        }}
                    >
                        {/* Google Maps Header Card Mockup */}
                        <div className="flex items-start justify-between pb-6 border-b border-white/10 relative z-10">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="bg-[#4285F4] text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">Google Maps</span>
                                    <span className="text-[#00FF41] font-mono text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 bg-[#00FF41]/10 px-2.5 py-0.5 rounded-full border border-[#00FF41]/30">
                                        <span className="w-2 h-2 rounded-full bg-[#00FF41] animate-pulse" /> #1 В ПОИСКЕ
                                    </span>
                                </div>
                                <h3 className="text-2xl font-black text-white">REVOO Gastro Lounge</h3>
                                <p className="text-white/50 text-xs mt-1">Ресторан • $$ • Открыто до 02:00</p>
                            </div>
                            <div className="flex flex-col items-end">
                                <div className="flex items-center gap-1 text-[#FFD700] text-xl font-black">
                                    <span>5.0</span>
                                    <FontAwesomeIcon icon={faStar} />
                                </div>
                                <span className="text-white/40 text-[10px]">1,420+ отзывов</span>
                            </div>
                        </div>

                        {/* Interactive Pin Route Visualizer */}
                        <div 
                            className="my-6 relative rounded-2xl overflow-hidden border border-white/10 h-64 flex items-center justify-center p-4 shadow-2xl"
                            style={{ 
                                backgroundImage: 'url(/assets/emirates-golf.jpg)', 
                                backgroundSize: 'cover', 
                                backgroundPosition: 'center' 
                            }}
                        >
                            <div className="absolute inset-0 bg-black/30 pointer-events-none" />
                            
                            <div className="relative z-10 flex flex-col items-center text-center">
                                <div className="w-14 h-14 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center text-red-500 text-2xl shadow-[0_0_30px_rgba(239,68,68,0.5)] animate-bounce mb-3">
                                    <FontAwesomeIcon icon={faLocationDot} />
                                </div>
                                <div className="bg-black/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-lg">
                                    <p className="text-xs font-bold text-white">Органический трафик: <span className="text-[#00FF41]">+340% гостей</span></p>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Status Pill */}
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#00FF41]/10 border border-[#00FF41]/30 flex items-center justify-center text-[#00FF41]">
                                    <FontAwesomeIcon icon={faBolt} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-white">Умная оцифровка визитов</p>
                                    <p className="text-[10px] text-white/50">Zero Friction: 0.5 сек без скачивания</p>
                                </div>
                            </div>
                            <span className="text-xs font-black text-[#D4AF37] font-mono">TOP #1</span>
                        </div>
                    </motion.div>

                    <motion.div initial="hidden" whileInView="visible" variants={fadeInUp} viewport={{ once: true }}>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] mb-6 backdrop-blur-md">
                            <FontAwesomeIcon icon={faMicrochip} />
                            Science-Backed
                        </div>
                        <h2 className="text-3xl md:text-4xl font-extrabold uppercase tracking-tight mb-6 text-white leading-tight">
                            {t('b2b2_weapon_h2', 'Под капотом — 2 нобелевских премии экономики')}
                        </h2>
                        <p className="text-white/70 text-base md:text-lg mb-8 leading-relaxed">
                            {t('b2b2_weapon_desc', 'В основу Revo заложены открытия в области поведенческой экономики, удостоенные 2 Нобелевских премий (Д. Канеман и Р. Талер). Почему наша система работает лучше любых пластиковых карт? Мы встроили фундаментальные психологические триггеры:')}
                        </p>
                        <div className="space-y-8">
                            <div className="p-6 rounded-[24px] bg-white/5 border border-white/10">
                                <h4 className="text-[#D4AF37] font-black text-xl mb-2">{t('b2b2_weapon_trigger1_title', 'Живая скидка-батарея')}</h4>
                                <p className="text-white/60 text-sm leading-relaxed">{t('b2b2_weapon_trigger1_desc', 'Размер скидки гостя тает, если он долго не заходит. Страх потери (Loss Aversion) мотивирует зайти гораздо сильнее, чем мифические накопления баллов.')}</p>
                            </div>
                            <div className="p-6 rounded-[24px] bg-white/5 border border-white/10">
                                <h4 className="text-[#00FF41] font-black text-xl mb-2">{t('b2b2_weapon_trigger2_title', 'Чистый Zero Friction')}</h4>
                                <p className="text-white/60 text-sm leading-relaxed">{t('b2b2_weapon_trigger2_desc', 'Никаких анкет, паролей и лишних приложений. Всё работает за 1 секунду прямо в браузере или в Telegram.')}</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Блок 6.1: Картина идеального будущего (The Success) */}
            <section className="py-24 px-6 relative z-10 border-b border-white/5 bg-black/60">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <motion.div initial="hidden" whileInView="visible" variants={fadeInUp} viewport={{ once: true }}>
                        <h2 className="text-3xl md:text-4xl font-extrabold uppercase tracking-tight mb-10 text-white leading-tight">
                            {t('b2b2_success_h2', 'Каким станет ваш бизнес с Системой Локального Доминирования?')}
                        </h2>
                        <ul className="space-y-6">
                            {[
                                { title: 'Вы — лидер локального поиска', desc: 'Ваш профиль в Google Картах в топе. У вас стабильный поток новых гостей, которые находят вас с телефона за пару секунд.' },
                                { title: 'Предсказуемый возврат', desc: 'Гости возвращаются регулярно, подогреваемые динамической скидкой. Вы точно знаете, кто сделает кассу на этой неделе.' },
                                { title: 'Репутация на автопилоте', desc: 'Ваш рейтинг держится на отметке 4.8–5.0 без вашего участия, потому что система отсекает негатив, а позитив конвертирует в публичные отзывы.' },
                                { title: 'Свобода от рутины', desc: 'Вы занимаетесь качеством сервиса, пока автоматизированная воронка набивает посадочные места.' }
                            ].map((item, i) => (
                                <li key={i} className="flex gap-4 items-start">
                                    <div className="mt-1 w-6 h-6 rounded-full bg-[#00FF41]/20 flex items-center justify-center text-[#00FF41] flex-shrink-0 shadow-[0_0_10px_rgba(0,255,65,0.3)]">
                                        <FontAwesomeIcon icon={faCheck} className="text-xs" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-white text-lg mb-1">{t(`b2b2_success_${i}_title`, item.title)}</h4>
                                        <p className="text-white/60 text-sm leading-relaxed">{t(`b2b2_success_${i}_desc`, item.desc)}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                    
                    <motion.div 
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="rounded-[40px] overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(255,255,255,0.05)] relative h-[600px]"
                    >
                        <img src="/b2b_busy_cafe.png" alt="Busy Cafe" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                    </motion.div>
                </div>
            </section>

            {/* Блок 6: Результат для кого (Target Audience) */}
            <section className="py-24 px-6 relative z-10 border-b border-white/5">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-extrabold uppercase tracking-tight mb-4 text-white">
                            {t('b2b2_target_h2', 'Идеальный двигатель для любого заведения в сфере HoReCa:')}
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { icon: faLocationDot, title: 'Туристический трафик', desc: 'Вылавливайте туристов прямо из поисковой выдачи Карт, давая им веский повод зайти к вам в первый же день отпуска.' },
                            { icon: faUsers, title: 'Локальные резиденты', desc: 'Превращайте случайных прохожах в постоянную базу, которая приносит стабильную выручку каждую неделю.' },
                            { icon: faCoins, title: 'Рост среднего чека', desc: 'Геймифицированные механики стимулируют гостей заказывать больше, чтобы разблокировать новые уровни выгоды.' }
                        ].map((card, i) => (
                            <div key={i} className="bg-gradient-to-b from-[#1C1C1E]/80 to-[#1C1C1E]/30 rounded-[32px] p-8 border border-white/5 text-center flex flex-col items-center">
                                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-[#D4AF37] text-3xl mb-6">
                                    <FontAwesomeIcon icon={card.icon} />
                                </div>
                                <h3 className="text-xl font-black text-white mb-4">{card.title}</h3>
                                <p className="text-white/60 text-sm leading-relaxed">{card.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Блок 7: Социальное доказательство (Social Proof - Reviews) */}
            <section className="py-24 px-6 relative z-10 border-b border-white/5 bg-black/40">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-2xl md:text-4xl font-extrabold uppercase tracking-tight mb-16 text-center text-white">
                        {t('b2b2_reviews_h2', 'Что говорят владельцы бизнеса?')}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                name: t('b2b2_reviews_1_name', 'Александр В., Владелец ресторана'),
                                text: t('b2b2_reviews_1_text', 'За месяц мы собрали больше отзывов, чем за весь прошлый год. Рейтинг вырос с 4.2 до 4.6, и мы уже видим приток новых гостей с Google Карт.')
                            },
                            {
                                name: t('b2b2_reviews_2_name', 'Мария С., Сеть кофеен'),
                                text: t('b2b2_reviews_2_text', 'Система Revoo буквально спасла нас от потребительского терроризма. Весь негатив теперь уходит мне в Telegram, а гости довольны, что мы моментально решаем их проблемы. Оборот вырос на 15%.')
                            },
                            {
                                name: t('b2b2_reviews_3_name', 'Дмитрий К., Барбершоп'),
                                text: t('b2b2_reviews_3_text', 'Раньше мы раздавали картонные визитки с печатками, которые никто не носил. Сейчас 98% клиентов сканируют QR-код на зеркале, а тающая скидка заставляет их стричься каждые 3 недели, а не раз в месяц.')
                            }
                        ].map((review, i) => (
                            <div key={i} className="p-8 rounded-[32px] bg-white/5 border border-white/10 relative hover:bg-white/10 transition-colors flex flex-col justify-between">
                                <div>
                                    <div className="flex text-[#D4AF37] mb-6 space-x-1">
                                        {[...Array(5)].map((_, idx) => (
                                            <FontAwesomeIcon key={idx} icon={faStar} />
                                        ))}
                                    </div>
                                    <p className="text-white/80 text-base leading-relaxed mb-8 italic">"{review.text}"</p>
                                </div>
                                <div className="flex items-center gap-4 border-t border-white/10 pt-6">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#8C7323] flex flex-shrink-0 items-center justify-center text-black font-bold text-lg">
                                        {review.name.charAt(0)}
                                    </div>
                                    <p className="text-white font-bold">{review.name}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Блок 8: Часто задаваемые вопросы (FAQ) */}
            <section className="py-24 px-6 relative z-10 border-b border-white/5">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl md:text-4xl font-extrabold uppercase tracking-tight mb-16 text-center text-white">
                        {t('b2b2_faq_h2', 'Остались вопросы? Давайте разберем главные:')}
                    </h2>
                    <div className="space-y-4">
                        {[...Array(16)].map((_, i) => (
                            <div key={i} className="rounded-[24px] bg-[#1C1C1E]/50 border border-white/5 overflow-hidden transition-colors hover:bg-[#1C1C1E]/70">
                                <button 
                                    onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                                    className="w-full flex items-center justify-between p-6 text-left"
                                >
                                    <h4 className="text-white text-base md:text-lg font-black pr-4">{t(`b2b2_faq_q_${i}`)}</h4>
                                    <FontAwesomeIcon 
                                        icon={faChevronDown} 
                                        className={`text-[#D4AF37] transition-transform duration-300 ${openFaqIndex === i ? 'rotate-180' : ''}`}
                                    />
                                </button>
                                <AnimatePresence>
                                    {openFaqIndex === i && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                                        >
                                            <div className="px-6 pb-6 text-white/60 text-sm md:text-base leading-relaxed border-t border-white/5 pt-4">
                                                {t(`b2b2_faq_a_${i}`)}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Блок 9: Финальный призыв к действию (The Call to Action) */}
            <section className="py-32 px-6 relative z-10">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl md:text-5xl font-extrabold uppercase tracking-tight mb-8 text-white leading-tight">
                        {t('b2b2_cta_h2', 'Не отдавайте своих клиентов конкурентам.')}
                    </h2>
                    <p className="text-white/70 text-lg md:text-xl font-medium mb-12 leading-relaxed">
                        {t('b2b2_cta_desc', 'Каждый день промедления — это десятки гостей, которые выбрали другое заведение в Google Картах, потому что у него рейтинг выше, а сервис современнее. Займите место лидера в своем районе.')}
                    </p>
                    <button
                        onClick={() => setIsContactModalOpen(true)}
                        className="bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] text-black px-10 py-5 rounded-full font-black text-lg uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(212,175,55,0.4)]"
                    >
                        {t('b2b2_cta_btn', 'ПОДКЛЮЧИТЬ МОЙ БИЗНЕС')}
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-white/10 relative z-10 bg-black">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <p className="text-white/30 text-sm font-bold tracking-widest uppercase">REVOO SYSTEM © 2026</p>
                        <p className="text-white/20 text-xs mt-1">Made in Dubai, UAE</p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs text-white/50 font-medium">
                        <button onClick={() => setLegalModalTab('privacy')} className="hover:text-[#D4AF37] transition-colors">
                            {t('legal_privacy', 'Политика конфиденциальности')}
                        </button>
                        <span className="text-white/20">•</span>
                        <button onClick={() => setLegalModalTab('disclaimer')} className="hover:text-[#D4AF37] transition-colors">
                            {t('legal_disclaimer', 'Отказ от ответственности')}
                        </button>
                        <span className="text-white/20">•</span>
                        <button onClick={() => setLegalModalTab('terms')} className="hover:text-[#D4AF37] transition-colors">
                            {t('legal_terms', 'Публичная оферта')}
                        </button>
                    </div>
                </div>
            </footer>

            <B2BContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
            <LegalModal isOpen={!!legalModalTab} initialTab={legalModalTab} onClose={() => setLegalModalTab(null)} />
        </div>
    );
};

export default RevooB2BV2;
