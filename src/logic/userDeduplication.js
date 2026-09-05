import { collection, query, where, getDocs, doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Normalizes email address by trimming and lowercasing.
 * Returns empty string if invalid or a system guest placeholder.
 */
export const normalizeEmail = (email) => {
    if (!email || typeof email !== 'string') return '';
    const clean = email.replace(/[\u200B-\u200D\uFEFF]/g, '').trim().toLowerCase();
    if (!clean.includes('@')) return '';
    if (clean.endsWith('@guest.com') || clean.endsWith('@telegram.user') || clean.endsWith('@friendlycode.fun')) {
        // Dummy/generated email placeholders
        return clean;
    }
    return clean;
};

/**
 * Role hierarchy score to preserve elevated privileges during merging.
 */
const ROLE_SCORES = {
    superadmin: 10,
    superAdmin: 10,
    admin: 8,
    owner: 7,
    staff: 5,
    guest: 1
};

const getRoleScore = (role) => ROLE_SCORES[role] || 1;

/**
 * Finds user documents matching the given email, merges duplicates into a single primary user,
 * updates related collection references, and returns the primary user profile & UID.
 * 
 * @param {object} db - Firestore database instance
 * @param {string} emailInput - Raw email input
 * @param {string} authUid - Current Firebase Auth UID or session UID
 * @param {object} optionalNewData - New profile fields (displayName, telegram, venueId, etc.)
 */
export const findAndMergeUserByEmail = async (db, emailInput, authUid = null, optionalNewData = {}) => {
    const cleanEmail = normalizeEmail(emailInput);
    if (!cleanEmail) {
        return { uid: authUid, isMerged: false, userProfile: null };
    }

    try {
        const usersRef = collection(db, 'users');
        const qEmail = query(usersRef, where('email', '==', cleanEmail));
        const snap = await getDocs(qEmail);

        if (snap.empty) {
            // No user found with this email. Use authUid or fallback UID.
            const targetUid = authUid || ('guest_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
            const newUserData = {
                email: cleanEmail,
                displayName: (optionalNewData.displayName || optionalNewData.name || 'Guest').trim(),
                role: optionalNewData.role || 'guest',
                ...(optionalNewData.telegram ? { telegram: optionalNewData.telegram } : {}),
                ...(optionalNewData.venueId ? { venueId: optionalNewData.venueId } : {}),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            await setDoc(doc(db, 'users', targetUid), newUserData, { merge: true });
            return { uid: targetUid, isMerged: false, userProfile: newUserData };
        }

        const matchingDocs = snap.docs.map(d => ({ id: d.id, data: d.data() }));

        // Select Primary Document
        matchingDocs.sort((a, b) => {
            // 1. Highest privilege role first
            const scoreA = getRoleScore(a.data.role);
            const scoreB = getRoleScore(b.data.role);
            if (scoreA !== scoreB) return scoreB - scoreA;

            // 2. Auth UID match
            if (authUid && a.id === authUid) return -1;
            if (authUid && b.id === authUid) return 1;

            // 3. Document with deposit balances
            const balA = Number(a.data.deposit_balance || 0);
            const balB = Number(b.data.deposit_balance || 0);
            if (balA !== balB) return balB - balA;

            // 4. Oldest creation date
            const timeA = a.data.createdAt?.seconds || 9999999999;
            const timeB = b.data.createdAt?.seconds || 9999999999;
            return timeA - timeB;
        });

        const primaryDoc = matchingDocs[0];
        const primaryUid = primaryDoc.id;
        const secondaryDocs = matchingDocs.slice(1);

        // Merge Data across all docs
        let mergedRole = primaryDoc.data.role || 'guest';
        let mergedName = optionalNewData.displayName || optionalNewData.name || primaryDoc.data.displayName || primaryDoc.data.name || 'Guest';
        let mergedTelegram = optionalNewData.telegram || primaryDoc.data.telegram || '';
        let mergedDepositBalances = { ...(primaryDoc.data.deposit_balances || {}) };
        let mergedDeposits = { ...(primaryDoc.data.deposits || {}) };
        let maxDepositBalance = Number(primaryDoc.data.deposit_balance || 0);
        let mergedGoogleReviews = { ...(primaryDoc.data.googleReviews || {}) };
        let mergedGoogleReviewsCompletedAt = { ...(primaryDoc.data.googleReviewCompletedAt || {}) };
        let mergedGoogleMapsDiscountAt = primaryDoc.data.googleMapsDiscountAt;

        for (const docObj of matchingDocs) {
            const data = docObj.data;
            if (getRoleScore(data.role) > getRoleScore(mergedRole)) {
                mergedRole = data.role;
            }
            if (!mergedName || mergedName === 'Guest') {
                if (data.displayName && data.displayName !== 'Guest') mergedName = data.displayName;
                else if (data.name && data.name !== 'Guest') mergedName = data.name;
            }
            if (!mergedTelegram && data.telegram) mergedTelegram = data.telegram;

            if (Number(data.deposit_balance || 0) > maxDepositBalance) {
                maxDepositBalance = Number(data.deposit_balance);
            }

            if (data.deposit_balances) {
                Object.keys(data.deposit_balances).forEach(vId => {
                    const val = Number(data.deposit_balances[vId] || 0);
                    mergedDepositBalances[vId] = Math.max(mergedDepositBalances[vId] || 0, val);
                });
            }

            if (data.deposits) {
                Object.keys(data.deposits).forEach(vId => {
                    const val = typeof data.deposits[vId] === 'object' ? (data.deposits[vId].balance || 0) : data.deposits[vId];
                    mergedDeposits[vId] = Math.max(Number(mergedDeposits[vId] || 0), Number(val));
                });
            }

            if (data.googleReviews) {
                mergedGoogleReviews = { ...mergedGoogleReviews, ...data.googleReviews };
            }
            if (data.googleReviewCompletedAt) {
                mergedGoogleReviewsCompletedAt = { ...mergedGoogleReviewsCompletedAt, ...data.googleReviewCompletedAt };
            }
            if (data.googleMapsDiscountAt) {
                if (!mergedGoogleMapsDiscountAt || new Date(data.googleMapsDiscountAt) > new Date(mergedGoogleMapsDiscountAt)) {
                    mergedGoogleMapsDiscountAt = data.googleMapsDiscountAt;
                }
            }
        }

        const updatedProfile = {
            email: cleanEmail,
            displayName: (mergedName || 'Guest').trim(),
            role: mergedRole,
            ...(mergedTelegram ? { telegram: mergedTelegram } : {}),
            deposit_balance: maxDepositBalance,
            deposit_balances: mergedDepositBalances,
            deposits: mergedDeposits,
            googleReviews: mergedGoogleReviews,
            googleReviewCompletedAt: mergedGoogleReviewsCompletedAt,
            ...(mergedGoogleMapsDiscountAt ? { googleMapsDiscountAt: mergedGoogleMapsDiscountAt } : {}),
            updatedAt: serverTimestamp()
        };

        // Save Primary Doc
        await setDoc(doc(db, 'users', primaryUid), updatedProfile, { merge: true });

        // If secondary docs exist, reassign references and delete secondary user docs
        if (secondaryDocs.length > 0) {
            console.log(`[userDeduplication] Merging ${secondaryDocs.length} secondary user docs into primaryUid ${primaryUid}`);
            for (const sec of secondaryDocs) {
                const secUid = sec.id;
                try {
                    // Update visits
                    const qVisits1 = query(collection(db, 'visits'), where('uid', '==', secUid));
                    const visitsSnap1 = await getDocs(qVisits1);
                    visitsSnap1.docs.forEach(async (vDoc) => {
                        await updateDoc(doc(db, 'visits', vDoc.id), { uid: primaryUid, userId: primaryUid, guestEmail: cleanEmail });
                    });

                    const qVisits2 = query(collection(db, 'visits'), where('userId', '==', secUid));
                    const visitsSnap2 = await getDocs(qVisits2);
                    visitsSnap2.docs.forEach(async (vDoc) => {
                        await updateDoc(doc(db, 'visits', vDoc.id), { uid: primaryUid, userId: primaryUid, guestEmail: cleanEmail });
                    });

                    // Update leads
                    const qLeads = query(collection(db, 'leads'), where('uid', '==', secUid));
                    const leadsSnap = await getDocs(qLeads);
                    leadsSnap.docs.forEach(async (lDoc) => {
                        await updateDoc(doc(db, 'leads', lDoc.id), { uid: primaryUid, email: cleanEmail });
                    });

                    // Update deposit transactions
                    const qTx = query(collection(db, 'deposit_transactions'), where('userId', '==', secUid));
                    const txSnap = await getDocs(qTx);
                    txSnap.docs.forEach(async (tDoc) => {
                        await updateDoc(doc(db, 'deposit_transactions', tDoc.id), { userId: primaryUid, guestEmail: cleanEmail });
                    });

                    // Delete duplicate user document
                    await deleteDoc(doc(db, 'users', secUid));
                    console.log(`[userDeduplication] Deleted duplicate user doc ${secUid}`);
                } catch (secErr) {
                    console.error(`[userDeduplication] Error reassigning data for ${secUid}:`, secErr);
                }
            }
        }

        return {
            uid: primaryUid,
            isMerged: secondaryDocs.length > 0,
            mergedCount: matchingDocs.length,
            userProfile: updatedProfile
        };
    } catch (err) {
        console.error("[userDeduplication] Error finding/merging user by email:", err);
        return { uid: authUid, isMerged: false, userProfile: null, error: err };
    }
};
