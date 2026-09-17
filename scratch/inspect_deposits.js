import admin from "firebase-admin";

admin.initializeApp({
    projectId: "bot-lab-21910"
});

const db = admin.firestore();

async function inspectDeposits() {
    console.log("=== INSPECTING USERS ===");
    const usersSnap = await db.collection("users").get();
    console.log(`Total users: ${usersSnap.size}`);
    
    usersSnap.forEach(d => {
        const data = d.data();
        const name = data.displayName || data.name || '';
        const email = data.email || '';
        const bal = data.deposit_balance;
        const bals = data.deposit_balances;
        if (name.includes('Шер') || name.includes('Татьяна') || (email && (email.includes('sher') || email.includes('tatyana')))) {
            console.log(`User ID: ${d.id} | Name: "${name}" | Email: "${email}" | deposit_balance: ${bal} | deposit_balances:`, bals);
        }
    });

    console.log("\n=== INSPECTING DEPOSIT TRANSACTIONS ===");
    const txSnap = await db.collection("deposit_transactions").get();
    console.log(`Total transactions: ${txSnap.size}`);

    txSnap.forEach(d => {
        const data = d.data();
        const guestName = data.guestName || data.userName || '';
        const guestEmail = data.guestEmail || '';
        const venueId = data.venueId || '';
        const userId = data.userId || '';
        const amount = data.amount || data.totalCredit || data.finalAmount;
        const type = data.type || data.transactionType;
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt;

        if (guestName.includes('Шер') || guestName.includes('Татьяна') || (guestEmail && (guestEmail.includes('sher') || guestEmail.includes('tatyana')))) {
            console.log(`Tx ID: ${d.id} | Date: ${createdAt} | Type: ${type} | Amount: ${amount} | Name: "${guestName}" | Email: "${guestEmail}" | userId: "${userId}" | venueId: "${venueId}"`);
        }
    });

    process.exit(0);
}

inspectDeposits().catch(err => {
    console.error(err);
    process.exit(1);
});
