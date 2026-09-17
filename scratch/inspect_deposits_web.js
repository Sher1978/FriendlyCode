import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDYqvC0Ti6ChVnz5eMQhxms4hkgMUxF9PY",
    authDomain: "bot-lab-21910.firebaseapp.com",
    projectId: "bot-lab-21910",
    storageBucket: "bot-lab-21910.firebasestorage.app",
    messagingSenderId: "331010142763",
    appId: "1:331010142763:web:cfd9fa17ed9bf99a99f06e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    console.log("Fetching users...");
    const uSnap = await getDocs(collection(db, "users"));
    console.log(`Total users: ${uSnap.docs.length}`);

    uSnap.docs.forEach(d => {
        const data = d.data();
        const name = data.displayName || data.name || '';
        const email = data.email || '';
        const bal = data.deposit_balance;
        const bals = data.deposit_balances;
        if (name.includes('Шер') || name.includes('Татьяна') || (email && (email.includes('sher') || email.includes('0451611') || email.includes('tatyana')))) {
            console.log(`[USER] ID: ${d.id} | Name: "${name}" | Email: "${email}" | deposit_balance: ${bal} | deposit_balances:`, JSON.stringify(bals));
        }
    });

    console.log("\nFetching deposit transactions...");
    const tSnap = await getDocs(collection(db, "deposit_transactions"));
    console.log(`Total deposit_transactions: ${tSnap.docs.length}`);

    tSnap.docs.forEach(d => {
        const data = d.data();
        const guestName = data.guestName || data.userName || '';
        const guestEmail = data.guestEmail || '';
        const venueId = data.venueId || '';
        const userId = data.userId || '';
        const amount = data.amount || data.totalCredit || data.finalAmount;
        const type = data.type || data.transactionType;
        let dt = 'N/A';
        if (data.createdAt?.toDate) dt = data.createdAt.toDate().toISOString();
        else if (data.createdAt?.seconds) dt = new Date(data.createdAt.seconds * 1000).toISOString();
        else if (data.createdAt) dt = data.createdAt;

        if (guestName.includes('Шер') || guestName.includes('Татьяна') || (guestEmail && (guestEmail.includes('sher') || guestEmail.includes('0451611') || guestEmail.includes('tatyana')))) {
            console.log(`[TX] ID: ${d.id} | Date: ${dt} | Type: ${type} | Amount: ${amount} | Name: "${guestName}" | Email: "${guestEmail}" | userId: "${userId}" | venueId: "${venueId}"`);
        }
    });

    process.exit(0);
}

run().catch(console.error);
