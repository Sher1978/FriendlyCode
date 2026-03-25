import React, { useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBolt, 
  faHandPointer, 
  faGift, 
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
    const batteryLevel = useTransform(scrollYProgress, [0, 0.8], [20, 100]);
    const batteryColor = useTransform(
        scrollYProgress, 
        [0, 0.4, 0.8], 
        ["#FF3B30", "#FFCC00", "#00FF41"]
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
        <div className="min-h-screen bg-[#FFF2E2] text-[#4E342E] font-sans selection:bg-[#00FF41]/30">
            
            {/* Sticky Battery Widget */}
            <motion.div 
                className="fixed top-6 right-6 z-50 flex flex-col items-center gap-2"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
            >
                <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Status</div>
                <div className="w-14 h-7 border-2 border-[#4E342E]/20 rounded-md p-[2px] relative bg-white/50 backdrop-blur-md">
                    <motion.div 
                        className="h-full rounded-[2px]"
                        style={{ 
                            width: `${smoothBatteryLevel.get()}%`,
                            backgroundColor: batteryColor
                        }}
                    />
                    <div className="absolute -right-[4px] top-1/2 -translate-y-1/2 w-[2px] h-2 bg-[#4E342E]/20 rounded-r-full" />
                </div>
            </motion.div>

            {/* Navigation */}
            <nav className={`fixed top-0 left-0 w-full z-40 px-6 py-6 transition-all duration-500 ${scrolled ? 'bg-white/70 backdrop-blur-xl border-b border-black/5 py-4' : ''}`}>
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="text-2xl font-black tracking-tighter uppercase italic">REVOO</div>
                    <button 
                        onClick={() => navigate('/qr?id=demo')}
                        className="bg-[#4E342E] text-[#FFF2E2] px-6 py-2 rounded-full text-sm font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg"
                    >
                        Demo
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative h-screen flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img 
                        src="/assets/hero.png" 
                        alt="Dubai Luxury" 
                        className="w-full h-full object-cover scale-105 animate-slow-zoom"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-[#FFF2E2]" />
                </div>

                <div className="relative z-10 text-center px-6 max-w-4xl">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    >
                        <h1 className="text-5xl md:text-8xl font-black text-white mb-6 tracking-tight leading-none uppercase italic">
                            REVOO: <br/>
                            <span className="text-[#00FF41] drop-shadow-[0_0_20px_rgba(0,255,65,0.5)]">Твой статус</span> <br/>
                            в городе.
                        </h1>
                        <p className="text-lg md:text-xl text-white/90 font-medium mb-10 max-w-2xl mx-auto leading-relaxed">
                            Забудь про анкеты и спам. Получай VIP-привилегии в лучших местах Дубая одним касанием. Твоя лояльность теперь — это энергия.
                        </p>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
                            className="bg-white text-black px-10 py-5 rounded-2xl font-black text-lg uppercase tracking-widest shadow-2xl hover:shadow-[#00FF41]/20 transition-all flex items-center gap-3 mx-auto"
                        >
                            Посмотреть демо
                            <FontAwesomeIcon icon={faArrowRight} />
                        </motion.button>
                    </motion.div>
                </div>
            </section>

            {/* Steps Section */}
            <section className="py-32 px-6 max-w-7xl mx-auto">
                <div className="text-center mb-24">
                    <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tight mb-4">Магия в 3 шага</h2>
                    <div className="w-24 h-2 bg-[#00FF41] mx-auto rounded-full" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {steps.map((step, index) => (
                        <motion.div
                            key={step.id}
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.6, delay: index * 0.2 }}
                            className="group relative"
                        >
                            <div className="bg-white/40 backdrop-blur-3xl border border-white/50 rounded-[40px] p-8 h-full shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden">
                                <div className="relative z-10">
                                    <div className="w-16 h-16 bg-[#4E342E] text-white rounded-2xl flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 group-hover:bg-[#00FF41] transition-all duration-500">
                                        <FontAwesomeIcon icon={step.icon} className="text-2xl" />
                                    </div>
                                    <h3 className="text-3xl font-black uppercase mb-1 tracking-tighter">
                                        {step.title}
                                    </h3>
                                    <p className="text-[#00FF41] font-bold uppercase text-xs tracking-[0.3em] mb-4">
                                        {step.subtitle}
                                    </p>
                                    <p className="text-[#4E342E]/70 font-medium leading-relaxed mb-8">
                                        {step.description}
                                    </p>
                                </div>
                                <div className="mt-auto rounded-2xl overflow-hidden h-48 border border-black/5 shadow-inner">
                                    <img src={step.image} alt={step.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Psychology Section */}
            <section className="relative py-32 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img 
                        src="/assets/vibe.png" 
                        alt="Dubai Vibe" 
                        className="w-full h-full object-cover opacity-20"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#FFF2E2] via-transparent to-[#FFF2E2]" />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="bg-[#4E342E] text-white p-12 md:p-24 rounded-[60px] shadow-2xl relative overflow-hidden"
                    >
                        {/* Glow Effect */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00FF41] blur-[150px] opacity-20 translate-x-1/2 -translate-y-1/2" />
                        
                        <FontAwesomeIcon icon={faCrown} className="text-[#00FF41] text-5xl mb-12 animate-pulse" />
                        <h2 className="text-4xl md:text-7xl font-black uppercase mb-8 leading-tight tracking-tighter">
                            Don’t lose your energy. <br/>
                            <span className="text-[#00FF41]">Stay Super VIP.</span>
                        </h2>
                        <p className="text-xl md:text-2xl text-white/70 font-medium max-w-3xl mx-auto leading-relaxed mb-12">
                            «Мы ценим твое время. Поэтому мы даем тебе максимум сразу. Твой статус — это живая батарея. Приходи чаще, чтобы поддерживать заряд на 100% и сохранять статус Super VIP. Если ты долго не заходишь — энергия тает».
                        </p>
                        <motion.button 
                            whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(0, 255, 65, 0.4)" }}
                            className="bg-[#00FF41] text-black px-12 py-5 rounded-2xl font-black text-xl uppercase tracking-[0.2em] shadow-xl"
                        >
                            Become VIP
                        </motion.button>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 border-t border-[#4E342E]/5">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-10">
                    <div className="text-3xl font-black uppercase tracking-tighter italic">REVOO</div>
                    <div className="flex gap-8 text-sm font-bold uppercase tracking-widest opacity-60">
                        <a href="#" className="hover:text-[#00FF41] transition-colors">Privacy</a>
                        <a href="#" className="hover:text-[#00FF41] transition-colors">Business</a>
                        <a href="#" className="hover:text-[#00FF41] transition-colors">Terms</a>
                    </div>
                    <div className="text-xs font-bold opacity-30 uppercase tracking-[0.4em]">
                        © 2026 REVOO. Dubai Edition.
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
