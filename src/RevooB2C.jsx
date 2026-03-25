import React, { useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBolt, 
  faHandPointer, 
  faChampagneGlasses, 
  faCrown,
  faArrowRight
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';

const RevooB2C = () => {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    
    // Scroll tracking for the Sticky Battery
    const { scrollYProgress } = useScroll();
    const batteryLevel = useTransform(scrollYProgress, [0, 0.8], [100, 20]);
    const batteryColor = useTransform(
        scrollYProgress, 
        [0, 0.4, 0.8], 
        ["#00FF41", "#FFCC00", "#FF3B30"]
    );
    
    const smoothBatteryLevel = useSpring(batteryLevel, { stiffness: 100, damping: 30 });

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const steps = [
        {
            id: 'tap',
            title: 'TAP',
            subtitle: 'Касание',
            icon: faHandPointer,
            description: 'Просто приложи телефон к NFC-метке или сканируй QR на столе. Никаких загрузок из App Store.',
            image: '/assets/hero.png'
        },
        {
            id: 'get',
            title: 'GET',
            subtitle: 'Получение',
            icon: faBolt,
            description: 'Твой VIP-статус и первая награда мгновенно появятся в твоем Apple Wallet. Это заняло 0.5 секунды.',
            image: '/assets/vibe.png'
        },
        {
            id: 'enjoy',
            title: 'ENJOY',
            subtitle: 'Удовольствие',
            icon: faChampagneGlasses,
            description: 'Просто покажи экран. Наслаждайся сервисом, где тебя знают в лицо и ценят твое время.',
            image: '/assets/hospitality.png'
        }
    ];

    return (
        <div className="min-h-screen bg-[#000000] text-white font-sans selection:bg-[#00FF41]/30 overflow-x-hidden">
            
            {/* Ambient Background Blurs (REVOO Deep Sea Blue & Friendly Orange) */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#00FF41]/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[20%] left-[-10%] w-[400px] h-[400px] bg-blue-900/20 blur-[100px] rounded-full" /> {/* Deep Sea Blue */}
                <div className="absolute top-[40%] left-[30%] w-[600px] h-[600px] bg-[#FF9933]/10 blur-[150px] rounded-full" /> {/* Friendly Orange */}
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
                        className="h-full rounded-[2px] shadow-[0_0_10px_rgba(0,255,65,0.4)]"
                        style={{ 
                            width: `${smoothBatteryLevel.get()}%`,
                            backgroundColor: batteryColor
                        }}
                    />
                    <div className="absolute -right-[4px] top-1/2 -translate-y-1/2 w-[2px] h-2 bg-white/20 rounded-r-full" />
                </div>
            </motion.div>

            {/* Navigation */}
            <nav className={`fixed top-0 left-0 w-full z-40 px-6 py-6 transition-all duration-500 ${scrolled ? 'bg-black/60 backdrop-blur-2xl border-b border-white/5 py-4' : ''}`}>
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="text-2xl font-black tracking-tighter uppercase italic text-[#00FF41]">REVOO</div>
                    <button 
                        onClick={() => navigate('/qr?id=demo')}
                        className="bg-white text-black px-6 py-2 rounded-full text-sm font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                    >
                        Demo
                    </button>
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
                        <h1 className="text-5xl md:text-8xl font-black text-white mb-6 tracking-tight leading-none uppercase italic">
                            REVOO: <br/>
                            <span className="text-[#00FF41] drop-shadow-[0_0_15px_rgba(0,255,65,0.6)]">ENERGY</span> <br/>
                            THAT MATTERS.
                        </h1>
                        <p className="text-lg md:text-xl text-white/70 font-medium mb-10 max-w-2xl mx-auto leading-relaxed">
                            Забудь про пластик и анкеты. Получай статус и награды мгновенно. Ваше время стоит большего.
                        </p>
                        <motion.button
                            whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(0, 255, 65, 0.4)" }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
                            className="bg-[#00FF41] text-black px-10 py-5 rounded-2xl font-black text-lg uppercase tracking-widest transition-all flex items-center gap-3 mx-auto"
                        >
                            Посмотреть демо
                            <FontAwesomeIcon icon={faArrowRight} />
                        </motion.button>
                    </motion.div>
                </div>
            </section>

            {/* Steps Section */}
            <section className="py-32 px-6 max-w-7xl mx-auto relative">
                <div className="text-center mb-24">
                    <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tight mb-4">Магия в 3 шага</h2>
                    <div className="w-24 h-2 bg-[#00FF41] mx-auto rounded-full" />
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
                            <div className="bg-[#1C1C1E]/60 backdrop-blur-[40px] border border-white/10 rounded-[40px] p-8 h-full shadow-2xl hover:border-[#00FF41]/50 transition-all duration-500 overflow-hidden">
                                <div className="relative z-10">
                                    <div className="w-16 h-16 bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/20 rounded-2xl flex items-center justify-center mb-8 shadow-lg group-hover:bg-[#00FF41] group-hover:text-black transition-all duration-500">
                                        <FontAwesomeIcon icon={step.icon} className="text-2xl" />
                                    </div>
                                    <h3 className="text-3xl font-black uppercase mb-1 tracking-tighter text-white">
                                        {step.title}
                                    </h3>
                                    <p className="text-[#00FF41] font-bold uppercase text-xs tracking-[0.3em] mb-4">
                                        {step.subtitle}
                                    </p>
                                    <p className="text-white/60 font-medium leading-relaxed mb-8">
                                        {step.description}
                                    </p>
                                </div>
                                <div className="mt-auto rounded-2xl overflow-hidden h-48 border border-white/5 shadow-inner opacity-80 decoration-slate-900 grayscale-[50%] group-hover:grayscale-0 transition-all duration-700">
                                    <img src={step.image} alt={step.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
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
                        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00FF41] blur-[150px] opacity-10 translate-x-1/2 -translate-y-1/2" />
                        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600 blur-[150px] opacity-10 -translate-x-1/2 translate-y-1/2" />
                        
                        <FontAwesomeIcon icon={faCrown} className="text-[#00FF41] text-5xl mb-12 animate-pulse shadow-[0_0_20px_rgba(0,255,65,0.4)]" />
                        <h2 className="text-4xl md:text-7xl font-black uppercase mb-8 leading-tight tracking-tighter text-white">
                            Don’t lose your energy. <br/>
                            <span className="text-[#00FF41]">Stay Super VIP.</span>
                        </h2>
                        <p className="text-xl md:text-2xl text-white/50 font-medium max-w-3xl mx-auto leading-relaxed mb-12">
                            « Твой статус — это живая батарея. Приходи чаще, чтобы поддерживать заряд на 100%. Если ты долго не заходишь — энергия тает, и твой ВИП статус снижается ».
                        </p>
                        <motion.button 
                            whileHover={{ scale: 1.05, boxShadow: "0 0 50px rgba(0, 255, 65, 0.5)" }}
                            onClick={() => navigate('/qr?id=demo')}
                            className="bg-white text-black px-12 py-5 rounded-2xl font-black text-xl uppercase tracking-[0.2em] shadow-xl"
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
                    <div className="flex gap-8 text-sm font-bold uppercase tracking-widest opacity-40 text-white">
                        <a href="#" className="hover:text-[#00FF41] transition-colors">Privacy</a>
                        <a href="#" className="hover:text-[#00FF41] transition-colors">Business</a>
                        <a href="#" className="hover:text-[#00FF41] transition-colors">Terms</a>
                    </div>
                    <div className="text-xs font-bold opacity-20 uppercase tracking-[0.4em] text-white">
                        © 2026 REVOO. Dubai x iOS 26 Edition.
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
