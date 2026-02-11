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

    const containerStyle = "flex flex-col min-h-screen bg-[#FFF8E1] font-sans text-[#4E342E] items-center justify-center p-8 text-center";

    if (status === 'processing') {
        return (
            <div className={containerStyle}>
                <div className="animate-spin text-[#E68A00] text-3xl mb-4">
                    <FontAwesomeIcon icon={faEnvelopeOpenText} />
                </div>
                <h1 className="text-xl font-black uppercase">Processing...</h1>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className={containerStyle}>
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-3xl mb-6">
                    <FontAwesomeIcon icon={faCheckCircle} />
                </div>
                <h1 className="text-2xl font-black mb-2 uppercase tracking-tight">You're Unsubscribed</h1>
                <p className="text-[#4E342E]/70 font-medium max-w-[280px] mb-8">
                    We've removed <b>{email}</b> from our mailing list. You won't receive marketing emails from Friendly Code partners anymore.
                </p>
                <div className="opacity-30 font-black text-xs tracking-[0.3em] flex items-center gap-2">
                    <FontAwesomeIcon icon={faLeaf} className="text-[#81C784]" /> FRIENDLY CODE
                </div>
            </div>
        );
    }

    return (
        <div className={containerStyle}>
            <h1 className="text-xl font-black mb-2 uppercase">Something went wrong</h1>
            <p className="opacity-60 text-sm mb-8">We couldn't process your unsubscription automatically.</p>
            <p className="text-sm font-bold">Please contact support@friendlycode.fun</p>
        </div>
    );
};

export default Unsubscribe;
