import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faEnvelope, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { db, auth, googleProvider } from './firebase';
import { signInWithPopup, linkWithPopup } from 'firebase/auth';
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
            let result;

            if (user && user.isAnonymous) {
                try {
                    result = await linkWithPopup(user, googleProvider);
                } catch (linkError) {
                    if (linkError.code === 'auth/credential-already-in-use') {
                        result = await signInWithPopup(auth, googleProvider);
                    } else {
                        throw linkError;
                    }
                }
            } else {
                result = await signInWithPopup(auth, googleProvider);
            }

            const linkedUser = result.user;
            const googleName = linkedUser.displayName || 'Guest';
            const googleEmail = linkedUser.email;
            
            await processAuthUser(googleName, googleEmail, linkedUser.uid);
            
        } catch (error) {
            console.error("Google Auth failed:", error);
            if (error.code !== 'auth/popup-closed-by-user') {
                alert("Google Sign-In failed: " + error.message);
            }
        } finally {
            setIsGoogleLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#FFF8E1] font-sans text-[#4E342E] antialiased">
            <div className="flex-grow flex flex-col px-6 py-12 relative">
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-[#4E342E] shadow-sm border border-[#4E342E]/5 absolute top-8 left-6 z-10"
                >
                    <FontAwesomeIcon icon={faArrowLeft} />
                </button>

                <div className="mt-16 text-left">
                    <h1 className="text-[32px] font-black leading-tight mb-2">
                        {t('almost_there')}
                    </h1>
                    <p className="text-[18px] opacity-70">
                        {t('introduce_yourself')}
                    </p>
                </div>

                <div className="mt-8 space-y-6">
                    {/* Google Sign-In Button */}
                    <button
                        onClick={handleGoogleSignIn}
                        disabled={isGoogleLoading}
                        className="w-full h-[64px] bg-white text-black font-black text-[16px] rounded-[24px] shadow-sm flex items-center justify-center gap-3 transition-all hover:bg-gray-50 active:scale-95 border border-gray-200"
                    >
                        {isGoogleLoading ? (
                            <span className="animate-pulse">Loading...</span>
                        ) : (
                            <>
                                <svg width="24" height="24" viewBox="0 0 48 48">
                                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                                </svg>
                                Continue with Google
                            </>
                        )}
                    </button>

                    <div className="flex items-center gap-4 my-2">
                        <div className="h-px bg-[#4E342E]/10 flex-1"></div>
                        <span className="text-[12px] font-bold text-[#4E342E]/30 uppercase tracking-widest">OR</span>
                        <div className="h-px bg-[#4E342E]/10 flex-1"></div>
                    </div>

                    {/* Name Input */}
                    <div className="relative">
                        <label className="text-[12px] font-black uppercase tracking-widest text-[#4E342E]/40 mb-2 block pl-1">
                            {t('your_name')}
                        </label>
                        <div className="relative">
                            <FontAwesomeIcon icon={faUser} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#E68A00]" />
                            <input
                                type="text"
                                placeholder="e.g., Alex"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full h-[64px] pl-12 pr-6 bg-white border-2 border-transparent focus:border-[#E68A00] rounded-[24px] font-bold text-[18px] outline-none shadow-sm transition-all"
                            />
                        </div>
                    </div>

                    {/* Email Input */}
                    <div className="relative">
                        <label className="text-[12px] font-black uppercase tracking-widest text-[#4E342E]/40 mb-2 block pl-1">
                            {t('your_email')}
                        </label>
                        <div className="relative">
                            <FontAwesomeIcon icon={faEnvelope} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#E68A00]" />
                            <input
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full h-[64px] pl-12 pr-6 bg-white border-2 border-transparent focus:border-[#E68A00] rounded-[24px] font-bold text-[18px] outline-none shadow-sm transition-all"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex-grow"></div>

                {/* Submit */}
                <button
                    onClick={handleContinue}
                    disabled={!name.trim() || !email.trim()}
                    className={`w-full h-[64px] rounded-[24px] font-black text-[20px] uppercase transition-all flex items-center justify-center shadow-xl ${name.trim() && email.trim()
                        ? 'bg-[#E68A00] text-white active:scale-95 shadow-[#E68A00]/30'
                        : 'bg-[#4E342E]/10 text-[#4E342E]/40 cursor-not-allowed shadow-none'
                        }`}
                >
                    {t('continue_reward')}
                </button>
            </div>
        </div>
    );
};

export default LeadCapture;
