import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faUserCheck, 
    faUser, 
    faEnvelope, 
    faShieldHalved, 
    faBuilding, 
    faCheckCircle,
    faArrowRight,
    faSpinner,
    faClock
} from '@fortawesome/free-solid-svg-icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { auth, db } from './firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

const safeStorage = {
    getItem: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    setItem: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { console.warn('Storage blocked'); } }
};

const StaffJoinPage = () => {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const venueId = searchParams.get('venueId') || searchParams.get('v') || searchParams.get('id') || safeStorage.getItem('currentVenueId') || 'demo';

    const [venueName, setVenueName] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('staff');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isPendingOwner, setIsPendingOwner] = useState(false);
    const [successMsg, setSuccessMsg] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [requestId, setRequestId] = useState(null);

    useEffect(() => {
        const fetchVenue = async () => {
            try {
                const venueSnap = await getDoc(doc(db, 'venues', venueId));
                if (venueSnap.exists()) {
                    setVenueName(venueSnap.data().name || venueId);
                } else {
                    setVenueName(venueId);
                }
            } catch (err) {
                console.warn("Error fetching venue for staff join:", err);
                setVenueName(venueId);
            } finally {
                setLoading(false);
            }
        };

        fetchVenue();

        const unsubAuth = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                try {
                    await signInAnonymously(auth);
                } catch (e) {
                    console.warn("Anonymous auth failed for staff join:", e);
                }
            } else {
                if (user.displayName) setName(user.displayName);
                if (user.email) setEmail(user.email);
            }
        });

        return () => unsubAuth();
    }, [venueId]);

    // Real-time listener for owner role assignment confirmation
    useEffect(() => {
        if (!requestId) return;

        const unsub = onSnapshot(doc(db, 'staff_requests', requestId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.status === 'approved') {
                    const assignedRole = data.assignedRole || role || 'staff';
                    const roleLabels = {
                        staff: 'Сотрудник / Официант',
                        manager: 'Менеджер заведения',
                        admin: 'Администратор заведения'
                    };

                    safeStorage.setItem('guestName', data.name || name);
                    safeStorage.setItem('guestEmail', data.email || email);
                    safeStorage.setItem('userRole', assignedRole);
                    safeStorage.setItem('currentVenueId', venueId);

                    setIsPendingOwner(false);
                    setSuccessMsg({
                        roleName: roleLabels[assignedRole] || 'Сотрудник',
                        venue: venueName
                    });
                } else if (data.status === 'rejected') {
                    setIsPendingOwner(false);
                    setErrorMsg('Владелец отклонил запрос на привязку роли.');
                }
            }
        });

        return () => unsub();
    }, [requestId, venueId, venueName, name, email, role]);

    const handleSendRequest = async (e) => {
        if (e && e.preventDefault) e.preventDefault();

        const cleanName = (name || '').trim();
        const rawEmail = (email || '').trim().toLowerCase();

        if (!cleanName) {
            setErrorMsg('Пожалуйста, укажите имя сотрудника');
            return;
        }

        if (!rawEmail || !rawEmail.includes('@')) {
            setErrorMsg('Пожалуйста, укажите корректный Email');
            return;
        }

        setErrorMsg('');
        setSubmitting(true);

        try {
            let currentUser = auth.currentUser;
            if (!currentUser) {
                const authRes = await signInAnonymously(auth);
                currentUser = authRes.user;
            }

            const uid = currentUser.uid;

            // Create staff_request in Firestore for owner real-time confirmation
            const reqRef = await addDoc(collection(db, 'staff_requests'), {
                venueId: venueId,
                employeeUid: uid,
                name: cleanName,
                email: rawEmail,
                requestedRole: role,
                status: 'pending',
                createdAt: serverTimestamp()
            });

            setRequestId(reqRef.id);
            setIsPendingOwner(true);
        } catch (err) {
            console.error("Error sending staff join request:", err);
            setErrorMsg("Ошибка при отправке запроса: " + (err.message || String(err)));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white">
                <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-xs font-black uppercase tracking-widest text-amber-400 animate-pulse">Загрузка приглашения...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-amber-500/30 overflow-x-hidden relative flex flex-col justify-between">
            {/* Background Ambient Glows */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-amber-500 blur-[140px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-emerald-500 blur-[140px] rounded-full" />
            </div>

            {/* Top Bar */}
            <header className="p-6 border-b border-white/10 flex items-center justify-between relative z-10 bg-black/60 backdrop-blur-xl">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <FontAwesomeIcon icon={faShieldHalved} className="text-lg" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black uppercase tracking-wider text-white">REVOO ECOSYSTEM</h1>
                        <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">Привязка Персонала</p>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-md w-full mx-auto p-6 flex flex-col justify-center relative z-10">
                <AnimatePresence mode="wait">
                    {successMsg ? (
                        <motion.div 
                            key="success"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#1C1C1E] border border-amber-500/40 rounded-[32px] p-8 text-center shadow-2xl relative overflow-hidden"
                        >
                            <div className="w-20 h-20 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-400 text-3xl shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                                <FontAwesomeIcon icon={faCheckCircle} />
                            </div>

                            <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-2">
                                РОЛЬ НАЗНАЧЕНА ВЛАДЕЛЬЦЕМ!
                            </h2>

                            <p className="text-sm font-semibold text-white/70 mb-6 leading-relaxed">
                                Владелец подтвердил вашу роль <span className="text-amber-400 font-bold">{successMsg.roleName}</span> для заведения <span className="text-white font-bold">{successMsg.venue}</span>.
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={() => window.location.href = '/owner'}
                                    className="w-full py-4 rounded-2xl bg-amber-500 text-black font-black text-sm uppercase tracking-wider shadow-lg hover:bg-amber-400 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <span>ПАНЕЛЬ ВЛАДЕЛЬЦА / СТАФФА</span>
                                    <FontAwesomeIcon icon={faArrowRight} />
                                </button>

                                <button
                                    onClick={() => navigate(`/test?id=${venueId}`)}
                                    className="w-full py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white/70 font-bold text-xs uppercase tracking-wider hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                                >
                                    Перейти к заведению
                                </button>
                            </div>
                        </motion.div>
                    ) : isPendingOwner ? (
                        <motion.div
                            key="pending"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#1C1C1E] border border-amber-500/40 rounded-[32px] p-8 text-center shadow-2xl relative overflow-hidden space-y-6"
                        >
                            <div className="w-20 h-20 bg-amber-500/20 border border-amber-500/40 rounded-full flex items-center justify-center mx-auto text-amber-400 text-3xl shadow-[0_0_30px_rgba(245,158,11,0.3)] animate-pulse">
                                <FontAwesomeIcon icon={faClock} />
                            </div>

                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tight text-white mb-2">
                                    ОЖИДАНИЕ ВЛАДЕЛЬЦА
                                </h2>
                                <p className="text-xs font-semibold text-white/70 leading-relaxed">
                                    Ваш запрос отправлен. Окно назначения роли сейчас открывается на стороне владельца во вкладке <span className="text-emerald-400 font-bold">МОЙ БИЗНЕС</span>.
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-white/40 uppercase font-black tracking-wider text-[9px]">Сотрудник</span>
                                    <span className="text-white font-bold">{name}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-white/40 uppercase font-black tracking-wider text-[9px]">Email</span>
                                    <span className="text-white font-bold">{email}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-white/40 uppercase font-black tracking-wider text-[9px]">Заведение</span>
                                    <span className="text-amber-400 font-bold">{venueName}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-center gap-2 text-amber-400 text-xs font-bold animate-pulse">
                                <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                                <span>Ожидание выбора роли владельцем...</span>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="form"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="bg-[#1C1C1E]/90 border border-white/10 rounded-[32px] p-6 shadow-2xl backdrop-blur-2xl relative overflow-hidden space-y-6"
                        >
                            <div className="text-center">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest mb-3">
                                    <FontAwesomeIcon icon={faBuilding} />
                                    <span>{venueName}</span>
                                </div>
                                <h2 className="text-2xl font-black uppercase tracking-tight text-white">
                                    Регистрация Персонала
                                </h2>
                                <p className="text-xs text-white/50 font-bold uppercase tracking-wider mt-1">
                                    Отсканирован QR-код заведения
                                </p>
                            </div>

                            {errorMsg && (
                                <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold text-center">
                                    {errorMsg}
                                </div>
                            )}

                            <form onSubmit={handleSendRequest} className="space-y-4">
                                {/* Имя сотрудника */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">
                                        Имя сотрудника
                                    </label>
                                    <div className="relative">
                                        <FontAwesomeIcon icon={faUser} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                                        <input 
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Имя Фамилия"
                                            className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-sm text-white font-semibold outline-none focus:border-amber-500/50 transition-all placeholder:text-white/20"
                                        />
                                    </div>
                                </div>

                                {/* Email сотрудника */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">
                                        Email сотрудника
                                    </label>
                                    <div className="relative">
                                        <FontAwesomeIcon icon={faEnvelope} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                                        <input 
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="staff@example.com"
                                            className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-sm text-white font-semibold outline-none focus:border-amber-500/50 transition-all placeholder:text-white/20"
                                        />
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full py-4 mt-2 rounded-2xl bg-amber-500 text-black font-black text-sm uppercase tracking-wider shadow-xl shadow-amber-500/20 active:scale-95 hover:bg-amber-400 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {submitting ? (
                                        <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    ) : (
                                        <span>ОТПРАВИТЬ ЗАПРОС НА ПРИВЯЗКУ</span>
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Footer */}
            <footer className="p-6 text-center opacity-30 relative z-10">
                <p className="text-[9px] font-black text-white uppercase tracking-[0.4em]">REVOO DIGITAL ECOSYSTEM © 2026</p>
            </footer>
        </div>
    );
};

export default StaffJoinPage;
