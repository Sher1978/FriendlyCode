import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faLocationDot, 
  faPhone, 
  faShareNodes, 
  faStar, 
  faCheckCircle, 
  faClock, 
  faFire 
} from '@fortawesome/free-solid-svg-icons';
import { faGoogle, faWhatsapp } from '@fortawesome/free-brands-svg-icons';

export const GoogleMapsHeader = ({ venue }) => {
  const name = venue?.name || 'Салон красоты & Барбершоп';
  const category = venue?.category || venue?.cuisine || 'Сервисный бизнес';
  const address = venue?.address || venue?.location || 'Центральный район';
  const phone = venue?.phone || venue?.gmConfig?.phone || '';
  const whatsapp = venue?.whatsapp || venue?.gmConfig?.whatsapp || '';
  const rating = venue?.rating || 4.9;
  const reviewCount = venue?.reviewCount || 128;
  const googleMapsUrl = venue?.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address}`)}`;
  const reviewsUrl = venue?.googleReviewUrl || googleMapsUrl;

  const cleanWhatsapp = (whatsapp || phone || '').replace(/[^0-9]/g, '');
  const whatsappUrl = cleanWhatsapp
    ? `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(`Здравствуйте! Нашел вас на Google Maps (${name}), хочу записаться`)}`
    : null;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: name,
        text: `Онлайн-запись в ${name} с динамической скидкой`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Ссылка на онлайн-запись скопирована!');
    }
  };

  return (
    <div className="relative overflow-hidden bg-[#121214] border-b border-white/10 pt-4 pb-5 px-4 sm:px-6">
      {/* Background cover photo overlay if available */}
      {venue?.coverPhotoUrl && (
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-15 pointer-events-none filter blur-[1px]"
          style={{ backgroundImage: `url(${venue.coverPhotoUrl})` }}
        />
      )}
      {/* Background ambient neon glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#00FF41]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#007AFF]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-xl mx-auto">
        {/* Top Google Maps verification pill */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/80">
            <FontAwesomeIcon icon={faGoogle} className="text-[#4285F4] text-xs" />
            <span className="font-medium text-white/90">Google Карты</span>
            <FontAwesomeIcon icon={faCheckCircle} className="text-[#00FF41] text-[10px] ml-0.5" />
            <span className="text-white/40">· Проверенное заведение</span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/20 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FF41] animate-pulse" />
              <span>Онлайн-запись 24/7</span>
            </div>

            <button
              type="button"
              onClick={handleShare}
              title="Поделиться ссылкой на заведение"
              className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 active:scale-90 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all ml-0.5"
            >
              <FontAwesomeIcon icon={faShareNodes} className="text-[11px]" />
            </button>
          </div>
        </div>

        {/* Business Title & Category */}
        <div className="mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
            {name}
          </h1>
          <p className="text-sm text-white/60 mt-0.5">
            {category}
          </p>
        </div>

        {/* Ratings & Status Row */}
        <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs mb-3.5">
          {/* Star rating */}
          <div className="flex items-center gap-1">
            <span className="font-bold text-white text-sm">{rating.toFixed(1)}</span>
            <div className="flex text-[#FBBC04] text-xs">
              {[...Array(5)].map((_, i) => (
                <FontAwesomeIcon key={i} icon={faStar} />
              ))}
            </div>
            <a 
              href={googleMapsUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white/50 hover:text-white/80 underline ml-0.5"
            >
              ({reviewCount} отзывов)
            </a>
          </div>

          <span className="text-white/20">·</span>

          {/* Opening Status */}
          <div className="flex items-center gap-1 text-[#00FF41] font-medium">
            <FontAwesomeIcon icon={faClock} className="text-[11px]" />
            <span>Открыто</span>
            <span className="text-white/40 font-normal">· До 21:00</span>
          </div>
        </div>

        {/* Address */}
        <div className="flex items-start gap-2 text-xs text-white/70 mb-4">
          <FontAwesomeIcon icon={faLocationDot} className="text-[#EA4335] mt-0.5 shrink-0" />
          <span className="line-clamp-2 leading-relaxed">{address}</span>
        </div>

        {/* Action Buttons in Google Maps style */}
        <div className="grid grid-cols-4 gap-2 pt-1 border-t border-white/5">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all text-center border border-white/5"
          >
            <div className="w-8 h-8 rounded-full bg-[#4285F4]/15 text-[#4285F4] flex items-center justify-center mb-1">
              <FontAwesomeIcon icon={faLocationDot} className="text-sm" />
            </div>
            <span className="text-[11px] font-medium text-white/90">Маршрут</span>
          </a>

          {phone ? (
            <a
              href={`tel:${phone}`}
              className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all text-center border border-white/5"
            >
              <div className="w-8 h-8 rounded-full bg-[#00FF41]/15 text-[#00FF41] flex items-center justify-center mb-1">
                <FontAwesomeIcon icon={faPhone} className="text-xs" />
              </div>
              <span className="text-[11px] font-medium text-white/90">Позвонить</span>
            </a>
          ) : (
            <div className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white/[0.02] text-white/30 text-center border border-white/5">
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center mb-1">
                <FontAwesomeIcon icon={faPhone} className="text-xs" />
              </div>
              <span className="text-[11px]">Контакты</span>
            </div>
          )}

          {/* 3. WhatsApp / Direct Chat */}
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all text-center border border-white/5"
            >
              <div className="w-8 h-8 rounded-full bg-[#25D366]/15 text-[#25D366] flex items-center justify-center mb-1">
                <FontAwesomeIcon icon={faWhatsapp} className="text-base" />
              </div>
              <span className="text-[11px] font-medium text-white/90">WhatsApp</span>
            </a>
          ) : (
            <button
              onClick={() => {
                const el = document.querySelector('[data-ai-widget-trigger]') || document.querySelector('button[aria-label*="ассистент"]');
                if (el) el.click();
              }}
              className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all text-center border border-white/5"
            >
              <div className="w-8 h-8 rounded-full bg-[#25D366]/15 text-[#25D366] flex items-center justify-center mb-1">
                <FontAwesomeIcon icon={faWhatsapp} className="text-base" />
              </div>
              <span className="text-[11px] font-medium text-white/90">Чат 24/7</span>
            </button>
          )}

          {/* 4. Real Google Maps Reviews */}
          <a
            href={reviewsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all text-center border border-white/5"
          >
            <div className="w-8 h-8 rounded-full bg-[#FBBC04]/15 text-[#FBBC04] flex items-center justify-center mb-1">
              <FontAwesomeIcon icon={faStar} className="text-xs" />
            </div>
            <span className="text-[11px] font-medium text-white/90">Отзывы</span>
          </a>
        </div>

        {/* Dynamic Yield Smart Banner */}
        <div className="mt-4 p-3 rounded-2xl bg-gradient-to-r from-[#FF9933]/15 via-[#00FF41]/10 to-transparent border border-[#FF9933]/30 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FF9933]/20 text-[#FF9933] flex items-center justify-center shrink-0 border border-[#FF9933]/30">
            <FontAwesomeIcon icon={faFire} className="text-base" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Динамические скидки Revo</span>
              <span className="px-1.5 py-0.2 rounded bg-[#00FF41] text-black text-[10px] font-extrabold uppercase">до -30%</span>
            </div>
            <p className="text-[11px] text-white/70 mt-0.5">
              Выбирайте свободные окна со значком скидки — цена снижается автоматически!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
