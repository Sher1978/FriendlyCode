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

async function inspectSherMath() {
    console.log('=== SEARCHING FOR USER "Шер" IN FIRESTORE ===');
    const usersSnap = await getDocs(collection(db, 'users'));
    
    const sherUsers = [];
    usersSnap.docs.forEach(d => {
        const data = d.data();
        const name = (data.displayName || data.name || '').toLowerCase();
        const email = (data.email || '').toLowerCase();
        if (name.includes('шер') || email.includes('sher') || d.id.includes('sher')) {
            sherUsers.push({ id: d.id, ...data });
        }
    });

    console.log(`Found ${sherUsers.length} user record(s) matching "Шер":`);
    sherUsers.forEach(u => {
        console.log(`\n- User Doc ID: ${u.id}`);
        console.log(`  Name: "${u.displayName || u.name}"`);
        console.log(`  Email: "${u.email}"`);
        console.log(`  deposit_balance: ${u.deposit_balance}`);
        console.log(`  deposit_balances:`, JSON.stringify(u.deposit_balances));
        console.log(`  deposit_venue_id: "${u.deposit_venue_id}"`);
    });

    const userIds = sherUsers.map(u => u.id);
    const emails = sherUsers.map(u => (u.email || '').toLowerCase()).filter(Boolean);

    console.log('\n=== FETCHING ALL TRANSACTIONS FOR USER "Шер" ===');
    const txSnap = await getDocs(collection(db, 'deposit_transactions'));
    const sherTxs = [];
    
    txSnap.docs.forEach(d => {
        const data = d.data();
        const uId = data.userId || data.uid;
        const gEmail = (data.guestEmail || '').toLowerCase();
        const gName = (data.guestName || '').toLowerCase();

        if (userIds.includes(uId) || (gEmail && emails.includes(gEmail)) || gName.includes('шер')) {
            sherTxs.push({ id: d.id, ...data });
        }
    });

    sherTxs.sort((a, b) => {
        const getSec = (x) => {
            if (!x) return 0;
            if (x.seconds) return x.seconds;
            if (x.toDate) return Math.floor(x.toDate().getTime() / 1000);
            if (typeof x === 'string' || typeof x === 'number') return Math.floor(new Date(x).getTime() / 1000);
            return 0;
        };
        const tA = getSec(a.createdAt) || getSec(a.timestamp);
        const tB = getSec(b.createdAt) || getSec(b.timestamp);
        return tA - tB; // Chronological order (oldest to newest)
    });

    console.log(`Total transactions found: ${sherTxs.length}\n`);

    let runningBalance = null;
    let foundTopup25 = false;

    sherTxs.forEach((tx, i) => {
        const type = tx.type || tx.transactionType;
        const amount = Number(tx.amount || 0);
        const finalAmount = Number(tx.finalAmount ?? tx.totalCredit ?? amount);
        const prevBal = Number(tx.previousBalance ?? 0);
        const newBal = Number(tx.newBalance ?? tx.balanceAfter ?? 0);
        const bonusPercent = Number(tx.bonusPercent || 0);
        const totalCredit = Number(tx.totalCredit || finalAmount);
        
        let date = 'N/A';
        if (tx.createdAt?.toDate) date = tx.createdAt.toDate().toLocaleString('ru-RU');
        else if (tx.createdAt?.seconds) date = new Date(tx.createdAt.seconds * 1000).toLocaleString('ru-RU');
        else if (tx.timestamp?.toDate) date = tx.timestamp.toDate().toLocaleString('ru-RU');
        else if (tx.createdAt) date = new Date(tx.createdAt).toLocaleString('ru-RU');

        console.log(`[Tx #${i+1}] Doc ID: ${tx.id}`);
        console.log(`     Date: ${date}`);
        console.log(`     Type: ${type}`);
        console.log(`     Venue ID: "${tx.venueId}"`);
        console.log(`     Guest Name/Email: "${tx.guestName}" / "${tx.guestEmail}" (userId: "${tx.userId}")`);
        console.log(`     Input Amount: ${amount.toLocaleString()} ₫ | Bonus: ${bonusPercent}% (${tx.bonusAmount ? tx.bonusAmount.toLocaleString() + ' ₫' : '0 ₫'})`);
        console.log(`     Total ${type === 'CREDIT' ? 'Credit' : 'Debit'} (finalAmount): ${finalAmount.toLocaleString()} ₫`);
        console.log(`     Stored previousBalance: ${prevBal.toLocaleString()} ₫ -> Stored newBalance: ${newBal.toLocaleString()} ₫`);

        if (type === 'CREDIT' && (amount === 2500000 || totalCredit === 2500000)) {
            console.log(`\n======================================================`);
            console.log(`🎯 TARGET TOP-UP FOUND AT TX #${i+1}: 2,500,000 ₫`);
            console.log(`======================================================\n`);
            foundTopup25 = true;
            runningBalance = newBal;
            console.log(`[MATH LOG] Starting Balance set to doc newBalance: ${runningBalance.toLocaleString()} ₫\n`);
        } else if (foundTopup25) {
            const before = runningBalance;
            if (type === 'DEBIT') {
                runningBalance -= finalAmount;
                console.log(`[MATH LOG] Tx #${i+1} [DEBIT]: ${before.toLocaleString()} - ${finalAmount.toLocaleString()} = ${runningBalance.toLocaleString()} ₫`);
                console.log(`           (Stored in transaction doc: prev=${prevBal.toLocaleString()}, new=${newBal.toLocaleString()})`);
            } else if (type === 'CREDIT') {
                runningBalance += totalCredit;
                console.log(`[MATH LOG] Tx #${i+1} [CREDIT]: ${before.toLocaleString()} + ${totalCredit.toLocaleString()} = ${runningBalance.toLocaleString()} ₫`);
                console.log(`           (Stored in transaction doc: prev=${prevBal.toLocaleString()}, new=${newBal.toLocaleString()})`);
            }
        }
        console.log('----------------------------------------------------------------------------------');
    });

    console.log(`\n========================================================`);
    console.log(`=== SUMMARY & RECONCILIATION FOR "Шер" ===`);
    console.log(`========================================================`);
    console.log(`Calculated Running Balance after 2,500,000 ₫ top-up: ${runningBalance !== null ? runningBalance.toLocaleString() : 'N/A'} ₫`);
    sherUsers.forEach(u => {
        console.log(`User Document ID: ${u.id}`);
        console.log(`  - deposit_balance in Firestore: ${u.deposit_balance?.toLocaleString()} ₫`);
        console.log(`  - deposit_balances map:`, JSON.stringify(u.deposit_balances));
    });

    process.exit(0);
}

inspectSherMath().catch(console.error);
