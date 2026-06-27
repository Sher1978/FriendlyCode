import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faEnvelope, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { db, auth, googleProvider } from './firebase';
import { signInWithPopup, linkWithPopup, signInWithRedirect, getRedirectResult, linkWithRedirect, signInWithCredential, GoogleAuthProvider, signInAnonymously } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit, doc, setDoc, getDoc, orderBy } from 'firebase/firestore';
import { RewardCalculator } from './logic/RewardCalculator';

const LeadCapture = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    
    // --- STATE PERSISTENCE (Recover state after redirect) ---
    const [discount, setDiscount] = useState(() => {
        const stateDiscount = location.state?.discount;
        if (stateDiscount !== undefined) {
            sessionStorage.setItem('pendingDiscount', stateDiscount.toString());
            return stateDiscount;
        }
        return parseInt(sessionStorage.getItem('pendingDiscount')) || 5;
    });

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

    // --- ROBUST AUTH REDIRECT HANDLING (MOBILE) ---
    React.useEffect(() => {
        let isProcessing = false;

        const handleAuthAction = async (user) => {
            if (!user || isProcessing) return;
            
            const guestEmail = user.email;
            if (!guestEmail) {
                console.log("User session found but no email yet (anonymous or pending redirect).");
                return;
            }

            console.log("Processing auth for:", guestEmail);
            isProcessing = true;
            setIsGoogleLoading(true); 
            
            const venueId = localStorage.getItem('currentVenueId') || 'unknown';
            const guestName = user.displayName || localStorage.getItem('guestName') || 'Guest';

            try {
                await processAuthUser(guestName, guestEmail, user.uid, venueId);
            } catch (err) {
                console.error("Auth process error:", err);
                isProcessing = false; // Allow retry on failure
            } finally {
                setIsGoogleLoading(false);
            }
        };

        const checkRedirect = async () => {
            console.log("Checking Google Auth redirect status...");
            try {
                const result = await getRedirectResult(auth);
                if (result?.user) {
                    console.log("Redirect result user identified:", result.user.email);
                    await handleAuthAction(result.user);
                } else {
                    console.log("No redirect result found (Normal page load).");
                    setIsGoogleLoading(false);
                }
            } catch (error) {
                console.error("Google Redirect Error:", error);
                
                // Handle already-in-use error for redirect flow
                if (error.code === 'auth/credential-already-in-use') {
                    console.log("Account already in use. Attempting direct sign-in...");
                    try {
                        const credential = GoogleAuthProvider.credentialFromError(error);
                        if (credential) {
                            const result = await signInWithCredential(auth, credential);
                            await handleAuthAction(result.user);
                            return;
                        }
                    } catch (signInErr) {
                        console.error("Secondary sign-in failed:", signInErr);
                    }
                }
                
                setIsGoogleLoading(false);
                if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
                    alert("Authentication Error: " + error.message);
                }
            }
        };

        // Single entry point for auth check
        const unsubscribe = auth.onAuthStateChanged((user) => {
            console.log("Auth state changed:", user ? `User(${user.email || 'anonymous'})` : "Null");
            if (user && user.email) {
                // We have a user with email, process them immediately
                handleAuthAction(user);
            } else {
                // No user OR anonymous user. 
                // We MUST check for redirect result here because a redirect just completed,
                // and we need to see if it upgraded our anonymous user or signed in a new one.
                checkRedirect();
            }
        });

        return () => unsubscribe();
    }, []);
    // -----------------------------------------------

    const processAuthUser = async (userName = 'Guest', userEmail = '', currentUid, venueIdOverride) => {
        const safeEmail = (userEmail || '').trim();
        if (!safeEmail) {
            console.error("No email provided for processAuthUser");
            return;
        }
        const lowerEmail = safeEmail.toLowerCase();
        const venueId = venueIdOverride || localStorage.getItem('currentVenueId') || 'unknown';

        try {
            console.log(`Processing user ${lowerEmail} for venue ${venueId}`);
            
            let effectiveUid = currentUid;
            let finalDiscount = discount;

            if (currentUid) {
                // 1. Sync with 'users' collection
                const q = query(collection(db, 'users'), where('email', '==', lowerEmail), limit(1));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const existingUserDoc = querySnapshot.docs[0];
                    effectiveUid = existingUserDoc.id;
                    
                    await setDoc(doc(db, 'users', effectiveUid), {
                        displayName: (userName || 'Guest').trim(),
                        updatedAt: serverTimestamp(),
                    }, { merge: true });

                    // Recalculate discount
                    try {
                        console.log("Searching for venue config:", venueId);
                        const vDoc = await getDoc(doc(db, 'venues', venueId));
                        if (vDoc.exists()) {
                            const venueData = vDoc.data();
                            console.log("Venue config found. Checking visit history for:", lowerEmail);
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
                                console.log("Last visit found:", lastVisitDate);
                                const now = new Date();
                                const calcResult = RewardCalculator.calculate(lastVisitDate, now, venueData.loyaltyConfig || venueData.tiers, venueData.timezone || 'Asia/Dubai');
                                finalDiscount = calcResult.discount;
                                console.log("Loyalty discount calculated:", finalDiscount);
                            } else {
                                console.log("No prior visits found for this venue.");
                            }
                        }
                    } catch (err) {
                        console.error("Discount calc error:", err);
                    }
                } else {
                    await setDoc(doc(db, 'users', currentUid), {
                        displayName: (userName || 'Guest').trim(),
                        email: lowerEmail,
                        role: 'guest',
                        updatedAt: serverTimestamp(),
                        createdAt: serverTimestamp(),
                    }, { merge: true });
                }

                // 2. Log Lead
                try {
                    await addDoc(collection(db, 'leads'), {
                        uid: effectiveUid,
                        name: (userName || 'Guest').trim(),
                        email: lowerEmail,
                        venueId: venueId,
                        timestamp: serverTimestamp(),
                        source: 'lead_capture'
                    });
                } catch (e) {
                    console.warn("Lead logging failed but continuing:", e);
                }

                // 3. Notify Owner
                try {
                    await addDoc(collection(db, 'notifications'), {
                        venueId: venueId,
                        type: 'guest_status_usage',
                        message: `Ваш гость ${(userName || 'Guest').trim()} (${lowerEmail}) использовал свой Статус`,
                        timestamp: serverTimestamp(),
                        read: false
                    });
                } catch (e) {}
            }

            // Save locally
            localStorage.setItem('guestName', (userName || 'Guest').trim());
            localStorage.setItem('guestEmail', lowerEmail);
            if (effectiveUid) localStorage.setItem('effectiveUid', effectiveUid);

            // Final Navigation
            console.log("Navigating to test screen with discount:", finalDiscount);
            navigate(`/test?id=${venueId}`, {
                state: {
                    guestName: (userName || 'Guest').trim(),
                    guestEmail: lowerEmail,
                    discountValue: finalDiscount,
                    venueId: venueId,
                    userRole: 'guest',
                    effectiveUid: effectiveUid
                },
                replace: true // Use replace to prevent back-looping to lead capture
            });
        } catch (e) {
            console.error("Critical error in processAuthUser:", e);
            // Fallback navigation
            navigate(`/test?id=${venueId}`, { 
                state: { guestName: (userName || 'Guest').trim(), discountValue: discount, venueId: venueId },
                replace: true
            });
        }
    };

    const handleContinue = async () => {
        const safeName = (name || '').trim();
        const safeEmail = (email || '').trim();
        if (!safeName || !safeEmail) return;
        
        setIsGoogleLoading(true);
        try {
            let user = auth.currentUser;
            if (!user) {
                console.log("No user found, signing in anonymously...");
                const result = await signInAnonymously(auth);
                user = result.user;
            }
            await processAuthUser(safeName, safeEmail, user.uid);
        } catch (err) {
            console.error("Manual entry auth error:", err);
            alert("Ошибка: " + err.message);
        } finally {
            setIsGoogleLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setIsGoogleLoading(true);
        try {
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            // Direct sign-in (linking anonymous users is not needed and causes cross-site cookie errors)
            if (isMobile) {
                await signInWithRedirect(auth, googleProvider);
            } else {
                await signInWithPopup(auth, googleProvider);
            }
        } catch (error) {
            console.error("Google Auth failed:", error);
            if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
                alert("Google Sign-In failed: " + error.message);
            }
        } finally {
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
                    disabled={!(name || '').trim() || !(email || '').trim()}
                    className={`w-full h-[60px] rounded-[18px] font-bold text-[18px] uppercase tracking-wider transition-all flex items-center justify-center shadow-2xl ${(name || '').trim() && (email || '').trim()
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
