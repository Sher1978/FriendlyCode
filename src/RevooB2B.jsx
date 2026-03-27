import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useMotionValueEvent } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBrain, 
  faBan, 
  faWaveSquare, 
  faDatabase, 
  faArrowRight,
  faChartLine,
  faMicrochip,
  faShieldHalved,
  faCheck,
  faXmark,
  faBolt,
  faHandPointer,
  faMagic,
  faRobot,
  faTriangleExclamation
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PngBattery from './PngBattery';
import LanguageSelector from './LanguageSelector';
import B2BContactModal from './B2BContactModal';


const RevooB2B = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [scrolled, setScrolled] = useState(false);
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [animationCycle, setAnimationCycle] = useState(1); // 1 = Bounce, 2 = Pass
    const [activeCardIdx, setActiveCardIdx] = useState(0);
    const [swipedCards, setSwipedCards] = useState([]); // Stack for swiped-out cards
    // Battery Simulation Showcase (Cycles 100 -> 50 -> 25 -> 10)
    const [batteryDiscount, setBatteryDiscount] = useState(20);
    const [displayEnergy, setDisplayEnergy] = useState(100);

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
        }, 3000); // 3 seconds per state = 12 seconds for full 4-state cycle

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            setActiveCardIdx((prev) => (prev + 1) % 3);
        }, 5000); // Auto-scroll every 5 seconds
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Timer logic to toggle Mario animation cycles
    useEffect(() => {
        const interval = setInterval(() => {
            setAnimationCycle(prev => (prev === 1 ? 2 : 1));
        }, 8000);
        return () => clearInterval(interval);
    }, []);

    // Helper: Fade in Up Animation
    const fadeInUp = {
        hidden: { opacity: 0, y: 40 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
    };

    return (
        <div className="min-h-screen bg-[#000000] text-white font-sans selection:bg-[#D4AF37]/30 overflow-x-hidden">
            
            {/* Ambient OLED Blurs (Dubai Premium Gold/Slate) */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-amber-900/10 blur-[130px] rounded-full" />
                <div className="absolute top-[40%] right-[-10%] w-[600px] h-[600px] bg-[#D4AF37]/10 blur-[150px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[20%] w-[700px] h-[700px] bg-[#FFDF00]/5 blur-[120px] rounded-full" />
            </div>

            {/* Navigation */}
            <nav className={`fixed top-0 left-0 w-full z-50 px-6 py-4 transition-all duration-500 ${scrolled ? 'bg-black/90 backdrop-blur-3xl border-b border-white/5 py-3 shadow-[0_4px_30px_rgba(0,0,0,0.5)]' : ''}`}>
                <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
                    <div className="flex-shrink-0 cursor-pointer flex items-center gap-4" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <img src="/revoo-logo.png" className={`transition-all duration-500 ${scrolled ? 'h-8' : 'h-10'} md:h-12 object-contain mix-blend-screen opacity-90 drop-shadow-[0_0_10px_rgba(212,175,55,0.3)]`} alt="REVOO Logo" />
                        <span className="hidden md:block text-white/40 text-xs md:text-sm font-bold tracking-widest uppercase border-l border-white/20 pl-4">{t('b2b_nav_business')}</span>
                    </div>
                    <div className="flex items-center gap-3 md:gap-6">
                        <LanguageSelector />
                        <button 
                            onClick={() => setIsContactModalOpen(true)}
                            className="bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] text-black px-6 py-2 rounded-full text-xs md:text-sm font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] whitespace-nowrap"
                        >
                            {t('b2b_form_whatsapp_btn')}
                        </button>
                    </div>
                </div>
            </nav>

            {/* SECTION 1: THE HERO (Инженерный хук) */}
            <section className="relative min-h-[90vh] flex items-center pt-32 pb-20 px-6 z-10 border-b border-white/5">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] backdrop-blur-md">
                            <FontAwesomeIcon icon={faMicrochip} />
                            {t('b2b_hero_tag')}
                        </div>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 tracking-tight leading-snug">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37]">{t('b2b_hero_h1')}</span>
                        </h1>
                        <p className="text-base md:text-lg text-white/70 font-medium mb-10 max-w-xl leading-relaxed">
                            {t('b2b_hero_sub_new')}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <motion.button
                                whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(212, 175, 55, 0.4)" }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setIsContactModalOpen(true)}
                                className="bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] text-black px-8 py-4 rounded-full font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                            >
                                {t('b2b_hero_cta_wp')}
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setIsContactModalOpen(true)}
                                className="bg-white/5 backdrop-blur-xl border border-white/10 text-white px-8 py-4 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
                            >
                                {t('b2b_hero_cta_demo')}
                            </motion.button>
                        </div>
                    </motion.div>

                    {/* 3D Realistic Segmented Glass Battery Layer */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className="relative h-[400px] w-full flex items-center justify-center perspective-[1000px]"
                    >
                        {/* Ambient Glow */}
                        <motion.div 
                            className="absolute inset-[20%] rounded-full blur-[100px] z-0 transition-colors duration-300"
                            style={{ backgroundColor: displayEnergy > 50 ? 'rgba(212,175,55,0.3)' : displayEnergy > 20 ? 'rgba(255,204,0,0.3)' : 'rgba(255,59,48,0.3)' }}
                        />

                        {/* PngBattery Container (Horizontal) */}
                        <div className="relative w-full max-w-sm flex flex-col items-center drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] z-20">
                            {/* VIP Status Control Pill */}
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 1, duration: 1 }}
                                className="mb-6 px-5 py-2 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 backdrop-blur-xl shadow-[0_0_15px_rgba(212,175,55,0.1)]"
                            >
                                <span className="text-[10px] md:text-[11px] font-black text-[#D4AF37] uppercase tracking-[0.2em]">
                                    {t('vip_status_control')}
                                </span>
                            </motion.div>
                            <PngBattery discount={batteryDiscount} />
                        </div>

                        {/* HUD Elements */}
                        <motion.div 
                            className="absolute -right-4 md:-right-10 top-20 bg-[#1C1C1E]/80 backdrop-blur-md border border-[#D4AF37]/30 p-4 rounded-xl shadow-2xl flex flex-col gap-1 z-30"
                            animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                        >
                            <span className="text-[#D4AF37] text-[10px] uppercase font-mono tracking-widest">{t('b2b_hud_energy')}</span>
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
                                {displayEnergy === 100 ? t('b2b_status_max') : displayEnergy === 50 ? t('b2b_status_warning') : displayEnergy === 25 ? t('b2b_status_risk') : t('b2b_status_critical')}
                            </motion.span>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* SECTION 2: THE ECONOMIC DIAGNOSIS (Экономика «Дырявого ведра») */}
            <section className="py-24 px-6 relative z-10 border-b border-white/5">
                <div className="max-w-7xl mx-auto text-center mb-16">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-[#FF3B30] text-[10px] font-bold uppercase tracking-widest mb-6"
                    >
                        {t('b2b_diag_tag')}
                    </motion.div>
                    <motion.h2 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-6xl font-black uppercase tracking-tight mb-6 text-white leading-tight"
                    >
                        {t('b2b_diagnosis_h2')}
                    </motion.h2>
                    <p className="text-white/60 text-base md:text-xl max-w-3xl mx-auto font-medium leading-relaxed">
                        {t('b2b_diagnosis_intro')}
                    </p>
                </div>

                <div className="max-w-6xl mx-auto mb-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <motion.div 
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        className="relative rounded-[48px] overflow-hidden bg-black aspect-square flex items-center justify-center p-2 border border-white/5 shadow-2xl group"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/20 via-transparent to-transparent z-0 opacity-40 group-hover:opacity-60 transition-opacity" />
                        <img 
                            src="/leaky-bucket-black.png" 
                            alt="Leaky Bucket Economic Diagnosis" 
                            className="w-full h-full object-cover relative z-10 drop-shadow-[0_20px_60px_rgba(255,59,48,0.2)] scale-110 group-hover:scale-105 transition-transform duration-1000"
                        />
                        {/* Overlay labels */}
                        <div className="absolute top-12 left-12 bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/10 flex flex-col items-center z-20">
                            <span className="text-[#D4AF37] font-black text-xl mb-1">CAC</span>
                            <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest leading-none">{t('b2b_diag_inflow')}</span>
                        </div>
                        <div className="absolute bottom-12 right-12 bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/10 flex flex-col items-center z-20">
                            <span className="text-[#FF3B30] font-black text-xl mb-1">LOST</span>
                            <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest leading-none">{t('b2b_diag_churn')}</span>
                        </div>
                    </motion.div>

                    <div className="flex flex-col gap-8">
                        <div className="p-8 rounded-[40px] bg-white/5 border border-[#00FF41]/20 backdrop-blur-xl relative group hover:bg-[#00FF41]/5 transition-all">
                            <div className="absolute top-6 right-8 text-[#00FF41] font-black text-2xl animate-pulse">90%</div>
                            <h4 className="text-[#00FF41] text-2xl font-black mb-1 leading-none uppercase">{t('b2b_diag_retained_title')}</h4>
                            <p className="text-white/40 text-[11px] uppercase font-bold tracking-[0.2em] mb-4 italic">{t('b2b_diag_retained_sub')}</p>
                            <p className="text-white/70 text-base leading-relaxed font-medium">{t('b2b_diag_retained_text')}</p>
                        </div>

                        <div className="p-8 rounded-[40px] bg-white/5 border border-red-500/20 backdrop-blur-xl relative group hover:bg-red-500/5 transition-all">
                            <div className="absolute top-6 right-8 text-[#FF3B30] font-black text-2xl">83%</div>
                            <h4 className="text-[#FF3B30] text-2xl font-black mb-1 leading-none uppercase">{t('b2b_diag_lost_title')}</h4>
                            <p className="text-white/40 text-[11px] uppercase font-bold tracking-[0.2em] mb-4 italic">{t('b2b_diag_lost_sub')}</p>
                            <p className="text-white/70 text-base leading-relaxed font-medium">{t('b2b_diag_lost_text')}</p>
                        </div>
                    </div>
                </div>

                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    className="mt-16 max-w-3xl mx-auto p-8 rounded-[32px] bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 backdrop-blur-xl flex items-center gap-6 shadow-[0_0_50px_rgba(212,175,55,0.1)] relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
                    <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 text-xl shadow-[0_0_20px_rgba(212,175,55,0.2)]">
                        <FontAwesomeIcon icon={faTriangleExclamation} />
                    </div>
                    <div className="text-left">
                        <span className="block text-[10px] font-black uppercase tracking-[0.3em] text-amber-500/60 mb-1">{t('b2b_diag_attention')}</span>
                        <p className="text-white text-lg md:text-xl font-bold leading-tight tracking-tight">
                            {t('b2b_diag_footer_stop_leakage')}
                        </p>
                    </div>
                </motion.div>
            </section>

            {/* SECTION 3: THE DISSERTATION (Научное обоснование - iOS 26 Detailed Style) */}
            <section className="py-32 px-6 relative z-10 border-b border-white/5 scroll-mt-20" id="science">
                <div className="max-w-7xl mx-auto text-center mb-24">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-[10px] font-bold uppercase tracking-widest mb-6"
                    >
                        {t('b2b_science_tag')}
                    </motion.div>
                    <motion.h2 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-6xl font-black uppercase tracking-tight mb-8 text-white"
                    >
                        Наш успех основан на научных исследованиях
                    </motion.h2>
                    <p className="text-white/50 text-base md:text-xl max-w-4xl mx-auto font-medium leading-relaxed">
                        Почему традиционные системы лояльности (приложения и карточки) мертвы? Потому что они создают Neural Friction (нейронное трение). Мы используем когнитивную инженерию для взлома привычек.
                    </p>
                </div>

                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* 1. Loss Aversion (Kahneman) */}
                    <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        className="bg-[#1C1C1E]/50 rounded-[56px] p-8 md:p-12 border border-white/5 backdrop-blur-3xl overflow-hidden relative flex flex-col gap-8 group"
                    >
                        <div className="flex flex-col h-full">
                            <div className="text-[#D4AF37] text-xs font-black uppercase tracking-[0.3em] mb-4">{t('b2b_science_pillar_1')}</div>
                            <h3 className="text-2xl md:text-3xl font-black text-white mb-4 uppercase leading-tight">{t('b2b_science_pillar_1_title')}</h3>
                            <p className="text-white/60 text-base leading-relaxed mb-6 italic border-l-2 border-[#D4AF37] pl-6">
                                "{t('b2b_science_pillar_1_quote')}"
                            </p>
                            <p className="text-white/80 text-sm md:text-base leading-relaxed mb-8">
                                {t('b2b_science_pillar_1_text')}
                            </p>
                            
                            {/* Schematic Balance visual */}
                            <div className="mt-auto h-48 bg-black/40 rounded-[32px] border border-white/5 flex items-center justify-center relative overflow-hidden p-6 group-hover:border-[#D4AF37]/30 transition-colors">
                                <svg viewBox="0 0 200 100" className="w-full h-full opacity-60">
                                    <line x1="20" y1="80" x2="180" y2="80" stroke="white" strokeWidth="1" strokeDasharray="4 4" />
                                    <motion.path 
                                        d="M100,80 L60,30" 
                                        stroke="#FF3B30" strokeWidth="3" 
                                        initial={{ pathLength: 0 }}
                                        whileInView={{ pathLength: 1 }}
                                        transition={{ duration: 1.5 }}
                                    />
                                    <motion.path 
                                        d="M100,80 L140,55" 
                                        stroke="#D4AF37" strokeWidth="3" 
                                        initial={{ pathLength: 0 }}
                                        whileInView={{ pathLength: 1 }}
                                        transition={{ duration: 1.5, delay: 0.5 }}
                                    />
                                    <circle cx="100" cy="80" r="4" fill="white" />
                                    <text x="50" y="20" fill="#FF3B30" fontSize="10" fontWeight="black" className="uppercase tracking-widest">{t('b2b_diag_lost_title')} (x2)</text>
                                    <text x="135" y="45" fill="#D4AF37" fontSize="10" fontWeight="black" className="uppercase tracking-widest">{t('b2b_diag_retained_title')} (x1)</text>
                                </svg>
                            </div>
                        </div>
                    </motion.div>

                    {/* 2. The Hook Model (Nir Eyal) */}
                    <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-[#1C1C1E]/50 rounded-[56px] p-8 md:p-12 border border-white/5 backdrop-blur-3xl overflow-hidden relative flex flex-col gap-8 group"
                    >
                        <div className="flex flex-col h-full">
                            <div className="text-[#D4AF37] text-xs font-black uppercase tracking-[0.3em] mb-4">{t('b2b_science_pillar_2')}</div>
                            <h3 className="text-2xl md:text-3xl font-black text-white mb-4 uppercase leading-tight">{t('b2b_science_pillar_2_title')}</h3>
                            <div className="space-y-4 mb-8">
                                {[
                                    { label: t('b2b_science_pillar_2_step_1_label'), desc: t('b2b_science_pillar_2_step_1_desc') },
                                    { label: t('b2b_science_pillar_2_step_2_label'), desc: t('b2b_science_pillar_2_step_2_desc') },
                                    { label: t('b2b_science_pillar_2_step_3_label'), desc: t('b2b_science_pillar_2_step_3_desc') },
                                    { label: t('b2b_science_pillar_2_step_4_label'), desc: t('b2b_science_pillar_2_step_4_desc') }
                                ].map((step, i) => (
                                    <div key={i} className="flex gap-4 items-center bg-white/5 p-3 rounded-2xl border border-white/5 group-hover:bg-white/10 transition-colors">
                                        <span className="text-[#D4AF37] font-black text-xs w-4">{i+1}</span>
                                        <div className="flex flex-col">
                                            <span className="text-white font-bold text-xs uppercase tracking-wide">{step.label}</span>
                                            <span className="text-white/40 text-[10px] uppercase font-bold tracking-tight">{step.desc}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Schematic Circle visual */}
                            <div className="mt-auto h-48 bg-black/40 rounded-[32px] border border-white/5 flex items-center justify-center relative p-4 group-hover:border-[#D4AF37]/30 transition-colors overflow-hidden">
                                <svg viewBox="0 0 100 100" className="h-full">
                                    <circle cx="50" cy="50" r="35" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                                    <motion.circle 
                                        cx="50" cy="50" r="35" 
                                        fill="none" stroke="#D4AF37" strokeWidth="2" 
                                        strokeDasharray="54.95 219.8"
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                                    />
                                    <g className="text-[4px] font-black uppercase fill-white/20">
                                        <text x="50" y="22" textAnchor="middle">Trigger</text>
                                        <text x="78" y="50" textAnchor="middle" transform="rotate(90 78,50)">Action</text>
                                        <text x="50" y="78" textAnchor="middle">Reward</text>
                                        <text x="22" y="50" textAnchor="middle" transform="rotate(-90 22,50)">Invest</text>
                                    </g>
                                    <circle cx="50" cy="15" r="2" fill="#D4AF37" className="animate-pulse" />
                                </svg>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-[#1C1C1E]/50 rounded-[56px] p-8 md:p-12 border border-white/5 backdrop-blur-3xl overflow-hidden relative flex flex-col gap-8 group"
                    >
                        <div className="flex flex-col h-full">
                            <div className="text-[#D4AF37] text-xs font-black uppercase tracking-[0.3em] mb-4">{t('b2b_science_pillar_3')}</div>
                            <h3 className="text-2xl md:text-3xl font-black text-white mb-4 uppercase leading-tight">{t('b2b_science_pillar_3_title')}</h3>
                            <p className="text-white/80 text-sm md:text-base leading-relaxed mb-8">
                                {t('b2b_science_pillar_3_text')}
                            </p>
                            
                            {/* Schematic Spike visual */}
                            <div className="mt-auto h-48 bg-black/40 rounded-[32px] border border-white/5 flex items-center justify-center p-8 group-hover:border-[#D4AF37]/30 transition-colors">
                                <svg viewBox="0 0 200 60" className="w-full h-full overflow-visible">
                                    <motion.path 
                                        d="M0,45 L40,45 L50,10 L65,50 L85,45 L115,45 L125,5 L145,55 L170,45 L200,45" 
                                        fill="none" stroke="#D4AF37" strokeWidth="2"
                                        initial={{ pathLength: 0 }}
                                        whileInView={{ pathLength: 1 }}
                                        transition={{ duration: 2 }}
                                    />
                                    <circle cx="50" cy="10" r="3" fill="#00FF41" className="animate-ping" />
                                    <circle cx="125" cy="5" r="3" fill="#00FF41" className="animate-ping" />
                                    <text x="135" y="10" fill="#00FF41" fontSize="8" fontWeight="black" className="uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">{t('b2b_science_pillar_3').split('. ')[1]}</text>
                                </svg>
                            </div>
                        </div>
                    </motion.div>

                    {/* 4. Zero Friction (Fogg Model) */}
                    <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-[#1C1C1E]/50 rounded-[56px] p-8 md:p-12 border border-white/5 backdrop-blur-3xl overflow-hidden relative flex flex-col gap-8 group"
                    >
                        <div className="flex flex-col h-full">
                            <div className="text-[#D4AF37] text-xs font-black uppercase tracking-[0.3em] mb-4">{t('b2b_science_pillar_4')}</div>
                            <h3 className="text-2xl md:text-3xl font-black text-white mb-4 uppercase leading-tight">{t('b2b_science_pillar_4_title')}</h3>
                            <p className="text-white/80 text-sm md:text-base leading-relaxed mb-8">
                                {t('b2b_science_pillar_4_text')}
                            </p>
                            
                            {/* Specific Mario Bounce SVG (Yellow Line, Green Ball, P-Block) */}
                            <div className="mt-auto h-48 bg-black/40 rounded-[32px] border border-white/5 flex items-center justify-center p-4 group-hover:border-yellow-500/30 transition-colors overflow-hidden relative">
                                <svg viewBox="0 0 200 80" className="w-full h-full">
                                    {/* Yellow Floor Line */}
                                    <line x1="10" y1="66" x2="190" y2="66" stroke="#FACC15" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 4" className="opacity-30" />
                                    <line x1="10" y1="66" x2="190" y2="66" stroke="#FACC15" strokeWidth="0.5" strokeLinecap="round" />

                                    {/* P-Shaped Block (Barrier) - Moved to the Right */}
                                    <motion.g 
                                        initial={{ x: 150, y: 26 }}
                                        animate={{ y: animationCycle === 2 ? 80 : 26 }}
                                        transition={{ 
                                            duration: 0.5, 
                                            type: "spring",
                                            stiffness: 100,
                                            delay: animationCycle === 2 ? 1.5 : 0 
                                        }}
                                    >
                                        <rect width="20" height="40" fill="#1C1C1E" stroke="#FF3B30" strokeWidth="1" rx="2" />
                                        <rect x="4" y="4" width="12" height="12" fill="none" stroke="#FF3B30" strokeWidth="0.5" strokeOpacity="0.5" rx="1" />
                                        <text x="10" y="30" fill="#FF3B30" fontSize="8" fontWeight="black" textAnchor="middle" className="uppercase font-mono">P</text>
                                    </motion.g>

                                    {/* Green Bouncing Ball */}
                                    <motion.circle 
                                        key={animationCycle}
                                        r="6" 
                                        fill="#4ADE80" 
                                        stroke="#14532D" 
                                        strokeWidth="1"
                                        animate={animationCycle === 1 ? { 
                                            cx: [20, 50, 80, 110, 140, 150, 140, 110, 80, 50, 20],
                                            cy: [60, 30, 60, 30, 60, 30, 60, 30, 60, 30, 60],
                                        } : {
                                            cx: [20, 50, 80, 110, 140, 170, 190],
                                            cy: [60, 30, 60, 30, 60, 30, 60],
                                        }}
                                        transition={{ 
                                            duration: animationCycle === 1 ? 4 : 2, // 2x speedup (was 8/4)
                                            repeat: animationCycle === 1 ? Infinity : 0, 
                                            ease: "linear"
                                        }}
                                    />

                                    {/* Labels */}
                                    <text x="20" y="15" fill="white" fillOpacity="0.2" fontSize="5" fontWeight="black" className="uppercase tracking-[0.2em] font-mono">
                                        {animationCycle === 1 ? "Trajectory: REJECTED" : "Trajectory: UNLOCKED"}
                                    </text>
                                    <text x="170" y="75" fill={animationCycle === 1 ? "#FF3B30" : "#00FF41"} fontSize="6" fontWeight="black" textAnchor="middle" className="uppercase tracking-widest font-mono">
                                        {animationCycle === 1 ? "BARRIER" : "SUCCESS"}
                                    </text>
                                </svg>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* SECTION 3.5: ZERO FRICTION FLOW (Customer Path Timeline) */}
            <section className="py-32 px-6 relative z-10 border-b border-white/5 bg-black/40 overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-24">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00FF41]/10 border border-[#00FF41]/20 text-[#00FF41] text-[10px] font-bold uppercase tracking-widest mb-6"
                        >
                            {t('b2b_path_tag')}
                        </motion.div>
                        <motion.h2 
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            className="text-4xl md:text-7xl font-black uppercase tracking-tighter mb-4 text-white"
                        >
                            {t('b2b_path_h2')}
                        </motion.h2>
                        <p className="text-white/40 text-sm md:text-lg font-bold uppercase tracking-[0.2em]">{t('b2b_path_sub')}</p>
                    </div>

                    {/* Timeline Path Schematic */}
                    <div className="relative max-w-4xl mx-auto">
                        {/* Central Line */}
                        <div className="absolute left-1/2 top-0 w-px h-full bg-gradient-to-b from-[#00FF41]/0 via-[#00FF41]/20 to-[#00FF41]/0 hidden md:block" />
                        
                        <div className="space-y-16">
                            {[
                                {
                                    step: "01",
                                    title: t('b2b_path_step_1_title'),
                                    subtitle: t('b2b_path_step_1_label'),
                                    text: t('b2b_path_step_1_text'),
                                    icon: faHandPointer,
                                    side: "left"
                                },
                                {
                                    step: "02",
                                    title: t('b2b_path_step_2_title'),
                                    subtitle: t('b2b_path_step_2_label'),
                                    text: t('b2b_path_step_2_text'),
                                    icon: faMagic,
                                    side: "right"
                                },
                                {
                                    step: "03",
                                    title: t('b2b_path_step_3_title'),
                                    subtitle: t('b2b_path_step_3_label'),
                                    text: t('b2b_path_step_3_text'),
                                    icon: faRobot,
                                    side: "left"
                                }
                            ].map((item, i) => (
                                <motion.div 
                                    key={i}
                                    initial={{ opacity: 0, x: item.side === "left" ? -50 : 50 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    className={`relative flex flex-col md:flex-row items-center gap-8 ${item.side === "right" ? "md:flex-row-reverse" : ""}`}
                                >
                                    {/* Point on timeline */}
                                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-black border-2 border-[#00FF41] z-20 hidden md:block shadow-[0_0_15px_rgba(0,255,65,0.5)]" />
                                    
                                    {/* Content Card */}
                                    <div className="w-full md:w-[45%] bg-white/5 backdrop-blur-3xl border border-white/5 p-10 rounded-[48px] shadow-2xl relative group hover:border-[#00FF41]/20 transition-all overflow-hidden">
                                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                            <FontAwesomeIcon icon={item.icon} className="text-8xl text-[#00FF41]" />
                                        </div>
                                        <div className="flex justify-between items-center mb-6">
                                            <span className="text-[#00FF41] font-black uppercase text-[10px] tracking-widest bg-[#00FF41]/10 px-3 py-1 rounded-full">{t('b2b_path_step')} {item.step}</span>
                                            <FontAwesomeIcon icon={item.icon} className="text-[#00FF41] text-xl" />
                                        </div>
                                        <h3 className="text-xl md:text-2xl font-black text-white uppercase leading-tight mb-4">{item.title}</h3>
                                        <div className="space-y-1">
                                            <span className="text-[#00FF41] font-bold text-xs uppercase tracking-wider">{item.subtitle}</span>
                                            <p className="text-white/70 text-base leading-relaxed font-medium">
                                                {item.text}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION 4: THE TECHNOLOGY (Архитектура REVOO) */}
            <section className="py-24 px-6 relative z-10 border-b border-white/5">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-16 items-center">
                    <motion.div 
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="flex-1 text-left"
                    >
                        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-6">{t('b2b_tech_h2')}</h2>
                        <p className="text-white/70 text-base md:text-lg font-medium mb-8 leading-relaxed max-w-xl">
                            {t('b2b_tech_sub')}
                        </p>
                        <ul className="grid grid-cols-1 gap-8">
                            <li className="flex items-start gap-4">
                                <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-[rgba(0,255,65,0.3)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] flex items-center justify-center text-[#00FF41] font-black text-xs shrink-0 pt-[2px]">1</div>
                                <div>
                                    <h4 className="text-white font-bold uppercase mb-1 tracking-widest text-xs md:text-sm">{t('b2b_tech_segments_title')}</h4>
                                    <p className="text-white/50 text-xs md:text-sm">{t('b2b_tech_segments_text')}</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-4">
                                <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-[rgba(255,59,48,0.3)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] flex items-center justify-center text-[#ff3b30] font-black text-xs shrink-0 pt-[2px]">2</div>
                                <div>
                                    <h4 className="text-white font-bold uppercase mb-1 tracking-widest text-xs md:text-sm">{t('b2b_tech_melting_title')}</h4>
                                    <p className="text-white/50 text-xs md:text-sm">{t('b2b_tech_melting_text')}</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-4">
                                <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-[rgba(59,130,246,0.3)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] flex items-center justify-center text-blue-500 font-black text-xs shrink-0 pt-[2px]">3</div>
                                <div>
                                    <h4 className="text-white font-bold uppercase mb-1 tracking-widest text-xs md:text-sm">{t('b2b_tech_wallet_title')}</h4>
                                    <p className="text-white/50 text-xs md:text-sm">{t('b2b_tech_wallet_text')}</p>
                                </div>
                            </li>
                        </ul>
                    </motion.div>
                    
                    <motion.div 
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="flex-1 relative w-full h-[400px] bg-[#1C1C1E] rounded-3xl border border-white/10 overflow-hidden flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                    >
                         {/* Abstract Code/HUD Visual */}
                         <div className="absolute inset-0 bg-black/50" />
                         <div className="absolute top-4 left-4 flex gap-2">
                             <div className="w-3 h-3 rounded-full bg-red-500/50" />
                             <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                             <div className="w-3 h-3 rounded-full bg-green-500/50" />
                         </div>
                         <div className="text-[#00FF41] font-mono text-xs opacity-70 p-8 w-full">
                             {`const batteryState = useSync();\nif (daysSinceLastVisit > threshold) {\n  applyMeltingLogic();\n  triggerLossAversionHook();\n}\nreturn <WalletPass state={active} />;`}
                         </div>
                    </motion.div>
                </div>
            </section>

            {/* SECTION 5: THE MATRIX (Сравнительный анализ) */}
            <section className="py-24 px-6 relative z-10 border-b border-white/5">
                <div className="max-w-5xl mx-auto">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="text-center mb-12"
                    >
                         <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-4">{t('b2b_matrix_h2')}</h2>
                         <p className="text-white/60 text-sm md:text-base font-medium max-w-2xl mx-auto">{t('b2b_matrix_sub')}</p>
                    </motion.div>

                    <div className="relative">
                        {/* Mobile: Swipable Card Stack | Desktop: 3-Column Grid */}
                        <div className="hidden md:grid md:grid-cols-3 gap-6">
                            {[
                                {
                                    id: 'revoo',
                                    title: "REVOO",
                                    subtitle: "Maximum Energy",
                                    icon: "⚡",
                                    isPremium: true,
                                    features: [
                                        { label: t('b2b_matrix_friction'), value: t('b2b_matrix_val_revoo_friction'), status: 'positive' },
                                        { label: t('b2b_matrix_hook'), value: t('b2b_matrix_val_revoo_hook'), status: 'positive' },
                                        { label: t('b2b_matrix_integration'), value: t('b2b_matrix_val_revoo_integration'), status: 'positive' },
                                        { label: t('b2b_matrix_data'), value: t('b2b_matrix_val_revoo_data'), status: 'positive' },
                                    ]
                                },
                                {
                                    id: 'stamps',
                                    title: "PAPER CARDS",
                                    subtitle: "Low Retention",
                                    icon: "🏷️",
                                    isPremium: false,
                                    features: [
                                        { label: t('b2b_matrix_friction'), value: t('b2b_matrix_val_friction_paper'), status: 'neutral' },
                                        { label: t('b2b_matrix_hook'), value: t('b2b_matrix_val_hook_paper'), status: 'negative' },
                                        { label: t('b2b_matrix_integration'), value: t('b2b_matrix_val_int_paper'), status: 'negative' },
                                        { label: t('b2b_matrix_data'), value: t('b2b_matrix_val_data_paper'), status: 'negative' },
                                    ]
                                },
                                {
                                    id: 'apps',
                                    title: "APP SOLUTIONS",
                                    subtitle: "High Friction",
                                    icon: "📱",
                                    isPremium: false,
                                    features: [
                                        { label: t('b2b_matrix_friction'), value: t('b2b_matrix_val_friction_apps'), status: 'negative' },
                                        { label: t('b2b_matrix_hook'), value: t('b2b_matrix_val_hook_apps'), status: 'negative' },
                                        { label: t('b2b_matrix_integration'), value: t('b2b_matrix_val_int_apps'), status: 'negative' },
                                        { label: t('b2b_matrix_data'), value: t('b2b_matrix_val_data_apps'), status: 'negative' },
                                    ]
                                }
                            ].map((card, idx) => (
                                <div 
                                    key={idx} 
                                    className={`relative overflow-hidden transition-all hover:translate-y-[-8px] p-8 flex flex-col gap-8 rounded-3xl border border-white/10
                                        ${card.isPremium ? 'bg-[#00FF41]/10 border-[#00FF41]/30 shadow-[0_0_40px_rgba(0,255,65,0.1)]' : 'bg-white/5 backdrop-blur-xl'}
                                    `}
                                >
                                    {/* Schematic Battery for REVOO Card */}
                                    {card.id === 'revoo' && (

                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-32 bg-black border border-[#00FF41]/20 rounded-md overflow-hidden flex flex-col-reverse p-0.5 opacity-40">
                                                <motion.div 
                                                    animate={{ height: ['20%', '100%', '20%'] }} 
                                                    transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                                                    className="w-full bg-[#00FF41] shadow-[0_0_10px_rgba(0,255,65,0.5)] rounded-sm"
                                                />
                                            </div>
                                    )}

                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${card.isPremium ? 'bg-[#00FF41]/20' : 'bg-white/10'}`}>
                                            {card.icon}
                                        </div>
                                        <div>
                                            <h4 className={`font-black uppercase tracking-tight ${card.isPremium ? 'text-[#00FF41]' : 'text-white'}`}>{card.title}</h4>
                                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">{card.subtitle}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4 relative z-10">
                                        {card.features.map((feat, fIdx) => (
                                            <div key={fIdx} className="p-4 rounded-2xl bg-black/20 border border-white/5 flex flex-col gap-1">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{feat.label}</span>
                                                    <span>
                                                        {feat.status === 'positive' ? '✅' : feat.status === 'negative' ? '❌' : '⛔'}
                                                    </span>
                                                </div>
                                                <p className={`text-xs md:text-sm font-bold leading-tight ${card.isPremium ? 'text-white' : 'text-white/60'}`}>
                                                    {feat.value}
                                                </p>
                                            </div>
                                        ))}
                                    </div>

                                    {card.isPremium && (
                                        <div className="mt-auto pt-4 relative z-10">
                                            <div className="bg-[#00FF41]/10 rounded-2xl p-4 border border-[#00FF41]/20 text-center">
                                                <span className="text-[10px] font-black text-[#00FF41] uppercase tracking-[0.2em]">Competitive Advantage: 10x</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>


                        {/* Mobile Stack: Swipable Deck */}
                        <div className="md:hidden relative mt-24 h-[600px] w-full flex items-center justify-center perspective-[1000px]">
                            {[
                                {
                                    id: 'revoo',
                                    title: "REVOO",
                                    subtitle: "Maximum Energy",
                                    icon: "⚡",
                                    isPremium: true,
                                    features: [
                                        { label: t('b2b_matrix_friction'), value: t('b2b_matrix_val_revoo_friction'), status: 'positive' },
                                        { label: t('b2b_matrix_hook'), value: t('b2b_matrix_val_revoo_hook'), status: 'positive' },
                                        { label: t('b2b_matrix_integration'), value: t('b2b_matrix_val_revoo_integration'), status: 'positive' },
                                        { label: t('b2b_matrix_data'), value: t('b2b_matrix_val_revoo_data'), status: 'positive' },
                                    ]
                                },
                                {
                                    id: 'stamps',
                                    title: "PAPER CARDS",
                                    subtitle: "Low Retention",
                                    icon: "🏷️",
                                    isPremium: false,
                                    features: [
                                        { label: t('b2b_matrix_friction'), value: t('b2b_matrix_val_friction_paper'), status: 'neutral' },
                                        { label: t('b2b_matrix_hook'), value: t('b2b_matrix_val_hook_paper'), status: 'negative' },
                                        { label: t('b2b_matrix_integration'), value: t('b2b_matrix_val_int_paper'), status: 'negative' },
                                        { label: t('b2b_matrix_data'), value: t('b2b_matrix_val_data_paper'), status: 'negative' },
                                    ]
                                },
                                {
                                    id: 'apps',
                                    title: "APP SOLUTIONS",
                                    subtitle: "High Friction",
                                    icon: "📱",
                                    isPremium: false,
                                    features: [
                                        { label: t('b2b_matrix_friction'), value: t('b2b_matrix_val_friction_apps'), status: 'negative' },
                                        { label: t('b2b_matrix_hook'), value: t('b2b_matrix_val_hook_apps'), status: 'negative' },
                                        { label: t('b2b_matrix_integration'), value: t('b2b_matrix_val_int_apps'), status: 'negative' },
                                        { label: t('b2b_matrix_data'), value: t('b2b_matrix_val_data_apps'), status: 'negative' },
                                    ]
                                }
                            ].map((card, idx) => (
                                <motion.div 
                                    key={idx}
                                    drag="x"
                                    dragConstraints={{ left: 0, right: 0 }}
                                    onDragEnd={(_, info) => {
                                        if (info.offset.x < -100) {
                                            // Swipe Left: Move to bottom of stack
                                            setActiveCardIdx((prev) => (prev + 1) % 3);
                                        } else if (info.offset.x > 100) {
                                            // Swipe Right: Move previous card back to top
                                            setActiveCardIdx((prev) => (prev - 1 + 3) % 3);
                                        }
                                    }}
                                    animate={{ 
                                        x: (idx - activeCardIdx + 3) % 3 === 0 ? 0 : (idx - activeCardIdx + 3) % 3 === 1 ? 20 : 40,
                                        y: (idx - activeCardIdx + 3) % 3 === 0 ? 0 : (idx - activeCardIdx + 3) % 3 === 1 ? 10 : 20,
                                        scale: (idx - activeCardIdx + 3) % 3 === 0 ? 1 : 0.95,
                                        zIndex: 3 - ((idx - activeCardIdx + 3) % 3),
                                        opacity: 1
                                    }}
                                    className={`absolute w-[85vw] p-8 flex flex-col gap-8 shadow-2xl touch-none overflow-hidden rounded-3xl border border-white/10
                                        ${card.isPremium ? 'bg-black border-[#00FF41]/30 text-[#00FF41]' : 'bg-white/5 backdrop-blur-xl text-white'}
                                    `}
                                >
                                    {/* Schematic Battery for REVOO Card */}
                                    {card.id === 'revoo' && (

                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-32 bg-black border border-[#00FF41]/20 rounded-md overflow-hidden flex flex-col-reverse p-0.5 opacity-30">
                                                <motion.div 
                                                    animate={{ height: ['20%', '100%', '20%'] }} 
                                                    transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                                                    className="w-full bg-[#00FF41] shadow-[0_0_10px_rgba(0,255,65,0.5)] rounded-sm"
                                                />
                                            </div>
                                    )}

                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${card.isPremium ? 'bg-[#00FF41]/20' : 'bg-white/10'}`}>
                                            {card.icon}
                                        </div>
                                        <div>
                                            <h4 className={`font-black uppercase tracking-tight ${card.isPremium ? '' : 'text-white'}`}>{card.title}</h4>
                                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">{card.subtitle}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4 relative z-10">
                                        {card.features.map((feat, fIdx) => (
                                            <div key={fIdx} className="p-4 rounded-2xl bg-black/20 border border-white/5 flex flex-col gap-1">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{feat.label}</span>
                                                    <span>
                                                        {feat.status === 'positive' ? '✅' : feat.status === 'negative' ? '❌' : '⛔'}
                                                    </span>
                                                </div>
                                                <p className={`text-xs font-bold leading-tight ${card.isPremium ? 'text-white' : 'text-white/60'}`}>
                                                    {feat.value}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="mt-auto text-center text-[10px] text-white/20 font-bold uppercase tracking-widest relative z-10">
                                        {t('swipe_hint', 'Swipe to explore')}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION 6: BUSINESS ANALYTICS */}
            <section className="py-24 px-6 relative z-10 border-b border-white/5 bg-[#1C1C1E]/30">
                <div className="max-w-7xl mx-auto text-center mb-16">
                    <motion.h2 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-4"
                    >
                        {t('b2b_analytics_h2')}
                    </motion.h2>
                    <p className="text-white/60 text-base md:text-lg max-w-3xl mx-auto font-medium">
                        {t('b2b_analytics_sub')}
                    </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    {[
                        { icon: faChartLine, title: t('b2b_analytics_velocity_title'), text: t('b2b_analytics_velocity_text') },
                        { icon: faDatabase, title: t('b2b_analytics_bot_title'), text: t('b2b_analytics_bot_text') },
                        { icon: faShieldHalved, title: t('b2b_analytics_ai_title'), text: t('b2b_analytics_ai_text') }
                    ].map((item, idx) => (
                        <div key={idx} className="bg-white/5 backdrop-blur-2xl border border-[rgba(0,255,65,0.15)] p-8 rounded-3xl flex flex-col items-center text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] hover:border-[#00FF41]/40 transition-all group">
                            {/* Glass Orb Container for Icons */}
                            <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] group-hover:bg-[#00FF41]/20 transition-all">
                                <FontAwesomeIcon icon={item.icon} className="text-2xl text-[#00FF41]" />
                            </div>
                            <h4 className="text-base font-black uppercase text-white mb-2 tracking-tight">{item.title}</h4>
                            <p className="text-white/50 text-xs md:text-sm leading-relaxed">{item.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* SECTION 6.5: ADDITIONAL TOOLS FOR OWNERS */}
            <section className="py-24 px-6 relative z-10 border-b border-white/5 bg-black">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <motion.h2 
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-4"
                        >
                            {t('b2b_tools_h2')}
                        </motion.h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                        {/* CRM Tool */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            className="bg-white/5 backdrop-blur-3xl border border-white/10 p-10 rounded-[48px] relative group hover:border-[#00FF41]/30 transition-all overflow-hidden"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-[#00FF41]/10 flex items-center justify-center text-[#00FF41] text-3xl mb-8 group-hover:scale-110 transition-transform">
                                <FontAwesomeIcon icon={faRobot} />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase mb-4 tracking-tight">{t('b2b_tools_crm_title')}</h3>
                            <p className="text-white/60 text-lg leading-relaxed font-medium">
                                {t('b2b_tools_crm_text')}
                            </p>
                        </motion.div>

                        {/* Google Reviews Tool */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white/5 backdrop-blur-3xl border border-white/10 p-10 rounded-[48px] relative group hover:border-[#00FF41]/30 transition-all overflow-hidden"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-white text-3xl mb-8 group-hover:scale-110 transition-transform">
                                <span className="font-bold">G</span>
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase mb-4 tracking-tight">{t('b2b_tools_reviews_title')}</h3>
                            <p className="text-white/60 text-lg leading-relaxed font-medium">
                                {t('b2b_tools_reviews_text')}
                            </p>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* SECTION 7: THE ZERO-RISK GUARANTEE */}
            <section className="py-32 px-6 relative z-10">
                <div className="max-w-4xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="bg-white/5 backdrop-blur-3xl border border-[rgba(212,175,55,0.4)] p-8 md:p-16 lg:p-20 rounded-[40px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_20px_60px_rgba(212,175,55,0.15)] relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-[#D4AF37]/5 animate-pulse" />
                        
                        <h2 className="text-2xl md:text-4xl lg:text-5xl font-black uppercase tracking-tight mb-6 text-white relative z-10 leading-tight">
                            {t('b2b_guarantee_h2')}
                        </h2>
                        <p className="text-white/70 text-base md:text-lg font-medium mb-10 max-w-2xl mx-auto relative z-10 leading-relaxed">
                            {t('b2b_guarantee_text')}
                        </p>
                        <motion.button
                            whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(212, 175, 55, 0.4)" }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsContactModalOpen(true)}
                            className="bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] text-black px-10 py-5 rounded-full font-black text-sm md:text-base uppercase tracking-[0.2em] relative z-10 w-full md:w-auto shadow-[0_0_20px_rgba(212,175,55,0.2)] hover:shadow-[0_0_40px_rgba(212,175,55,0.4)]"
                        >
                            {t('b2b_final_cta')}
                        </motion.button>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-white/5 bg-black relative z-10">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <img src="/revoo-logo.png" className="h-6 mx-auto mix-blend-screen opacity-50 mb-4" alt="REVOO Logo" />
                    <div className="text-xs font-black uppercase tracking-tighter italic text-[#D4AF37]/40 mb-2">{t('b2b_nav_business')}</div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/30">{t('b2b_canvas_footer')} © 2026</div>
                </div>
            </footer>

            <B2BContactModal 
                isOpen={isContactModalOpen} 
                onClose={() => setIsContactModalOpen(false)} 
            />
        </div>
    );
};

export default RevooB2B;
