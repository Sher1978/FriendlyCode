import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGift, faCalendarAlt, faCrown, faQrcode, faArrowUp, faUtensils, faCheckCircle, faHistory, faRocket, faLeaf, faStar, faHeart } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const MarketingB2C = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    return (
        <div className="min-h-screen bg-background-cream font-sans text-brand-brown overflow-x-hidden relative">
            {/* Navbar */}
            <nav className="fixed top-0 w-full bg-background-cream/80 backdrop-blur-md z-50 border-b border-brand-brown/5 h-16 flex items-center justify-between px-6">
                <div className="font-black text-xl tracking-tighter text-brand-brown">FRIENDLY CODE</div>
                <button
                    onClick={() => navigate('/business')}
                    className="text-brand-orange font-black uppercase tracking-widest text-[10px] md:text-xs flex items-center gap-2 group transition-all"
                >
                    For Business
                    <span className="w-4 h-px bg-brand-orange group-hover:w-6 transition-all"></span>
                </button>
            </nav>

            {/* Block 0: Emotional Intro (NEW) */}
            <section className="pt-32 pb-12 px-6 flex flex-col items-center text-center max-w-6xl mx-auto relative">
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.2 }}
                    className="w-full mb-12 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white group relative aspect-[16/9]"
                >
                    <img
                        src="/hero_pov_v4_no_glare.png"
                        alt="Warm heartwarming 'thank you' moment in a cafe"
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                    className="text-4xl md:text-6xl lg:text-7xl font-black leading-[1.05] mb-8 tracking-tight text-brand-brown"
                >
                    Friendly Code — первое умное приложение для гостей, где тебя <span className="text-brand-orange italic font-serif">любят</span> в ответ.
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    className="text-lg md:text-2xl text-brand-brown/70 max-w-4xl leading-relaxed mb-10 font-medium"
                >
                    Мы создали технологию взаимности. Хватит быть просто «номером столика». Твоя преданность заведению всегда возвращается к тебе в виде реальных привилегий и заботы.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                    className="w-full max-w-5xl mt-12 bg-white/50 backdrop-blur-sm rounded-[3rem] p-8 md:p-12 border border-brand-brown/5 shadow-xl shadow-brand-brown/5"
                >
                    <h3 className="text-xl md:text-2xl font-black text-brand-brown/80 mb-12 uppercase tracking-widest">Вот как это работает:</h3>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
                        {/* Connecting line for desktop */}
                        <div className="hidden md:block absolute top-[2.25rem] left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-brand-orange/20 via-brand-orange/40 to-brand-orange/20"></div>

                        <PathStep
                            num="1"
                            title="Приди в любимое кафе и найди qr код"
                            icon={faUtensils}
                            delay={0.7}
                        />
                        <PathStep
                            num="2"
                            title="Отсканируй код"
                            icon={faQrcode}
                            delay={0.8}
                        />
                        <PathStep
                            num="3"
                            title="Покажи экран официанту"
                            icon={faCheckCircle}
                            delay={0.9}
                        />
                        <PathStep
                            num="4"
                            title="Мгновенно получи подарок"
                            icon={faGift}
                            delay={1.0}
                        />
                    </div>
                </motion.div>
            </section>

            {/* Block 1: Hero Section "Zero Friction" */}
            <section className="py-24 px-6 flex flex-col items-center text-center max-w-5xl mx-auto">
                <div className="w-16 h-px bg-brand-brown/10 mb-12"></div>

                <motion.h2
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-3xl md:text-5xl font-black mb-6 text-brand-brown"
                >
                    Подарки, ради которых <span className="text-brand-orange italic font-serif">НЕ НУЖНО</span> ничего скачивать.
                </motion.h2>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-lg md:text-xl text-brand-brown/70 max-w-2xl leading-relaxed mb-10"
                >
                    Забудь про анкеты, пластик и спам. Твой любимый город теперь знает тебя в лицо.
                </motion.p>

                <button
                    onClick={() => navigate('/map')}
                    className="text-brand-orange font-black uppercase tracking-widest text-sm flex items-center gap-3 group"
                >
                    Найти скидки рядом
                    <span className="w-8 h-px bg-brand-orange group-hover:w-12 transition-all"></span>
                </button>
            </section>

            {/* Block 2: «Анти-скука» (Живи сейчас!) */}
            <section className="py-24 bg-brand-brown/5 px-6 overflow-hidden">
                <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="space-y-8"
                    >
                        <h2 className="text-3xl md:text-5xl font-black text-brand-brown leading-tight">
                            Хватит копить баллы <br /> к 2030 году!
                        </h2>
                        <div className="space-y-4">
                            <p className="text-brand-brown/70 text-lg md:text-xl leading-relaxed">
                                Копить бонусы годами — это жутко устарело и скучно. Мы ценим твое время.
                            </p>
                            <div className="bg-white p-6 rounded-2xl border-l-4 border-brand-orange shadow-lg">
                                <span className="text-sm font-black text-brand-orange uppercase tracking-widest block mb-2">The Golden Rule</span>
                                <p className="text-xl md:text-2xl font-black text-brand-brown">
                                    Просто приди завтра — и получи максимальную скидку!
                                </p>
                                <p className="text-sm text-brand-brown/50 mt-2">
                                    Logic: Сегодня (Welcome) → Завтра (Super VIP). Максимум сразу за возврат на следующий день.
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="relative rounded-[3rem] overflow-hidden shadow-2xl aspect-[3/5] border-[12px] border-white group max-w-md mx-auto"
                    >
                        <img
                            src="/anti_boring_solution.png"
                            alt="Decisive hand dropping old loyalty cards into a recycling bin"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-tr from-brand-brown/10 to-transparent"></div>
                    </motion.div>
                </div>
            </section>

            {/* Block 3: Визуализация цели (The VIP Party) */}
            <section className="py-24 px-6 relative overflow-hidden bg-white">
                <div className="max-w-6xl mx-auto flex flex-col items-center">
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="relative w-full rounded-[3rem] overflow-hidden shadow-2xl aspect-[16/9] border-4 border-background-cream mb-16"
                    >
                        <img
                            src="/vip_pov_celebration_final.jpg"
                            alt="POV: Joyful restaurant celebration. A team welcomes a guest with a VIP cake."
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-8 text-center">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                whileInView={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="bg-brand-orange px-6 py-3 rounded-full text-white font-black uppercase tracking-widest text-sm mb-6 flex items-center gap-2"
                            >
                                <FontAwesomeIcon icon={faStar} />
                                Super VIP Magic
                            </motion.div>
                            <h2 className="text-3xl md:text-6xl font-black text-white leading-tight max-w-3xl mb-6">
                                Почувствуй магию признания.
                            </h2>
                            <p className="text-lg md:text-2xl text-white/90 max-w-2xl font-medium">
                                Статус Super VIP — это когда тебя ждут. Ты больше не гость, ты — часть семьи.
                            </p>
                        </div>
                    </motion.div>
                </div>
            </section>

            <section className="py-24 px-6 bg-white border-t border-brand-brown/5">
                <div className="max-w-5xl mx-auto flex flex-col items-center text-center">
                    <div className="space-y-16 w-full">
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-3xl md:text-5xl font-black text-brand-brown"
                        >
                            Стать Super VIP другом — это проще простого.
                        </motion.h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <Step
                                num="01"
                                icon={faQrcode}
                                title="Сканируй QR"
                                desc="Наведи камеру на код."
                            />
                            <Step
                                num="02"
                                icon={faArrowUp}
                                title="Расти мгновенно"
                                desc="Твой статус растет сразу."
                                highlight
                            />
                            <Step
                                num="03"
                                icon={faUtensils}
                                title="Наслаждайся"
                                desc="Получай свои подарки."
                            />
                        </div>

                        {/* Integrated Final CTA */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="pt-16 border-t border-brand-brown/10 w-full max-w-3xl mx-auto"
                        >
                            <h3 className="text-2xl md:text-3xl font-black mb-4 text-brand-brown leading-tight">
                                Готов к новому уровню гостеприимства?
                            </h3>
                            <p className="text-brand-brown/60 mb-10 text-lg">
                                Попробуй демку прямо сейчас и ощути магию Friendly Code.
                            </p>
                            <button
                                onClick={() => navigate('/qr')}
                                className="w-full md:w-auto bg-brand-orange text-white px-12 py-6 rounded-full font-black text-lg md:text-xl shadow-xl shadow-brand-orange/40 hover:shadow-brand-orange/60 hover:scale-[1.02] transition-all flex items-center justify-center gap-4 uppercase tracking-wider mx-auto"
                            >
                                <FontAwesomeIcon icon={faRocket} />
                                Запустить демку
                            </button>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-16 text-center bg-background-cream flex flex-col items-center gap-8">
                <button
                    onClick={() => navigate('/business')}
                    className="text-brand-orange font-black uppercase tracking-widest text-sm flex items-center gap-3 group transition-all"
                >
                    For Business
                    <span className="w-8 h-px bg-brand-orange group-hover:w-12 transition-all"></span>
                </button>
                <div className="text-brand-brown/40 text-sm">
                    &copy; {new Date().getFullYear()} Friendly Code. Zero Friction Loyalty.
                </div>
            </footer>

        </div>
    );
};

const Step = ({ num, icon, title, desc, highlight }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className={`flex flex-col items-center text-center p-8 rounded-3xl transition-all bg-white shadow-xl shadow-brand-brown/5 border-l-4 ${highlight ? 'border-brand-orange scale-105 z-10' : 'border-brand-brown/10 shadow-none'}`}
    >
        <div className="flex flex-col items-center mb-6">
            <div className="text-xs font-black text-brand-orange/40 mb-3 uppercase tracking-widest">{num}</div>
            <div className={`w-14 h-14 rounded-2xl ${highlight ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/20' : 'bg-brand-brown/5 text-brand-brown'} flex items-center justify-center text-2xl`}>
                <FontAwesomeIcon icon={icon} />
            </div>
        </div>
        <div>
            <h4 className="font-black text-xl mb-3 text-brand-brown">{title}</h4>
            <p className="text-brand-brown/60 leading-relaxed text-sm max-w-[200px]">{desc}</p>
        </div>
    </motion.div>
);

const PathStep = ({ num, icon, title, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay, duration: 0.6 }}
        className="flex flex-col items-center text-center space-y-4 group z-10"
    >
        <div className="relative">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-white shadow-xl flex items-center justify-center text-brand-orange text-2xl md:text-3xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 border border-brand-brown/5">
                <FontAwesomeIcon icon={icon} />
            </div>
            <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-brand-orange text-white text-sm font-black flex items-center justify-center shadow-lg border-2 border-white">
                {num}
            </div>
        </div>
        <p className="text-sm md:text-base font-bold text-brand-brown/80 max-w-[160px] leading-tight">
            {title}
        </p>
    </motion.div>
);

export default MarketingB2C;
