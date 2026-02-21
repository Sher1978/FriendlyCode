import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faLeaf, faChartLine, faBell, faQrcode, faHandshake,
    faComments, faGlobe, faArrowRight, faUsers, faBolt,
    faDatabase, faPaperPlane, faMobileButton, faIdCard
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';

const MarketingB2B = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ city: '', phone: '', email: '' });
    const [isSubmitted, setIsSubmitted] = useState(false);

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'ru' : 'en';
        i18n.changeLanguage(newLang);
    };

    const fadeInUp = {
        initial: { opacity: 0, y: 30 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-100px" },
        transition: { duration: 0.8, ease: "easeOut" }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            // Use addDoc to allow multiple submissions without hitting update restrictions
            await addDoc(collection(db, 'leads'), {
                ...formData,
                createdAt: new Date(),
                source: 'b2b_landing'
            });

            setIsSubmitted(true);
            setFormData({ city: '', phone: '', email: '' });
        } catch (error) {
            console.error("Error adding document: ", error);
            alert("Error submitting form. Please try again.");
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-background-cream font-sans text-brand-brown antialiased selection:bg-brand-orange/20 overflow-x-hidden">
            {/* 1. Navigation */}
            <nav className="px-6 py-4 flex justify-between items-center bg-background-cream/80 backdrop-blur-xl sticky top-0 z-50 border-b border-brand-brown/5">
                <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate('/')}>
                    <div className="w-10 h-10 bg-brand-orange rounded-xl flex items-center justify-center text-white rotate-0 group-hover:rotate-12 transition-transform shadow-lg shadow-brand-orange/20">
                        <FontAwesomeIcon icon={faLeaf} />
                    </div>
                    <span className="font-black text-xl leading-tight uppercase tracking-tighter text-brand-brown">FRIENDLY CODE</span>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleLanguage}
                        className="w-12 h-12 flex items-center justify-center rounded-full bg-white/50 text-brand-brown font-black border border-brand-brown/5 hover:bg-white hover:shadow-md transition-all active:scale-90"
                    >
                        {i18n.language.toUpperCase()}
                    </button>
                    <button
                        onClick={() => window.location.href = '#footer-form'}
                        className="hidden md:block px-8 py-3 bg-brand-brown text-white rounded-full font-black text-sm tracking-wide hover:bg-black hover:shadow-xl transition-all active:scale-95"
                    >
                        {t('b2b_nav_join')}
                    </button>
                </div>
            </nav>

            {/* 2. Hero Section */}
            <section className="relative px-6 py-12 md:py-32 overflow-hidden">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 1 }}
                        className="z-10 order-2 lg:order-1"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-orange/10 text-brand-orange text-[10px] font-black uppercase tracking-[0.2em] mb-8 border border-brand-orange/20">
                            <span className="w-2 h-2 rounded-full bg-brand-orange animate-pulse"></span>
                            Retention-as-a-Service
                        </div>
                        <h1 className="text-5xl md:text-[5.5rem] font-black leading-[0.95] tracking-tighter mb-8 text-brand-brown">
                            {i18n.language === 'ru' ? (
                                <>Привлечь гостя — дорого. Удержать — <span className="text-brand-orange italic">бесценно</span>.</>
                            ) : (
                                <>Attract a guest — expensive. Retain — <span className="text-brand-orange italic">priceless</span>.</>
                            )}
                        </h1>
                        <p className="text-xl md:text-2xl font-medium opacity-70 leading-relaxed max-w-xl mb-12 text-brand-brown">
                            {t('b2b_hero_sub_new')}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-6">
                            <button
                                onClick={() => window.location.href = '#footer-form'}
                                className="px-10 py-6 bg-brand-orange text-white rounded-[2rem] font-black text-xl tracking-tight shadow-[0_20px_60px_-15px_rgba(230,138,0,0.4)] hover:shadow-[0_25px_70px_-12px_rgba(230,138,0,0.6)] hover:-translate-y-2 transition-all active:scale-95 flex items-center justify-center gap-3"
                            >
                                {t('b2b_hero_cta_new')}
                                <FontAwesomeIcon icon={faArrowRight} className="text-sm opacity-50" />
                            </button>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, rotate: -3 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className="relative block order-1 lg:order-2"
                    >
                        <div className="aspect-[4/5] bg-gradient-to-br from-brand-brown to-black rounded-[4rem] shadow-2xl relative overflow-hidden group border-8 border-white">
                            <img
                                src="/paying_with_iphone_v3.png"
                                alt="Happy guest POV"
                                className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-[2000ms]"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                            <div className="absolute bottom-12 left-12 right-12 p-8 bg-white/10 backdrop-blur-2xl rounded-[2.5rem] border border-white/20">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-brand-orange rounded-full flex items-center justify-center text-white text-xl shadow-lg shadow-brand-orange/30">
                                        <FontAwesomeIcon icon={faChartLine} />
                                    </div>
                                    <div>
                                        <div className="text-white/60 text-[10px] font-black uppercase tracking-widest">Revenue Growth</div>
                                        <div className="text-white text-3xl font-black tracking-tighter">+25%</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 3. Leaky Bucket Block */}
            <section className="px-6 py-32 bg-white relative overflow-hidden">
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
                        <motion.div {...fadeInUp} className="lg:col-span-6 text-left">
                            <h2 className="text-4xl md:text-7xl font-black mb-8 leading-[0.95] tracking-tighter text-brand-brown">{t('b2b_leaky_bucket_h2')}</h2>
                            <p className="text-xl md:text-2xl opacity-70 leading-relaxed mb-12 font-medium">{t('b2b_leaky_bucket_intro')}</p>

                            <div className="grid grid-cols-1 gap-6 mb-12">
                                <ProblemCard
                                    icon={faGlobe}
                                    title={t('b2b_problem_aggregators_title')}
                                    desc={t('b2b_problem_aggregators_desc')}
                                    tag="Margin Killer"
                                />
                                <ProblemCard
                                    icon={faMobileButton}
                                    title={t('b2b_problem_app_title')}
                                    desc={t('b2b_problem_app_desc')}
                                    tag="$20k+ Loss"
                                />
                                <ProblemCard
                                    icon={faIdCard}
                                    title={t('b2b_problem_plastic_title')}
                                    desc={t('b2b_problem_plastic_desc')}
                                    tag="Analog Era"
                                />
                            </div>

                            <div className="inline-flex items-center gap-6 p-8 bg-red-50 rounded-[2.5rem] border border-red-100 text-left w-full">
                                <div className="w-16 h-16 shrink-0 bg-red-500 rounded-full flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-red-500/30">!</div>
                                <p className="text-red-900 font-black text-lg leading-tight">{t('b2b_leaky_bucket_fact')}</p>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1 }}
                            className="lg:col-span-6 relative"
                        >
                            <div className="aspect-[4/5] rounded-[4rem] overflow-hidden border-8 border-background-cream shadow-2xl relative">
                                <img
                                    src="/leaky_bucket_money_v2.png"
                                    alt="Leaky bucket metaphor"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-brand-brown/10 mix-blend-multiply"></div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* 4. Brilliant Simplicity Block */}
            <section className="px-6 py-32 bg-background-cream">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-32 items-center">
                    <motion.div {...fadeInUp}>
                        <h2 className="text-4xl md:text-6xl font-black mb-12 leading-[1.05] tracking-tighter text-brand-brown">
                            {t('b2b_simplicity_h2')}
                        </h2>
                        <div className="space-y-10">
                            <div className="p-10 bg-white rounded-[3rem] shadow-xl shadow-brand-brown/5 border border-brand-brown/5">
                                <p className="text-2xl font-bold opacity-80 leading-relaxed italic mb-10 text-brand-brown">"{t('b2b_simplicity_intro')}"</p>
                                <div className="space-y-6">
                                    <div className="flex items-center gap-6 group">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-orange-400/10 flex items-center justify-center text-orange-400 text-2xl group-hover:bg-orange-400 group-hover:text-white transition-all">
                                            <FontAwesomeIcon icon={faBolt} />
                                        </div>
                                        <div>
                                            <p className="font-black text-xl tracking-tight">{t('b2b_simplicity_daily')}</p>
                                            <p className="text-xs opacity-50 font-bold uppercase tracking-widest text-brand-brown">Super VIP Enabled</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 grayscale opacity-40 group hover:grayscale-0 hover:opacity-100 transition-all">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-brand-orange/10 flex items-center justify-center text-brand-orange text-2xl group-hover:bg-brand-orange group-hover:text-white transition-all">
                                            <FontAwesomeIcon icon={faQrcode} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-xl tracking-tight">{t('b2b_simplicity_rare')}</p>
                                            <p className="text-xs font-bold uppercase tracking-widest text-brand-brown">Automatic Decay</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <p className="text-xl opacity-60 leading-relaxed font-black uppercase tracking-tight text-center px-10 text-brand-brown">
                                {t('b2b_simplicity_footer')}
                            </p>
                        </div>
                    </motion.div>

                    <div className="relative">
                        <div className="bg-brand-brown p-16 rounded-[5rem] shadow-[0_50px_100px_-20px_rgba(78,52,46,0.5)] relative overflow-hidden h-[600px] flex flex-col justify-between border-4 border-white/10">
                            <div className="flex items-end justify-between h-80 gap-6">
                                <DetailedBar height="40%" label="Day 1" val="5%" color="#E68A0033" />
                                <DetailedBar height="100%" label="Day 2" val="20%" active color="#E68A00" />
                                <DetailedBar height="65%" label="Day 5" val="15%" color="#E68A0066" />
                                <DetailedBar height="55%" label="Day 10" val="10%" color="#E68A0044" />
                            </div>
                            <div className="text-center mt-12">
                                <div className="inline-block px-6 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white/60 text-xs font-black uppercase tracking-widest">
                                    Dynamic Discount Algorithm
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 5. Growth Formula Block */}
            <section className="px-6 py-32 bg-white">
                <div className="max-w-7xl mx-auto">
                    <motion.div {...fadeInUp} className="text-center mb-24">
                        <h2 className="text-4xl md:text-7xl font-black mb-8 tracking-tighter text-brand-brown">{t('b2b_formula_h2')}</h2>
                        <p className="text-xl md:text-2xl opacity-60 max-w-3xl mx-auto leading-relaxed font-medium">{t('b2b_formula_intro')}</p>
                    </motion.div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        <LargePillarCard
                            icon={faBolt}
                            number="01"
                            title={t('b2b_formula_pillar1_title')}
                            desc={t('b2b_formula_pillar1_desc')}
                            color="bg-brand-orange"
                        />
                        <LargePillarCard
                            icon={faUsers}
                            number="02"
                            title={t('b2b_formula_pillar2_title')}
                            desc={t('b2b_formula_pillar2_desc')}
                            color="bg-indigo-600"
                        />
                        <LargePillarCard
                            icon={faChartLine}
                            number="03"
                            title={t('b2b_formula_pillar3_title')}
                            desc={t('b2b_formula_pillar3_desc')}
                            color="bg-green-600"
                        />
                    </div>
                </div>
            </section>

            {/* 6. Benefits & Social Proof */}
            <section className="px-6 py-40 bg-brand-brown text-white mx-0 sm:mx-6 sm:rounded-[4rem] my-12 overflow-hidden relative shadow-2xl">
                {/* Background Image Overlay */}
                <div className="absolute inset-0 z-0 opacity-20">
                    <img src="/vip_pov_celebration_final.jpg" alt="Celebration" className="w-full h-full object-cover grayscale" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-brand-brown via-brand-brown/90 to-brand-brown/80 z-0"></div>

                <div className="max-w-7xl mx-auto relative z-10">
                    <motion.h2 {...fadeInUp} className="text-4xl md:text-7xl font-black mb-32 text-center leading-tight tracking-tighter">
                        {t('b2b_benefits_h2')}
                    </motion.h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-24">
                        <BigBenefitItem
                            icon={faBolt}
                            title={t('b2b_benefit_install_title')}
                            desc={t('b2b_benefit_install_desc')}
                        />
                        <BigBenefitItem
                            icon={faDatabase}
                            title={t('b2b_benefit_analytics_title')}
                            desc={t('b2b_benefit_analytics_desc')}
                        />
                        <BigBenefitItem
                            icon={faPaperPlane}
                            title={t('b2b_benefit_autopilot_title')}
                            desc={t('b2b_benefit_autopilot_desc')}
                        />
                    </div>
                </div>
            </section>

            {/* 7. Final CTA & Lead Form */}
            <section id="footer-form" className="px-6 py-32 md:py-48 bg-background-cream">
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
                        <motion.div {...fadeInUp}>
                            <h2 className="text-4xl md:text-7xl font-black mb-8 leading-[1] tracking-tighter text-brand-brown">
                                {t('b2b_final_h2')}
                            </h2>
                            <p className="text-xl opacity-60 mb-12 leading-relaxed font-medium">
                                {t('b2b_final_sub')}
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="bg-white p-12 rounded-[4rem] shadow-2xl shadow-brand-brown/10 border border-white relative overflow-hidden"
                        >
                            <AnimatePresence mode="wait">
                                {isSubmitted ? (
                                    <motion.div
                                        key="thank-you"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="text-center py-12"
                                    >
                                        <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-8 shadow-inner">
                                            <FontAwesomeIcon icon={faHandshake} />
                                        </div>
                                        <h3 className="text-3xl font-black text-brand-brown mb-4 tracking-tight">
                                            {i18n.language === 'ru' ? 'Спасибо!' : 'Thank you!'}
                                        </h3>
                                        <p className="text-lg opacity-70 mb-8 font-medium leading-relaxed max-w-sm mx-auto">
                                            {i18n.language === 'ru'
                                                ? 'Мы получили вашу заявку и свяжемся с вами в течение 24 часов.'
                                                : 'We have received your request and will contact you within 24 hours.'}
                                        </p>
                                        <div className="pt-8 border-t border-brand-brown/5">
                                            <p className="text-sm opacity-50 mb-2">{i18n.language === 'ru' ? 'Срочный вопрос?' : 'Urgent question?'}</p>
                                            <a href="mailto:friiendlycode@gmail.com" className="text-brand-orange font-bold hover:underline transition-all">
                                                friiendlycode@gmail.com
                                            </a>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.form
                                        key="lead-form"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="space-y-6"
                                        onSubmit={handleSubmit}
                                    >
                                        <div className="space-y-4">
                                            <input
                                                type="text"
                                                required
                                                placeholder={t('b2b_form_city')}
                                                className="w-full px-8 py-5 bg-slate-50 border border-brand-brown/5 rounded-[1.5rem] outline-none font-bold text-brand-brown placeholder:font-medium placeholder:opacity-40 focus:bg-white focus:border-brand-orange/50 transition-all"
                                                value={formData.city}
                                                onChange={e => setFormData({ ...formData, city: e.target.value })}
                                            />
                                            <input
                                                type="tel"
                                                required
                                                placeholder={t('b2b_form_phone')}
                                                className="w-full px-8 py-5 bg-slate-50 border border-brand-brown/5 rounded-[1.5rem] outline-none font-bold text-brand-brown placeholder:font-medium placeholder:opacity-40 focus:bg-white focus:border-brand-orange/50 transition-all"
                                                value={formData.phone}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            />
                                            <input
                                                type="email"
                                                required
                                                placeholder={t('b2b_form_email')}
                                                className="w-full px-8 py-5 bg-slate-50 border border-brand-brown/5 rounded-[1.5rem] outline-none font-bold text-brand-brown placeholder:font-medium placeholder:opacity-40 focus:bg-white focus:border-brand-orange/50 transition-all"
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            />
                                        </div>
                                        <button className="w-full py-6 bg-brand-orange text-white rounded-[2rem] font-black text-xl tracking-wide hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-brand-orange/20">
                                            {t('b2b_final_cta')}
                                        </button>
                                    </motion.form>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </div>
                </div>
            </section>
        </div>
    );
};

const ProblemCard = ({ icon, title, desc, tag }) => (
    <div className="p-8 bg-red-50 rounded-[2.5rem] border border-red-100 flex flex-col sm:flex-row items-start sm:items-center gap-6 relative group hover:bg-red-100 hover:border-red-200 hover:shadow-xl hover:shadow-red-900/10 transition-all">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm text-red-500 shrink-0 group-hover:scale-110 group-hover:bg-red-500 group-hover:text-white transition-all border border-red-100">
            <FontAwesomeIcon icon={icon} />
        </div>
        <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
                <h3 className="text-xl font-black leading-tight tracking-tight text-brand-brown group-hover:text-red-900 transition-colors">{title}</h3>
                <div className="px-3 py-1 bg-white/50 rounded-full text-[10px] font-black uppercase tracking-widest text-red-400 border border-red-100 group-hover:bg-red-500 group-hover:text-white group-hover:border-transparent transition-all">
                    {tag}
                </div>
            </div>
            <p className="opacity-70 text-sm leading-relaxed font-bold text-red-900/60 group-hover:text-red-900/80 transition-colors">{desc}</p>
        </div>
    </div>
);

const LargePillarCard = ({ icon, number, title, desc, color }) => (
    <div className="p-12 bg-background-cream rounded-[4rem] border border-brand-brown/5 flex flex-col gap-10 hover:shadow-2xl transition-all group relative overflow-hidden">
        <div className={`absolute top-0 right-0 w-32 h-32 ${color} opacity-5 rounded-bl-[4rem] -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-700`}></div>
        <div className="flex justify-between items-start z-10">
            <div className={`w-24 h-24 ${color} rounded-[2rem] flex items-center justify-center text-white text-4xl shadow-xl transition-transform group-hover:rotate-6`}>
                <FontAwesomeIcon icon={icon} />
            </div>
            <span className="text-6xl font-black text-slate-100">{number}</span>
        </div>
        <div className="z-10">
            <h3 className="text-3xl font-black mb-6 leading-tight tracking-tight text-brand-brown">{title}</h3>
            <p className="text-lg opacity-60 leading-relaxed font-medium">{desc}</p>
        </div>
    </div>
);

const BigBenefitItem = ({ icon, title, desc }) => (
    <div className="flex flex-col items-center text-center group">
        <div className="w-24 h-24 rounded-[2rem] bg-white/10 border border-white/10 flex items-center justify-center text-4xl mb-12 text-brand-orange group-hover:bg-brand-orange group-hover:text-white transition-all shadow-2xl">
            <FontAwesomeIcon icon={icon} />
        </div>
        <h3 className="text-3xl font-black mb-6 tracking-tight">{title}</h3>
        <p className="opacity-50 text-lg leading-relaxed max-w-xs font-medium">{desc}</p>
    </div>
);

const DetailedBar = ({ height, label, val, active, color }) => (
    <div className="h-full flex flex-col items-center justify-end flex-1 max-w-[80px]">
        <div className={`text-sm font-black mb-4 ${active ? 'text-brand-orange text-2xl' : 'text-white/20'}`}>{val}</div>
        <motion.div
            initial={{ height: 0 }}
            whileInView={{ height }}
            transition={{ duration: 1.5 }}
            style={{ backgroundColor: color }}
            className={`w-full rounded-2xl ${active ? 'shadow-[0_0_80px_rgba(230,138,0,0.5)]' : ''}`}
        />
        <div className={`mt-6 text-[10px] font-black uppercase tracking-[0.2em] w-full text-center ${active ? 'text-white' : 'text-white/20'}`}>{label}</div>
    </div>
);

export default MarketingB2B;
