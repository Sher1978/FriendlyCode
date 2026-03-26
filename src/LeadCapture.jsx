import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faEnvelope, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { db, auth, googleProvider } from './firebase';
import { signInWithPopup, linkWithPopup, signInWithRedirect, getRedirectResult, linkWithRedirect } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit, doc, setDoc, getDoc, orderBy } from 'firebase/firestore';
import { RewardCalculator } from './logic/RewardCalculator';

const LeadCapture = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { discount } = location.state || { discount: 5 }; // Default to 5% if direct access

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

    // Handle Redirect Result on Mount
    React.useEffect(() => {
        const handleRedirect = async () => {
            try {
                const result = await getRedirectResult(auth);
                if (result) {
                    setIsGoogleLoading(true);
                    const linkedUser = result.user;
                    const googleName = linkedUser.displayName || 'Guest';
                    const googleEmail = linkedUser.email;
                    await processAuthUser(googleName, googleEmail, linkedUser.uid);
                }
            } catch (error) {
                console.error("Redirect Auth Result failed:", error);
            } finally {
                setIsGoogleLoading(false);
            }
        };
        handleRedirect();
    }, []);

    const processAuthUser = async (userName, userEmail, currentUid) => {
        const lowerEmail = userEmail.trim().toLowerCase();

        try {
            const venueId = localStorage.getItem('currentVenueId') || 'unknown';
            
            let effectiveUid = currentUid;
            let finalDiscount = discount;

            if (currentUid) {
                // 0. Check if this email already exists in 'users' collection
                const q = query(collection(db, 'users'), where('email', '==', lowerEmail), limit(1));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    // FOUND EXISTING USER -> Link to this ID instead of the new anonymous one
                    const existingUserDoc = querySnapshot.docs[0];
                    effectiveUid = existingUserDoc.id;
                    console.log(`Found existing user for ${lowerEmail}: ${effectiveUid}. Linking session...`);

                    // Update existing user with latest name/timestamp
                    await setDoc(doc(db, 'users', effectiveUid), {
                        displayName: userName.trim(),
                        updatedAt: serverTimestamp(),
                    }, { merge: true });

                    // Recalculate discount based on actual history
                    try {
                        const vDoc = await getDoc(doc(db, 'venues', venueId));
                        if (vDoc.exists()) {
                            const venueData = vDoc.data();
                            console.log("Recalculating discount for existing user using tiers:", venueData.tiers);

                            const qVisits = query(
                                collection(db, 'visits'),
                                where('guestEmail', '==', lowerEmail),
                                where('venueId', '==', venueId),
                                orderBy('timestamp', 'desc'),
                                limit(1)
                            );
                            const visitsSnap = await getDocs(qVisits);
                            if (!visitsSnap.empty) {
                                const lastVisitDate = visitsSnap.docs[0].data().timestamp.toDate();
                                const now = new Date();
                                const calcResult = RewardCalculator.calculate(lastVisitDate, now, venueData.loyaltyConfig || venueData.tiers, venueData.timezone || 'Asia/Dubai');
                                finalDiscount = calcResult.discount;
                                console.log(`New discount calculated for ${lowerEmail}: ${finalDiscount}%`);
                            }
                        }
                    } catch (err) {
                        console.error("Error recalculating discount on email match:", err);
                    }
                } else {
                    // NEW USER -> Create new doc with current auth UID
                    await setDoc(doc(db, 'users', currentUid), {
                        displayName: userName.trim(),
                        email: lowerEmail,
                        role: 'guest',
                        updatedAt: serverTimestamp(),
                        createdAt: serverTimestamp(), // Add creation time for new users
                    }, { merge: true });
                }

                // 2. Also keep the lead entry for marketing tracking (using effectiveUid)
                await addDoc(collection(db, 'leads'), {
                    uid: effectiveUid,
                    name: userName.trim(),
                    email: lowerEmail,
                    venueId: venueId,
                    timestamp: serverTimestamp(),
                    source: 'lead_capture'
                });

                // 3. OWNER NOTIFICATION: Guest used status
                try {
                    await addDoc(collection(db, 'notifications'), {
                        venueId: venueId,
                        type: 'guest_status_usage',
                        message: `Ваш гость ${userName.trim()} (${lowerEmail}) использовал свой Статус`,
                        timestamp: serverTimestamp(),
                        read: false
                    });
                } catch (notifErr) {
                    console.error("Failed to send owner notification:", notifErr);
                }
            }

            // Save guest data locally for instant recognition
            localStorage.setItem('guestName', userName.trim());
            localStorage.setItem('guestEmail', lowerEmail);
            if (effectiveUid) {
                localStorage.setItem('effectiveUid', effectiveUid);
            }

            // Navigate to UnifiedActivation (Reward Screen)
            navigate('/thank-you', {
                state: {
                    guestName: userName.trim(),
                    guestEmail: lowerEmail,
                    discountValue: finalDiscount,
                    venueId: venueId,
                    userRole: 'guest',
                    effectiveUid: effectiveUid // PASS THIS TO NEXT SCREEN
                }
            });
        } catch (e) {
            console.error("Error saving lead/user:", e);
            localStorage.setItem('guestName', userName.trim());
            localStorage.setItem('guestEmail', lowerEmail);
            navigate('/thank-you', { state: { guestName: userName.trim(), discountValue: discount } });
        }
    };

    const handleContinue = async () => {
        if (!name.trim() || !email.trim()) return;
        const user = auth.currentUser;
        await processAuthUser(name, email, user?.uid);
    };

    const handleGoogleSignIn = async () => {
        setIsGoogleLoading(true);
        try {
            const user = auth.currentUser;
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

            if (user && user.isAnonymous) {
                if (isMobile) {
                    await linkWithRedirect(user, googleProvider);
                } else {
                    const result = await linkWithPopup(user, googleProvider);
                    const linkedUser = result.user;
                    await processAuthUser(linkedUser.displayName || 'Guest', linkedUser.email, linkedUser.uid);
                }
            } else {
                if (isMobile) {
                    await signInWithRedirect(auth, googleProvider);
                } else {
                    const result = await signInWithPopup(auth, googleProvider);
                    const linkedUser = result.user;
                    await processAuthUser(linkedUser.displayName || 'Guest', linkedUser.email, linkedUser.uid);
                }
            }
        } catch (error) {
            console.error("Google Auth failed:", error);
            if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
                alert("Google Sign-In failed: " + error.message);
            }
            setIsGoogleLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#000000] font-sans text-white antialiased overflow-hidden relative">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#D4AF37]/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-amber-900/5 blur-[100px] rounded-full pointer-events-none" />

            <div className="flex-grow flex flex-col px-6 py-12 relative z-10">
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-white/60 shadow-sm border border-white/10 absolute top-8 left-6 z-10 hover:bg-white/10 transition-colors"
                >
                    <FontAwesomeIcon icon={faArrowLeft} />
                </button>

                <div className="mt-16 text-left">
                    <h1 className="text-[36px] font-bold tracking-tight leading-tight mb-2 text-white">
                        {t('almost_there')}
                    </h1>
                    <p className="text-[17px] text-white/40 font-medium">
                        {t('introduce_yourself')}
                    </p>
                </div>

                <div className="mt-12 space-y-8">
                    {/* Google Sign-In Button */}
                    <button
                        onClick={handleGoogleSignIn}
                        disabled={isGoogleLoading}
                        className="w-full h-[60px] bg-white text-black font-bold text-[16px] rounded-[18px] shadow-xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                    >
                        {isGoogleLoading ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                <span>Verifying...</span>
                            </div>
                        ) : (
                            <>
                                <svg width="20" height="20" viewBox="0 0 48 48">
                                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                                </svg>
                                Continue with Google
                            </>
                        )}
                    </button>

                    <div className="flex items-center gap-4 py-2">
                        <div className="h-px bg-white/5 flex-1"></div>
                        <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">OR</span>
                        <div className="h-px bg-white/5 flex-1"></div>
                    </div>

                    <div className="space-y-6">
                        {/* Name Input */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/30 ml-1">
                                {t('your_name')}
                            </label>
                            <div className="relative group">
                                <FontAwesomeIcon icon={faUser} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#D4AF37] transition-colors" />
                                <input
                                    type="text"
                                    placeholder="e.g., Alex"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full h-[60px] pl-12 pr-6 bg-white/5 border border-white/5 focus:border-[#D4AF37]/50 focus:bg-white/10 rounded-[18px] font-semibold text-[17px] text-white outline-none transition-all placeholder:text-white/10"
                                />
                            </div>
                        </div>

                        {/* Email Input */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/30 ml-1">
                                {t('your_email')}
                            </label>
                            <div className="relative group">
                                <FontAwesomeIcon icon={faEnvelope} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#D4AF37] transition-colors" />
                                <input
                                    type="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full h-[60px] pl-12 pr-6 bg-white/5 border border-white/5 focus:border-[#D4AF37]/50 focus:bg-white/10 rounded-[18px] font-semibold text-[17px] text-white outline-none transition-all placeholder:text-white/10"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-grow"></div>

                {/* Submit */}
                <button
                    onClick={handleContinue}
                    disabled={!name.trim() || !email.trim()}
                    className={`w-full h-[60px] rounded-[18px] font-bold text-[18px] uppercase tracking-wider transition-all flex items-center justify-center shadow-2xl ${name.trim() && email.trim()
                        ? 'bg-[#D4AF37] text-black active:scale-[0.97] shadow-[#D4AF37]/20 hover:bg-[#F3E5AB]'
                        : 'bg-white/5 text-white/20 cursor-not-allowed shadow-none'
                        }`}
                >
                    {t('continue_reward')}
                </button>
            </div>
            
            {/* Footer Note */}
            <div className="p-6 text-center">
                <p className="text-[10px] font-medium text-white/20 uppercase tracking-[0.1em]">Verified SECURE by FriendlyCode</p>
            </div>
        </div>
    );
};

export default LeadCapture;
