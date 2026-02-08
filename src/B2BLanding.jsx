import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLeaf, faChartLine, faBell, faQrcode, faHandshake, faComments, faGlobe } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const B2BLanding = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'ru' : 'en';
        i18n.changeLanguage(newLang);
    };

    return (
        <div className="flex flex-col min-h-screen bg-background-cream font-sans text-brand-brown antialiased">
            {/* 1. Navigation */}
            <nav className="px-6 py-4 flex justify-between items-center bg-background-cream sticky top-0 z-50">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                    <FontAwesomeIcon icon={faLeaf} className="text-brand-green text-xl" />
                    <span className="font-bold text-lg leading-tight uppercase">{t('app_name')}</span>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleLanguage}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white/50 text-brand-brown/70 hover:bg-white transition"
                    >
                        <span className="text-xs font-bold uppercase">{i18n.language}</span>
                    </button>
                    <button className="px-4 py-2 bg-brand-orange text-white rounded-lg font-bold text-sm">
                        {t('b2b_nav_join')}
                    </button>
                </div>
            </nav>

            {/* 2. Hero Section */}
            <section className="px-6 py-20 text-center flex flex-col items-center">
                <h1 className="text-4xl lg:text-5xl font-black leading-[1.1] whitespace-pre-line">
                    {t('b2b_hero_title')}
                </h1>
                <p className="mt-6 text-xl font-medium opacity-80 max-w-2xl mx-auto leading-relaxed whitespace-pre-line">
                    {t('b2b_hero_sub')}
                </p>
                <button className="mt-10 px-8 py-6 bg-brand-orange text-white rounded-2xl font-bold text-lg shadow-xl active:scale-95 transition-transform flex items-center gap-2">
                    <span>🤝</span> {t('b2b_hero_cta')}
                </button>

                {/* Visual Hero */}
                <div className="mt-12 w-full max-w-xl aspect-video bg-brand-orange/10 rounded-3xl flex items-center justify-center">
                    <FontAwesomeIcon icon={faHandshake} className="text-brand-orange text-8xl" />
                </div>
            </section>

            {/* 3. Problem / Solution */}
            <section className="px-6 py-20 bg-white grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="p-10 bg-red-50 rounded-3xl">
                    <h3 className="text-2xl font-bold text-red-900">{t('b2b_prob_casino')}</h3>
                    <p className="mt-4 text-lg text-red-900/80 leading-relaxed">
                        {t('b2b_prob_casino_body')}
                    </p>
                </div>
                <div className="p-10 bg-brand-green/10 rounded-3xl text-brand-brown">
                    <h3 className="text-2xl font-bold">{t('b2b_sol_table4')}</h3>
                    <p className="mt-4 text-lg opacity-80 leading-relaxed">
                        {t('b2b_sol_table4_body')}
                    </p>
                </div>
            </section>

            {/* 4. What You Get */}
            <section className="px-6 py-20 text-center flex flex-col items-center">
                <h2 className="text-3xl font-bold">{t('b2b_what_you_get')}</h2>
                <div className="mt-12 flex flex-wrap justify-center gap-8">
                    <FeatureCard
                        title={t('b2b_feat_stats')}
                        body={t('b2b_feat_stats_body')}
                        icon={faChartLine}
                        color="#81C784"
                    />
                    <FeatureCard
                        title={t('b2b_feat_comm')}
                        body={t('b2b_feat_comm_body')}
                        icon={faComments}
                        color="#E68A00"
                    />
                </div>
            </section>

            {/* 5. Mechanics (The Fair Game) */}
            <section className="px-6 py-20 bg-background-cream text-center flex flex-col items-center">
                <div className="text-brand-orange font-bold uppercase tracking-widest text-sm">{t('b2b_fair_game')}</div>
                <h2 className="text-3xl font-black mt-4">{t('b2b_fair_game_sub')}</h2>

                <div className="mt-12 w-full max-w-md bg-white p-8 rounded-3xl shadow-lg flex flex-col items-center">
                    <div className="flex items-end justify-between w-full h-40 px-4">
                        <Bar height="50%" label="Today" value="5%" />
                        <Bar height="100%" label="Tmrw" value="20%" active />
                        <Bar height="75%" label="3 Days" value="15%" />
                        <Bar height="60%" label="7 Days" value="10%" />
                    </div>
                    <p className="mt-8 text-brand-brown/70 leading-relaxed">
                        {t('b2b_fair_game_body')}
                    </p>
                </div>
            </section>

            {/* 6. Zero Friction */}
            <section className="px-6 py-20 bg-white text-center flex flex-col items-center">
                <FontAwesomeIcon icon={faQrcode} className="text-brand-brown text-5xl" />
                <h2 className="text-3xl font-bold mt-6">{t('b2b_no_app')}</h2>
                <p className="mt-4 text-lg text-brand-brown/70 max-w-2xl leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: t('b2b_no_app_body') }} />
            </section>

            {/* 7. Footer */}
            <footer className="px-6 py-20 bg-brand-brown text-center text-white flex flex-col items-center">
                <h2 className="text-3xl font-bold">{t('b2b_ready')}</h2>
                <button className="mt-8 px-12 py-6 bg-brand-orange text-white rounded-2xl font-bold text-lg shadow-xl active:scale-95 transition-transform">
                    {t('b2b_trial_cta')}
                </button>
                <div className="mt-20 text-white/40 text-sm">
                    {t('b2b_footer_copy')}
                </div>
            </footer>
        </div>
    );
};

const FeatureCard = ({ title, body, icon, color }) => (
    <div className="w-[350px] p-8 bg-white rounded-3xl shadow-md flex flex-col items-center">
        <div
            className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
            style={{ backgroundColor: `${color}1A` }} // 10% opacity hex
        >
            <FontAwesomeIcon icon={icon} className="text-5xl" style={{ color }} />
        </div>
        <h3 className="text-xl font-bold text-center">{title}</h3>
        <p className="mt-4 text-brand-brown/70 text-center text-sm leading-relaxed">{body}</p>
    </div>
);

const Bar = ({ height, label, value, active }) => (
    <div className="flex flex-col items-center justify-end h-full">
        <div className={`font-bold text-sm mb-2 ${active ? 'text-brand-orange' : ''}`}>{value}</div>
        <div
            className={`w-10 rounded-lg transition-all ${active ? 'bg-brand-orange' : 'bg-brand-orange/30'}`}
            style={{ height }}
        ></div>
        <div className="mt-2 text-[10px] text-brand-brown/50 uppercase tracking-widest font-bold">{label}</div>
    </div>
);

export default B2BLanding;
