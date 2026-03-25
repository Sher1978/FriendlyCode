import React, { useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
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

const RevooB2B = () => {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    
    // Smooth scroll progress
    const { scrollYProgress } = useScroll();
    const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
    
    // Battery Animation logic for Hero (Energy Flow)
    const [energyLevel, setEnergyLevel] = useState(100);
    useEffect(() => {
        const interval = setInterval(() => {
            setEnergyLevel(prev => (prev <= 10 ? 100 : prev - 1));
        }, 100);
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
        <div className="min-h-screen bg-[#000000] text-white font-sans selection:bg-[#00FF41]/30 overflow-x-hidden">
            
            {/* Ambient OLED Blurs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-900/10 blur-[130px] rounded-full" />
                <div className="absolute top-[40%] right-[-10%] w-[600px] h-[600px] bg-[#00FF41]/5 blur-[150px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[20%] w-[700px] h-[700px] bg-[#FF9933]/5 blur-[120px] rounded-full" />
            </div>

            {/* Navigation */}
            <nav className={`fixed top-0 left-0 w-full z-50 px-6 py-6 transition-all duration-500 ${scrolled ? 'bg-black/60 backdrop-blur-2xl border-b border-white/5 py-4' : ''}`}>
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="text-xl md:text-2xl font-black tracking-tighter uppercase italic text-[#00FF41]">REVOO <span className="text-white/40 text-sm ml-2 font-bold tracking-widest not-italic">FOR BUSINESS</span></div>
                    <button 
                        onClick={() => window.open('https://t.me/REVOO_bot', '_blank')}
                        className="bg-white text-black px-6 py-2 rounded-full text-sm font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                    >
                        Book Demo
                    </button>
                </div>
            </nav>

            {/* SECTION 1: THE HERO (Инженерный хук) */}
            <section className="relative min-h-[90vh] flex items-center pt-32 pb-20 px-6 z-10 border-b border-white/5">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1C1C1E] border border-white/10 text-xs font-bold uppercase tracking-widest text-[#00FF41] mb-8">
                            <FontAwesomeIcon icon={faMicrochip} />
                            The Architecture of Profitability
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight leading-tight uppercase">
                            Лояльность — <br/>
                            <span className="text-white/40">это не маркетинг.</span> <br/>
                            Это когнитивная инженерия.
                        </h1>
                        <p className="text-lg md:text-xl text-white/70 font-medium mb-10 max-w-xl leading-relaxed">
                            Как удерживать 90% гостей, используя Нобелевскую теорию боязни потери и технологию Zero Friction.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <motion.button
                                whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(0, 255, 65, 0.4)" }}
                                whileTap={{ scale: 0.95 }}
                                className="bg-[#00FF41] text-black px-8 py-4 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all"
                            >
                                СКАЧАТЬ WHITE PAPER
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="bg-[#1C1C1E] border border-white/10 text-white px-8 py-4 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                            >
                                ТЕСТ-ДРАЙВ
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
                        {/* Battery Container */}
                        <div className="relative w-48 h-[340px] flex flex-col items-center transform-gpu rotate-y-[-20deg] rotate-x-[15deg] drop-shadow-[0_30px_50px_rgba(0,0,0,0.6)]">
                            
                            {/* Top Cap (Positive) */}
                            <div className="w-full h-10 relative rounded-t-2xl bg-gradient-to-b from-gray-300 via-gray-100 to-gray-400 border-b border-gray-600 overflow-hidden shadow-[inset_0_-2px_10px_rgba(0,0,0,0.5),0_5px_15px_rgba(0,0,0,0.5)] z-20">
                                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-black/70" />
                                <div className="absolute inset-0 flex items-center justify-center text-black/50 font-black text-2xl z-10 translate-y-1 drop-shadow-sm">+</div>
                            </div>

                            {/* Main Glass Body */}
                            <div className="w-[94%] flex-1 relative bg-black/40 backdrop-blur-sm border-x border-white/20 flex flex-col justify-end py-1 z-10 shadow-[inset_0_0_30px_rgba(255,255,255,0.05),0_0_20px_rgba(0,255,65,0.1)]">
                                {/* Volumetric Glass Reflection / Glare */}
                                <div className="absolute inset-y-0 left-[15%] w-[10%] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none z-30" />
                                <div className="absolute inset-y-0 right-[5%] w-[5%] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none z-30" />
                                
                                {/* 14 Glass Segments */}
                                {Array.from({ length: 14 }).map((_, idx) => {
                                    const reversedIdx = 13 - idx; // 0 is bottom
                                    const activeSegments = Math.ceil((energyLevel / 100) * 14);
                                    const isActive = reversedIdx < activeSegments;
                                    
                                    const activeColor = energyLevel > 50 ? '#00FF41' : energyLevel > 20 ? '#FFCC00' : '#FF3B30';
                                    const glowShadow = isActive ? `inset 0 0 15px ${activeColor}, 0 0 25px ${activeColor}` : 'none';

                                    return (
                                        <div key={idx} className="flex-1 w-full relative group">
                                            {/* Metallic Separator Ring (Like the reference image) */}
                                            <div className="absolute -left-1 -right-1 h-[3px] top-0 bg-gradient-to-r from-gray-600 via-gray-300 to-gray-600 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.8),inset_0_1px_1px_white]" />
                                            {idx === 13 && (
                                                <div className="absolute -left-1 -right-1 h-[3px] bottom-0 bg-gradient-to-r from-gray-600 via-gray-300 to-gray-600 z-20 shadow-[0_-1px_3px_rgba(0,0,0,0.8),inset_0_-1px_1px_white]" />
                                            )}
                                            
                                            {/* Glowing Liquid Inner Chamber */}
                                            <motion.div 
                                                className="absolute inset-[3px] rounded-sm transition-all duration-300"
                                                style={{ 
                                                    backgroundColor: isActive ? activeColor : 'rgba(255,255,255,0.01)',
                                                    boxShadow: glowShadow,
                                                    opacity: isActive ? 0.85 : 1
                                                }}
                                            />
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Bottom Cap (Negative) */}
                            <div className="w-full h-10 relative rounded-b-2xl bg-gradient-to-b from-gray-400 via-gray-100 to-gray-300 border-t border-gray-600 overflow-hidden shadow-[inset_0_2px_10px_rgba(0,0,0,0.5),0_-5px_15px_rgba(0,0,0,0.5)] z-20">
                                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-black/70" />
                                <div className="absolute inset-0 flex items-center justify-center text-black/50 font-black text-3xl leading-none z-10 -translate-y-1 drop-shadow-sm">-</div>
                            </div>
                        </div>

                        {/* HUD Elements */}
                        <motion.div 
                            className="absolute -right-10 top-20 bg-[#1C1C1E]/80 backdrop-blur-md border border-[#00FF41]/30 p-4 rounded-xl shadow-2xl flex flex-col gap-1 z-30"
                            animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                        >
                            <span className="text-[#00FF41] text-[10px] uppercase font-mono tracking-widest">Energy Flow</span>
                            <span className="text-3xl font-black font-mono tracking-tighter" style={{ color: energyLevel > 50 ? '#00FF41' : energyLevel > 20 ? '#FFCC00' : '#FF3B30' }}>{energyLevel}%</span>
                        </motion.div>
                        <motion.div 
                            className="absolute left-0 lg:-left-20 bottom-24 bg-[#1C1C1E]/80 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl z-30"
                            animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
                        >
                            <span className="text-white/50 text-[10px] uppercase font-mono tracking-widest block mb-1">State Logic</span>
                            <span className="text-sm font-bold uppercase text-white tracking-widest">Active Retention</span>
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
                        className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-4 text-[#FF3B30]"
                    >
                        Диагноз: Хроническая утечка LTV
                    </motion.h2>
                    <p className="text-white/60 text-lg max-w-2xl mx-auto font-medium">
                        Большинство заведений тратят огромные бюджеты (CAC) на привлечение, но клиенты «вытекают» к конкурентам после первого визита.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    <motion.div 
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="bg-[#1C1C1E] border border-red-500/20 p-8 rounded-[30px] shadow-[0_0_30px_rgba(255,59,48,0.05)] relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-[50px] rounded-full" />
                        <h3 className="text-2xl font-black uppercase mb-4 opacity-80 decoration-slate-900 border-b border-white/10 pb-4">Статус Кво</h3>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-4 text-white/70">
                                <FontAwesomeIcon icon={faXmark} className="text-red-500 mt-1" />
                                <span>Высокая стоимость привлечения (High CAC).</span>
                            </li>
                            <li className="flex items-start gap-4 text-white/70">
                                <FontAwesomeIcon icon={faXmark} className="text-red-500 mt-1" />
                                <span>Неудобные карточки и мертвые приложения (Neural Friction).</span>
                            </li>
                            <li className="flex items-start gap-4 text-white/70">
                                <FontAwesomeIcon icon={faXmark} className="text-red-500 mt-1" />
                                <span>Гости забывают о вас через неделю.</span>
                            </li>
                        </ul>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="bg-[#1C1C1E]/50 border border-[#00FF41]/30 p-8 rounded-[30px] shadow-[0_0_30px_rgba(0,255,65,0.05)] relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00FF41]/10 blur-[50px] rounded-full" />
                        <h3 className="text-2xl font-black uppercase mb-4 text-[#00FF41] border-b border-white/10 pb-4">Архитектура REVOO</h3>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-4 text-white/80 font-medium">
                                <FontAwesomeIcon icon={faCheck} className="text-[#00FF41] mt-1" />
                                <span>Максимизация Lifetime Value (LTV).</span>
                            </li>
                            <li className="flex items-start gap-4 text-white/80 font-medium">
                                <FontAwesomeIcon icon={faCheck} className="text-[#00FF41] mt-1" />
                                <span>Технология Zero Friction: NFC + Apple Wallet.</span>
                            </li>
                            <li className="flex items-start gap-4 text-white/80 font-medium">
                                <FontAwesomeIcon icon={faCheck} className="text-[#00FF41] mt-1" />
                                <span>Дофаминовая петля возвратов.</span>
                            </li>
                        </ul>
                    </motion.div>
                </div>
                <div className="text-center mt-12 text-white/40 font-bold uppercase tracking-[0.2em] text-sm">
                    Вы не строите бизнес, вы просто оплачиваете рекламные счета Facebook и Google.
                </div>
            </section>

            {/* SECTION 3: THE DISSERTATION (Научное обоснование) */}
            <section className="py-24 px-6 relative z-10 border-b border-white/5 bg-[#1C1C1E]/30">
                <div className="max-w-7xl mx-auto text-center mb-16">
                    <motion.h2 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-4 text-white"
                    >
                        Взлом привычек через Cognitive Hooks
                    </motion.h2>
                    <p className="text-white/60 text-lg max-w-3xl mx-auto font-medium">
                        Почему традиционные системы лояльности мертвы? Потому что они создают <strong>Neural Friction</strong>.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
                    {[
                        { icon: faBrain, title: "Теория Канемана", subtitle: "(Loss Aversion)", text: "Мы не предлагаем гостю «накопить на подарок». Мы даем ему актив (статус). Психологически потерять 100% заряда батареи в 2 раза больнее, чем радость от бесплатного кофе." },
                        { icon: faBan, title: "Zero Friction", subtitle: "Удаление барьеров", text: "Удаление барьера входа. 0.5 секунды на «Тар» — это быстрее, чем достать кошелек." },
                        { icon: faWaveSquare, title: "Variable Reward", subtitle: "Дофаминовый отклик", text: "Как переменное вознаграждение вызывает дофаминовый отклик, заставляя гостя проверять статус батареи снова и снова." }
                    ].map((item, idx) => (
                        <motion.div 
                            key={idx}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.2 }}
                            className="bg-black border border-white/10 p-8 rounded-3xl group hover:border-[#00FF41]/50 transition-colors"
                        >
                            <FontAwesomeIcon icon={item.icon} className="text-4xl text-white/20 mb-6 group-hover:text-[#00FF41] transition-colors" />
                            <h4 className="text-xl font-black uppercase text-white mb-1">{item.title}</h4>
                            <div className="text-xs font-bold text-[#00FF41] tracking-[0.2em] uppercase mb-4">{item.subtitle}</div>
                            <p className="text-white/50 text-sm leading-relaxed">{item.text}</p>
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
                        <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-6">Технологический стек <span className="text-[#00FF41]">2026 года</span></h2>
                        <p className="text-white/70 text-lg font-medium mb-8 leading-relaxed max-w-xl">
                            Никаких POS-интеграций. Никакого обучения персонала. Полная автономность.
                        </p>
                        <ul className="space-y-6">
                            <li className="flex items-start gap-4">
                                <div className="w-8 h-8 rounded-full bg-[#1C1C1E] border border-[#00FF41]/30 flex items-center justify-center text-[#00FF41] font-black text-sm shrink-0">1</div>
                                <div>
                                    <h4 className="text-white font-bold uppercase mb-1 tracking-widest text-sm">Разбор 14-сегментной структуры визуализации</h4>
                                    <p className="text-white/50 text-sm">Продвинутый PngBattery.jsx контроллер, который мгновенно визуализирует статус гостя.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-4">
                                <div className="w-8 h-8 rounded-full bg-[#1C1C1E] border border-[#ff3b30]/30 flex items-center justify-center text-[#ff3b30] font-black text-sm shrink-0">2</div>
                                <div>
                                    <h4 className="text-white font-bold uppercase mb-1 tracking-widest text-sm">Тающая механика (Melting Logic)</h4>
                                    <p className="text-white/50 text-sm">Чем дольше пауза между визитами, тем ниже заряд. Алгоритм 자동으로 сжигает энергию неактивных гостей.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-4">
                                <div className="w-8 h-8 rounded-full bg-[#1C1C1E] border border-blue-500/30 flex items-center justify-center text-blue-500 font-black text-sm shrink-0">3</div>
                                <div>
                                    <h4 className="text-white font-bold uppercase mb-1 tracking-widest text-sm">Apple Wallet & Google Pay</h4>
                                    <p className="text-white/50 text-sm">Использование нативных инструментов смартфона вместо сторонних приложений.</p>
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
                         <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-4">Retention Architecture Matrix</h2>
                    </motion.div>

                    <div className="bg-[#1C1C1E] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                        <div className="grid grid-cols-4 bg-black/50 p-6 border-b border-white/10 font-black uppercase text-xs md:text-sm tracking-widest text-white/40">
                            <div>Параметр</div>
                            <div className="text-center">Приложения</div>
                            <div className="text-center">Штампы</div>
                            <div className="text-center text-[#00FF41]">REVOO 🔄</div>
                        </div>
                        {[
                            { label: "Трение (Friction)", app: "Высокое (Скачивание)", stamp: "Низкое (Кошелек)", revoo: "Нулевое (0.5 сек)" },
                            { label: "Когнитивный хук", app: "Пассивный", stamp: "Пассивный", revoo: "Активный (Loss Aversion)" },
                            { label: "Сбор данных", app: "Принудительный", stamp: "Отсутствует", revoo: "Бесшовный (Fingerprinting)" },
                            { label: "Интеграция", app: "Дорогая / Сложная", stamp: "Нет", revoo: "Автономная (Cloud Alerts)" }
                        ].map((row, idx) => (
                            <div key={idx} className="grid grid-cols-4 p-6 border-b border-white/5 last:border-0 text-xs md:text-sm font-medium items-center hover:bg-white/5 transition-colors">
                                <div className="text-white font-bold">{row.label}</div>
                                <div className="text-center text-white/50">{row.app}</div>
                                <div className="text-center text-white/50">{row.stamp}</div>
                                <div className="text-center text-[#00FF41] font-bold bg-[#00FF41]/10 py-2 rounded-lg">{row.revoo}</div>
                            </div>
                        ))}
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
                        className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-4"
                    >
                        Управление на основе данных
                    </motion.h2>
                    <p className="text-white/60 text-lg max-w-3xl mx-auto font-medium">
                        От интуиции к точным алгоритмам.
                    </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    {[
                        { icon: faChartLine, title: "Visit Velocity", text: "Мониторинг скорости возврата клиентов в реальном времени." },
                        { icon: faDatabase, title: "Telegram Admin Bot", text: "Уведомления владельцу: «Ваш VIP-гость вошел в зал»." },
                        { icon: faShieldHalved, title: "Prediction AI", text: "Прогноз оттока клиентов до того, как они решат уйти." }
                    ].map((item, idx) => (
                        <div key={idx} className="bg-black/40 border border-[#00FF41]/20 p-6 rounded-2xl flex flex-col items-center text-center">
                            <FontAwesomeIcon icon={item.icon} className="text-2xl text-[#00FF41] mb-4" />
                            <h4 className="text-base font-black uppercase text-white mb-2">{item.title}</h4>
                            <p className="text-white/50 text-xs leading-relaxed">{item.text}</p>
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
                        className="bg-[#1C1C1E] border border-[#00FF41]/40 p-12 md:p-20 rounded-[40px] shadow-[0_0_80px_rgba(0,255,65,0.15)] relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-[#00FF41]/5 animate-pulse" />
                        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-6 text-white relative z-10">
                            30-дневный тест-драйв <br/>
                            <span className="text-[#00FF41]">с гарантией 100% ROI.</span>
                        </h2>
                        <p className="text-white/70 text-lg md:text-xl font-medium mb-12 max-w-2xl mx-auto relative z-10">
                            Мы настолько уверены в научной базе, что берем все риски на себя. Если через месяц вы не увидите измеримого роста частоты визитов — мы возвращаем инвестиции и забираем оборудование.
                        </p>
                        <motion.button
                            whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(0, 255, 65, 0.4)" }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => window.open('https://t.me/REVOO_bot', '_blank')}
                            className="bg-[#00FF41] text-black px-12 py-6 rounded-2xl font-black text-lg md:text-xl uppercase tracking-[0.2em] relative z-10 w-full md:w-auto"
                        >
                            ВНЕДРИТЬ СИСТЕМУ ЗА 15 МИНУТ
                        </motion.button>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-white/5 bg-black relative z-10">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <div className="text-2xl font-black uppercase tracking-tighter italic text-white/20 mb-2">REVOO B2B</div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/30">The Architecture of Profitability © 2026</div>
                </div>
            </footer>

        </div>
    );
};

export default RevooB2B;
