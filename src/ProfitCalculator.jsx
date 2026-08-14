import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowRight, 
  faCheck,
  faBolt,
  faShieldHalved,
  faPlus,
  faMinus,
  faRocket,
  faCoins,
  faChartLine,
  faTags
} from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';

const formatCurrency = (val) => {
  const isNegative = val < 0;
  const absVal = Math.abs(Math.round(val)).toLocaleString('ru-RU').replace(/\s/g, ' ');
  return `${isNegative ? '-$' : '$'}${absVal}`;
};

const formatNumber = (val) => {
  return Math.round(val).toLocaleString('ru-RU').replace(/\s/g, ' ');
};

const DISCOUNT_TIERS = [
  { label: '3-7%', effectiveDiscount: 0.05, repeatLift: 0.15, liftPercent: 15, effectivePercentText: '5%' },
  { label: '5-15%', effectiveDiscount: 0.10, repeatLift: 0.25, liftPercent: 25, effectivePercentText: '10%' },
  { label: '5-20%', effectiveDiscount: 0.125, repeatLift: 0.40, liftPercent: 40, effectivePercentText: '12.5%' }
];

const ProfitCalculator = ({ onOpenContactModal }) => {
  const { t } = useTranslation();

  // State values matching business defaults
  const [monthlyChecks, setMonthlyChecks] = useState(1100);
  const [avgCheck, setAvgCheck] = useState(12);
  const [fixedCosts, setFixedCosts] = useState(18500);
  const [discountTierIdx, setDiscountTierIdx] = useState(2); // Default 5-20% (+40% lift)

  const activeTier = DISCOUNT_TIERS[discountTierIdx];

  // Calculations: Honest model deducting discount from avg check
  const discountedAvgCheck = avgCheck * (1 - activeTier.effectiveDiscount);
  const checksWithRevo = Math.round(monthlyChecks * (1 + activeTier.repeatLift));

  const revenueBefore = monthlyChecks * avgCheck;
  const revenueWithRevo = checksWithRevo * discountedAvgCheck;

  // Food cost = 30% of standard check ($3.60 for $12 check)
  const unitFoodCost = avgCheck * 0.30;
  const unitMarginBefore = avgCheck * 0.70;
  const unitMarginWithRevo = discountedAvgCheck - unitFoodCost;

  const grossProfitBefore = monthlyChecks * unitMarginBefore;
  const grossProfitWithRevo = checksWithRevo * unitMarginWithRevo;

  const netProfitBefore = Math.round(grossProfitBefore - fixedCosts);
  const netProfitWithRevo = Math.round(grossProfitWithRevo - fixedCosts);

  // Extra net profit gained per month and year
  const profitDiffMonthly = Math.round(grossProfitWithRevo - grossProfitBefore);
  const profitDiffYearly = profitDiffMonthly * 12;

  // Percentage & Multiplier calculations
  let growthRatioText = "";
  let growthPercent = 0;
  
  if (netProfitBefore > 0 && netProfitWithRevo > 0) {
    const ratio = (netProfitWithRevo / netProfitBefore).toFixed(1);
    growthPercent = Math.round(((netProfitWithRevo - netProfitBefore) / netProfitBefore) * 100);
    growthRatioText = t('calc_profit_growth_multiplier', `Прибыль вырастет в ${ratio}x раза (+${growthPercent}%)!`);
  } else if (netProfitBefore <= 0 && netProfitWithRevo > netProfitBefore) {
    growthRatioText = t('calc_loss_reduction', `Рост чистой прибыли +${formatCurrency(profitDiffMonthly)} / мес!`);
  } else {
    growthRatioText = t('calc_growth_badge_default', `+${activeTier.liftPercent}% повторных визитов с Revo`);
  }

  // Helper for Steppers
  const adjustValue = (setter, current, step, min, max) => {
    const newVal = Math.min(max, Math.max(min, current + step));
    setter(newVal);
  };

  const handleCTAClick = () => {
    if (onOpenContactModal) {
      onOpenContactModal();
    } else {
      window.open('https://t.me/revoogiftx_bot', '_blank');
    }
  };

  return (
    <div id="profit-calculator" className="w-full max-w-6xl mx-auto my-6 sm:my-12 px-3 sm:px-6">
      
      {/* MAIN SIMULATOR WIDGET CARD */}
      <motion.div 
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative bg-[#0B0C10]/95 rounded-3xl sm:rounded-[36px] border border-white/10 p-5 sm:p-8 md:p-10 shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden backdrop-blur-2xl"
      >
        {/* Glow ambient background accents (Dubai Gold & Neon Emerald) */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#00FF41]/10 rounded-full blur-[130px] pointer-events-none" />

        {/* CARD HEADER SECTION */}
        <div className="mb-8 text-left relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-[10px] sm:text-xs font-black uppercase tracking-[0.25em] mb-4 shadow-[0_0_15px_rgba(212,175,55,0.15)]">
            <FontAwesomeIcon icon={faChartLine} />
            <span>{t('calc_tag_sim', 'Интерактивный симулятор ROI')}</span>
          </div>

          <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight mb-3">
            {t('calc_title_landing', 'Рассчитайте рост чистой прибыли Revo')}
          </h3>
          <p className="text-white/60 text-xs sm:text-sm md:text-base font-medium max-w-2xl leading-relaxed">
            {t('calc_subtitle_landing', 'Настройте параметры вашего заведения. Выберите размер скидки и подвигайте слайдеры для моментального расчета честной прибыли.')}
          </p>
        </div>

        {/* SLIDERS & CONTROLS GRID (4 CARDS) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8 relative z-10 text-left">
          
          {/* CONTROL CARD 1: Monthly Checks */}
          <div className="bg-white/[0.03] p-4 sm:p-5 rounded-2xl border border-white/10 hover:border-[#D4AF37]/40 transition-all flex flex-col justify-between group">
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <FontAwesomeIcon icon={faCoins} className="text-[#D4AF37] text-xs" />
                  {t('calc_label_checks', 'Чеков в месяц:')}
                </label>
              </div>

              {/* Stepper + Input Header */}
              <div className="flex items-center justify-between gap-2 mb-4 bg-black/40 p-1.5 rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => adjustValue(setMonthlyChecks, monthlyChecks, -100, 100, 20000)}
                  className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/15 active:scale-95 text-white/80 flex items-center justify-center transition-all border border-white/10 cursor-pointer"
                >
                  <FontAwesomeIcon icon={faMinus} className="text-xs" />
                </button>

                <div className="text-center font-mono font-black text-base sm:text-lg text-white">
                  {formatNumber(monthlyChecks)}
                  <span className="text-[9px] text-white/40 font-sans uppercase font-bold block leading-none">чеков/мес</span>
                </div>

                <button
                  type="button"
                  onClick={() => adjustValue(setMonthlyChecks, monthlyChecks, 100, 100, 20000)}
                  className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/15 active:scale-95 text-white/80 flex items-center justify-center transition-all border border-white/10 cursor-pointer"
                >
                  <FontAwesomeIcon icon={faPlus} className="text-xs" />
                </button>
              </div>

              {/* Range Slider */}
              <div className="mb-4">
                <input
                  type="range"
                  min="100"
                  max="10000"
                  step="50"
                  value={monthlyChecks}
                  onChange={(e) => setMonthlyChecks(Number(e.target.value))}
                  className="revo-slider revo-slider-gold"
                />
              </div>

              {/* Preset Quick Chips */}
              <div className="flex flex-wrap gap-1 mb-3">
                {[500, 1100, 2500, 5000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setMonthlyChecks(preset)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all border cursor-pointer ${
                      monthlyChecks === preset
                        ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]'
                        : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {formatNumber(preset)}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-white/5 flex justify-between items-center text-[11px] font-bold">
              <span className="text-white/50">До Revo: <span className="text-white font-mono">{formatNumber(monthlyChecks)}</span></span>
              <span className="text-[#00FF41] font-mono bg-[#00FF41]/10 px-1.5 py-0.5 rounded border border-[#00FF41]/20">
                +{activeTier.liftPercent}% ➔ {formatNumber(checksWithRevo)}
              </span>
            </div>
          </div>

          {/* CONTROL CARD 2: Average Check */}
          <div className="bg-white/[0.03] p-4 sm:p-5 rounded-2xl border border-white/10 hover:border-cyan-500/40 transition-all flex flex-col justify-between group">
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <FontAwesomeIcon icon={faChartLine} className="text-cyan-400 text-xs" />
                  {t('calc_label_avg_check', 'Средний чек ($):')}
                </label>
              </div>

              {/* Stepper + Input Header */}
              <div className="flex items-center justify-between gap-2 mb-4 bg-black/40 p-1.5 rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => adjustValue(setAvgCheck, avgCheck, -1, 1, 500)}
                  className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/15 active:scale-95 text-white/80 flex items-center justify-center transition-all border border-white/10 cursor-pointer"
                >
                  <FontAwesomeIcon icon={faMinus} className="text-xs" />
                </button>

                <div className="text-center font-mono font-black text-base sm:text-lg text-cyan-400">
                  ${avgCheck}
                  <span className="text-[9px] text-white/40 font-sans uppercase font-bold block leading-none">стандартный</span>
                </div>

                <button
                  type="button"
                  onClick={() => adjustValue(setAvgCheck, avgCheck, 1, 1, 500)}
                  className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/15 active:scale-95 text-white/80 flex items-center justify-center transition-all border border-white/10 cursor-pointer"
                >
                  <FontAwesomeIcon icon={faPlus} className="text-xs" />
                </button>
              </div>

              {/* Range Slider */}
              <div className="mb-4">
                <input
                  type="range"
                  min="1"
                  max="150"
                  step="1"
                  value={avgCheck}
                  onChange={(e) => setAvgCheck(Number(e.target.value))}
                  className="revo-slider revo-slider-cyan"
                />
              </div>

              {/* Preset Quick Chips */}
              <div className="flex flex-wrap gap-1 mb-3">
                {[5, 12, 25, 50].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAvgCheck(preset)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all border cursor-pointer ${
                      avgCheck === preset
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    ${preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-white/5 flex justify-between items-center text-[11px] font-bold">
              <span className="text-white/50">Со скидкой:</span>
              <span className="text-amber-300 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                ${discountedAvgCheck.toFixed(2)}
              </span>
            </div>
          </div>

          {/* NEW CONTROL CARD 3: DISCOUNT RANGE & REPEAT VISITS LIFT */}
          <div className="bg-white/[0.03] p-4 sm:p-5 rounded-2xl border-2 border-amber-500/40 hover:border-amber-400 transition-all flex flex-col justify-between group relative overflow-hidden shadow-[0_0_20px_rgba(212,175,55,0.1)]">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <FontAwesomeIcon icon={faTags} className="text-amber-400 text-xs" />
                  <span>Размер скидки:</span>
                </label>
              </div>

              {/* Display Header */}
              <div className="flex items-center justify-between gap-2 mb-4 bg-amber-950/40 p-2 rounded-xl border border-amber-500/30">
                <div className="text-left">
                  <span className="text-[10px] text-amber-400/80 font-mono uppercase font-black block leading-none">Скидка гостя</span>
                  <div className="font-mono font-black text-base sm:text-lg text-amber-300">
                    {activeTier.label}
                  </div>
                </div>

                <div className="text-right border-l border-amber-500/20 pl-3">
                  <span className="text-[10px] text-[#00FF41] font-mono uppercase font-black block leading-none">Рост возвратов</span>
                  <div className="font-mono font-black text-base sm:text-lg text-[#00FF41]">
                    +{activeTier.liftPercent}%
                  </div>
                </div>
              </div>

              {/* Interlocked Range Slider */}
              <div className="mb-4">
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="1"
                  value={discountTierIdx}
                  onChange={(e) => setDiscountTierIdx(Number(e.target.value))}
                  className="revo-slider revo-slider-gold cursor-pointer"
                />
              </div>

              {/* Tier Selection Chips */}
              <div className="grid grid-cols-3 gap-1 mb-3">
                {DISCOUNT_TIERS.map((tier, idx) => (
                  <button
                    key={tier.label}
                    type="button"
                    onClick={() => setDiscountTierIdx(idx)}
                    className={`py-1.5 px-1 rounded-lg text-[9px] font-mono font-black transition-all border text-center cursor-pointer ${
                      discountTierIdx === idx
                        ? 'bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] text-black border-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.4)]'
                        : 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <div>{tier.label}</div>
                    <div className="text-[8px] opacity-80">+{tier.liftPercent}%</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-white/5 flex justify-between items-center text-[11px] font-bold">
              <span className="text-white/50">Корреляция:</span>
              <span className="text-[#00FF41] font-mono bg-[#00FF41]/10 px-1.5 py-0.5 rounded border border-[#00FF41]/20">
                Выше скидка ➔ Больше визитов
              </span>
            </div>
          </div>

          {/* CONTROL CARD 4: Fixed Expenses */}
          <div className="bg-white/[0.03] p-4 sm:p-5 rounded-2xl border border-white/10 hover:border-indigo-500/40 transition-all flex flex-col justify-between group">
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <FontAwesomeIcon icon={faShieldHalved} className="text-indigo-400 text-xs" />
                  {t('calc_label_fixed_costs', 'Расходы ($/мес):')}
                </label>
              </div>

              {/* Stepper + Input Header */}
              <div className="flex items-center justify-between gap-2 mb-4 bg-black/40 p-1.5 rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => adjustValue(setFixedCosts, fixedCosts, -500, 0, 200000)}
                  className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/15 active:scale-95 text-white/80 flex items-center justify-center transition-all border border-white/10 cursor-pointer"
                >
                  <FontAwesomeIcon icon={faMinus} className="text-xs" />
                </button>

                <div className="text-center font-mono font-black text-base sm:text-lg text-indigo-300">
                  ${formatNumber(fixedCosts)}
                  <span className="text-[9px] text-white/40 font-sans uppercase font-bold block leading-none">Аренда+ФОТ</span>
                </div>

                <button
                  type="button"
                  onClick={() => adjustValue(setFixedCosts, fixedCosts, 500, 0, 200000)}
                  className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/15 active:scale-95 text-white/80 flex items-center justify-center transition-all border border-white/10 cursor-pointer"
                >
                  <FontAwesomeIcon icon={faPlus} className="text-xs" />
                </button>
              </div>

              {/* Range Slider */}
              <div className="mb-4">
                <input
                  type="range"
                  min="500"
                  max="50000"
                  step="250"
                  value={fixedCosts}
                  onChange={(e) => setFixedCosts(Number(e.target.value))}
                  className="revo-slider"
                />
              </div>

              {/* Preset Quick Chips */}
              <div className="flex flex-wrap gap-1 mb-3">
                {[5000, 10000, 18500, 30000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setFixedCosts(preset)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all border cursor-pointer ${
                      fixedCosts === preset
                        ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300'
                        : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    ${formatNumber(preset)}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-white/5 flex justify-between items-center text-[11px] font-bold">
              <span className="text-white/50">Рост расходов:</span>
              <span className="text-indigo-400 font-mono bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-500/30">
                0% с Revo
              </span>
            </div>
          </div>

        </div>

        {/* ---------------------------------------------------- */}
        {/* HERO RESULTS CARD: ACCENTED FINAL VALUES (Итоговые значения) */}
        {/* ---------------------------------------------------- */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-gradient-to-b from-[#0B1E14] via-[#08170F] to-[#040C07] rounded-3xl border-2 border-[#00FF41]/60 p-5 sm:p-8 md:p-10 shadow-[0_0_50px_rgba(0,255,65,0.2)] relative overflow-hidden text-left z-10"
        >
          {/* Subtle Grid / Pattern overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(#00FF41_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-[#00FF41]/15 rounded-full blur-[100px] pointer-events-none" />

          {/* HERO TOP BADGE & TITLE */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-6 border-b border-[#00FF41]/20 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#00FF41]/10 border border-[#00FF41]/40 flex items-center justify-center text-[#00FF41] text-xl shadow-[0_0_20px_rgba(0,255,65,0.3)]">
                <FontAwesomeIcon icon={faRocket} />
              </div>
              <div>
                <span className="text-[10px] font-mono font-black tracking-[0.3em] uppercase text-[#00FF41] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#00FF41] animate-ping" />
                  {t('calc_result_hero_badge', 'ИТОГОВЫЙ РАСЧЕТ ОКУПАЕМОСТИ')}
                </span>
                <h4 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-tight">
                  {t('calc_result_hero_title', 'Дополнительная чистая прибыль заведения')}
                </h4>
              </div>
            </div>

            {/* Dynamic Growth Badge Pill */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-[#D4AF37]/15 border border-[#D4AF37]/50 text-[#D4AF37] px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-[0_0_15px_rgba(212,175,55,0.2)]"
            >
              <FontAwesomeIcon icon={faBolt} className="text-amber-400" />
              <span>{growthRatioText}</span>
            </motion.div>
          </div>

          {/* ACCENTUATED STATS DISPLAY GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center mb-8 relative z-10">
            
            {/* HERO BIG NUMBER 1: MONTHLY & YEARLY EXTRA PROFIT (Centerpiece Accent) */}
            <div className="lg:col-span-6 bg-black/50 p-6 sm:p-8 rounded-2xl border border-[#00FF41]/40 relative overflow-hidden flex flex-col justify-center">
              <span className="text-xs font-bold text-white/60 uppercase tracking-widest block mb-2">
                {t('calc_monthly_extra_label', 'Ежемесячный прирост чистой прибыли:')}
              </span>

              {/* Glowing Huge Numeric Display */}
              <div className="text-4xl sm:text-5xl lg:text-6xl font-mono font-black text-[#00FF41] tracking-tight drop-shadow-[0_0_25px_rgba(0,255,65,0.8)] leading-none mb-3">
                +{formatCurrency(profitDiffMonthly)}
                <span className="text-base sm:text-xl text-[#00FF41]/80 font-sans font-bold ml-2">/ мес</span>
              </div>

              {/* Annualized Projection */}
              <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-300 bg-[#00FF41]/10 px-3 py-1.5 rounded-xl border border-[#00FF41]/30 w-fit">
                <FontAwesomeIcon icon={faCoins} className="text-[#00FF41]" />
                <span>
                  {t('calc_yearly_extra_label', 'В год:')} <strong className="font-mono text-white text-sm sm:text-base">+{formatCurrency(profitDiffYearly)}</strong> {t('calc_yearly_extra_sub', 'чистой прибыли')}
                </span>
              </div>
            </div>

            {/* DUAL COMPARISON METRIC CARDS (До Revo vs С Revo) */}
            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* CARD BEFORE REVO */}
              <div className="bg-white/[0.03] p-4 sm:p-5 rounded-2xl border border-white/10 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    {t('calc_net_profit_before', 'Чистая прибыль До Revo:')}
                  </span>
                  <div className={`font-mono text-2xl sm:text-3xl font-black ${netProfitBefore < 0 ? 'text-red-400' : 'text-slate-200'}`}>
                    {formatCurrency(netProfitBefore)}
                    <span className="text-xs text-slate-500 font-sans font-normal block">в месяц</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-white/5 text-[11px] text-slate-400 font-mono">
                  Выручка: ${formatNumber(revenueBefore)}
                </div>
              </div>

              {/* CARD WITH REVO */}
              <div className="bg-[#00FF41]/10 p-4 sm:p-5 rounded-2xl border border-[#00FF41]/40 shadow-[0_0_20px_rgba(0,255,65,0.15)] flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold text-[#00FF41] uppercase tracking-wider block mb-1 flex items-center gap-1">
                    <FontAwesomeIcon icon={faCheck} />
                    {t('calc_net_profit_with', 'Чистая прибыль С Revo:')}
                  </span>
                  <div className="font-mono text-2xl sm:text-3xl font-black text-[#00FF41] drop-shadow-[0_0_10px_rgba(0,255,65,0.5)]">
                    {formatCurrency(netProfitWithRevo)}
                    <span className="text-xs text-[#00FF41]/70 font-sans font-normal block">в месяц</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-[#00FF41]/20 text-[11px] text-emerald-300 font-mono">
                  Выручка: ${formatNumber(revenueWithRevo)} (+{activeTier.liftPercent}%)
                </div>
              </div>

            </div>

          </div>

          {/* GOLD LOYALTY ECONOMICS CALLOUT BANNER (ВЫВОД НА ЗОЛОТОЙ ПЛАШКЕ) */}
          <div className="mt-8 bg-gradient-to-r from-amber-950/60 via-[#1A1508] to-amber-950/40 p-6 sm:p-8 rounded-3xl border-2 border-[#D4AF37]/60 relative overflow-hidden shadow-[0_0_30px_rgba(212,175,55,0.2)] text-left z-10">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#D4AF37]/10 rounded-full blur-[80px] pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row items-start gap-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37] text-2xl flex-shrink-0 shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                💡
              </div>
              
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-[10px] font-black uppercase tracking-widest">
                  ЭКОНОМИКА ЛОЯЛЬНОСТИ REVOO
                </div>
                
                <p className="text-white text-sm sm:text-base md:text-lg font-bold leading-relaxed">
                  Даже с учетом того, что заведение даёт среднюю скидку <span className="text-[#D4AF37] font-black">{activeTier.effectivePercentText}</span> (уменьшая средний чек с <span className="text-white font-mono font-black">{formatCurrency(avgCheck)}</span> до <span className="text-amber-300 font-mono font-black">{formatCurrency(discountedAvgCheck)}</span>), за счет резкого роста повторных визитов (<span className="text-[#00FF41] font-black">+{activeTier.liftPercent}%</span>) чистая прибыль заведения вырастает на <span className="text-[#00FF41] font-mono font-black">+{formatCurrency(profitDiffMonthly)} в месяц</span> (<span className="text-[#00FF41] font-mono font-black">+{formatCurrency(profitDiffYearly)} в год</span>)!
                </p>
                
                <p className="text-white/70 text-xs sm:text-sm font-medium italic border-l-2 border-[#D4AF37]/60 pl-4 py-0.5">
                  Это демонстрирует главное правило экономики лояльности: объем повторных чеков с запасом перекрывает размер предоставленной скидки.
                </p>
              </div>
            </div>
          </div>

          {/* ACTION FOOTER */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-6 mt-6 border-t border-[#00FF41]/20 relative z-10">
            
            <div className="text-xs text-white/70 font-medium max-w-xl leading-relaxed flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#D4AF37] flex-shrink-0 mt-0.5">
                <FontAwesomeIcon icon={faShieldHalved} />
              </div>
              <p>
                <strong className="text-white block font-bold mb-0.5">{t('calc_leverage_title', 'Почему прибыль растет быстрее выручки?')}</strong>
                {t('calc_leverage_desc', 'Постоянные расходы (аренда и зарплата) остаются неизменными (0% прироста затрат). Маржа с каждого дополнительного чека идет напрямую в чистую прибыль.')}
              </p>
            </div>

            {/* CALL TO ACTION BUTTON (Dubai Gold CTA) */}
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 0 35px rgba(212, 175, 55, 0.4)" }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCTAClick}
              className="w-full md:w-auto bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] text-black font-black uppercase text-xs sm:text-sm tracking-widest py-4 px-8 rounded-full flex items-center justify-center gap-3 shadow-[0_0_25px_rgba(212,175,55,0.3)] transition-all cursor-pointer whitespace-nowrap"
            >
              <span>{t('calc_cta_btn', 'ПОДАТЬ ЗАЯВКУ В TELEGRAM')}</span>
              <FontAwesomeIcon icon={faArrowRight} className="text-sm" />
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ProfitCalculator;
