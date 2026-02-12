import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLeaf, faChartLine, faBell, faQrcode, faHandshake, faComments, faGlobe, faArrowRight, faUsers, faBolt, faDatabase, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

const MarketingB2B = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ city: '', phone: '', email: '' });

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

    const handleSubmit = (e) => {
        e.preventDefault();
        alert(i18n.language === 'ru' ? "Заявка принята! Мы свяжемся с вами в течение 24 часов." : "Request received! We will contact you within 24 hours.");
    };

    return (
        <div className="flex flex-col min-h-screen bg-background-cream font-sans text-brand-brown antialiased selection:bg-brand-orange/20 overflow-x-hidden">
            {/* 1. Navigation */}
            <nav className="px-6 py-4 flex justify-between items-center bg-background-cream/80 backdrop-blur-xl sticky top-0 z-50 border-b border-brand-brown/5">
                <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate('/')}>
                    <div className="w-10 h-10 bg-brand-orange rounded-xl flex items-center justify-center text-white rotate-0 group-hover:rotate-12 transition-transform shadow-lg shadow-brand-orange/20">
                        <FontAwesomeIcon icon={faLeaf} />
                    </div>
                    <span className="font-black text-xl leading-tight uppercase tracking-tighter">FRIENDLY CODE</span>
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
                        className="hidden md:block px-8 py-3 bg-brand-brown text-white rounded-full font-black text-sm hover:bg-black hover:shadow-xl transition-all active:scale-95"
                    >
                        {t('b2b_nav_join')}
                    </button>
                </div>
            </nav>

            {/* 2. Hero Section */}
            <section className="relative px-6 py-24 md:py-40 overflow-hidden">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 1 }}
                        className="z-10"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-orange/10 text-brand-orange text-[10px] font-black uppercase tracking-[0.2em] mb-8 border border-brand-orange/20">
                            <span className="w-2 h-2 rounded-full bg-brand-orange animate-pulse"></span>
                            Retention-as-a-Service
                        </div>
                        <h1 className="text-5xl md:text-[5.5rem] font-black leading-[0.95] tracking-tight mb-8">
                            {t('b2b_hero_h1')}
                        </h1>
                        <p className="text-xl md:text-2xl font-medium opacity-60 leading-relaxed max-w-xl mb-12">
                            {t('b2b_hero_sub_new')}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-6">
                            <button
                                onClick={() => window.location.href = '#footer-form'}
                                className="px-10 py-6 bg-brand-orange text-white rounded-[2rem] font-black text-xl shadow-[0_20px_60px_-15px_rgba(230,138,0,0.4)] hover:shadow-[0_25px_70px_-12px_rgba(230,138,0,0.6)] hover:-translate-y-2 transition-all active:scale-95 flex items-center justify-center gap-3"
                            >
                                {t('b2b_hero_cta_new')}
                                <FontAwesomeIcon icon={faArrowRight} className="text-sm opacity-50" />
                            </button>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className="relative hidden lg:block"
                    >
                        <div className="aspect-square bg-gradient-to-br from-brand-brown to-black rounded-[4rem] shadow-2xl relative overflow-hidden group">
                            {/* Visual metaphor placeholder */}
                            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=800')] bg-cover bg-center mix-blend-overlay opacity-60 group-hover:scale-110 transition-transform duration-[2000ms]"></div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                            <div className="absolute bottom-12 left-12 right-12 p-8 bg-white/10 backdrop-blur-2xl rounded-[2.5rem] border border-white/20">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-brand-orange rounded-full flex items-center justify-center text-white text-xl">
                                        <FontAwesomeIcon icon={faChartLine} />
                                    </div>
                                    <div>
                                        <div className="text-white/40 text-[10px] font-black uppercase tracking-widest">Revenue Growth</div>
                                        <div className="text-white text-3xl font-black">+25%</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Decorative elements */}
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-orange/20 blur-[80px] rounded-full"></div>
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-brand-brown/40 blur-[80px] rounded-full"></div>
                    </motion.div>
                </div>
            </section>

            {/* 3. Leaky Bucket Block */}
            <section className="px-6 py-32 bg-white relative overflow-hidden">
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
                        <motion.div {...fadeInUp} className="lg:col-span-12 text-center max-w-4xl mx-auto mb-20">
                            <h2 className="text-4xl md:text-7xl font-black mb-8 leading-tight">{t('b2b_leaky_bucket_h2')}</h2>
                            <p className="text-xl md:text-2xl opacity-60 leading-relaxed mb-12">{t('b2b_leaky_bucket_intro')}</p>
                            <div className="inline-flex items-center gap-6 p-8 bg-red-50 rounded-[2.5rem] border border-red-100 text-left">
                                <div className="w-20 h-20 shrink-0 bg-red-500 rounded-full flex items-center justify-center text-white text-3xl font-black">!</div>
                                <p className="text-red-900 font-black text-xl leading-tight max-w-xl">{t('b2b_leaky_bucket_fact')}</p>
                            </div>
                        </motion.div>

                        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                            <ProblemCard
                                icon={faGlobe}
                                title={t('b2b_problem_aggregators_title')}
                                desc={t('b2b_problem_aggregators_desc')}
                                tag="Margin Killer"
                            />
                            <ProblemCard
                                icon={faMobileAlt}
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
                    </div>
                </div>
            </section>

            {/* 4. Brilliant Simplicity Block */}
            <section className="px-6 py-32 bg-background-cream">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-32 items-center">
                    <motion.div {...fadeInUp}>
                        <h2 className="text-4xl md:text-6xl font-black mb-12 leading-[1.1]">
                            {t('b2b_simplicity_h2')}
                        </h2>
                        <div className="space-y-10">
                            <div className="p-10 bg-white rounded-[3rem] shadow-xl shadow-brand-brown/5 border border-brand-brown/5">
                                <p className="text-2xl font-bold opacity-80 leading-relaxed italic mb-10">"{t('b2b_simplicity_intro')}"</p>
                                <div className="space-y-6">
                                    <div className="flex items-center gap-6 group">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-brand-green/10 flex items-center justify-center text-brand-green text-2xl group-hover:bg-brand-green group-hover:text-white transition-all">
                                            <FontAwesomeIcon icon={faBolt} />
                                        </div>
                                        <div>
                                            <p className="font-black text-xl">{t('b2b_simplicity_daily')}</p>
                                            <p className="text-sm opacity-40 font-bold uppercase tracking-widest">Super VIP Enabled</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 grayscale opacity-40 group hover:grayscale-0 hover:opacity-100 transition-all">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-brand-orange/10 flex items-center justify-center text-brand-orange text-2xl group-hover:bg-brand-orange group-hover:text-white transition-all">
                                            <FontAwesomeIcon icon={faQrcode} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-xl">{t('b2b_simplicity_rare')}</p>
                                            <p className="text-sm font-bold uppercase tracking-widest">Automatic Decay</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <p className="text-xl opacity-60 leading-relaxed font-black uppercase tracking-tight text-center px-10">
                                {t('b2b_simplicity_footer')}
                            </p>
                        </div>
                    </motion.div>

                    <div className="relative">
                        <div className="bg-brand-brown p-16 rounded-[5rem] shadow-[0_50px_100px_-20px_rgba(78,52,46,0.5)] relative overflow-hidden h-[600px] flex flex-col justify-between">
                            <div className="flex items-end justify-between h-80 gap-6">
                                <DetailedBar height="40%" label="Day 1" val="5%" color="#E68A0033" />
                                <DetailedBar height="100%" label="Day 2" val="20%" active color="#E68A00" />
                                <DetailedBar height="75%" label="Day 5" val="15%" color="#E68A0066" />
                                <DetailedBar height="55%" label="Day 10" val="10%" color="#E68A0044" />
                            </div>
                            <div className="pt-12 border-t border-white/10 flex justify-between items-center text-white/40 font-black text-xs tracking-widest">
                                <span>TIME-DECAY ALGORITHM V2.1</span>
                                <div className="flex gap-1">
                                    {[1, 2, 3].map(i => <div key={i} className="w-1 h-1 bg-brand-orange rounded-full"></div>)}
                                </div>
                            </div>
                        </div>
                        {/* Realistic touch */}
                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/20 backdrop-blur-3xl rounded-full border border-white/30 hidden md:flex items-center justify-center text-brand-orange font-black shadow-2xl">
                            ALGO
                        </div>
                    </div>
                </div>
            </section>

            {/* 5. Growth Formula Block */}
            <section className="px-6 py-32 bg-white">
                <div className="max-w-7xl mx-auto">
                    <motion.div {...fadeInUp} className="text-center mb-24">
                        <h2 className="text-4xl md:text-7xl font-black mb-8">{t('b2b_formula_h2')}</h2>
                        <p className="text-xl md:text-2xl opacity-60 max-w-3xl mx-auto leading-relaxed">{t('b2b_formula_intro')}</p>
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
                            color="bg-brand-green"
                        />
                    </div>
                </div>
            </section>

            {/* 6. Functional Benefits Block */}
            <section className="px-6 py-40 bg-brand-brown text-white rounded-[4rem] mx-6 my-12 overflow-hidden relative shadow-2xl">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-orange/10 blur-[150px] rounded-full"></div>
                <div className="max-w-7xl mx-auto relative z-10">
                    <motion.h2 {...fadeInUp} className="text-4xl md:text-7xl font-black mb-32 text-center leading-tight">
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
                            <h2 className="text-4xl md:text-7xl font-black mb-8 leading-[1] tracking-tighter">
                                {t('b2b_final_h2')}
                            </h2>
                            <p className="text-xl opacity-60 mb-12 leading-relaxed">
                                {t('b2b_final_sub')}
                            </p>
                            <div className="flex items-center gap-6">
                                <div className="flex -space-x-4">
                                    {[1, 2, 3, 4].map(i => <div key={i} className="w-12 h-12 rounded-full border-4 border-background-cream bg-slate-200"></div>)}
                                </div>
                                <div className="text-sm font-black uppercase tracking-widest opacity-40">
                                    +120 venues joined this month
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="bg-white p-12 rounded-[4rem] shadow-2xl shadow-brand-brown/10 border border-white"
                        >
                            <form className="space-y-6" onSubmit={handleSubmit}>
                                <div className="space-y-4">
                                    <h3 className="text-center font-black text-xl uppercase tracking-tighter mb-8">
                                        Grow your business
                                    </h3>
                                    <input
                                        type="text"
                                        required
                                        placeholder={t('b2b_form_city')}
                                        className="w-full px-8 py-5 bg-slate-50 border border-brand-brown/5 rounded-[1.5rem] focus:ring-4 focus:ring-brand-orange/10 focus:border-brand-orange outline-none transition-all font-bold"
                                        value={formData.city}
                                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                                    />
                                    <input
                                        type="tel"
                                        required
                                        placeholder={t('b2b_form_phone')}
                                        className="w-full px-8 py-5 bg-slate-50 border border-brand-brown/5 rounded-[1.5rem] focus:ring-4 focus:ring-brand-orange/10 focus:border-brand-orange outline-none transition-all font-bold"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                    <input
                                        type="email"
                                        required
                                        placeholder={t('b2b_form_email')}
                                        className="w-full px-8 py-5 bg-slate-50 border border-brand-brown/5 rounded-[1.5rem] focus:ring-4 focus:ring-brand-orange/10 focus:border-brand-orange outline-none transition-all font-bold"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <button className="group w-full py-6 bg-brand-orange text-white rounded-[2rem] font-black text-xl shadow-xl shadow-brand-orange/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
                                    {t('b2b_final_cta')}
                                    <FontAwesomeIcon icon={faArrowRight} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </form>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Simple Footer */}
            <footer className="px-6 py-20 bg-white border-t border-brand-brown/5">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12 opacity-30 text-[10px] font-black uppercase tracking-[0.2em]">
                    <div className="flex items-center gap-3">
                        <FontAwesomeIcon icon={faLeaf} className="text-xl" />
                        <span>Friendly Code Systems © 2026</span>
                    </div>
                    <div className="flex gap-12">
                        <span>Legal</span>
                        <span>Privacy</span>
                        <span>Dubai Intelligence</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

// Components
const ProblemCard = ({ icon, title, desc, tag }) => (
    <motion.div
        whileHover={{ y: -10 }}
        className="p-10 bg-slate-50 rounded-[3rem] border border-brand-brown/5 flex flex-col gap-6 relative overflow-hidden group"
    >
        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-100 transition-opacity">
            <span className="text-[8px] font-black uppercase tracking-widest bg-red-500 text-white px-3 py-1 rounded-full">{tag}</span>
        </div>
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm text-brand-brown">
            <FontAwesomeIcon icon={icon} />
        </div>
        <h3 className="text-3xl font-black leading-tight tracking-tighter">{title}</h3>
        <p className="opacity-60 text-lg leading-relaxed font-medium">{desc}</p>
    </motion.div>
);

const LargePillarCard = ({ icon, number, title, desc, color }) => (
    <div className="p-12 bg-white rounded-[4rem] border border-brand-brown/5 flex flex-col gap-10 hover:shadow-2xl hover:shadow-brand-brown/5 transition-all group">
        <div className="flex justify-between items-start">
            <div className={`w-24 h-24 ${color} rounded-[2rem] flex items-center justify-center text-white text-4xl shadow-xl transition-transform duration-500 group-hover:rotate-6`}>
                <FontAwesomeIcon icon={icon} />
            </div>
            <span className="text-6xl font-black text-slate-100 group-hover:text-brand-orange/10 transition-colors uppercase">{number}</span>
        </div>
        <div>
            <h3 className="text-3xl font-black mb-6 leading-tight tracking-tighter">{title}</h3>
            <p className="text-lg opacity-60 leading-relaxed font-medium">{desc}</p>
        </div>
    </div>
);

const BigBenefitItem = ({ icon, title, desc }) => (
    <div className="flex flex-col items-center text-center group">
        <div className="w-24 h-24 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center text-4xl mb-12 text-brand-orange group-hover:bg-brand-orange group-hover:text-white transition-all transform group-hover:scale-110 duration-500">
            <FontAwesomeIcon icon={icon} />
        </div>
        <h3 className="text-3xl font-black mb-6 tracking-tighter">{title}</h3>
        <p className="opacity-40 text-lg leading-relaxed max-w-xs group-hover:opacity-80 transition-opacity">{desc}</p>
    </div>
);

const DetailedBar = ({ height, label, val, active, color }) => (
    <div className="h-full flex flex-col items-center justify-end flex-1 max-w-[80px]">
        <div className={`text-sm font-black mb-4 ${active ? 'text-brand-orange text-2xl' : 'text-white/20'}`}>{val}</div>
        <motion.div
            initial={{ height: 0 }}
            whileInView={{ height }}
            transition={{ duration: 1.5, ease: "anticipate" }}
            style={{ backgroundColor: color }}
            className={`w-full rounded-2xl ${active ? 'shadow-[0_0_80px_rgba(230,138,0,0.5)]' : ''}`}
        />
        <div className={`mt-6 text-[10px] font-black uppercase tracking-[0.2em] w-full text-center ${active ? 'text-white' : 'text-white/20'}`}>{label}</div>
    </div>
);

export default MarketingB2B;
