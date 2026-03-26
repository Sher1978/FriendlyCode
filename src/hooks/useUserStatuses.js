import { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';

export const useUserStatuses = () => {
    const [statuses, setStatuses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStatuses = async () => {
            try {
                const guestEmail = localStorage.getItem('guestEmail')?.toLowerCase();
                const user = auth.currentUser;
                const email = guestEmail || user?.email;

                if (!email) {
                    setStatuses([]);
                    setLoading(false);
                    return;
                }

                // Query all visits for this guest
                const q = query(
                    collection(db, 'visits'),
                    where('guestEmail', '==', email),
                    orderBy('timestamp', 'desc')
                );

                const snapshot = await getDocs(q);
                const venueMap = new Map();

                // Group by venue and keep latest
                for (const docSnap of snapshot.docs) {
                    const data = docSnap.data();
                    if (!venueMap.has(data.venueId)) {
                        venueMap.set(data.venueId, data);
                    }
                }

                const resolvedStatuses = [];
                for (const [venueId, lastVisit] of venueMap.entries()) {
                    // Fetch venue name
                    const venueSnap = await getDoc(doc(db, 'venues', venueId));
                    const venueName = venueSnap.exists() ? venueSnap.data().name : 'Unknown Venue';
                    
                    // Add expiration logic (e.g., 30 days from last visit)
                    const lastDate = lastVisit.timestamp?.toDate() || new Date();
                    const expiryDate = new Date(lastDate);
                    expiryDate.setDate(expiryDate.getDate() + 30);

                    resolvedStatuses.push({
                        venueId,
                        venueName,
                        discount: lastVisit.discountValue,
                        expiry: expiryDate,
                        lastVisit: lastDate
                    });
                }

                setStatuses(resolvedStatuses);
            } catch (err) {
                console.error("Error fetching statuses:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStatuses();
    }, []);

    return { statuses, loading };
};
