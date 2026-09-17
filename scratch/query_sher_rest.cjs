const fs = require('fs');
const path = require('path');
const https = require('https');

const tokenPath = path.join(process.env.USERPROFILE || '', '.config', 'configstore', 'firebase-tools.json');
const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
const accessToken = tokenData.tokens?.access_token;

console.log('Access token loaded from firebase-tools.json');

function fetchFirestoreCollection(collectionName) {
    return new Promise((resolve, reject) => {
        const url = `https://firestore.googleapis.com/v1/projects/bot-lab-21910/databases/(default)/documents/${collectionName}?pageSize=1000`;
        const req = https.get(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(body));
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${body}`));
                }
            });
        });
        req.on('error', reject);
    });
}

function parseFirestoreValue(val) {
    if (!val) return null;
    if (val.stringValue !== undefined) return val.stringValue;
    if (val.integerValue !== undefined) return parseInt(val.integerValue, 10);
    if (val.doubleValue !== undefined) return parseFloat(val.doubleValue);
    if (val.booleanValue !== undefined) return val.booleanValue;
    if (val.timestampValue !== undefined) return val.timestampValue;
    if (val.mapValue !== undefined) {
        const res = {};
        const fields = val.mapValue.fields || {};
        for (const k in fields) {
            res[k] = parseFirestoreValue(fields[k]);
        }
        return res;
    }
    if (val.arrayValue !== undefined) {
        return (val.arrayValue.values || []).map(parseFirestoreValue);
    }
    if (val.nullValue !== undefined) return null;
    return val;
}

function parseDoc(doc) {
    const id = doc.name.split('/').pop();
    const fields = doc.fields || {};
    const data = { id };
    for (const k in fields) {
        data[k] = parseFirestoreValue(fields[k]);
    }
    return data;
}

async function run() {
    console.log('Fetching users from Firestore REST API...');
    const usersResp = await fetchFirestoreCollection('users');
    const users = (usersResp.documents || []).map(parseDoc);

    const sherUsers = users.filter(u => {
        const name = (u.displayName || u.name || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        return name.includes('шер') || email.includes('sher') || u.id.includes('sher');
    });

    console.log(`\nFound ${sherUsers.length} user record(s) matching "Шер":`);
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

    console.log('\nFetching deposit_transactions from Firestore REST API...');
    const txResp = await fetchFirestoreCollection('deposit_transactions');
    const allTxs = (txResp.documents || []).map(parseDoc);

    const sherTxs = allTxs.filter(tx => {
        const uId = tx.userId || tx.uid;
        const gEmail = (tx.guestEmail || '').toLowerCase();
        const gName = (tx.guestName || '').toLowerCase();
        return userIds.includes(uId) || (gEmail && emails.includes(gEmail)) || gName.includes('шер');
    });

    sherTxs.sort((a, b) => {
        const getSec = (x) => {
            if (!x) return 0;
            if (typeof x === 'string') return Math.floor(new Date(x).getTime() / 1000);
            if (typeof x === 'number') return x;
            return 0;
        };
        const tA = getSec(a.createdAt) || getSec(a.timestamp);
        const tB = getSec(b.createdAt) || getSec(b.timestamp);
        return tA - tB;
    });

    console.log(`\nTotal transactions found for "Шер": ${sherTxs.length}\n`);

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
        const date = tx.createdAt ? new Date(tx.createdAt).toLocaleString('ru-RU') : 'N/A';

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

run().catch(err => {
    console.error(err);
    process.exit(1);
});
