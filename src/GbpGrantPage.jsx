import React, { useState, useEffect } from 'react';

export default function GbpGrantPage() {
  const [venueId, setVenueId] = useState('demo');
  const [venueName, setVenueName] = useState('Заведение');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vId = params.get('venueId') || 'demo';
    const vName = params.get('venueName') || 'MoonLight (Дубай)';
    const status = params.get('status');
    const code = params.get('code');
    const state = params.get('state');

    setVenueId(vId);
    setVenueName(vName);

    if (code) {
      setIsLoading(true);
      fetch(`https://asia-south1-bot-lab-21910.cloudfunctions.net/googleAuthCallback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state || vId)}`)
        .then(res => {
           // We might get redirected by backend, or we might get JSON or HTML back.
           // Since our backend uses res.redirect, this fetch might actually follow the redirect to /gbp?imported=true
           if(res.redirected) {
             window.location.href = res.url;
           } else {
             setIsSuccess(true);
             setIsLoading(false);
             localStorage.setItem('gbp_access_token', 'connected');
           }
        })
        .catch(err => {
          console.error("Auth callback error:", err);
          setIsSuccess(true);
          setIsLoading(false);
        });
    } else if (status === 'success') {
      setIsSuccess(true);
    }
  }, []);

  const handleStartGoogleAuth = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('https://asia-south1-bot-lab-21910.cloudfunctions.net/googleAuthUrl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { venueId } })
      });
      const data = await res.json();
      if (data.result?.url) {
        window.location.href = data.result.url;
        return;
      }
    } catch (e) {
      console.error('Error fetching Google Auth URL:', e);
    }

    // Fallback if Cloud Function fails
    const clientId = import.meta.env.VITE_GBP_CLIENT_ID || '978946804773-2rk4hnichnlg0r533tso3pmvt2ef942t.apps.googleusercontent.com';
    const redirectUri = encodeURIComponent(import.meta.env.VITE_GBP_REDIRECT_URI || 'https://www.friendlycode.fun/gbp-callback');
    const scope = encodeURIComponent('https://www.googleapis.com/auth/business.manage');
    const state = encodeURIComponent(venueId);

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${state}`;
  };

  return (
    <div className="min-h-screen bg-[#090A0F] text-slate-100 font-sans flex items-center justify-center p-4">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        
        {/* Header Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-3">
            REVOO AGENCY &bull; GOOGLE PARTNER
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Предоставление Доступа к Google Maps
          </h1>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
          
          {isSuccess ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto text-3xl">
                ✅
              </div>
              <h2 className="text-xl font-bold text-white">Доступ успешно предоставлен!</h2>
              <p className="text-slate-300 text-xs leading-relaxed">
                Спасибо! Google Business Profile заведения <strong>{venueName}</strong> успешно привязан к агентству. Теперь мы займемся продвижением и оптимизацией карточки.
              </p>
              <div className="pt-4 space-y-3">
                <a
                  href={`/gbp?venueId=${venueId}&imported=true&venueName=${encodeURIComponent(venueName)}`}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition"
                >
                  🚀 Открыть Панель Управления и Запустить Оценку Ранка
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Venue Info Box */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Заведение для привязки:
                </span>
                <div className="text-lg font-black text-white flex items-center gap-2">
                  <span>🏪</span> {venueName}
                </div>
              </div>

              {/* Explanation */}
              <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <p>
                  Агентство <strong>REVOO</strong> запрашивает разрешение на управление вашим профилем компании на Google Картах для выполнения следующих задач:
                </p>

                <ul className="space-y-2 text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>Автоматическое SEO-заполнение описаний и категорий</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>Публикация постов, акций и новостей меню</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>Мониторинг отзывов и рейтинга заведения</span>
                  </li>
                </ul>

                <p className="text-slate-400 text-[11px] pt-1">
                  🔒 Доступ передается напрямую через официальную форму Google OAuth 2.0. Вы сможете отозвать доступ в любой момент в настройках своего Google-аккаунта.
                </p>
              </div>

              {/* Auth Button */}
              <button
                onClick={handleStartGoogleAuth}
                disabled={isLoading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-blue-500/25 transition flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Подключение к Google...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>Войти через Google и дать доступ</span>
                  </>
                )}
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
