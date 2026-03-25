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
  faXmark
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
        }, 3500); // 3.5 seconds per state gives enough time to see the animation

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
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
                        <span className="hidden md:block text-white/40 text-xs md:text-sm font-bold tracking-widest uppercase border-l border-white/20 pl-4">FOR BUSINESS</span>
                    </div>
                    <div className="flex items-center gap-3 md:gap-6">
                        <LanguageSelector />
                        <button 
                            onClick={() => setIsContactModalOpen(true)}
                            className="bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] text-black px-6 py-2 rounded-full text-xs md:text-sm font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] whitespace-nowrap"
                        >
                            WhatsApp
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
                            The Architecture of Profitability
                        </div>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 tracking-tight leading-snug uppercase">
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
                                onClick={() => navigate('/qr?id=demo')}
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
                            <PngBattery discount={batteryDiscount} />
                        </div>

                        {/* HUD Elements */}
                        <motion.div 
                            className="absolute -right-4 md:-right-10 top-20 bg-[#1C1C1E]/80 backdrop-blur-md border border-[#D4AF37]/30 p-4 rounded-xl shadow-2xl flex flex-col gap-1 z-30"
                            animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                        >
                            <span className="text-[#D4AF37] text-[10px] uppercase font-mono tracking-widest">Energy Flow</span>
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
                                {displayEnergy === 100 ? 'Max Retention' : displayEnergy === 50 ? 'Warning: Decay' : displayEnergy === 25 ? 'High Risk' : 'Critical Loss'}
                            </motion.span>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* SECTION 2: THE ECONOMIC DIAGNOSIS (Экономика «Дырявого ведра») */}
            <section className="py-24 px-6 relative z-10 border-b border-white/5">
                <div className="max-w-7xl mx-auto text-center mb-16">
                    <motion.h2 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-4 text-[#FF3B30]"
                    >
                        {t('b2b_diagnosis_h2')}
                    </motion.h2>
                    <p className="text-white/60 text-base md:text-lg max-w-2xl mx-auto font-medium leading-relaxed">
                        {t('b2b_diagnosis_intro')}
                    </p>
                </div>

                {/* Leaky Bucket Infographic */}
                <div className="max-w-6xl mx-auto mb-20 grid grid-cols-1 md:grid-cols-3 gap-8 items-center bg-white/5 rounded-[40px] p-8 md:p-12 border border-white/10 relative overflow-hidden backdrop-blur-xl">
                    <div className="text-center md:text-left z-10">
                        <div className="text-[#00FF41] text-3xl md:text-5xl font-black mb-2 sm:mb-4">Retained</div>
                        <div className="text-white/40 text-[10px] md:text-xs uppercase font-bold tracking-[0.3em] mb-4">Cost of Retention (LTV)</div>
                        <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} whileInView={{ width: "90%" }} className="bg-[#00FF41] h-full shadow-[0_0_10px_#00FF41]" />
                        </div>
                        <p className="mt-4 text-white/60 text-xs md:text-sm font-medium">90% frequency build-up through cognitive loops.</p>
                    </div>

                    {/* The "Bucket" Visual */}
                    <div className="relative h-[300px] flex items-center justify-center">
                        <div className="absolute inset-0 bg-[#D4AF37]/5 animate-pulse rounded-full blur-[80px]" />
                        <div className="relative w-48 h-64 border-x-2 border-b-2 border-white/20 rounded-b-[40px] overflow-hidden flex flex-col justify-end">
                            <motion.div 
                                animate={{ height: ["0%", "80%", "30%"] }} 
                                transition={{ repeat: Infinity, duration: 10, ease: "easeInOut" }}
                                className="w-full bg-gradient-to-t from-[#D4AF37]/40 to-[#F3E5AB]/60 relative"
                            >
                                <div className="absolute top-0 left-0 w-full h-[2px] bg-white/30" />
                                {/* Leak Particles */}
                                {[...Array(5)].map((_, i) => (
                                    <motion.div 
                                        key={i}
                                        animate={{ y: [0, 100], opacity: [0, 1, 0] }}
                                        transition={{ repeat: Infinity, duration: 2, delay: i * 0.4 }}
                                        className="absolute bottom-0 bg-[#D4AF37] w-1 h-3 rounded-full"
                                        style={{ left: `${20 + i * 15}%` }}
                                    />
                                ))}
                            </motion.div>
                        </div>
                        <div className="absolute -top-10 flex flex-col items-center">
                            <div className="text-red-500 font-black text-xl mb-1 animate-bounce">CAC</div>
                            <div className="w-1 h-20 bg-gradient-to-b from-red-500 to-transparent" />
                        </div>
                    </div>

                    <div className="text-center md:text-right z-10">
                        <div className="text-[#FF3B30] text-3xl md:text-5xl font-black mb-2 sm:mb-4">Lost</div>
                        <div className="text-white/40 text-[10px] md:text-xs uppercase font-bold tracking-[0.3em] mb-4">Cost of Acquisition (CAC)</div>
                        <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden flex justify-end">
                            <motion.div initial={{ width: 0 }} whileInView={{ width: "80%" }} className="bg-[#FF3B30] h-full shadow-[0_0_10px_#FF3B30]" />
                        </div>
                        <p className="mt-4 text-white/60 text-xs md:text-sm font-medium">83% of first-time guests never return without a hook.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    <motion.div 
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="bg-white/5 backdrop-blur-2xl border border-red-500/20 p-8 rounded-[30px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_0_30px_rgba(255,59,48,0.05)] relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-[50px] rounded-full" />
                        <h3 className="text-xl md:text-2xl font-black uppercase mb-4 opacity-80 decoration-slate-900 border-b border-white/10 pb-4">Статус Кво</h3>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-4 text-white/70 text-sm md:text-base">
                                <FontAwesomeIcon icon={faXmark} className="text-red-500 mt-1" />
                                <span>Высокая стоимость привлечения (High CAC).</span>
                            </li>
                            <li className="flex items-start gap-4 text-white/70 text-sm md:text-base">
                                <FontAwesomeIcon icon={faXmark} className="text-red-500 mt-1" />
                                <span>Неудобные карточки и мертвые приложения (Neural Friction).</span>
                            </li>
                            <li className="flex items-start gap-4 text-white/70 text-sm md:text-base">
                                <FontAwesomeIcon icon={faXmark} className="text-red-500 mt-1" />
                                <span>Гости забывают о вас через неделю.</span>
                            </li>
                        </ul>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="bg-white/5 backdrop-blur-2xl border border-[#D4AF37]/30 p-8 rounded-[30px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_0_30px_rgba(212,175,55,0.05)] relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/10 blur-[50px] rounded-full" />
                        <h3 className="text-xl md:text-2xl font-black uppercase mb-4 text-[#D4AF37] border-b border-white/10 pb-4">Архитектура REVOO</h3>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-4 text-white/80 font-medium text-sm md:text-base">
                                <FontAwesomeIcon icon={faCheck} className="text-[#D4AF37] mt-1" />
                                <span>Максимизация Lifetime Value (LTV).</span>
                            </li>
                            <li className="flex items-start gap-4 text-white/80 font-medium text-sm md:text-base">
                                <FontAwesomeIcon icon={faCheck} className="text-[#D4AF37] mt-1" />
                                <span>Технология Zero Friction: NFC + Apple Wallet.</span>
                            </li>
                            <li className="flex items-start gap-4 text-white/80 font-medium text-sm md:text-base">
                                <FontAwesomeIcon icon={faCheck} className="text-[#D4AF37] mt-1" />
                                <span>Дофаминовая петля возвратов.</span>
                            </li>
                        </ul>
                    </motion.div>
                </div>
                <div className="text-center mt-12 text-white/40 font-bold uppercase tracking-[0.2em] text-sm">
                    {t('b2b_diagnosis_conclusion')}
                </div>
            </section>

            {/* SECTION 3: THE DISSERTATION (Научное обоснование) */}
            <section className="py-24 px-6 relative z-10 border-b border-white/5 bg-[#1C1C1E]/30">
                <div className="max-w-7xl mx-auto text-center mb-16">
                    <motion.h2 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-4 text-white"
                    >
                        {t('b2b_science_h2')}
                    </motion.h2>
                    <p className="text-white/60 text-base md:text-lg max-w-3xl mx-auto font-medium">
                        {t('b2b_science_sub')}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
                    {[
                        { icon: faBrain, title: t('b2b_science_kahneman_title'), subtitle: "(Loss Aversion)", text: t('b2b_science_kahneman_text') },
                        { icon: faBan, title: t('b2b_science_friction_title'), subtitle: "Zero Friction", text: t('b2b_science_friction_text') },
                        { icon: faWaveSquare, title: t('b2b_science_reward_title'), subtitle: "Dopamine Response", text: t('b2b_science_reward_text') }
                    ].map((item, idx) => (
                        <motion.div 
                            key={idx}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.2 }}
                            className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl group hover:border-[#D4AF37]/40 transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] relative overflow-hidden"
                        >
                            {/* Glass Orb Icon Container */}
                            <div className="w-16 h-16 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center mb-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] group-hover:bg-[#D4AF37]/10 transition-colors relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50 rounded-2xl pointer-events-none" />
                                <FontAwesomeIcon icon={item.icon} className="text-3xl text-white/50 group-hover:text-[#D4AF37] transition-colors relative z-10" />
                            </div>
                            <h4 className="text-lg font-black uppercase text-white mb-1 tracking-tight">{item.title}</h4>
                            <div className="text-[10px] font-bold text-[#D4AF37] tracking-[0.2em] uppercase mb-4">{item.subtitle}</div>
                            <p className="text-white/60 text-sm leading-relaxed">{item.text}</p>
                        </motion.div>
                    ))}
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
                    </motion.div>

                    <div className="bg-white/5 backdrop-blur-3xl rounded-3xl border border-white/10 overflow-x-auto shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)]">
                        <div className="min-w-[700px]">
                            <div className="grid grid-cols-4 bg-black/50 p-6 border-b border-white/10 font-black uppercase text-[10px] md:text-xs tracking-widest text-white/40">
                                <div>{t('b2b_matrix_integration').split(' ')[0]}</div>
                                <div className="text-center">{t('b2b_matrix_val_apps').split(' ')[0]}</div>
                                <div className="text-center">{t('b2b_matrix_val_stamps').split(' ')[0]}</div>
                                <div className="text-center text-[#00FF41]">REVOO 🔄</div>
                            </div>
                            {[
                                { label: t('b2b_matrix_friction'), app: t('b2b_matrix_val_apps'), stamp: t('b2b_matrix_val_stamps'), revoo: t('b2b_matrix_val_revoo_friction') },
                                { label: t('b2b_matrix_hook'), app: t('b2b_matrix_val_passive'), stamp: t('b2b_matrix_val_passive'), revoo: t('b2b_matrix_val_revoo_hook') },
                                { label: t('b2b_matrix_data'), app: t('b2b_matrix_val_forced'), stamp: t('b2b_matrix_val_none'), revoo: t('b2b_matrix_val_revoo_data') },
                                { label: t('b2b_matrix_integration'), app: t('b2b_matrix_val_expensive'), stamp: t('b2b_matrix_val_none'), revoo: t('b2b_matrix_val_revoo_integration') }
                            ].map((row, idx) => (
                                <div key={idx} className="grid grid-cols-4 p-6 border-b border-white/5 last:border-0 text-xs md:text-sm font-medium items-center hover:bg-white/5 transition-colors">
                                    <div className="text-white font-bold">{row.label}</div>
                                    <div className="text-center text-white/50 leading-tight px-2">{row.app}</div>
                                    <div className="text-center text-white/50 leading-tight px-2">{row.stamp}</div>
                                    <div className="text-center text-[#00FF41] font-bold bg-[#00FF41]/10 py-3 rounded-xl border border-[#00FF41]/20 shadow-[0_0_20px_rgba(0,255,65,0.05)]">{row.revoo}</div>
                                </div>
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
                    <div className="text-xs font-black uppercase tracking-tighter italic text-[#D4AF37]/40 mb-2">FOR BUSINESS</div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/30">The Architecture of Profitability © 2026</div>
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
