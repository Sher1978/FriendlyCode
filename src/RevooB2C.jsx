import React, { useEffect, useState } from 'react';
import PngBattery from './PngBattery';
import LanguageSelector from './LanguageSelector';

import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBolt, 
  faHandPointer, 
  faChampagneGlasses, 
  faCrown,
  faArrowRight
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate, useLocation } from 'react-router-dom';

const RevooB2C = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t, i18n } = useTranslation();
    const [scrolled, setScrolled] = useState(false);
    
    const searchParams = new URLSearchParams(location.search);
    const interceptedVenueId = searchParams.get('qr_venue_id');

    // Return Guest Logic: If user is already known, bypass landing and go to QR page
    useEffect(() => {
        const guestName = localStorage.getItem('guestName');
        const guestEmail = localStorage.getItem('guestEmail');
        if ((guestName || guestEmail) && interceptedVenueId) {
            navigate(`/qr?id=${interceptedVenueId}&bypass_landing=true`);
        }
    }, [interceptedVenueId, navigate]);
    
    // Scroll tracking for the Sticky Battery
    const { scrollYProgress } = useScroll();
    const batteryLevel = useTransform(scrollYProgress, [0, 0.95], [100, 10]);
    const batteryColor = useTransform(
        scrollYProgress, 
        [0, 0.5, 0.95], 
        ["#22C55E", "#EAB308", "#EF4444"]
    );
    
    const smoothBatteryLevel = useSpring(batteryLevel, { stiffness: 100, damping: 30 });
    const batteryWidth = useTransform(smoothBatteryLevel, (v) => `${v}%`);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const steps = [
        {
            id: 'scan',
            title: 'SCAN',
            subtitle: 'Сканируй QR',
            icon: faHandPointer,
            description: 'Просто приложи телефон к NFC-метке или сканируй QR на столе. Никаких форм и ожидания.',
            image: '/assets/hero.png'
        },
        {
            id: 'reveal',
            title: 'REVEAL',
            subtitle: 'Увидишь награду',
            icon: faBolt,
            description: 'Твой VIP-статус и личная привилегия появятся мгновенно. Система узнает тебя в лицо.',
            showBattery: true,
            image: '/assets/vibe.png'
        },
        {
            id: 'status',
            title: 'STAY VIP',
            subtitle: 'Держи заряд',
            icon: faCrown,
            description: 'Возвращайся чаще, чтобы держать заряд VIP-батареи на максимуме и сохранять статус.',
            image: '/assets/hospitality.png'
        }
    ];

    return (
        <div className="min-h-screen bg-[#000000] text-white font-sans selection:bg-[#00FF41]/30 overflow-x-hidden">
            
            {/* Ambient Background Blurs (Dubai Premium Gold & Slate) */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#D4AF37]/15 blur-[120px] rounded-full" />
                <div className="absolute bottom-[20%] left-[-10%] w-[400px] h-[400px] bg-amber-900/10 blur-[100px] rounded-full" />
                <div className="absolute top-[40%] left-[30%] w-[600px] h-[600px] bg-[#FFDF00]/5 blur-[150px] rounded-full" />
            </div>

            {/* Sticky Battery Widget */}
            <motion.div 
                className="fixed top-6 right-6 z-50 flex flex-col items-center gap-2"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
            >
                <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 text-white">Status</div>
                <div className="w-14 h-7 border-2 border-white/20 rounded-md p-[2px] relative bg-white/5 backdrop-blur-xl">
                    <motion.div 
                        className="h-full rounded-[2px]"
                        style={{ 
                            width: batteryWidth,
                            backgroundColor: batteryColor,
                            boxShadow: "0 0 10px rgba(0,255,65,0.4)"
                        }}
                    />
                    <div className="absolute -right-[4px] top-1/2 -translate-y-1/2 w-[2px] h-2 bg-white/20 rounded-r-full" />
                </div>
            </motion.div>

            {/* Navigation */}
            <nav className={`fixed top-0 left-0 w-full z-40 px-6 py-4 transition-all duration-500 ${scrolled ? 'bg-black/90 backdrop-blur-3xl border-b border-white/5 py-3 shadow-[0_4px_30px_rgba(0,0,0,0.5)]' : ''}`}>
                <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
                    <div className="flex-shrink-0 cursor-pointer flex items-center gap-4" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <img src="/revoo-logo.png" className={`transition-all duration-500 ${scrolled ? 'h-8' : 'h-10'} md:h-12 object-contain mix-blend-screen opacity-90 drop-shadow-[0_0_10px_rgba(212,175,55,0.3)]]`} alt="REVOO Logo" />
                        <span className="hidden md:block text-white/40 text-xs md:text-sm font-bold tracking-widest uppercase border-l border-white/20 pl-4">REVOO</span>
                    </div>
                    <div className="flex items-center gap-3 md:gap-6">
                        <LanguageSelector />
                        <button 
                            onClick={() => navigate('/qr?id=demo')}
                            className="bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] text-black px-6 py-2 rounded-full text-xs md:text-sm font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] whitespace-nowrap"
                        >
                            Demo
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative h-screen flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 z-0 opacity-60">
                    <img 
                        src="/assets/hero.png" 
                        alt="Dubai Luxury" 
                        className="w-full h-full object-cover scale-105 animate-slow-zoom brightness-75 grayscale-[20%]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-black" />
                </div>

                <div className="relative z-10 text-center px-6 max-w-4xl">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    >
                        <img src="/revoo-logo.png" className="w-[90%] max-w-[500px] mx-auto mb-12 mix-blend-screen opacity-95 drop-shadow-[0_0_40px_rgba(212,175,55,0.15)]" alt="REVOO Logo" />
                        <h1 className="text-2xl md:text-3xl font-black text-white/50 mb-6 tracking-[0.2em] uppercase border-t border-white/10 pt-8 inline-block">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37]">ENERGY</span> THAT MATTERS
                        </h1>
                        <p className="text-lg md:text-xl text-white/60 font-medium mb-12 max-w-2xl mx-auto leading-relaxed">
                            Забудь про пластик и анкеты. Получай статус и награды мгновенно. Ваше время стоит большего.
                        </p>
                        <motion.button
                            whileHover={{ scale: 1.05, boxShadow: "0 0 50px rgba(212, 175, 55, 0.4)" }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                if (interceptedVenueId) {
                                    navigate(`/qr?id=${interceptedVenueId}&bypass_landing=true`);
                                } else {
                                    navigate('/test?id=komKf0beSnsuuZ6p0Igh');
                                }
                            }}
                            className="bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] text-black px-12 py-5 rounded-full font-black text-sm md:text-base uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(212,175,55,0.2)] hover:shadow-[0_0_40px_rgba(212,175,55,0.5)] mx-auto flex items-center gap-4"
                        >
                            {interceptedVenueId ? 'ПОЛУЧИТЬ НАГРАДУ' : 'ПОСМОТРЕТЬ ДЕМО'}
                            <FontAwesomeIcon icon={faArrowRight} />
                        </motion.button>
                    </motion.div>
                </div>
            </section>

            {/* Steps Section */}
            <section className="py-32 px-6 max-w-7xl mx-auto relative">
                <div className="text-center mb-24 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#D4AF37] blur-[100px] opacity-10 pointer-events-none rounded-full" />
                    <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tight mb-6 relative z-10 text-white">Магия в 3 шага</h2>
                    <div className="w-24 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent mx-auto relative z-10" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {steps.map((step, index) => (
                        <motion.div
                            key={step.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.6, delay: index * 0.2 }}
                            className="group relative"
                        >
                            <div className="bg-[#1C1C1E]/60 backdrop-blur-[40px] border border-white/5 rounded-[40px] p-8 h-full shadow-2xl hover:border-[#D4AF37]/50 transition-all duration-500 overflow-hidden relative group-hover:bg-[#1C1C1E]/80">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/5 blur-[80px] rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                <div className="relative z-10">
                                    <div className="w-16 h-16 bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 rounded-2xl flex items-center justify-center mb-8 shadow-inner group-hover:bg-gradient-to-br group-hover:from-[#D4AF37] group-hover:to-[#B8860B] group-hover:text-black transition-all duration-500 group-hover:shadow-[0_0_30px_rgba(212,175,55,0.4)]">
                                        <FontAwesomeIcon icon={step.icon} className="text-2xl" />
                                    </div>
                                    <h3 className="text-3xl font-black uppercase mb-1 tracking-tighter text-white">
                                        {step.title}
                                    </h3>
                                    <p className="text-[#D4AF37] font-bold uppercase text-xs tracking-[0.3em] mb-4">
                                        {step.subtitle}
                                    </p>
                                    <p className="text-white/50 font-medium leading-relaxed mb-8 text-sm">
                                        {step.description}
                                    </p>
                                </div>
                                <div className="mt-auto rounded-3xl overflow-hidden h-48 border border-white/5 shadow-inner opacity-60 grayscale-[80%] group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 relative flex items-center justify-center">
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#1C1C1E] to-transparent z-10 opacity-50" />
                                    {step.showBattery ? (
                                        <div className="scale-[0.5] md:scale-[0.7] transform">
                                            <PngBattery discount={20} />
                                        </div>
                                    ) : (
                                        <img src={step.image} alt={step.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Psychology Section */}
            <section className="relative py-32 overflow-hidden">
                <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="bg-gradient-to-br from-[#1C1C1E] to-black border border-white/10 p-12 md:p-24 rounded-[60px] shadow-[0_0_80px_rgba(0,0,0,0.5)] relative overflow-hidden"
                    >
                        {/* Glow Effect */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37] blur-[150px] opacity-10 translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-900 blur-[150px] opacity-10 -translate-x-1/2 translate-y-1/2 pointer-events-none" />
                        
                        <div className="relative mx-auto w-24 h-24 mb-12 flex items-center justify-center">
                            <div className="absolute inset-0 bg-[#D4AF37]/20 rounded-full blur-[30px] animate-pulse" />
                            <FontAwesomeIcon icon={faCrown} className="text-[#D4AF37] text-6xl relative z-10 drop-shadow-[0_0_20px_rgba(212,175,55,0.6)]" />
                        </div>
                        <h2 className="text-4xl md:text-7xl font-black uppercase mb-8 leading-tight tracking-tighter text-white">
                            Don’t lose your energy. <br/>
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37]">Stay Super VIP.</span>
                        </h2>
                        <p className="text-lg md:text-xl text-white/50 font-medium max-w-3xl mx-auto leading-relaxed mb-12 italic">
                            « Твой статус — это живая батарея. Приходи чаще, чтобы поддерживать заряд на 100%. Если ты долго не заходишь — энергия тает, и твой ВИП статус снижается ».
                        </p>
                        <motion.button 
                            whileHover={{ scale: 1.05, boxShadow: "0 0 50px rgba(212, 175, 55, 0.4)" }}
                            onClick={() => navigate('/qr?id=demo')}
                            className="bg-gradient-to-r from-[#1C1C1E] to-black border border-[#D4AF37]/30 text-[#D4AF37] px-12 py-5 rounded-full font-black text-xl uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(212,175,55,0.1)] hover:border-[#D4AF37] transition-all"
                        >
                            Become VIP
                        </motion.button>
                    </motion.div>
                </div>
            </section>


            {/* Footer */}
            <footer className="py-20 border-t border-white/5 bg-black">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-10">
                    <div className="text-3xl font-black uppercase tracking-tighter italic text-[#00FF41]">REVOO</div>
                    <div className="flex gap-8 text-xs font-bold uppercase tracking-widest opacity-40 text-white mt-10 md:mt-0">
                        <a href="#" className="hover:text-[#D4AF37] transition-colors">Privacy</a>
                        <a href="#" className="hover:text-[#D4AF37] transition-colors">Business</a>
                        <a href="#" className="hover:text-[#D4AF37] transition-colors">Terms</a>
                    </div>
                    <div className="text-[10px] md:text-xs font-bold opacity-20 uppercase tracking-[0.4em] text-white mt-10 md:mt-0">
                        © 2026 REVOO. Dubai Premium Edition.
                    </div>
                </div>
            </footer>

            <style>{`
                @keyframes slow-zoom {
                    from { transform: scale(1); }
                    to { transform: scale(1.1); }
                }
                .animate-slow-zoom {
                    animation: slow-zoom 20s infinite alternate ease-in-out;
                }
            `}</style>
        </div>
    );
};

export default RevooB2C;
