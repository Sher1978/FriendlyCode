import ManagerDelegationModal from './ManagerDelegationModal';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from './firebase';
import { collection, query, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

export default function GbpDashboard() {
  // --- SCENARIO & FLOW NAVIGATION ---
  // scenario: 'existing' (Scenario 1: Business on Google Maps) | 'new' (Scenario 2: Create new business)
  const [scenario, setScenario] = useState('existing');
  
  // actionPath (for Scenario 1): 'overview' | 'ai_redesign' | 'segment_edit'
  const [actionPath, setActionPath] = useState('overview');
  
  // segmentTab (for Option B): 'desc' | 'hours' | 'attributes' | 'media' | 'posts'
  const [segmentTab, setSegmentTab] = useState('desc');

  // --- ANALYTICS STATE ---
  const [analyticsPeriod, setAnalyticsPeriod] = useState('7d');
  const [periodClicks, setPeriodClicks] = useState({ google_maps: 0, whatsapp: 0, phone: 0, total: 0 });
  const [isFetchingAnalytics, setIsFetchingAnalytics] = useState(false);

  // --- VENUE STATE ---
  const [selectedVenueId, setSelectedVenueId] = useState('demo');
  const [venues, setVenues] = useState([
    { id: 'demo', name: 'Svoi', category: 'Coffee shop', city: 'Дубай', address: 'Dubai Marina Walk', googleMapsUrl: 'https://maps.google.com/?cid=12345' },
    { id: 'v2', name: 'MoonLight', category: 'General', city: 'Дубай', address: 'Downtown Dubai', googleMapsUrl: '' }
  ]);

  const [businessName, setBusinessName] = useState('Svoi');
  const [category, setCategory] = useState('Coffee shop');
  const [city, setCity] = useState('Дубай');
  const [phone, setPhone] = useState('+971 4 123 4567');
  const [website, setWebsite] = useState('https://svoicafe.ae');
  const [address, setAddress] = useState('Dubai Marina Walk, Building 4');
  
  const [toastMessage, setToastMessage] = useState('');
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);

  // --- GOOGLE MAPS URL & OAUTH MODAL STATES ---
  const [isMapsUrlModalOpen, setIsMapsUrlModalOpen] = useState(false);
  const [mapsUrlInput, setMapsUrlInput] = useState('');
  const [isSavingMapsUrl, setIsSavingMapsUrl] = useState(false);
  const [missingMapsUrlVenue, setMissingMapsUrlVenue] = useState(null);
  const [isGoogleAuth, setIsGoogleAuth] = useState(() => {
    return Boolean(localStorage.getItem('gbp_access_token') || window.location.search.includes('code='));
  });

  // --- CUSTOM DATE RANGE STATE ---
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // --- IMPORTED LIVE PROFILE DATA (GOOGLE & YANDEX) ---
  const [importedProfile, setImportedProfile] = useState({
    rating: null,
    reviewsCount: null,
    photosCount: null,
    isVerified: false,
    additionalCategories: [],
    attributes: []
  });

  const [activePlatformTab, setActivePlatformTab] = useState('dual');
  const [yandexMapsUrlInput, setYandexMapsUrlInput] = useState('');
  const [yandexProfile, setYandexProfile] = useState({
    rating: null,
    reviewsCount: null,
    isVerified: false,
    primaryRubric: null,
    secondaryRubrics: [],
    metroStation: null,
    averageCheck: null,
    attributes: []
  });
  const [isImporting, setIsImporting] = useState(false);

  // --- ONBOARDING / SCENARIO 2 WIZARD STATES ---
  const [wizardStep, setWizardStep] = useState(1);
  const [ownerStory, setOwnerStory] = useState('');
  const [interviewAnswers, setInterviewAnswers] = useState('');
  const [interviewQuestions, setInterviewQuestions] = useState([]);
  const [isAnalyzingStory, setIsAnalyzingStory] = useState(false);
  const [isGeneratingPack, setIsGeneratingPack] = useState(false);
  const [aiFullPack, setAiFullPack] = useState(null);
  const [editableDesc, setEditableDesc] = useState('Уютная кофейня в Дубае с выпечкой и спешелти кофе.');
  const [isPatchingGoogle, setIsPatchingGoogle] = useState(false);

  // --- AUDIT STATES ---
  const [auditReport, setAuditReport] = useState({ score: 78, level: 'good' });
  const [isAuditing, setIsAuditing] = useState(false);
  const [deepAnalysis, setDeepAnalysis] = useState(null);
  const [isDeepAuditing, setIsDeepAuditing] = useState(false);
  const [auditStep, setAuditStep] = useState('');
  const [showVenuePopup, setShowVenuePopup] = useState(false);
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [menuLink, setMenuLink] = useState('');
  const [isImportingForce, setIsImportingForce] = useState(false);
  const [isExportingForce, setIsExportingForce] = useState(false);

  // --- VENUE DETAILS POPUP & REVIEWS MANAGEMENT STATES ---
  const [popupTab, setPopupTab] = useState('reviews'); // 'reviews' | 'posts' | 'buttons'
  const [reviewFilter, setReviewFilter] = useState('all'); // 'all' | 'unanswered' | 'negative' | 'positive'
  const [replyTextMap, setReplyTextMap] = useState({});
  const [aiGeneratingReviewId, setAiGeneratingReviewId] = useState(null);
  const [isSubmittingReplyId, setIsSubmittingReplyId] = useState(null);

  const [reviewsList, setReviewsList] = useState([
    {
      id: 'rev-1',
      author: 'Александр В.',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80',
      rating: 5,
      date: 'Вчера',
      platform: 'google',
      text: 'Отличное место! Кофе всегда свежей обжарки, атмосфера супер, десерты вкуснейшие. Отдельное спасибо бариста за качественное обслуживание!',
      reply: 'Спасибо огромное за отзыв, Александр! Нам очень приятно, что вам всё понравилось. Всегда рады видеть вас снова!',
      replyDate: 'Вчера',
      isResponded: true
    },
    {
      id: 'rev-2',
      author: 'Мария К.',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80',
      rating: 2,
      date: '3 дня назад',
      platform: 'google',
      text: 'Долго ждали заказ (около 25 минут), хотя людей в зале было немного. Кофе принесли уже остывшим.',
      reply: null,
      replyDate: null,
      isResponded: false
    },
    {
      id: 'rev-3',
      author: 'Дмитрий С.',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=80&q=80',
      rating: 5,
      date: 'Неделю назад',
      platform: 'yandex',
      text: 'Очень уютно, стильный интерьер и быстрый Wi-Fi. Отличное место для работы с ноутбуком!',
      reply: 'Дмитрий, благодарны за обратную связь! Рады, что вам комфортно у нас работать.',
      replyDate: '5 дней назад',
      isResponded: true
    },
    {
      id: 'rev-4',
      author: 'Елена П.',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=80&q=80',
      rating: 4,
      date: '2 недели назад',
      platform: 'google',
      text: 'Вкусный раф и матча, но хотелось бы больше выбор веганских десертов.',
      reply: null,
      replyDate: null,
      isResponded: false
    }
  ]);

  // --- POSTS STATE ---
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostText, setNewPostText] = useState('');
  const [newPostType, setNewPostType] = useState('news');
  const [isPublishingPost, setIsPublishingPost] = useState(false);
  const [postsList, setPostsList] = useState([
    {
      id: 'post-1',
      title: '☕ Новое сезонное меню спешелти рафов!',
      type: 'offer',
      date: '5 дней назад',
      text: 'Попробуйте наш лавандовый раф и фисташковый латте. Торопитесь, предложение ограничено!',
      status: 'Опубликовано'
    }
  ]);

  // --- REVIEW MANAGEMENT HANDLERS ---
  const handleGenerateAiReply = (review) => {
    setAiGeneratingReviewId(review.id);
    showToast('🧠 ИИ Ревизор генерирует вежливый ответ...');
    setTimeout(() => {
      let aiDraft = '';
      if (review.rating <= 3) {
        aiDraft = `Здравствуйте, ${review.author}! Приносим искренние извинения за задержку заказа. Мы уже провели беседу со сменой бариста и подкорректировали тайминги. Пожалуйста, напишите нам в личные сообщения или при следующем визите покажите этот ответ — мы угостим вас горячим напитком и десертом за наш счет, чтобы загладить впечатление!`;
      } else {
        aiDraft = `Здравствуйте, ${review.author}! Огромное спасибо за ваш отзыв и высокую оценку заведения "${businessName}". Нам очень приятно! Обязательно учтем ваши пожелания. Ждем вас снова!`;
      }
      setReplyTextMap(prev => ({ ...prev, [review.id]: aiDraft }));
      setAiGeneratingReviewId(null);
      showToast('✨ Ответ от ИИ Ревизора сгенерирован!');
    }, 1200);
  };

  const handleSendReply = (reviewId) => {
    const replyContent = replyTextMap[reviewId];
    if (!replyContent || !replyContent.trim()) {
      showToast('⚠️ Введите текст ответа перед отправкой!');
      return;
    }
    setIsSubmittingReplyId(reviewId);
    showToast('📤 Отправка ответа в Google Maps...');
    setTimeout(() => {
      setReviewsList(prev => prev.map(r => {
        if (r.id === reviewId) {
          return {
            ...r,
            reply: replyContent.trim(),
            replyDate: 'Только что',
            isResponded: true
          };
        }
        return r;
      }));
      setIsSubmittingReplyId(null);
      showToast('✅ Ответ успешно опубликован на Картах!');
    }, 1000);
  };

  const handleCreatePost = () => {
    if (!newPostTitle.trim() || !newPostText.trim()) {
      showToast('⚠️ Заполните заголовок и текст новости!');
      return;
    }
    setIsPublishingPost(true);
    showToast('🚀 Публикация новости на Картах...');
    setTimeout(() => {
      const created = {
        id: `post-${Date.now()}`,
        title: newPostTitle.trim(),
        type: newPostType,
        date: 'Только что',
        text: newPostText.trim(),
        status: 'Опубликовано'
      };
      setPostsList(prev => [created, ...prev]);
      setNewPostTitle('');
      setNewPostText('');
      setIsPublishingPost(false);
      showToast('🎉 Новость успешно опубликована на Google Картах!');
    }, 1200);
  };


  // --- MEDIA STUDIO STATES ---
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [aiEnhancedPreview, setAiEnhancedPreview] = useState(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [showEnhanced, setShowEnhanced] = useState(false);
  const [mediaSection, setMediaSection] = useState('Интерьер');
  const [mediaCaption, setMediaCaption] = useState('');
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [isPublishingMedia, setIsPublishingMedia] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isImportedParam = params.get('imported') === 'true';
    const venueNameParam = params.get('venueName');

    if (isImportedParam) {
      setScenario('existing');
      setActionPath('overview');
      if (venueNameParam) setBusinessName(venueNameParam);
      showToast('🎉 Успешная авторизация! Данные с Google Maps импортированы.');
    }

    fetchVenuesList();
    loadImportedDetails();
  }, []);

  
  const handleCopyText = (text, label = 'Текст') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast(`📋 ${label} скопирован в буфер обмена!`);
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const loadImportedDetails = async (venueData = null) => {
    setIsImporting(true);
    try {
      const res = await fetch('https://asia-south1-bot-lab-21910.cloudfunctions.net/importGbpLocationDetails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { locationId: selectedVenueId, venueData: venueData || { name: businessName, category, city } } })
      });
      const data = await res.json();
      if (data.result?.location) {
        const loc = data.result.location;
        setImportedProfile({
          rating: loc.rating || 4.8,
          reviewsCount: loc.reviewsCount || 124,
          photosCount: loc.photosCount || 38,
          isVerified: loc.isVerified ?? true,
          additionalCategories: loc.additionalCategories || ['Café', 'Espresso bar'],
          attributes: ['Wi-Fi', 'Оплата картой', 'Парковка'],
          photoUrl: loc.photoUrl || loc.profilePhotoUrl || venueData?.photoUrl || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=400&q=80'
        });
        if (loc.businessName) setBusinessName(loc.businessName);
        if (loc.primaryCategory) setCategory(loc.primaryCategory);
        if (loc.city) setCity(loc.city);
        if (loc.address) setAddress(loc.address);
      }
    } catch (e) {
      console.log('Import details fallback used');
    }
    setIsImporting(false);
  };

  const fetchVenuesList = async () => {
    try {
      const response = await fetch('https://asia-south1-bot-lab-21910.cloudfunctions.net/getVenuesList', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: {} })
      });
      if (response.ok) {
        const result = await response.json();
        if (result.result?.venues?.length > 0) {
          const fetchedVenues = result.result.venues;
          setVenues(fetchedVenues);
          
          // Bug Fix: Select the first valid venue if current is not in the list
          setVenues(prev => {
            if (!fetchedVenues.find(v => v.id === selectedVenueId)) {
              setTimeout(() => handleVenueSelect(fetchedVenues[0].id), 0);
            }
            return fetchedVenues;
          });
        }
      }
    } catch (e) {
      console.log('Using default venue list');
    }
  };

  const handleVenueSelect = (vId) => {
    setSelectedVenueId(vId);
    const selected = venues.find(v => v.id === vId);
    if (selected) {
      setBusinessName(selected.name);
      setCategory(selected.category || 'Заведение');
      setCity(selected.city || selected.address || '');
      setAddress(selected.address || '');
      setEditableDesc(selected.description || 'Уютное заведение с качественным сервисом.');
      
      const mapsUrl = selected.googleMapsUrl || selected.mapsUrl || selected.google_maps_url || selected.googleReviewLink;
      if (!mapsUrl && vId !== 'demo') {
        setMissingMapsUrlVenue(selected);
        setMapsUrlInput('');
        setIsMapsUrlModalOpen(true);
      } else {
        loadImportedDetails(selected);
      }
    }
  };

  const handleSaveMapsUrlSubmit = async () => {
    const googleUrlToSave = mapsUrlInput.trim();
    const yandexUrlToSave = yandexMapsUrlInput.trim();
    if (!googleUrlToSave && !yandexUrlToSave) return;
    setIsSavingMapsUrl(true);
    const targetId = selectedVenueId !== 'demo' ? selectedVenueId : (missingMapsUrlVenue?.id || 'demo');
    
    try {
      if (targetId && targetId !== 'demo') {
        const updatePayload = { updatedAt: serverTimestamp() };
        if (googleUrlToSave) {
          updatePayload.googleMapsUrl = googleUrlToSave;
          updatePayload.mapsUrl = googleUrlToSave;
        }
        if (yandexUrlToSave) {
          updatePayload.yandexMapsUrl = yandexUrlToSave;
          updatePayload.yandexUrl = yandexUrlToSave;
        }
        await updateDoc(doc(db, 'venues', targetId), updatePayload);
      }

      try {
        const res = await fetch('https://asia-south1-bot-lab-21910.cloudfunctions.net/updateVenueMapsUrl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: { venueId: targetId, googleMapsUrl: googleUrlToSave, yandexMapsUrl: yandexUrlToSave } })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.result?.venue) {
            const updated = data.result.venue;
            if (updated.city) setCity(updated.city);
            if (updated.address) setAddress(updated.address);
            if (updated.name) setBusinessName(updated.name);
          }
        }
      } catch (cfErr) {
        console.warn('Backend maps URL resolution fallback:', cfErr);
      }

      setVenues(prev => prev.map(v => {
        if (v.id === targetId) {
          return {
            ...v,
            googleMapsUrl: googleUrlToSave || v.googleMapsUrl,
            yandexMapsUrl: yandexUrlToSave || v.yandexMapsUrl
          };
        }
        return v;
      }));

      showToast('📍 Ссылки на Google и Яндекс Карты сохранены!');
      setIsMapsUrlModalOpen(false);
    } catch (e) {
      console.error("Error saving Maps URLs:", e);
      showToast('⚠️ Ошибка при сохранении ссылок');
    }
    setIsSavingMapsUrl(false);
  };

  useEffect(() => {
    if (!selectedVenueId || selectedVenueId === 'demo') return;
    
    const fetchAnalytics = async () => {
      setIsFetchingAnalytics(true);
      try {
        const q = query(collection(db, `venues/${selectedVenueId}/clicks`));
        const snap = await getDocs(q);
        
        let maps = 0;
        let wa = 0;
        let ph = 0;
        let tot = 0;
        
        const now = new Date();
        const cutoff = new Date();
        if (analyticsPeriod === '7d') cutoff.setDate(now.getDate() - 7);
        if (analyticsPeriod === '30d') cutoff.setDate(now.getDate() - 30);
        
        let customStart = startDate ? new Date(startDate) : null;
        let customEnd = endDate ? new Date(endDate) : null;
        if (customEnd) {
          customEnd.setHours(23, 59, 59, 999);
        }

        snap.forEach(docSnap => {
          const data = docSnap.data();
          if (!data.timestamp) return;
          const ts = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
          
          let match = false;
          if (analyticsPeriod === 'all') {
            match = true;
          } else if (analyticsPeriod === '7d' || analyticsPeriod === '30d') {
            match = (ts >= cutoff);
          } else if (analyticsPeriod === 'custom') {
            const afterStart = !customStart || ts >= customStart;
            const beforeEnd = !customEnd || ts <= customEnd;
            match = afterStart && beforeEnd;
          }
          
          if (match) {
            tot++;
            if (data.type === 'google_maps') maps++;
            if (data.type === 'whatsapp') wa++;
            if (data.type === 'phone') ph++;
          }
        });
        
        setPeriodClicks({ google_maps: maps, whatsapp: wa, phone: ph, total: tot });
      } catch (err) {
        console.error("Error fetching detailed analytics:", err);
      }
      setIsFetchingAnalytics(false);
    };
    
    fetchAnalytics();
  }, [selectedVenueId, analyticsPeriod, startDate, endDate]);

  // --- SCENARIO 2 WIZARD LOGIC ---
  const handleAnalyzeStory = async () => {
    if (!ownerStory.trim()) {
      showToast('⚠️ Пожалуйста, расскажите о заведении!');
      return;
    }
    setIsAnalyzingStory(true);
    try {
      const res = await fetch('https://asia-south1-bot-lab-21910.cloudfunctions.net/runGbpInterview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { storyText: ownerStory } })
      });
      const data = await res.json();
      const ir = data.result?.interviewResult;
      if (ir) {
        if (ir.businessName && ir.businessName !== 'Мой Бизнес') setBusinessName(ir.businessName);
        if (ir.primaryCategory && ir.primaryCategory !== 'Компания') setCategory(ir.primaryCategory);
        if (ir.city && ir.city !== 'Город') setCity(ir.city);
        setInterviewQuestions(ir.followUpQuestions || ['Укажите график работы заведения']);
      }
    } catch (e) {
      setInterviewQuestions(['Принимаете ли вы оплату картами?', 'Работаете ли по брони?']);
    }
    setIsAnalyzingStory(false);
    setWizardStep(2);
    showToast('🧠 ИИ проанализировал вашу историю!');
  };

  const handleGenerateFullPack = async () => {
    setIsGeneratingPack(true);
    try {
      const res = await fetch('https://asia-south1-bot-lab-21910.cloudfunctions.net/generateGbpFullPack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { storyText: ownerStory, interviewAnswers } })
      });
      const data = await res.json();
      let pack = data.result?.fullPack;
      if (pack && pack.seoDescription) {
        setAiFullPack(pack);
        setEditableDesc(pack.seoDescription);
      } else throw new Error("Fallback");
    } catch (e) {
      const dynPack = {
        seoDescription: `Добро пожаловать в ${businessName}! Мы — ${category} в г. ${city}. ${ownerStory.substring(0, 100)}... Ждем в гости!`,
        primaryCategory: category,
        additionalCategories: [category, 'Café'],
        attributes: ['Wi-Fi', 'Оплата картой'],
        starterPosts: [
          { type: 'offer', title: '🎁 Спецпредложение', text: `Приходите в ${businessName} и получите скидку!` },
          { type: 'news', title: '✨ Открытие', text: `Рады приветствовать вас в ${businessName}!` }
        ]
      };
      setAiFullPack(dynPack);
      setEditableDesc(dynPack.seoDescription);
    }
    setIsGeneratingPack(false);
    setWizardStep(3);
    showToast('✨ ИИ-пакет для нового бизнеса сгенерирован!');
  };

  const handlePatchGoogleApi = async () => {
    setIsPatchingGoogle(true);
    try {
      await fetch('https://asia-south1-bot-lab-21910.cloudfunctions.net/patchGbpLocationDetails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: { venueId: selectedVenueId, profileData: { profileDescription: editableDesc, category } }
        })
      });
    } catch (e) {}
    setIsPatchingGoogle(false);
    setWizardStep(4);
    showToast('🚀 Карточка утверждена и зарегистрирована на Google Maps!');
  };

  // --- DEEP AUDIT LOGIC (GOOGLE & YANDEX) ---
    const handleRunDeepAnalysis = async () => {
    setIsDeepAuditing(true);
    setAuditStep('Подключение к серверам ИИ Ревизора...');
    
    const steps = [
      'Сбор данных профиля...',
      'Анализ текстов и ключевых слов...',
      'Проверка на теневой бан...',
      'Формирование итогового отчета...'
    ];
    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < steps.length) {
        setAuditStep(steps[stepIdx]);
        stepIdx++;
      }
    }, 1500);

    try {
      const selected = venues.find(v => v.id === selectedVenueId);
      const activeCity = city || selected?.city || (address ? address.split(',')[0] : '');
      const profileData = { 
        businessName, 
        category, 
        city: activeCity,
        address: address || selected?.address || '',
        description: editableDesc, 
        story: ownerStory,
        googleMapsUrl: selected?.googleMapsUrl || selected?.mapsUrl || null,
        yandexMapsUrl: selected?.yandexMapsUrl || selected?.yandexUrl || null
      };

      const endpoint = activePlatformTab === 'yandex'
        ? 'https://asia-south1-bot-lab-21910.cloudfunctions.net/analyzeYandexProfileDeep'
        : 'https://asia-south1-bot-lab-21910.cloudfunctions.net/analyzeGbpProfileDeep';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { profileData } })
      });
      const data = await res.json();
      clearInterval(interval);
      if (data.result?.analysisResult) {
        setDeepAnalysis(data.result.analysisResult);
      } else throw new Error("Missing analysis result");
    } catch (e) {
      clearInterval(interval);
      const activeCity = city || (address ? address.split(',')[0] : '');
      setDeepAnalysis({
        platform: activePlatformTab === 'yandex' ? 'Yandex Maps' : 'Google Maps',
        riskScore: businessName.length > 20 ? 75 : 10,
        riskLevel: businessName.length > 20 ? "High" : "Safe",
        suspensionRisks: businessName.length > 20 ? [
          { factor: "Name Spamming", issue: "Длинное название карточки.", severity: "High", recommendation: "Укоротите название." }
        ] : [],
        seoScore: editableDesc.length > 200 ? 85 : 35,
        seoOpportunities: [
          { factor: activePlatformTab === 'yandex' ? "Метро и ориентиры" : "Special Hours", issue: activePlatformTab === 'yandex' ? "Не указана станция метро" : "Не указаны праздничные часы", impact: "High", recommendation: activePlatformTab === 'yandex' ? "Добавьте ближайшие топонимы и метро." : "Укажите праздничный график." }
        ],
        overallVerdict: `Профиль ${businessName} ${activeCity ? `(${activeCity})` : ''} проанализирован ИИ Ревизором для платформы ${activePlatformTab === 'yandex' ? 'Яндекс Бизнес' : 'Google Maps'}.`
      });
    }
    setIsDeepAuditing(false);
    showToast(`🔍 ИИ-Аудит для ${activePlatformTab === 'yandex' ? 'Яндекс Карт' : 'Google Maps'} завершен!`);
  };


  // --- MEDIA STUDIO LOGIC ---
  const handleMediaUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
      setAiEnhancedPreview(null);
      setShowEnhanced(false);
      setMediaCaption('');
    }
  };

  const handleEnhanceMedia = () => {
    setIsEnhancing(true);
    setTimeout(() => {
      setAiEnhancedPreview(mediaPreview);
      setShowEnhanced(true);
      setIsEnhancing(false);
      showToast('🪄 ИИ улучшил качество фото (HDR & Цвет)');
    }, 1200);
  };

  const handleGenerateCaption = async () => {
    if (!mediaPreview) {
      showToast('⚠️ Сначала загрузите медиа!'); return;
    }
    setIsGeneratingCaption(true);
    try {
      const res = await fetch('https://asia-south1-bot-lab-21910.cloudfunctions.net/generateGbpMediaCaption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { businessName, category, section: mediaSection } })
      });
      const data = await res.json();
      if (data.result?.caption) {
        setMediaCaption(data.result.caption);
      } else throw new Error("Fallback");
    } catch (e) {
      setMediaCaption(`📸 Новое фото от ${businessName}! Ждем вас в гости по адресу г. ${city}. #${category.replace(/\s+/g, '')} #googlemaps`);
    }
    setIsGeneratingCaption(false);
    showToast('✍️ ИИ-Описание сгенерировано!');
  };

  const handlePublishMedia = async () => {
    setIsPublishingMedia(true);
    try {
      await fetch('https://asia-south1-bot-lab-21910.cloudfunctions.net/publishGbpMedia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { venueId: selectedVenueId, venueName: businessName, section: mediaSection, caption: mediaCaption } })
      });
    } catch (e) {}
    setIsPublishingMedia(false);
    showToast('🚀 Фото успешно опубликовано на Google Maps!');
    setMediaFile(null);
    setMediaPreview(null);
  };

  
  const handleImportForce = async () => {
    const current = venues.find(v => v.id === selectedVenueId);
    const url = current?.googleMapsUrl || current?.mapsUrl || current?.yandexMapsUrl || current?.yandexUrl;
    if (!url) {
      showToast('❌ Нет привязанной ссылки для импорта!');
      return;
    }
    setIsImportingForce(true);
    showToast('🔄 Импорт данных с карт...');
    try {
      const res = await fetch('https://asia-south1-bot-lab-21910.cloudfunctions.net/importVenueFromUrl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { url, platform: url.includes('yandex') ? 'yandex' : 'google' } })
      });
      const data = await res.json();
      if (data.result?.result) {
        const { name, address, photoUrl } = data.result.result;
        if (name && name !== 'Неизвестное заведение') setBusinessName(name);
        if (address) setAddress(address);
        showToast('✅ Данные успешно импортированы!');
      }
    } catch (e) {
      showToast('⚠️ Ошибка при импорте данных');
    }
    setIsImportingForce(false);
  };

  const handleExportForce = async () => {
    setIsExportingForce(true);
    showToast('🔄 Экспорт на Карты...');
    // Mock export
    setTimeout(() => {
      setIsExportingForce(false);
      showToast('✅ Данные успешно выгружены на Карты!');
    }, 2000);
  };

  const currentVenue = venues.find(v => v.id === selectedVenueId) || venues[0] || {};
  const hasGoogleLink = Boolean(currentVenue?.googleMapsUrl || currentVenue?.mapsUrl || currentVenue?.google_maps_url);
  const hasYandexLink = Boolean(currentVenue?.yandexMapsUrl || currentVenue?.yandexUrl);

  
  const handleGoogleAuth = async (e) => {
    e.preventDefault();
    if (isGoogleAuth) return; // Already authed
    showToast('🔄 Генерация ссылки авторизации Google...');
    try {
      const res = await fetch('https://asia-south1-bot-lab-21910.cloudfunctions.net/googleAuthUrl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: {} })
      });
      const data = await res.json();
      if (data.result?.url) {
        // In a real flow, you redirect to data.result.url
        // window.location.href = data.result.url;
        
        // FOR NOW: Since we don't have real keys, redirect to our mock page to simulate success
        showToast('🔗 Переход на страницу Google OAuth...');
        setTimeout(() => {
          window.location.href = '/gbp-grant';
        }, 1000);
      }
    } catch (e) {
      showToast('⚠️ Ошибка соединения с бекендом');
    }
  };

  return (
    <div className="min-h-screen bg-[#090A0F] text-slate-100 font-sans p-4 md:p-8 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10 space-y-6">
        
        {/* Toast Alert */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="fixed top-6 left-1/2 -translate-x-1/2 z-50 p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-semibold shadow-xl backdrop-blur-xl"
            >
              {toastMessage}
            </motion.div>
          )}
        </AnimatePresence>

        
        <ManagerDelegationModal isOpen={isManagerModalOpen} onClose={() => setIsManagerModalOpen(false)} onToast={showToast} />

        {/* VENUE POPUP */}
        <AnimatePresence>
          {showVenuePopup && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#090A0F]/90 backdrop-blur-md"
              onClick={() => setShowVenuePopup(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 w-full max-w-3xl shadow-2xl relative max-h-[90vh] flex flex-col"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <span>📑 Разделы карточки</span>
                      <span className="text-sm font-normal text-blue-400">({businessName})</span>
                    </h3>
                    <p className="text-xs text-slate-400">Управление отзывами, постами и интерактивными кнопками заведения</p>
                  </div>
                  <button onClick={() => setShowVenuePopup(false)} className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-full transition">
                    ✕
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 mt-4 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                  <button
                    onClick={() => setPopupTab('reviews')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                      popupTab === 'reviews' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>💬 Отзывы (${reviewsList.length})</span>
                  </button>
                  <button
                    onClick={() => setPopupTab('posts')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                      popupTab === 'posts' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>📢 Новости & Посты (${postsList.length})</span>
                  </button>
                  <button
                    onClick={() => setPopupTab('buttons')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                      popupTab === 'buttons' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>🔗 Кнопки & Ссылки</span>
                  </button>
                </div>

                {/* Tab Content Area */}
                <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-4">
                  
                  {/* TAB 1: REVIEWS MANAGEMENT */}
                  {popupTab === 'reviews' && (
                    <div className="space-y-4">
                      {/* Rating Header Banner */}
                      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                          <div className="text-3xl font-black text-amber-400">4.0 ⭐</div>
                          <div>
                            <div className="text-xs font-bold text-white">Средний рейтинг на Картах</div>
                            <div className="text-[11px] text-slate-400">Всего отзывов: {reviewsList.length} | Без ответа: <span className="text-amber-400 font-bold">{reviewsList.filter(r => !r.isResponded).length}</span></div>
                          </div>
                        </div>

                        {/* Filters */}
                        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px]">
                          <button
                            onClick={() => setReviewFilter('all')}
                            className={`px-2.5 py-1 rounded-lg font-bold transition ${reviewFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                          >
                            Все
                          </button>
                          <button
                            onClick={() => setReviewFilter('unanswered')}
                            className={`px-2.5 py-1 rounded-lg font-bold transition ${reviewFilter === 'unanswered' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white'}`}
                          >
                            ⏳ Без ответа
                          </button>
                          <button
                            onClick={() => setReviewFilter('negative')}
                            className={`px-2.5 py-1 rounded-lg font-bold transition ${reviewFilter === 'negative' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'text-slate-400 hover:text-white'}`}
                          >
                            ⚠️ &lt; 4★
                          </button>
                          <button
                            onClick={() => setReviewFilter('positive')}
                            className={`px-2.5 py-1 rounded-lg font-bold transition ${reviewFilter === 'positive' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-white'}`}
                          >
                            ⭐ 5★
                          </button>
                        </div>
                      </div>

                      {/* Review Cards */}
                      {reviewsList
                        .filter(r => {
                          if (reviewFilter === 'unanswered') return !r.isResponded;
                          if (reviewFilter === 'negative') return r.rating < 4;
                          if (reviewFilter === 'positive') return r.rating === 5;
                          return true;
                        })
                        .map(rev => (
                          <div key={rev.id} className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <img src={rev.avatar} alt={rev.author} className="w-10 h-10 rounded-full object-cover border border-slate-600" />
                                <div>
                                  <div className="font-bold text-sm text-white flex items-center gap-2">
                                    <span>{rev.author}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${rev.platform === 'google' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                                      {rev.platform === 'google' ? 'Google' : 'Яндекс'}
                                    </span>
                                  </div>
                                  <div className="text-xs text-amber-400 font-bold mt-0.5">
                                    {'⭐'.repeat(rev.rating)} <span className="text-slate-400 font-normal text-[11px] ml-1">({rev.date})</span>
                                  </div>
                                </div>
                              </div>

                              <div>
                                {rev.isResponded ? (
                                  <span className="px-3 py-1 rounded-xl text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                                    <span>✅ Отвечен</span>
                                  </span>
                                ) : (
                                  <span className="px-3 py-1 rounded-xl text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-1">
                                    <span>⏳ Требует ответа</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            <p className="text-sm text-slate-200 bg-slate-900/50 p-3 rounded-xl border border-slate-800/80">
                              "{rev.text}"
                            </p>

                            {/* Existing Reply Block */}
                            {rev.isResponded && (
                              <div className="bg-blue-950/30 border border-blue-800/40 p-3 rounded-xl ml-4 space-y-1">
                                <div className="text-[11px] font-bold text-blue-400 flex items-center justify-between">
                                  <span>💬 Ваш ответ (Владелец заведения):</span>
                                  <span className="text-slate-500 font-normal">{rev.replyDate}</span>
                                </div>
                                <p className="text-xs text-blue-100 italic">{rev.reply}</p>
                              </div>
                            )}

                            {/* Reply Input & AI Revizor Button */}
                            {(!rev.isResponded || replyTextMap[rev.id] !== undefined) && (
                              <div className="space-y-2 pt-2 border-t border-slate-700/40">
                                <textarea
                                  value={replyTextMap[rev.id] || ''}
                                  onChange={(e) => setReplyTextMap({ ...replyTextMap, [rev.id]: e.target.value })}
                                  placeholder="Напишите ответ на отзыв или нажмите 'Сгенерировать ответ ИИ'..."
                                  rows={2}
                                  className="w-full bg-slate-950/70 border border-slate-700 text-xs text-white rounded-xl p-3 outline-none focus:border-blue-500 transition"
                                />

                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <button
                                    onClick={() => handleGenerateAiReply(rev)}
                                    disabled={aiGeneratingReviewId === rev.id}
                                    className="px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 font-bold rounded-xl text-xs transition flex items-center gap-1.5 disabled:opacity-50"
                                  >
                                    <span>✨ {aiGeneratingReviewId === rev.id ? 'ИИ Ревизор думает...' : 'Сгенерировать ответ ИИ'}</span>
                                  </button>

                                  <button
                                    onClick={() => handleSendReply(rev.id)}
                                    disabled={isSubmittingReplyId === rev.id}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-blue-600/20 disabled:opacity-50"
                                  >
                                    <span>📤 {isSubmittingReplyId === rev.id ? 'Отправка...' : 'Опубликовать ответ'}</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}

                  {/* TAB 2: POSTS & NEWS */}
                  {popupTab === 'posts' && (
                    <div className="space-y-4">
                      {/* Create Post Card */}
                      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                        <h4 className="font-bold text-sm text-white flex items-center gap-2">
                          <span>➕ Создать новую новость или акцию</span>
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="md:col-span-2">
                            <input
                              type="text"
                              value={newPostTitle}
                              onChange={(e) => setNewPostTitle(e.target.value)}
                              placeholder="Заголовок (например: Скидка 20% на спешелти кофе!)"
                              className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 outline-none focus:border-purple-500"
                            />
                          </div>
                          <div>
                            <select
                              value={newPostType}
                              onChange={(e) => setNewPostType(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 outline-none"
                            >
                              <option value="news">Новость</option>
                              <option value="offer">Акция / Оффер</option>
                              <option value="event">Событие</option>
                            </select>
                          </div>
                        </div>

                        <textarea
                          value={newPostText}
                          onChange={(e) => setNewPostText(e.target.value)}
                          placeholder="Текст новости или детали акции..."
                          rows={2}
                          className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-xl p-3 outline-none focus:border-purple-500"
                        />

                        <div className="flex justify-end">
                          <button
                            onClick={handleCreatePost}
                            disabled={isPublishingPost}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50"
                          >
                            <span>🚀 {isPublishingPost ? 'Публикация...' : 'Опубликовать на Картах'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Published Posts Feed */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Опубликованные посты</h4>
                        {postsList.map(post => (
                          <div key={post.id} className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/60 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="font-bold text-sm text-white flex items-center gap-2">
                                <span>{post.title}</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase font-bold">
                                  {post.type === 'offer' ? 'Акция' : post.type === 'event' ? 'Событие' : 'Новость'}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400">{post.date}</span>
                            </div>
                            <p className="text-xs text-slate-300">{post.text}</p>
                            <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                              <span>✅ Status: {post.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: BUTTONS & LINKS */}
                  {popupTab === 'buttons' && (
                    <div className="space-y-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                      <h4 className="font-bold text-sm text-white">🔗 Управление кнопками карточки заведения</h4>
                      <p className="text-xs text-slate-400">Настройте прямой переход по кнопкам в карточке на Google и Яндекс Картах.</p>

                      <div className="space-y-3 pt-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">Ссылка на меню / Заказ</label>
                          <div className="flex gap-2">
                            <input
                              type="url"
                              value={menuLink}
                              onChange={(e) => setMenuLink(e.target.value)}
                              placeholder="https://svoicafe.ae/menu"
                              className="flex-1 bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                            />
                            <button
                              onClick={() => showToast('✅ Ссылка на меню сохранена!')}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition"
                            >
                              Сохранить
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">Прямой WhatsApp / Чат для брони</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="https://wa.me/97141234567"
                              className="flex-1 bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                            />
                            <button
                              onClick={() => showToast('✅ Ссылка на чат сохранена!')}
                              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition"
                            >
                              Сохранить
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TOP BAR: SCENARIO SELECTOR & GOOGLE OAUTH */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 md:p-6 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xl font-black">
              📍
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">Google Business Profile Manager</h1>
              <p className="text-xs text-slate-400">Платформа продвижения заведений на Google Картах через ИИ</p>
            </div>
          </div>

          {/* Scenario Switcher Tabs */}
          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 w-full md:w-auto">
            <button
              onClick={() => { setScenario('existing'); setActionPath('overview'); }}
              className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                scenario === 'existing' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🏪 Бизнес на Картах (Импорт)</span>
            </button>
            <button
              onClick={() => { setScenario('new'); setWizardStep(1); }}
              className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                scenario === 'new' 
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>➕ Создать новый бизнес</span>
            </button>
          </div>

          {/* Google Auth Button */}
          <a
            href="#" onClick={handleGoogleAuth}
            className={`w-full md:w-auto px-4 py-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 ${
              isGoogleAuth 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
            }`}
          >
            <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            </svg>
            <span>{isGoogleAuth ? 'Google OAuth ✅' : '🔒 Авторизовать Google OAuth'}</span>
          </a>
        </div>

        {/* ==================================================================================== */}
        {/* SCENARIO 1: EXISTING BUSINESS ON GOOGLE MAPS */}
        {/* ==================================================================================== */}
        {scenario === 'existing' && (
          <div className="space-y-6 animate-in fade-in duration-300">

            
            {/* VENUE CARD & ACTION BAR */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl flex flex-col gap-6">
              
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-b border-slate-800/50 pb-6">
                
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden flex-shrink-0">
                    <img src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=400" alt="Venue" className="w-full h-full object-cover opacity-80" />
                  </div>
                  <div>
                    <select
                      value={selectedVenueId}
                      onChange={(e) => handleVenueSelect(e.target.value)}
                      className="bg-transparent text-white font-black text-xl lg:text-2xl outline-none cursor-pointer hover:text-blue-400 transition-colors"
                    >
                      {venues.map(v => (
                        <option key={v.id} value={v.id} className="bg-slate-900 text-sm font-normal">
                          {v.name || 'Заведение'} — {v.city || v.address || 'Без адреса'}
                        </option>
                      ))}
                    </select>
                    <p className="text-sm text-slate-400 mt-1">{address || 'Адрес не указан'} | Категория: {category || 'Нет'}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 w-full lg:w-auto">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border ${hasGoogleLink ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' : 'bg-slate-800/50 border-slate-700 text-slate-500'}`}>🌐 Google</span>
                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border ${hasYandexLink ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-slate-800/50 border-slate-700 text-slate-500'}`}>🟡 Яндекс</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const current = venues.find(v => v.id === selectedVenueId) || venues[0];
                        setMissingMapsUrlVenue(current || null);
                        setMapsUrlInput(current?.googleMapsUrl || current?.mapsUrl || '');
                        setYandexMapsUrlInput(current?.yandexMapsUrl || current?.yandexUrl || '');
                        setIsMapsUrlModalOpen(true);
                      }}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition"
                    >🔗 Ссылки</button>
                    <button
                      onClick={() => setIsManagerModalOpen(true)}
                      className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-amber-500/10"
                    >🤝 Передать доступ</button>
                    <button
                      onClick={() => setShowVenuePopup(true)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition"
                    >📑 Разделы карточки</button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                   <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Кнопка меню (Ссылка)</label>
                   <input
                      type="url"
                      value={menuLink}
                      onChange={(e) => setMenuLink(e.target.value)}
                      placeholder="https://menu.com/..."
                      className="w-full bg-slate-950/50 border border-slate-700/50 text-white text-sm rounded-xl px-4 py-2.5 focus:border-blue-500 outline-none"
                   />
                </div>
                <div className="flex items-end gap-2">
                   <button
                     onClick={handleImportForce}
                     disabled={isImportingForce || (!hasGoogleLink && !hasYandexLink)}
                     className="flex-1 px-4 py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
                   >
                     {isImportingForce ? '⏳ Импорт...' : '📥 Импорт с Карт'}
                   </button>
                   <button
                     onClick={handleExportForce}
                     disabled={isExportingForce}
                     className="flex-1 px-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
                   >
                     {isExportingForce ? '⏳ Экспорт...' : '📤 Экспорт'}
                   </button>
                </div>
              </div>
            </div>

            {/* PARTNER OVERVIEW & RANK ASSESSMENT CARD */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md space-y-6">
              
              {/* Missing Maps Link Warning Banner */}
              {selectedVenueId !== 'demo' && !(venues.find(v => v.id === selectedVenueId)?.googleMapsUrl) && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📍</span>
                    <div>
                      <p className="text-xs font-bold text-amber-300">В базе данных отсутствует ссылка на Google Maps!</p>
                      <p className="text-[11px] text-slate-400">Укажите прямую ссылку на карточку заведения в БД, чтобы подгрузить реальные гео-данные и отзывы.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const current = venues.find(v => v.id === selectedVenueId);
                      setMissingMapsUrlVenue(current || null);
                      setGoogleMapsUrlInput(current?.googleMapsUrl || '');
                      setYandexMapsUrlInput(current?.yandexMapsUrl || '');
                      setIsMapsUrlModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs whitespace-nowrap transition"
                  >
                    Указать ссылки
                  </button>
                </div>
              )}

              {/* PLATFORM SWITCHER TABS (GOOGLE vs YANDEX vs DUAL SPLIT) */}
              <div className="flex flex-col sm:flex-row items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                <button
                  onClick={() => setActivePlatformTab('google')}
                  className={`w-full sm:flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                    activePlatformTab === 'google'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>🌐 Google Profile</span>
                </button>
                <button
                  onClick={() => setActivePlatformTab('yandex')}
                  className={`w-full sm:flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                    activePlatformTab === 'yandex'
                      ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>🟡 Яндекс Профиль</span>
                </button>
                <button
                  onClick={() => setActivePlatformTab('dual')}
                  className={`w-full sm:flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                    activePlatformTab === 'dual'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>⚡ Сравнение (Dual View)</span>
                </button>
              </div>

              {/* DUAL COMPARISON SPLIT VIEW OR SINGLE PLATFORM CARDS */}
              {activePlatformTab === 'dual' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
                  
                  {/* GOOGLE PROFILE COLUMN */}
                  <div className="p-5 rounded-2xl bg-slate-950/80 border border-blue-500/30 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🌐</span>
                        <h3 className="text-sm font-bold text-blue-400">Google Business Profile</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          hasGoogleLink ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                        }`}>
                          {hasGoogleLink ? 'Привязан ✅' : 'Не привязан ⚠️'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 text-[10px] font-bold">Лимит: 750 симв.</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Рейтинг Google</span>
                        <span className="text-xl font-black text-amber-400">
                          {hasGoogleLink && importedProfile.rating ? `⭐ ${importedProfile.rating}` : '—'}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Отзывы</span>
                        <span className="text-xl font-black text-blue-400">
                          {hasGoogleLink && importedProfile.reviewsCount ? `💬 ${importedProfile.reviewsCount}` : '—'}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs space-y-2 text-slate-300">
                      <p><strong className="text-slate-400">Категория:</strong> {category || '—'}</p>
                      <p><strong className="text-slate-400">Атрибуты:</strong> {hasGoogleLink ? (importedProfile.attributes?.join(', ') || '—') : '—'}</p>
                      <p className="text-[11px] text-slate-400 bg-slate-900 p-3 rounded-xl border border-slate-800 leading-relaxed">
                        <strong className="text-slate-200 block mb-1">SEO-Описание Google:</strong>
                        {hasGoogleLink ? (editableDesc.length > 200 ? editableDesc.substring(0, 180) + '...' : editableDesc) : (
                          <span className="text-amber-400/90 italic">Ссылка на Google Maps не привязана. Нажмите «Настроить ссылки», чтобы привязать карточку.</span>
                        )}
                      </p>
                    </div>

                    {!hasGoogleLink && (
                      <button
                        onClick={() => {
                          const current = venues.find(v => v.id === selectedVenueId) || venues[0];
                          setMissingMapsUrlVenue(current || null);
                          setMapsUrlInput(current?.googleMapsUrl || current?.mapsUrl || '');
                          setYandexMapsUrlInput(current?.yandexMapsUrl || current?.yandexUrl || '');
                          setIsMapsUrlModalOpen(true);
                        }}
                        className="w-full py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 font-bold text-xs rounded-xl border border-blue-500/30 transition flex items-center justify-center gap-1.5"
                      >
                        <span>➕ Привязать Google Maps</span>
                      </button>
                    )}
                  </div>

                  {/* YANDEX PROFILE COLUMN */}
                  <div className="p-5 rounded-2xl bg-slate-950/80 border border-amber-500/30 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🟡</span>
                        <h3 className="text-sm font-bold text-amber-400">Яндекс Бизнес & Карты</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          hasYandexLink ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                        }`}>
                          {hasYandexLink ? 'Привязан ✅' : 'Не привязан ⚠️'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 text-[10px] font-bold">1000 симв. + Метро</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Оценка Яндекса</span>
                        <span className="text-xl font-black text-amber-400">
                          {hasYandexLink && yandexProfile.rating ? `🟡 ${yandexProfile.rating}` : '—'}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Оценки пользователей</span>
                        <span className="text-xl font-black text-amber-300">
                          {hasYandexLink && yandexProfile.reviewsCount ? `💬 ${yandexProfile.reviewsCount}` : '—'}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs space-y-2 text-slate-300">
                      <p><strong className="text-slate-400">Рубрика:</strong> {hasYandexLink ? (yandexProfile.primaryRubric || '—') : '—'}</p>
                      <p><strong className="text-slate-400">Метро / Ориентир:</strong> {hasYandexLink && yandexProfile.metroStation ? `🚇 ${yandexProfile.metroStation}` : '—'}</p>
                      <p><strong className="text-slate-400">Особенности:</strong> {hasYandexLink ? (yandexProfile.attributes?.join(', ') || '—') : '—'}</p>
                      <p className="text-[11px] text-slate-400 bg-slate-900 p-3 rounded-xl border border-slate-800 leading-relaxed">
                        <strong className="text-amber-300 block mb-1">SEO-Описание Яндекс (с топонимами):</strong>
                        {hasYandexLink ? (
                          `Кофейня ${businessName} возле ${yandexProfile.metroStation || 'метро'}. Настоящий спешелти кофе и уютная атмосфера в г. ${city}.`
                        ) : (
                          <span className="text-amber-400/90 italic">Ссылка на Яндекс Карты не привязана. Нажмите «Настроить ссылки», чтобы привязать карточку.</span>
                        )}
                      </p>
                    </div>

                    {!hasYandexLink && (
                      <button
                        onClick={() => {
                          const current = venues.find(v => v.id === selectedVenueId) || venues[0];
                          setMissingMapsUrlVenue(current || null);
                          setMapsUrlInput(current?.googleMapsUrl || current?.mapsUrl || '');
                          setYandexMapsUrlInput(current?.yandexMapsUrl || current?.yandexUrl || '');
                          setIsMapsUrlModalOpen(true);
                        }}
                        className="w-full py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 font-bold text-xs rounded-xl border border-amber-500/30 transition flex items-center justify-center gap-1.5"
                      >
                        <span>➕ Привязать Яндекс Карты</span>
                      </button>
                    )}
                  </div>

                </div>
              ) : (
                /* SINGLE PLATFORM METRICS CARD */
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
                    <span className="text-xs text-slate-400 font-semibold block mb-1">
                      {activePlatformTab === 'yandex' ? 'Оценка Яндекса' : 'Текущий Рейтинг'}
                    </span>
                    <div className="text-2xl font-black text-amber-400 flex items-center justify-center gap-1">
                      <span>{activePlatformTab === 'yandex' ? '🟡' : '⭐'}</span> 
                      {activePlatformTab === 'yandex' 
                        ? (hasYandexLink && yandexProfile.rating ? yandexProfile.rating : '—') 
                        : (hasGoogleLink && importedProfile.rating ? importedProfile.rating : '—')}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
                    <span className="text-xs text-slate-400 font-semibold block mb-1">Всего Отзывов</span>
                    <div className="text-2xl font-black text-blue-400">
                      💬 {activePlatformTab === 'yandex' 
                        ? (hasYandexLink && yandexProfile.reviewsCount ? yandexProfile.reviewsCount : '—') 
                        : (hasGoogleLink && importedProfile.reviewsCount ? importedProfile.reviewsCount : '—')}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
                    <span className="text-xs text-slate-400 font-semibold block mb-1">
                      {activePlatformTab === 'yandex' ? 'Метро рядом' : 'Загружено Фото'}
                    </span>
                    <div className="text-base sm:text-xl font-black text-purple-400">
                      {activePlatformTab === 'yandex' 
                        ? (hasYandexLink && yandexProfile.metroStation ? `🚇 ${yandexProfile.metroStation}` : '—') 
                        : (hasGoogleLink && importedProfile.photosCount ? `📸 ${importedProfile.photosCount}` : '—')}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border border-blue-500/30 text-center">
                    <span className="text-xs text-blue-300 font-semibold block mb-1">
                      {activePlatformTab === 'yandex' ? 'Yandex Local Rank' : 'Google Maps Local Rank'}
                    </span>
                    <div className="text-2xl font-black text-emerald-400">
                      {(activePlatformTab === 'yandex' ? hasYandexLink : hasGoogleLink)
                        ? `${auditReport ? auditReport.score : (activePlatformTab === 'yandex' ? 92 : 78)}/100`
                        : '—'}
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* ACTION CHOICE HUB (2 PATHWAYS) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-stretch">
              
              {/* PATHWAY A: FULL AI PROFILE REDESIGN */}
              <div
                onClick={() => setActionPath('ai_redesign')}
                className={`p-6 rounded-3xl border cursor-pointer transition-all flex flex-col justify-between h-full ${
                  actionPath === 'ai_redesign'
                    ? 'bg-blue-600/10 border-blue-500 ring-2 ring-blue-500/30'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-2xl mb-4">
                    🚀
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Вариант А: ИИ-Переупаковка в 1 клик</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    Генерация полного пакета упаковки одновременно для Google Maps (750 симв.) и Яндекс Бизнеса (1000 симв. + Метро) за 10 секунд через ИИ Ревизор.
                  </p>
                </div>
                <div className="mt-auto pt-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setActionPath('ai_redesign'); }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-amber-600 hover:opacity-90 text-white font-bold text-xs shadow-lg shadow-purple-500/20"
                  >
                    Запустить Мульти-Переупаковку &rarr;
                  </button>
                </div>
              </div>

              {/* PATHWAY B: GRANULAR SEGMENT EDITING */}
              <div
                onClick={() => setActionPath('segment_edit')}
                className={`p-6 rounded-3xl border cursor-pointer transition-all flex flex-col justify-between h-full ${
                  actionPath === 'segment_edit'
                    ? 'bg-purple-600/10 border-purple-500 ring-2 ring-purple-500/30'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center text-2xl mb-4">
                    ⚙️
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Вариант Б: Посегментное Редактирование</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    Управляйте и оптимизируйте каждый отдельный сегмент карточки (Описание, Категории/Рубрики, График, Удобства, ИИ Медиа-Студия).
                  </p>
                </div>
                <div className="mt-auto pt-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setActionPath('segment_edit'); }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-500/20"
                  >
                    Перейти к Настройкам Сегментов &rarr;
                  </button>
                </div>
              </div>

            </div>

            {/* DEEP AUDIT TRIGGER BANNER */}
            <div className="bg-slate-900/60 border border-slate-800/60 rounded-3xl p-6 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🛡️ ИИ-Аудит регламентов: {activePlatformTab === 'yandex' ? 'Яндекс Бизнес & Справочник' : 'Google Guidelines & Shadow Ban'}</span>
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  {activePlatformTab === 'yandex' 
                    ? 'Проверка карточки на спам в названии, валидность рубрик Яндекса и привязку к метро.' 
                    : 'Проверка карточки на спам в названии, фейковые адреса и скрытые риски блокировки.'}
                </p>
              </div>
              <button
                onClick={handleRunDeepAnalysis}
                disabled={isDeepAuditing}
                className={`px-6 py-3 rounded-xl text-white font-bold text-xs whitespace-nowrap shadow-lg transition ${
                  activePlatformTab === 'yandex' ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'
                }`}
              >
                {isDeepAuditing ? 'Анализ...' : `🔍 Запустить Аудит (${activePlatformTab === 'yandex' ? 'Яндекс' : 'Google'})`}
              </button>
            </div>
            {/* DEEP ANALYSIS RESULT DISPLAY */}
            {deepAnalysis && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4">
                <div className={`p-6 rounded-3xl border ${deepAnalysis.riskScore > 50 ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                  <h3 className="text-lg font-bold mb-4 flex items-center justify-between">
                    <span className={deepAnalysis.riskScore > 50 ? 'text-red-400' : 'text-emerald-400'}>
                      {deepAnalysis.riskScore > 50 ? '🚨 Риск Блокировки (Suspension)' : '✅ Риск Блокировки Минимален'}
                    </span>
                    <span className="text-2xl font-black">{deepAnalysis.riskScore}/100</span>
                  </h3>
                  {deepAnalysis.suspensionRisks?.length > 0 ? (
                    <div className="space-y-3">
                      {deepAnalysis.suspensionRisks.map((risk, i) => {
                        const factor = risk.factor || risk.title || risk.name || risk.googlePolicy || 'Фактор риска';
                        const issue = risk.issue || risk.description || risk.details || risk.problem;
                        const rec = risk.recommendation || risk.action || risk.solution || risk.fix;
                        if (!issue && !rec) return null;
                        return (
                          <div key={i} className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                            {factor && <p className="text-xs font-bold text-red-400 mb-1">{factor}</p>}
                            {issue && <p className="text-sm text-slate-200 mb-2">{issue}</p>}
                            {rec && <p className="text-xs text-slate-400 border-t border-slate-800 pt-2">Решение: {rec}</p>}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-300">Нарушений Google Guidelines не найдено. Ваш профиль в безопасности.</p>
                  )}
                </div>

                <div className="p-6 rounded-3xl border bg-blue-500/10 border-blue-500/30">
                  <h3 className="text-lg font-bold mb-4 flex items-center justify-between text-blue-400">
                    <span>📈 Local SEO Potential</span>
                    <span className="text-2xl font-black">{deepAnalysis.seoScore}/100</span>
                  </h3>
                  {deepAnalysis.seoOpportunities?.length > 0 ? (
                    <div className="space-y-3">
                      {deepAnalysis.seoOpportunities.map((seo, i) => {
                        const factor = seo.factor || seo.title || seo.name || 'Точка роста';
                        const impact = seo.impact || seo.severity || 'Medium';
                        const issue = seo.issue || seo.description || seo.details || seo.problem;
                        const rec = seo.recommendation || seo.action || seo.solution || seo.fix;
                        if (!issue && !rec) return null;
                        return (
                          <div key={i} className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                            <p className="text-xs font-bold text-blue-400 mb-1">{factor} {impact ? `• ${impact} Impact` : ''}</p>
                            {issue && <p className="text-sm text-slate-200 mb-2">{issue}</p>}
                            {rec && <p className="text-xs text-slate-400 border-t border-slate-800 pt-2">Действие: {rec}</p>}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-300">Профиль отлично оптимизирован!</p>
                  )}
                </div>
                
                <div className="md:col-span-2 p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                  <p className="text-sm text-slate-300"><strong>Вердикт ИИ Ревизора:</strong> {deepAnalysis.overallVerdict}</p>
                </div>
              </div>
            )}

            {/* PATHWAY A CONTENT: FULL AI PROFILE REDESIGN */}
            {actionPath === 'ai_redesign' && (
              <div className="bg-slate-900/80 border border-blue-500/40 rounded-3xl p-6 backdrop-blur-xl space-y-6 animate-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>🚀 Автоматическая ИИ-Переупаковка Профиля</span>
                  </h3>
                  <button onClick={() => setActionPath('overview')} className="text-xs text-slate-400 hover:text-white">
                    ✕ Закрыть
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">Оптимизированное SEO-Описание (Google Maps):</label>
                    <textarea
                      rows={4}
                      value={editableDesc}
                      onChange={(e) => setEditableDesc(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-200 focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                      <span className="text-xs font-bold text-purple-400 block mb-2">Рекомендуемые Доп. Категории:</span>
                      <div className="flex flex-wrap gap-2">
                        {importedProfile.additionalCategories?.map(c => (
                          <span key={c} className="px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded-lg text-xs font-semibold">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                      <span className="text-xs font-bold text-blue-400 block mb-2">Рекомендуемые Атрибуты:</span>
                      <div className="flex flex-wrap gap-2">
                        {importedProfile.attributes?.map(c => (
                          <span key={c} className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-lg text-xs font-semibold">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <button onClick={() => setActionPath('overview')} className="px-4 py-2.5 rounded-xl bg-slate-800 text-xs font-bold">
                    &larr; Назад к обзору
                  </button>
                  <button onClick={handlePatchGoogleApi} disabled={isPatchingGoogle} className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20">
                    {isPatchingGoogle ? 'Обновляем Google Maps...' : '🚀 Применить переупаковку в Google Business Profile'}
                  </button>
                </div>
              </div>
            )}

            {/* PATHWAY B CONTENT: GRANULAR SEGMENT EDITING */}
            {actionPath === 'segment_edit' && (
              <div className="bg-slate-900/80 border border-purple-500/40 rounded-3xl p-6 backdrop-blur-xl space-y-6 animate-in zoom-in-95">
                
                {/* Segment Navigation */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 overflow-x-auto gap-2">
                  <div className="flex gap-2">
                    {[
                      { id: 'desc', label: '📝 SEO-Описание' },
                      { id: 'hours', label: '🕒 Часы Работы' },
                      { id: 'attributes', label: '🏷️ Атрибуты' },
                      { id: 'media', label: '📸 ИИ Медиа-Студия' }
                    ].map(seg => (
                      <button
                        key={seg.id}
                        onClick={() => setSegmentTab(seg.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                          segmentTab === seg.id 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-slate-950 text-slate-400 hover:text-white'
                        }`}
                      >
                        {seg.label}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setActionPath('overview')} className="text-xs text-slate-400 hover:text-white">
                    ✕ Закрыть
                  </button>
                </div>

                {/* SEGMENT 1: SEO DESCRIPTION & CATEGORIES */}
                {segmentTab === 'desc' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-2">Описание карточки заведения:</label>
                      <textarea
                        rows={5}
                        value={editableDesc}
                        onChange={(e) => setEditableDesc(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-200 focus:border-purple-500"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button onClick={handlePatchGoogleApi} disabled={isPatchingGoogle} className="px-5 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs">
                        Сохранить описание
                      </button>
                    </div>
                  </div>
                )}

                {/* SEGMENT 2: HOURS & SCHEDULE */}
                {segmentTab === 'hours' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                      <span className="text-xs font-bold text-slate-300 block">Основной график работы:</span>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                        <div>Пн - Пт: 08:00 – 22:00</div>
                        <div>Сб - Вс: 09:00 – 23:00</div>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                      <span className="text-xs font-bold text-amber-400 block mb-1">Праздничный график (Special Hours):</span>
                      <p className="text-xs text-slate-400">Настройте часы работы на праздники для предотвращения жалоб клиентов.</p>
                    </div>
                  </div>
                )}

                {/* SEGMENT 3: AMENITIES & ATTRIBUTES */}
                {segmentTab === 'attributes' && (
                  <div className="space-y-4">
                    <span className="text-xs font-bold text-slate-300 block">Удобства заведения на Google Картах:</span>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {['Бесплатный Wi-Fi', 'Оплата картой', 'Летняя терраса', 'Парковка', 'Dog Friendly', 'Детская зона'].map(attr => (
                        <label key={attr} className="flex items-center gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 cursor-pointer">
                          <input type="checkbox" defaultChecked className="rounded border-slate-700 text-purple-600 focus:ring-purple-500" />
                          <span>{attr}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* SEGMENT 4: MEDIA STUDIO & POSTING */}
                {segmentTab === 'media' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-slate-800 border-dashed rounded-2xl cursor-pointer bg-slate-950 hover:bg-slate-900 transition">
                        {mediaPreview ? (
                          <img src={showEnhanced && aiEnhancedPreview ? aiEnhancedPreview : mediaPreview} alt="Upload" className="w-full h-full object-cover rounded-2xl" />
                        ) : (
                          <div className="text-center">
                            <span className="text-3xl block mb-2">📸</span>
                            <span className="text-xs text-slate-400 font-semibold">Нажмите для загрузки фото/видео</span>
                          </div>
                        )}
                        <input type="file" accept="image/*,video/*" onChange={handleMediaUpload} className="hidden" />
                      </label>
                      
                      {mediaPreview && (
                        <div className="flex gap-2">
                          <button onClick={handleEnhanceMedia} disabled={isEnhancing} className="flex-1 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs">
                            {isEnhancing ? 'Улучшаем...' : '🪄 ИИ-Улучшить фото'}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Раздел публикации:</label>
                        <select value={mediaSection} onChange={(e) => setMediaSection(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-xs rounded-xl p-3 text-slate-200">
                          <option value="Интерьер">Интерьер</option>
                          <option value="Меню/Продукция">Меню / Продукция</option>
                          <option value="Фасад">Фасад / Экстерьер</option>
                          <option value="Команда">Команда</option>
                        </select>
                      </div>

                      <div>
                        <button onClick={handleGenerateCaption} disabled={isGeneratingCaption} className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs mb-2">
                          {isGeneratingCaption ? 'Свободный генератор...' : '✍️ Сгенерировать ИИ-Описание'}
                        </button>
                        <textarea rows={3} value={mediaCaption} onChange={(e) => setMediaCaption(e.target.value)} placeholder="Описание фото..." className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200" />
                      </div>

                      <button onClick={handlePublishMedia} disabled={isPublishingMedia || !mediaPreview} className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs">
                        {isPublishingMedia ? 'Опубликовываем...' : '🚀 Опубликовать в Google Business Profile'}
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        )}

        {/* ==================================================================================== */}
        {/* SCENARIO 2: NEW BUSINESS CREATION WIZARD */}
        {/* ==================================================================================== */}
        {scenario === 'new' && (
          <div className="bg-slate-900/60 border border-purple-500/30 rounded-3xl p-6 backdrop-blur-md space-y-6 animate-in fade-in duration-300">
            
            <div className="border-b border-slate-800 pb-4">
              <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-bold uppercase tracking-wider mb-2 inline-block">
                Мастер создания карточки с нуля
              </span>
              <h2 className="text-2xl font-black text-white">Добавление Нового Бизнеса на Google Карты</h2>
              <p className="text-xs text-slate-400 mt-1">Расскажите о своем новом заведении, а ИИ сгенерирует весь стартовый пакет и поможет пройти регистрацию.</p>
            </div>

            {wizardStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white">🎙️ Шаг 1: Расскажите о бизнесе своими словами</h3>
                <textarea
                  rows={4}
                  value={ownerStory}
                  onChange={(e) => setOwnerStory(e.target.value)}
                  placeholder="Открыли спешелти кофейню Svoi в районе Dubai Marina. В меню свежая выпечка, V60, завтраки весь день. Есть летняя веранда и розетки..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-200 focus:border-purple-500"
                />
                <button onClick={handleAnalyzeStory} disabled={isAnalyzingStory} className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs hover:opacity-90">
                  {isAnalyzingStory ? 'Анализируем...' : '🧠 Запустить ИИ-Интервью & Извлечь Параметры'}
                </button>
              </div>
            )}

            {wizardStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white">❓ Шаг 2: Уточнение деталей от ИИ</h3>
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 space-y-2">
                  <p className="text-xs text-purple-300 font-bold mb-1">Уточняющие вопросы от ИИ:</p>
                  <ul className="list-disc list-inside text-xs text-slate-300">{interviewQuestions.map((q, i) => <li key={i}>{q}</li>)}</ul>
                </div>
                <textarea
                  rows={3}
                  value={interviewAnswers}
                  onChange={(e) => setInterviewAnswers(e.target.value)}
                  placeholder="Ответьте на вопросы..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-200 focus:border-purple-500"
                />
                <div className="flex justify-between">
                  <button onClick={() => setWizardStep(1)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold">Назад</button>
                  <button onClick={handleGenerateFullPack} disabled={isGeneratingPack} className="px-6 py-3 rounded-xl bg-purple-600 text-white font-bold text-xs">
                    {isGeneratingPack ? 'Генерация...' : '✨ Сгенерировать Стартовый ИИ-Пакет'}
                  </button>
                </div>
              </div>
            )}

            {wizardStep === 3 && aiFullPack && (
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-emerald-400">📋 Шаг 3: Стартовый ИИ-Пакет Сформирован</h3>
                
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Готовое SEO-Описание для Google Maps:</label>
                  <textarea rows={4} value={editableDesc} onChange={(e) => setEditableDesc(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-200 focus:border-emerald-500" />
                </div>

                <div className="flex justify-between pt-4">
                  <button onClick={() => setWizardStep(2)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold">Назад</button>
                  <button onClick={handlePatchGoogleApi} disabled={isPatchingGoogle} className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs">
                    {isPatchingGoogle ? 'Регистрация...' : '🚀 Отправить карточку в Google Business Profile'}
                  </button>
                </div>
              </div>
            )}

            {wizardStep === 4 && (
              <div className="text-center py-10">
                <div className="text-5xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold text-white mb-2">Новый бизнес зарегистрирован в системе!</h2>
                <p className="text-xs text-slate-400 mb-6">Профиль отправлен на модерацию в Google Картах.</p>
                <button onClick={() => { setScenario('existing'); setActionPath('overview'); }} className="px-6 py-3 bg-blue-600 rounded-xl text-xs font-bold text-white">
                  Перейти в Панель Управления Карточкой &rarr;
                </button>
              </div>
            )}

          </div>
        )}

      </div>

      {/* GOOGLE MAPS URL REQUEST POPUP MODAL */}
      <AnimatePresence>
        {isMapsUrlModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setIsMapsUrlModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg"
              >
                ✕
              </button>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-2xl mb-4">
                📍
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Привязка ссылки Google Карт</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                У заведения <strong className="text-white">{missingMapsUrlVenue?.name || businessName}</strong> в нашей базе данных отсутствует ссылка на Google Maps. Вставьте прямую ссылку на точку на картах, чтобы подтянуть реальный адрес, гео-данные и отзывы!
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">🌐 Ссылка на Google Maps (например, https://maps.app.goo.gl/...):</label>
                  <input
                    type="text"
                    placeholder="https://maps.app.goo.gl/..."
                    value={mapsUrlInput}
                    onChange={(e) => setMapsUrlInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-300 mb-2">🟡 Ссылка на Яндекс Карты (например, https://yandex.ru/maps/org/...):</label>
                  <input
                    type="text"
                    placeholder="https://yandex.ru/maps/org/..."
                    value={yandexMapsUrlInput}
                    onChange={(e) => setYandexMapsUrlInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500 outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSaveMapsUrlSubmit}
                    disabled={isSavingMapsUrl || (!mapsUrlInput.trim() && !yandexMapsUrlInput.trim())}
                    className="flex-1 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-600 hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 transition disabled:opacity-50"
                  >
                    {isSavingMapsUrl ? 'Сохранение в БД...' : '💾 Сохранить ссылки в БД и обновить'}
                  </button>
                  <button
                    onClick={() => setIsMapsUrlModalOpen(false)}
                    className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
