import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { db } from './firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLeaf, faCheckCircle, faEnvelopeOpenText } from '@fortawesome/free-solid-svg-icons';

const Unsubscribe = () => {
    const location = useLocation();
    const [status, setStatus] = useState('processing');
    const [email, setEmail] = useState('');

    useEffect(() => {
        const performUnsubscribe = async () => {
            const params = new URLSearchParams(location.search);
            const emailParam = params.get('email');

            if (!emailParam) {
                setStatus('error');
                return;
            }

            setEmail(emailParam);

            try {
                // Find user by email
                const q = query(collection(db, 'users'), where('email', '==', emailParam));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    setStatus('not_found');
                    return;
                }

                // Update all instances (though there should be one)
                for (const userDoc of querySnapshot.docs) {
                    await updateDoc(doc(db, 'users', userDoc.id), {
                        isUnsubscribed: true,
                        unsubscribedAt: new Date().toISOString()
                    });
                }
                setStatus('success');
            } catch (e) {
                console.error("Unsubscribe error:", e);
                setStatus('error');
            }
        };

        performUnsubscribe();
    }, [location]);

    // Base layout with Ambient background
    const renderLayout = (content) => (
        <div className="flex flex-col min-h-screen bg-black font-sans text-white items-center justify-center p-8 text-center relative overflow-hidden antialiased" style={{ WebkitFontSmoothing: 'antialiased' }}>
            {/* Ambient Background Glow Arrays */}
            <div className="absolute top-[-10%] left-[-20vw] w-[140vw] h-[60vh] rounded-[100%] blur-[100px] pointer-events-none opacity-[0.20] mix-blend-screen bg-blue-500" />
            <div className="absolute bottom-[0%] right-[-20vw] w-[140vw] h-[50vh] rounded-[100%] blur-[120px] pointer-events-none opacity-[0.10]" />
            
            <div className="relative z-10 flex flex-col items-center">
                {content}
            </div>
        </div>
    );

    if (status === 'processing') {
        return renderLayout(
            <>
                <div className="animate-spin text-white/50 text-[32px] mb-6">
                    <FontAwesomeIcon icon={faEnvelopeOpenText} />
                </div>
                <h1 className="text-[20px] font-semibold text-white tracking-wide">Processing...</h1>
            </>
        );
    }

    if (status === 'success') {
        return renderLayout(
            <div className="bg-[#1C1C1E]/60 backdrop-blur-3xl border border-white/10 rounded-[36px] p-8 shadow-2xl flex flex-col items-center max-w-sm w-full mx-auto relative overflow-hidden">
                <div className="absolute inset-0 border border-white/5 rounded-[36px] pointer-events-none mix-blend-overlay"></div>
                <div className="w-16 h-16 bg-[#00FF41]/10 border border-[#00FF41]/20 rounded-full flex items-center justify-center text-[#00FF41] text-[32px] mb-6 shadow-lg">
                    <FontAwesomeIcon icon={faCheckCircle} />
                </div>
                <h1 className="text-[26px] font-bold mb-3 tracking-tight leading-tight">Unsubscribed</h1>
                <p className="text-white/50 font-medium text-[15px] mb-8 leading-relaxed">
                    We've removed <b>{email}</b> from our mailing list. You won't receive marketing emails from REVOO partners anymore.
                </p>
                <div className="opacity-30 font-semibold text-[11px] tracking-widest flex items-center gap-2 uppercase">
                    <img src="/revoo-logo.png" className="h-3 mix-blend-screen opacity-50" alt="REVOO Logo" /> REVOO
                </div>
            </div>
        );
    }

    return renderLayout(
        <div className="bg-[#1C1C1E]/60 backdrop-blur-3xl border border-white/10 rounded-[36px] p-8 shadow-2xl flex flex-col items-center max-w-sm w-full mx-auto relative overflow-hidden">
            <h1 className="text-[24px] font-bold mb-3 tracking-tight text-white leading-tight">Something went wrong</h1>
            <p className="opacity-50 text-[15px] mb-6 font-medium leading-relaxed">
                We couldn't process your unsubscription automatically.
            </p>
            <p className="text-[14px] font-semibold text-white/80">
                Please contact support@friendlycode.fun
            </p>
        </div>
    );
};

export default Unsubscribe;
