import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faCircleUser, 
    faChevronRight,
    faXmark,
    faChartLine,
    faCrown,
    faMapLocationDot,
    faGear,
    faRightFromBracket,
    faRightToBracket,
    faAward,
    faCalendarAlt,
    faInfoCircle,
    faBolt,
    faGaugeHigh,
    faShieldHalved,
    faQrcode,
    faUserCheck,
    faUserGear,
    faCheckCircle
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUserStatuses } from './hooks/useUserStatuses';
import { auth, db } from './firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, orderBy, getDocs, limit, doc, getDoc, onSnapshot, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const UserMenu = ({ user, trigger, isGuestView, venueColor = '#00FF41' }) => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [userRole, setUserRole] = useState('guest');
    const [showStaffQrModal, setShowStaffQrModal] = useState(false);
    const [showStatusDetails, setShowStatusDetails] = useState(false);
    const [showVisitHistory, setShowVisitHistory] = useState(false);
    const [visitHistoryList, setVisitHistoryList] = useState([]);
    const [loadingVisits, setLoadingVisits] = useState(false);

    // Owner Real-time Staff Role Assignment states
    const [pendingStaffRequests, setPendingStaffRequests] = useState([]);
    const [assigningRoleForReq, setAssigningRoleForReq] = useState(null);
    const [selectedRole, setSelectedRole] = useState('staff');
    const [confirmingRole, setConfirmingRole] = useState(false);
    const [roleAssignSuccess, setRoleAssignSuccess] = useState('');

    const { statuses, loading, loadingMore, hasMore, loadMore } = useUserStatuses(5);
    const observerTarget = useRef(null);

    // Color utility for background variants
    const getAccentColor = () => venueColor;

    useEffect(() => {
        const venueId = localStorage.getItem('currentVenueId') || 'demo';
        const q = query(
            collection(db, 'staff_requests'),
            where('venueId', '==', venueId),
            where('status', '==', 'pending')
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const reqs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setPendingStaffRequests(reqs);
            if (reqs.length > 0) {
                setAssigningRoleForReq(reqs[0]);
                setShowStaffQrModal(true);
            }
        }, (err) => {
            console.warn("Error listening to staff_requests:", err);
        });

        return () => unsub();
    }, []);

    const handleConfirmRole = async () => {
        if (!assigningRoleForReq) return;
        setConfirmingRole(true);
        try {
            const req = assigningRoleForReq;
            const currentVenueId = localStorage.getItem('currentVenueId') || req.venueId || 'demo';

            // 1. Update user document
            if (req.employeeUid) {
                await setDoc(doc(db, 'users', req.employeeUid), {
                    role: selectedRole,
                    venueId: currentVenueId,
                    displayName: req.name || '',
                    email: req.email || '',
                    updatedAt: serverTimestamp()
                }, { merge: true });
            }

            // 2. Also search user by email to ensure role update
            if (req.email) {
                try {
                    const qEmail = query(collection(db, 'users'), where('email', '==', req.email.toLowerCase()));
                    const emailSnap = await getDocs(qEmail);
                    emailSnap.docs.forEach(async (d) => {
                        await setDoc(doc(db, 'users', d.id), {
                            role: selectedRole,
                            venueId: currentVenueId,
                            displayName: req.name,
                            updatedAt: serverTimestamp()
                        }, { merge: true });
                    });
                } catch (e) {
                    console.warn("Error updating user by email:", e);
                }
            }

            // 3. Mark request as approved
            await updateDoc(doc(db, 'staff_requests', req.id), {
                status: 'approved',
                assignedRole: selectedRole,
                approvedAt: serverTimestamp()
            });

            const roleLabels = {
                staff: 'Сотрудник / Официант',
                manager: 'Менеджер',
                admin: 'Администратор'
            };

            setRoleAssignSuccess(`Сотрудник ${req.name} успешно создан с ролью: ${roleLabels[selectedRole] || selectedRole}!`);
            setAssigningRoleForReq(null);
            setTimeout(() => setRoleAssignSuccess(''), 5000);
        } catch (err) {
            console.error("Error confirming staff role:", err);
        } finally {
            setConfirmingRole(false);
        }
    };

    useEffect(() => {
        if (!showVisitHistory) return;
        const fetchVisits = async () => {
            setLoadingVisits(true);
            try {
                const effectiveUid = user?.uid || localStorage.getItem('effectiveUid');
                const guestEmail = user?.email || localStorage.getItem('guestEmail');
                let docs = [];

                if (effectiveUid) {
                    const qUid = query(
                        collection(db, 'visits'),
                        where('uid', '==', effectiveUid),
                        orderBy('timestamp', 'desc'),
                        limit(30)
                    );
                    const snapUid = await getDocs(qUid);
                    docs = snapUid.docs.map(d => ({ id: d.id, ...d.data() }));
                }

                if (docs.length === 0 && guestEmail) {
                    const qEmail = query(
                        collection(db, 'visits'),
                        where('guestEmail', '==', guestEmail.toLowerCase()),
                        orderBy('timestamp', 'desc'),
                        limit(30)
                    );
                    const snapEmail = await getDocs(qEmail);
                    docs = snapEmail.docs.map(d => ({ id: d.id, ...d.data() }));
                }

                setVisitHistoryList(docs);
            } catch (err) {
                console.warn("Error fetching visit history:", err);
            } finally {
                setLoadingVisits(false);
            }
        };
        fetchVisits();
    }, [showVisitHistory, user]);

    useEffect(() => {
        const fetchUserRole = async () => {
            try {
                const uid = user?.uid || localStorage.getItem('effectiveUid');
                const guestEmail = user?.email || localStorage.getItem('guestEmail');

                if (uid) {
                    const userRef = doc(db, 'users', uid);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        const data = userSnap.data();
                        if (data?.role) {
                            setUserRole(data.role);
                            return;
                        }
                    }
                }

                if (guestEmail) {
                    const q = query(
                        collection(db, 'users'),
                        where('email', '==', guestEmail.toLowerCase()),
                        limit(1)
                    );
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                        const data = snap.docs[0].data();
                        if (data?.role) {
                            setUserRole(data.role);
                            return;
                        }
                    }
                }
            } catch (e) {
                console.warn("Error fetching user role in UserMenu:", e);
            }
        };
        if (user || isOpen) {
            fetchUserRole();
        }
    }, [user, isOpen]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !loadingMore) {
                    loadMore();
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [hasMore, loadingMore, loadMore, showStatusDetails]);

    const handleLogout = async () => {
        try {
            const currentVenueId = localStorage.getItem('currentVenueId');
            // Clear Firebase Auth
            await signOut(auth);
            
            // Clear application state
            localStorage.removeItem('guestName');
            localStorage.removeItem('guestEmail');
            localStorage.removeItem('currentVenueId');
            localStorage.removeItem('effectiveUid');
            
            setIsOpen(false);
            if (currentVenueId) {
                navigate(`/test?id=${currentVenueId}`);
            } else {
                navigate('/test');
            }
        } catch (error) {
            console.error("Logout error:", error);
        }
    };



    return (
        <div className="relative z-[100]">
            {/* Trigger Button */}
            {trigger ? (
                <div onClick={() => setIsOpen(true)}>
                    {trigger}
                </div>
            ) : (
                <button 
                    onClick={() => setIsOpen(true)}
                    className="w-10 h-10 bg-white/10 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center text-white/80 active:scale-90 transition-all shadow-lg"
                >
                    <FontAwesomeIcon icon={faCircleUser} className="text-[20px]" />
                </button>
            )}

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
                        />

                        {/* Dropdown Menu */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, x: -20, y: -20 }}
                            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, x: -20, y: -20 }}
                            className="absolute top-0 left-0 w-[85vw] max-w-[320px] bg-[#121214] border border-white/10 rounded-[32px] shadow-[0_30px_60px_rgba(0,0,0,0.8)] z-[101] overflow-hidden"
                        >
                            {/* Header */}
                            <div className="p-6 flex items-center justify-between border-b border-white/5 bg-white/[0.02]">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 border rounded-full flex items-center justify-center" style={{ backgroundColor: `${getAccentColor()}20`, borderColor: `${getAccentColor()}20`, color: getAccentColor() }}>
                                        <FontAwesomeIcon icon={faCircleUser} className="text-lg" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-black text-sm text-white uppercase tracking-tight">{user?.displayName || localStorage.getItem('guestName') || 'REVOO Guest'}</span>
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: getAccentColor() }}>Verified Profile</span>
                                    </div>
                                </div>
                                <button onClick={() => setIsOpen(false)} className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center text-white/20 transition-colors">
                                    <FontAwesomeIcon icon={faXmark} />
                                </button>
                            </div>

                            {/* Menu Body */}
                            <div className="p-4 space-y-3">
                                {/* 1. БИЗНЕС (Показывается, если за пользователем закреплены заведения / роль Владелец/Персонал/Админ) */}
                                {['owner', 'staff', 'admin', 'superadmin'].includes(userRole) && (
                                    <button 
                                        onClick={() => { window.location.href = '/owner'; setIsOpen(false); }}
                                        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent rounded-2xl text-white hover:bg-amber-500/25 transition-all border border-amber-500/40 group shadow-lg"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                                                <FontAwesomeIcon icon={faShieldHalved} />
                                            </div>
                                            <div className="flex flex-col text-left">
                                                <span className="text-xs font-black uppercase tracking-widest text-amber-400">{t('menu_business', 'БИЗНЕС')}</span>
                                                <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider">{t('menu_owner_admin_sub', 'Управление заведением')}</span>
                                            </div>
                                        </div>
                                        <FontAwesomeIcon icon={faChevronRight} className="text-[10px] text-amber-400 opacity-70" />
                                    </button>
                                )}

                                {/* 2. ПРОФИЛЬ (Объединенная страница гостя) */}
                                <button 
                                    onClick={() => { 
                                        navigate('/guest-dashboard', { state: { returnUrl: window.location.pathname + window.location.search } }); 
                                        setIsOpen(false); 
                                    }}
                                    className="w-full flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl text-white hover:bg-white/5 transition-all border border-white/5 group"
                                    style={{ borderColor: isGuestView ? `${getAccentColor()}20` : 'transparent' }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(0,0,0,0.1)]" style={{ backgroundColor: `${getAccentColor()}10`, color: getAccentColor() }}>
                                            <FontAwesomeIcon icon={faCircleUser} />
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-widest">{t('menu_profile', 'ПРОФИЛЬ')}</span>
                                    </div>
                                    <FontAwesomeIcon icon={faChevronRight} className="text-[10px] opacity-20" />
                                </button>

                                {/* 3. ДЕПОЗИТ (Депозитный баланс и статусы) */}
                                <button 
                                    onClick={() => { setShowStatusDetails(true); setIsOpen(false); }}
                                    className="w-full flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl text-white hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/30 transition-all border border-white/5 group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-[#D4AF37]/10 text-[#D4AF37] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                                            <FontAwesomeIcon icon={faCrown} />
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-widest">{t('menu_deposit', 'ДЕПОЗИТ')}</span>
                                    </div>
                                    <FontAwesomeIcon icon={faChevronRight} className="text-[10px] opacity-20" />
                                </button>

                                {/* 4. КАРТА (Карта партнёров) */}
                                <button 
                                    onClick={() => { navigate('/map'); setIsOpen(false); }}
                                    className="w-full flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl text-white hover:bg-blue-500/10 hover:border-blue-500/30 transition-all border border-white/5 group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FontAwesomeIcon icon={faMapLocationDot} />
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-widest">{t('menu_map', 'КАРТА')}</span>
                                    </div>
                                    <FontAwesomeIcon icon={faChevronRight} className="text-[10px] opacity-20" />
                                </button>

                                {/* 5. ПЕРЕКЛЮЧАТЕЛЬ ЯЗЫКА */}
                                <div className="p-4 bg-white/[0.03] rounded-2xl border border-white/5">
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="w-8 h-8 bg-white/5 text-white/40 rounded-xl flex items-center justify-center">
                                            <FontAwesomeIcon icon={faGear} className="text-xs" />
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-widest text-white/60">{t('menu_settings', 'ЯЗЫК')}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                                        {[
                                            { code: 'en', flag: '🇺🇸', label: 'EN' },
                                            { code: 'ru', flag: '🇷🇺', label: 'RU' },
                                            { code: 'ar', flag: '🇦🇪', label: 'AR' },
                                            { code: 'vi', flag: '🇻🇳', label: 'VI' }
                                        ].map((lang) => (
                                            <button 
                                                key={lang.code}
                                                onClick={() => i18n.changeLanguage(lang.code)}
                                                className={`flex-1 py-2.5 px-2 rounded-xl text-[10px] font-black flex flex-col items-center justify-center gap-1 border transition-all ${i18n.language === lang.code ? 'bg-[#00FF41] text-black border-[#00FF41] shadow-[0_0_15px_rgba(0,255,65,0.3)]' : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'}`}
                                            >
                                                <span className="text-sm leading-none">{lang.flag}</span>
                                                <span className="uppercase">{lang.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 6. LOG OUT / LOG IN */}
                                <button 
                                    onClick={() => { if (user) handleLogout(); else { navigate('/activate'); setIsOpen(false); } }}
                                    className={`w-full flex items-center justify-between p-4 rounded-[20px] active:scale-[0.98] transition-all border mt-3 ${user ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-[#00FF41]/10 border-[#00FF41]/20 text-[#00FF41]'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <FontAwesomeIcon icon={user ? faRightFromBracket : faRightToBracket} className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">{user ? t('menu_logout', 'ВЫХОД') : t('menu_login', 'ВХОД')}</span>
                                    </div>
                                    <FontAwesomeIcon icon={faChevronRight} className="text-[10px] opacity-30" />
                                </button>

                                <div className="pt-6 text-center opacity-10">
                                    <p className="text-[7px] font-black text-white uppercase tracking-[0.5em]">REVOO DIGITAL ECOSYSTEM © 2026</p>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Status Details Modal */}
            <AnimatePresence>
                {showStatusDetails && (
                    <motion.div
                        initial={{ opacity: 0, x: '100%' }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-0 z-[200] bg-black flex flex-col"
                    >
                        {/* Background Tech Watermark (Dynamic Green) */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.02]">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] border-[200px] rounded-full blur-[150px]" style={{ borderColor: getAccentColor() }} />
                        </div>

                        {/* Header */}
                        <div className="p-6 pt-12 md:pt-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-black/80 backdrop-blur-xl z-20">
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-[0_0_20px_rgba(0,0,0,0.1)]" style={{ backgroundColor: `${getAccentColor()}10`, borderColor: `${getAccentColor()}20` }}>
                                    <FontAwesomeIcon icon={faAward} className="w-6 h-6" style={{ color: getAccentColor() }} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white uppercase tracking-tight">{t('menu_my_statuses', 'My Statuses')}</h2>
                                    <p className="text-[10px] uppercase tracking-[0.3em] font-black" style={{ color: getAccentColor() }}>{t('status_archive', 'Digital Loyalty Vault')}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowStatusDetails(false)}
                                className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-all active:scale-95"
                            >
                                <FontAwesomeIcon icon={faXmark} className="w-6 h-6 text-white" />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative z-10">
                            <div className="max-w-3xl mx-auto space-y-6 pb-20">
                                {loading && statuses.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-40">
                                        <div className="w-12 h-12 border-2 border-t-transparent rounded-full animate-spin mb-6" style={{ borderColor: getAccentColor(), borderTopColor: 'transparent' }} />
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] animate-pulse" style={{ color: getAccentColor() }}>Synchronizing Data...</p>
                                    </div>
                                ) : statuses.length > 0 ? (
                                    <>
                                        {statuses.map((status, idx) => (
                                            <motion.div
                                                key={status.id || idx}
                                                initial={{ opacity: 0, y: 30 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className="p-6 rounded-[32px] bg-gradient-to-br from-white/[0.04] to-transparent border border-white/5 relative overflow-hidden group hover:border-white/20 transition-all"
                                            >
                                                <div className="absolute top-0 right-0 w-32 h-32 blur-[100px] opacity-[0.05] group-hover:opacity-[0.1] transition-opacity" style={{ backgroundColor: getAccentColor() }} />
                                                
                                                <div className="flex items-center justify-between mb-8">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                                                            <FontAwesomeIcon icon={faCalendarAlt} className="w-4 h-4 text-white/40" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] text-white/30 uppercase tracking-widest font-black">Captured On</p>
                                                            <p className="text-white font-bold text-sm">{status.lastVisit?.toLocaleDateString() || 'Recent Activity'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: getAccentColor() }} />
                                                        Verified Session
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="p-5 rounded-2xl bg-black/40 border border-white/5">
                                                        <p className="text-[10px] text-white/30 uppercase tracking-widest font-black mb-1">{status.venueName}</p>
                                                        <div className="flex items-baseline gap-1">
                                                            <p className="text-3xl font-black" style={{ color: getAccentColor() }}>{status.discount}%</p>
                                                            <p className="text-[10px] font-black opacity-50" style={{ color: getAccentColor() }}>OFF</p>
                                                        </div>
                                                    </div>
                                                    <div className="p-5 rounded-2xl bg-black/40 border border-white/5 flex flex-col justify-center">
                                                        <p className="text-[10px] text-white/30 uppercase tracking-widest font-black mb-1">Tier Level</p>
                                                        <p className="text-sm font-black text-white uppercase tracking-tighter">
                                                            {status.discount >= 20 ? 'REVOO ELITE' : 'ACTIVE MEMBER'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-between">
                                                    <div className="flex items-center space-x-2">
                                                        <FontAwesomeIcon icon={faBolt} className="text-[10px]" style={{ color: getAccentColor() }} />
                                                        <span className="text-[10px] text-white/40 font-black uppercase tracking-[0.1em]">Status active for 30 days post-visit</span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                        
                                        {/* Infinite Scroll Trigger */}
                                        <div ref={observerTarget} className="py-10 flex flex-col items-center">
                                            {loadingMore ? (
                                                <>
                                                    <div className="w-8 h-8 border-2 rounded-full animate-spin mb-4" style={{ borderColor: `${getAccentColor()}20`, borderTopColor: getAccentColor() }} />
                                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50" style={{ color: getAccentColor() }}>Fetching Archive...</p>
                                                </>
                                            ) : hasMore ? (
                                                <div className="h-20" />
                                            ) : (
                                                <div className="text-center opacity-20 py-10">
                                                    <div className="w-1 h-8 mx-auto mb-4" style={{ backgroundColor: getAccentColor() }} />
                                                    <p className="text-[10px] font-black uppercase tracking-[0.4em]">End of Records</p>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="py-40 text-center opacity-30">
                                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-8 border border-white/5">
                                            <FontAwesomeIcon icon={faAward} className="text-4xl" />
                                        </div>
                                        <p className="text-sm font-black uppercase tracking-[0.3em]">Vault is Empty</p>
                                        <p className="text-xs mt-4 max-w-[240px] mx-auto leading-relaxed">
                                            Visit REVOO partner venues to start building your digital privilege history.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Info Footer */}
                        <div className="p-6 bg-black border-t border-white/10 relative z-20">
                            <div className="max-w-3xl mx-auto flex items-start space-x-4 opacity-50">
                                <FontAwesomeIcon icon={faInfoCircle} className="mt-1" style={{ color: getAccentColor() }} />
                                <p className="text-[10px] leading-relaxed uppercase tracking-wider font-bold">
                                    {t('status_disclaimer', 'This is an immutable ledger of your statuses. Information is synced in real-time across the REVOO ecosystem.')}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Visit History Details Modal */}
            <AnimatePresence>
                {showVisitHistory && (
                    <motion.div
                        initial={{ opacity: 0, x: '100%' }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-0 z-[200] bg-black flex flex-col"
                    >
                        {/* Ambient Background Glow */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03]">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] border-[200px] rounded-full blur-[150px] border-emerald-500" />
                        </div>

                        {/* Header */}
                        <div className="p-6 pt-12 md:pt-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-black/80 backdrop-blur-xl z-20">
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                                    <FontAwesomeIcon icon={faCalendarAlt} className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white uppercase tracking-tight">{t('menu_visit_history', 'История визитов')}</h2>
                                    <p className="text-[10px] uppercase tracking-[0.3em] font-black text-emerald-400">{t('your_venue_visits', 'Ваши посещения заведения')}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowVisitHistory(false)}
                                className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-all active:scale-95 text-white"
                            >
                                <FontAwesomeIcon icon={faXmark} className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Scrollable List */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative z-10">
                            <div className="max-w-3xl mx-auto space-y-4 pb-20">
                                {loadingVisits ? (
                                    <div className="flex flex-col items-center justify-center py-40">
                                        <div className="w-12 h-12 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-6" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400 animate-pulse">{t('loading_history', 'Загрузка истории...')}</p>
                                    </div>
                                ) : visitHistoryList.length > 0 ? (
                                    visitHistoryList.map((visit, idx) => {
                                        const dateObj = visit.timestamp?.toDate ? visit.timestamp.toDate() : (visit.timestamp ? new Date(visit.timestamp) : null);
                                        const formattedDate = dateObj ? dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : t('recent_visit', 'Недавний визит');

                                        return (
                                            <motion.div
                                                key={visit.id || idx}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.04 }}
                                                className="p-5 rounded-[24px] bg-[#1C1C1E]/80 border border-white/10 flex items-center justify-between shadow-xl"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-sm">
                                                        {visit.discount || 0}%
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-white tracking-tight">
                                                            {visit.venueName || visit.venueId || 'REVOO Venue'}
                                                        </span>
                                                        <span className="text-[11px] text-white/50 font-medium">
                                                            {formattedDate}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-[10px] font-bold text-white/70 uppercase tracking-wider">
                                                    {visit.source === 'qr_scan_auto' ? 'QR' : (visit.source === 'wifi' ? 'Wi-Fi' : 'Visit')}
                                                </div>
                                            </motion.div>
                                        );
                                    })
                                ) : (
                                    <div className="py-32 text-center opacity-40">
                                        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
                                            <FontAwesomeIcon icon={faCalendarAlt} className="text-2xl text-white/60" />
                                        </div>
                                        <p className="text-sm font-black uppercase tracking-widest text-white">{t('visit_history_empty', 'История визитов пуста')}</p>
                                        <p className="text-xs text-white/60 mt-2">{t('visit_history_empty_sub', 'Сканируйте QR-коды в заведениях для накопления скидок')}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Staff QR & Role Assignment Modal */}
            <AnimatePresence>
                {showStaffQrModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-md flex items-center justify-center p-6"
                        onClick={() => setShowStaffQrModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-[#1C1C1E] border border-emerald-500/40 rounded-[32px] p-6 text-center shadow-2xl relative max-w-sm w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {roleAssignSuccess && (
                                <div className="mb-4 p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold flex items-center justify-center gap-2">
                                    <FontAwesomeIcon icon={faCheckCircle} />
                                    <span>{roleAssignSuccess}</span>
                                </div>
                            )}

                            {assigningRoleForReq ? (
                                /* ── REAL-TIME ROLE ASSIGNMENT WINDOW BY OWNER ── */
                                <div className="space-y-4 text-left">
                                    <div className="text-center">
                                        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-3 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                                            <FontAwesomeIcon icon={faUserGear} className="text-xl" />
                                        </div>
                                        <h3 className="text-lg font-black uppercase tracking-tight text-white mb-1">
                                            Назначение роли оунером
                                        </h3>
                                        <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                                            Сотрудник отсканировал QR-код
                                        </p>
                                    </div>

                                    {/* Employee Details Card */}
                                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Новый сотрудник</p>
                                        <p className="text-sm font-bold text-white">{assigningRoleForReq.name || 'Без имени'}</p>
                                        <p className="text-xs text-white/60 font-medium">{assigningRoleForReq.email || 'Email не указан'}</p>
                                    </div>

                                    {/* Role Selector */}
                                    <div className="space-y-2">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1">Выберите роль</p>
                                        {[
                                            { id: 'staff', label: 'Сотрудник / Официант', desc: 'Проведение скидок и списание депозитов' },
                                            { id: 'manager', label: 'Менеджер заведения', desc: 'Управление визитами и отчетами' },
                                            { id: 'admin', label: 'Администратор заведения', desc: 'Полный доступ к настройкам заведения' }
                                        ].map((r) => (
                                            <button
                                                type="button"
                                                key={r.id}
                                                onClick={() => setSelectedRole(r.id)}
                                                className={`w-full p-3 rounded-2xl border text-left transition-all ${selectedRole === r.id ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-black uppercase tracking-wider">{r.label}</span>
                                                    {selectedRole === r.id && <FontAwesomeIcon icon={faUserCheck} className="text-emerald-400 text-xs" />}
                                                </div>
                                                <span className="text-[9px] font-medium opacity-70 block mt-0.5">{r.desc}</span>
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        onClick={handleConfirmRole}
                                        disabled={confirmingRole}
                                        className="w-full py-4 bg-emerald-500 text-black font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl hover:bg-emerald-400 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                                    >
                                        {confirmingRole ? (
                                            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                        ) : (
                                            <span>ПОДТВЕРДИТЬ РОЛЬ И СОЗДАТЬ СОТРУДНИКА</span>
                                        )}
                                    </button>

                                    <button
                                        onClick={async () => {
                                            if (assigningRoleForReq) {
                                                await updateDoc(doc(db, 'staff_requests', assigningRoleForReq.id), { status: 'rejected' });
                                                setAssigningRoleForReq(null);
                                            }
                                        }}
                                        className="w-full py-2 text-red-400 font-bold text-[10px] uppercase tracking-wider hover:text-red-300 transition-colors"
                                    >
                                        Отклонить запрос
                                    </button>
                                </div>
                            ) : (
                                /* ── DEFAULT QR DISPLAY ── */
                                <div>
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-4">
                                        <FontAwesomeIcon icon={faQrcode} className="text-xl" />
                                    </div>
                                    <h3 className="text-lg font-black uppercase tracking-tight text-white mb-2">
                                        МОЙ БИЗНЕС — QR Сотрудника
                                    </h3>
                                    <p className="text-xs font-medium text-white/70 mb-4 leading-relaxed">
                                        Дайте отсканировать этот QR-код новому сотруднику. При сканировании здесь автоматически откроется <span className="text-emerald-400 font-bold">окно назначения роли</span>.
                                    </p>
                                    <div className="bg-white p-4 rounded-2xl shadow-xl mb-4 border border-white/20 inline-block">
                                        <img 
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                                                window.location.origin + '/staff-join?venueId=' + (localStorage.getItem('currentVenueId') || 'demo')
                                            )}`}
                                            alt="Staff Invite QR Code"
                                            className="w-[200px] h-[200px] block"
                                        />
                                    </div>
                                    <button
                                        onClick={() => setShowStaffQrModal(false)}
                                        className="w-full py-3.5 bg-emerald-500 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer"
                                    >
                                        Закрыть
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UserMenu;
