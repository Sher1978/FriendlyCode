import { useState, useEffect, useCallback } from 'react';
import { db, auth } from '../firebase';
import { 
    collection, 
    query, 
    where, 
    orderBy, 
    getDocs, 
    doc, 
    getDoc, 
    limit, 
    startAfter 
} from 'firebase/firestore';

// Global cache to persist across hook re-renders/mounts
const venueCache = new Map();

export const useUserStatuses = (pageSize = 5) => {
    const [statuses, setStatuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastDoc, setLastDoc] = useState(null);
    const [hasMore, setHasMore] = useState(true);

    const fetchStatuses = useCallback(async (isNextPage = false) => {
        try {
            if (isNextPage) setLoadingMore(true);
            else setLoading(true);

            const guestEmail = localStorage.getItem('guestEmail')?.toLowerCase();
            const user = auth.currentUser;
            const email = guestEmail || user?.email;

            if (!email) {
                setStatuses([]);
                setLoading(false);
                setHasMore(false);
                return;
            }

            // Query all visits for this guest with pagination
            let q = query(
                collection(db, 'visits'),
                where('guestEmail', '==', email),
                orderBy('timestamp', 'desc'),
                limit(pageSize)
            );

            if (isNextPage && lastDoc) {
                q = query(q, startAfter(lastDoc));
            }

            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                setHasMore(false);
                if (!isNextPage) setLoading(false);
                setLoadingMore(false);
                return;
            }

            setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
            if (snapshot.docs.length < pageSize) setHasMore(false);

            const newStatuses = [];

            for (const docSnap of snapshot.docs) {
                const data = docSnap.data();
                
                // Venue Caching Logic
                let venueName = venueCache.get(data.venueId);
                if (!venueName) {
                    const venueSnap = await getDoc(doc(db, 'venues', data.venueId));
                    venueName = venueSnap.exists() ? venueSnap.data().name : 'Unknown Venue';
                    venueCache.set(data.venueId, venueName);
                }
                
                const lastDate = data.timestamp?.toDate() || new Date();
                const expiryDate = new Date(lastDate);
                expiryDate.setDate(expiryDate.getDate() + 30);

                newStatuses.push({
                    id: docSnap.id,
                    venueId: data.venueId,
                    venueName,
                    discount: data.discountValue,
                    expiry: expiryDate,
                    lastVisit: lastDate
                });
            }

            setStatuses(prev => isNextPage ? [...prev, ...newStatuses] : newStatuses);
        } catch (err) {
            console.error("Error fetching statuses:", err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [lastDoc, pageSize]);

    useEffect(() => {
        fetchStatuses();
    }, []);

    const loadMore = () => {
        if (!loadingMore && hasMore) {
            fetchStatuses(true);
        }
    };

    return { statuses, loading, loadingMore, hasMore, loadMore };
};
