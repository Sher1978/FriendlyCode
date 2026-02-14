import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faEnvelope, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { db, auth } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const LeadCapture = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { discount } = location.state || { discount: 5 }; // Default to 5% if direct access

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');

    const handleContinue = async () => {
        if (!name.trim() || !email.trim()) return;

        try {
            const venueId = localStorage.getItem('currentVenueId') || 'unknown';
            const user = auth.currentUser;

            // Default to current auth UID (anonymous)
            let effectiveUid = user?.uid;

            if (user) {
                // 0. Check if this email already exists in 'users' collection
                const { collection, query, where, getDocs, limit, doc, setDoc, serverTimestamp, addDoc } = await import('firebase/firestore');

                const q = query(collection(db, 'users'), where('email', '==', email.trim()), limit(1));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    // FOUND EXISTING USER -> Link to this ID instead of the new anonymous one
                    const existingUserDoc = querySnapshot.docs[0];
                    effectiveUid = existingUserDoc.id;
                    console.log(`Found existing user for ${email}: ${effectiveUid}. Linking session...`);

                    // Update existing user with latest name/timestamp
                    await setDoc(doc(db, 'users', effectiveUid), {
                        displayName: name.trim(),
                        // email is same, no need to update
                        updatedAt: serverTimestamp(),
                        // We do NOT overwrite role or other fields
                    }, { merge: true });

                } else {
                    // NEW USER -> Create new doc with current auth UID
                    await setDoc(doc(db, 'users', user.uid), {
                        displayName: name.trim(),
                        email: email.trim(),
                        role: 'guest',
                        updatedAt: serverTimestamp(),
                        createdAt: serverTimestamp(), // Add creation time for new users
                    }, { merge: true });
                }

                // 2. Also keep the lead entry for marketing tracking (using effectiveUid)
                await addDoc(collection(db, 'leads'), {
                    uid: effectiveUid,
                    name: name.trim(),
                    email: email.trim(),
                    venueId: venueId,
                    timestamp: serverTimestamp(),
                    source: 'lead_capture'
                });
            }

            // Save guest data locally for instant recognition
            localStorage.setItem('guestName', name.trim());
            localStorage.setItem('guestEmail', email.trim());
            if (effectiveUid) {
                localStorage.setItem('effectiveUid', effectiveUid);
            }

            // Navigate to UnifiedActivation (Reward Screen)
            navigate('/thank-you', {
                state: {
                    guestName: name,
                    guestEmail: email,
                    discountValue: discount,
                    venueId: venueId,
                    userRole: 'guest',
                    effectiveUid: effectiveUid // PASS THIS TO NEXT SCREEN
                }
            });
        } catch (e) {
            console.error("Error saving lead/user:", e);
            localStorage.setItem('guestName', name.trim());
            localStorage.setItem('guestEmail', email.trim());
            navigate('/thank-you', { state: { guestName: name, discountValue: discount } });
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
                        {t('almost_there', "Almost there!")}
                    </h1>
                    <p className="text-[18px] opacity-70">
                        {t('introduce_yourself', "Please introduce yourself to claim your reward.")}
                    </p>
                </div>

                <div className="mt-12 space-y-6">
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
                            {t('your_email', "Your Email")}
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
                    {t('continue_reward', "Get Reward")}
                </button>
            </div>
        </div>
    );
};

export default LeadCapture;
