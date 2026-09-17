const admin = require("firebase-admin");

// Initialize admin app
admin.initializeApp({
    projectId: "bot-lab-21910"
});

const db = admin.firestore();

const ROLE_SCORES = { superadmin: 10, superAdmin: 10, admin: 8, owner: 7, staff: 5, guest: 1 };
const getRoleScore = (role) => ROLE_SCORES[role] || 1;

async function runDeduplicationAdmin() {
    console.log("Fetching all user documents with Firebase Admin SDK...");
    const usersSnap = await db.collection("users").get();
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

        console.log(` -> Primary UID selected: ${primaryUid}`);

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

        // Update primary doc
        await db.collection("users").doc(primaryUid).set({
            email,
            displayName: (mergedName || 'Guest').trim(),
            role: mergedRole,
            ...(mergedTelegram ? { telegram: mergedTelegram } : {}),
            deposit_balance: maxDepositBalance,
            deposit_balances: mergedDepositBalances,
            deposits: mergedDeposits,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        for (const sec of secondaryDocs) {
            const secUid = sec.id;
            console.log(` -> Reassigning references & deleting secondary UID: ${secUid}`);

            // Reassign visits
            const vSnap1 = await db.collection("visits").where("uid", "==", secUid).get();
            for (const vDoc of vSnap1.docs) {
                await vDoc.ref.update({ uid: primaryUid, userId: primaryUid, guestEmail: email });
            }

            const vSnap2 = await db.collection("visits").where("userId", "==", secUid).get();
            for (const vDoc of vSnap2.docs) {
                await vDoc.ref.update({ uid: primaryUid, userId: primaryUid, guestEmail: email });
            }

            // Reassign leads
            const lSnap = await db.collection("leads").where("uid", "==", secUid).get();
            for (const lDoc of lSnap.docs) {
                await lDoc.ref.update({ uid: primaryUid, email: email });
            }

            // Reassign deposit_transactions
            const txSnap = await db.collection("deposit_transactions").where("userId", "==", secUid).get();
            for (const tDoc of txSnap.docs) {
                await tDoc.ref.update({ userId: primaryUid, guestEmail: email });
            }

            // Delete secondary document
            await db.collection("users").doc(secUid).delete();
            totalRemoved++;
        }
    }

    console.log(`\nSUCCESS: Merged ${duplicateEmails.length} email groups and removed ${totalRemoved} duplicate user records.`);
    process.exit(0);
}

runDeduplicationAdmin().catch(err => {
    console.error("Deduplication error:", err);
    process.exit(1);
});
