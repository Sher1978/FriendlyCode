import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';

/**
 * Logs a button or link click to Firebase
 * @param {string} venueId - The ID of the venue
 * @param {string} clickType - The type of click (e.g., 'google_maps', 'whatsapp', 'phone', 'instagram')
 * @param {string|null} userId - The user ID if available
 */
export const logVenueClick = async (venueId, clickType, userId = null) => {
    if (!venueId || venueId === 'demo') return;
    
    try {
        // 1. Add detailed click record
        await addDoc(collection(db, `venues/${venueId}/clicks`), {
            type: clickType,
            timestamp: serverTimestamp(),
            userId: userId || 'anonymous',
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
        });
        
        // 2. Increment global counter on the venue doc for quick dashboard access
        const venueRef = doc(db, 'venues', venueId);
        await updateDoc(venueRef, {
            [`stats.clicks_${clickType}`]: increment(1),
            [`stats.totalClicks`]: increment(1)
        });
    } catch (e) {
        console.error(`Error logging ${clickType} click:`, e);
    }
};
