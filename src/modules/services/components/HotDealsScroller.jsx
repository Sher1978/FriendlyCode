import React from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFire, faBolt, faClock, faArrowRight, faTag } from '@fortawesome/free-solid-svg-icons';

export const HotDealsScroller = ({
  deals = [],
  currency = 'RUB',
  onSelectDeal,
  archetype = 'personal'
}) => {
  if (!deals || deals.length === 0) return null;

  const formatPrice = (amount) => {
    const num = Math.round(Number(amount) || 0);
    if (currency === 'VND') return `${num.toLocaleString('vi-VN')} ₫`;
    if (currency === 'AED') return `${num.toLocaleString()} AED`;
    if (currency === 'USD') return `$${num}`;
    if (currency === 'THB' || currency === '฿') return `${num.toLocaleString()} ฿`;
    return `${num.toLocaleString('ru-RU')} ₽`;
  };

  const isBatch = archetype === 'batch';

  return (
    <div className="space-y-2.5 my-2">
      {/* Header with pulsing flame badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#FF3B30] to-[#FF9933] flex items-center justify-center text-black text-xs shadow-[0_0_12px_rgba(255,153,51,0.5)] animate-pulse">
            <FontAwesomeIcon icon={faFire} />
          </div>
          <span className="text-sm font-extrabold text-white tracking-tight flex items-center gap-1.5">
            <span>Горящие предложения</span>
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-[#FF9933]/20 text-[#FF9933] border border-[#FF9933]/30">
              Sale
            </span>
          </span>
        </div>

        <span className="text-[11px] text-[#FF9933] font-semibold flex items-center gap-1">
          <FontAwesomeIcon icon={faBolt} className="text-[10px]" />
          <span>Максимальные скидки</span>
        </span>
      </div>

      {/* Horizontal Scroller */}
      <div className="flex items-stretch gap-3 overflow-x-auto pb-2 pt-1 scrollbar-none snap-x snap-mandatory">
        {deals.map((deal) => {
          const discountBadge = deal.discountType === 'fixed'
            ? `-${formatPrice(deal.discountAmount)}`
            : `-${deal.discountPercent || 25}%`;

          return (
            <div
              key={deal.id}
              role="button"
              tabIndex={0}
              data-testid={`hot-deal-${deal.id}`}
              onClick={() => onSelectDeal(deal)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectDeal(deal); }}
              className="snap-start shrink-0 w-[270px] sm:w-[290px] rounded-2xl p-3.5 bg-gradient-to-br from-[#261709] via-[#1C1814] to-[#141416] border border-[#FF9933]/50 shadow-[0_0_20px_rgba(255,153,51,0.15)] hover:border-[#FF9933] active:scale-[0.98] transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden group select-none"
            >
              {/* Top ambient glow */}
              <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#FF9933]/20 rounded-full blur-2xl pointer-events-none" />

              <div>
                {/* Top Row: Discount Pill & Date/Slot */}
                <div className="flex items-center justify-between gap-1.5 mb-2">
                  <span className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-[#FF3B30] to-[#FF9933] text-black text-[11px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                    <FontAwesomeIcon icon={faFire} className="text-[9px]" />
                    <span>{discountBadge}</span>
                  </span>

                  <span className="text-[10px] text-white/70 font-semibold flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                    <FontAwesomeIcon icon={faClock} className="text-[9px] text-[#FF9933]" />
                    <span>{deal.dateLabel || 'Завтра'} • {deal.slotTime || '10:00'}</span>
                  </span>
                </div>

                {/* Service Name */}
                <h3 className="text-xs font-bold text-white group-hover:text-[#FF9933] transition-colors line-clamp-1">
                  {deal.serviceName}
                </h3>

                {/* Details subtitle: Vehicle / Master & Scarcity */}
                <div className="flex items-center justify-between text-[10px] text-white/50 mt-1">
                  <span className="truncate max-w-[150px]">
                    {deal.vehicleName || deal.staffName || (isBatch ? 'VIP Рейс' : 'Мастер')}
                  </span>
                  {deal.seatsLeft && (
                    <span className="text-[#00FF41] font-bold shrink-0">
                      {isBatch ? `Осталось ${deal.seatsLeft} мест` : '1 свободное окно'}
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom Price & Quick CTA Bar */}
              <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-white/40 line-through leading-none">
                    {formatPrice(deal.originalPrice)}
                  </div>
                  <div className="text-sm font-extrabold text-[#00FF41] mt-0.5 leading-none">
                    {formatPrice(deal.finalPrice)}
                  </div>
                </div>

                <div className="py-1.5 px-3 rounded-xl bg-[#FF9933] hover:bg-[#FF9933]/90 text-black font-extrabold text-[11px] flex items-center gap-1 shadow-md shadow-[#FF9933]/20 group-hover:translate-x-0.5 transition-transform">
                  <span>{isBatch ? 'Выбрать место' : 'Записаться'}</span>
                  <FontAwesomeIcon icon={faArrowRight} className="text-[9px]" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HotDealsScroller;
