import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, where, serverTimestamp } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyDYqvC0Ti6ChVnz5eMQhxms4hkgMUxF9PY",
    authDomain: "bot-lab-21910.firebaseapp.com",
    projectId: "bot-lab-21910",
    storageBucket: "bot-lab-21910.firebasestorage.app",
    messagingSenderId: "331010142763",
    appId: "1:331010142763:web:cfd9fa17ed9bf99a99f06e",
    databaseURL: "https://bot-lab-21910.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const ROLE_SCORES = { superadmin: 10, superAdmin: 10, admin: 8, owner: 7, staff: 5, guest: 1 };
const getRoleScore = (role) => ROLE_SCORES[role] || 1;

async function runDeduplication() {
    console.log("Authenticating anonymously...");
    try {
        await signInAnonymously(auth);
        console.log("Authenticated successfully.");
    } catch (e) {
        console.warn("Auth note:", e.message);
    }

    console.log("Fetching all user documents from Firestore...");
    const usersSnap = await getDocs(collection(db, "users"));
    console.log(`Found ${usersSnap.size} total user documents.`);

    const usersByEmail = {};
    usersSnap.forEach(docSnap => {
        const data = docSnap.data();
        const email = (data.email || "").trim().toLowerCase();
        if (!email || !email.includes("@")) return;
        if (email.endsWith("@guest.com") || email.endsWith("@telegram.user") || email.endsWith("@friendlycode.fun")) return;

        if (!usersByEmail[email]) usersByEmail[email] = [];
        usersByEmail[email].push({ id: docSnap.id, data });
    });

    const duplicateEmails = Object.keys(usersByEmail).filter(e => usersByEmail[e].length > 1);
    console.log(`Found ${duplicateEmails.length} email addresses with duplicate user accounts.`);

    let totalRemoved = 0;

    for (const email of duplicateEmails) {
        const docs = usersByEmail[email];
        console.log(`\nProcessing email '${email}' (${docs.length} docs)...`);

        docs.sort((a, b) => {
            const scoreA = getRoleScore(a.data.role);
            const scoreB = getRoleScore(b.data.role);
            if (scoreA !== scoreB) return scoreB - scoreA;

            const balA = Number(a.data.deposit_balance || 0);
            const balB = Number(b.data.deposit_balance || 0);
            if (balA !== balB) return balB - balA;

            const timeA = a.data.createdAt?.seconds || 9999999999;
            const timeB = b.data.createdAt?.seconds || 9999999999;
            return timeA - timeB;
        });

        const primaryDoc = docs[0];
        const primaryUid = primaryDoc.id;
        const secondaryDocs = docs.slice(1);

        console.log(` -> Selected primary UID: ${primaryUid}`);

        let mergedRole = primaryDoc.data.role || 'guest';
        let mergedName = primaryDoc.data.displayName || primaryDoc.data.name || 'Guest';
        let mergedTelegram = primaryDoc.data.telegram || '';
        let mergedDepositBalances = { ...(primaryDoc.data.deposit_balances || {}) };
        let mergedDeposits = { ...(primaryDoc.data.deposits || {}) };
        let maxDepositBalance = Number(primaryDoc.data.deposit_balance || 0);

        for (const docObj of docs) {
            const data = docObj.data;
            if (getRoleScore(data.role) > getRoleScore(mergedRole)) mergedRole = data.role;
            if ((!mergedName || mergedName === 'Guest') && (data.displayName || data.name)) {
                mergedName = data.displayName || data.name;
            }
            if (!mergedTelegram && data.telegram) mergedTelegram = data.telegram;
            if (Number(data.deposit_balance || 0) > maxDepositBalance) maxDepositBalance = Number(data.deposit_balance);

            if (data.deposit_balances) {
                Object.keys(data.deposit_balances).forEach(vId => {
                    const val = Number(data.deposit_balances[vId] || 0);
                    mergedDepositBalances[vId] = Math.max(mergedDepositBalances[vId] || 0, val);
                });
            }
        }

        // Update primary document
        await setDoc(doc(db, "users", primaryUid), {
            email,
            displayName: (mergedName || 'Guest').trim(),
            role: mergedRole,
            ...(mergedTelegram ? { telegram: mergedTelegram } : {}),
            deposit_balance: maxDepositBalance,
            deposit_balances: mergedDepositBalances,
            deposits: mergedDeposits,
            updatedAt: serverTimestamp()
        }, { merge: true });

        for (const sec of secondaryDocs) {
            const secUid = sec.id;
            console.log(` -> Reassigning references and deleting secondary UID: ${secUid}`);

            // Reassign visits
            try {
                const qV1 = query(collection(db, "visits"), where("uid", "==", secUid));
                const vSnap1 = await getDocs(qV1);
                vSnap1.docs.forEach(async (v) => {
                    await updateDoc(doc(db, "visits", v.id), { uid: primaryUid, userId: primaryUid, guestEmail: email });
                });

                const qV2 = query(collection(db, "visits"), where("userId", "==", secUid));
                const vSnap2 = await getDocs(qV2);
                vSnap2.docs.forEach(async (v) => {
                    await updateDoc(doc(db, "visits", v.id), { uid: primaryUid, userId: primaryUid, guestEmail: email });
                });

                const qL = query(collection(db, "leads"), where("uid", "==", secUid));
                const lSnap = await getDocs(qL);
                lSnap.docs.forEach(async (l) => {
                    await updateDoc(doc(db, "leads", l.id), { uid: primaryUid, email: email });
                });

                const qTx = query(collection(db, "deposit_transactions"), where("userId", "==", secUid));
                const txSnap = await getDocs(qTx);
                txSnap.docs.forEach(async (t) => {
                    await updateDoc(doc(db, "deposit_transactions", t.id), { userId: primaryUid, guestEmail: email });
                });

                await deleteDoc(doc(db, "users", secUid));
                totalRemoved++;
            } catch (err) {
                console.error(`Error processing secondary UID ${secUid}:`, err);
            }
        }
    }

    console.log(`\nSUCCESS: Merged ${duplicateEmails.length} email groups and removed ${totalRemoved} duplicate user records.`);
    process.exit(0);
}

runDeduplication().catch(err => {
    console.error("Deduplication script error:", err);
    process.exit(1);
});
