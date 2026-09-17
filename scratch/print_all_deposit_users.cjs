const fs = require('fs');
const path = require('path');
const https = require('https');

const tokenPath = path.join(process.env.USERPROFILE || '', '.config', 'configstore', 'firebase-tools.json');
const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
const accessToken = tokenData.tokens?.access_token;

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
    console.log('=== USERS WITH DEPOSITS ===');
    const usersResp = await fetchFirestoreCollection('users');
    const users = (usersResp.documents || []).map(parseDoc);

    users.forEach(u => {
        if (u.deposit_balance || u.deposit_balances) {
            console.log(`[USER] ${u.id} | name: "${u.displayName || u.name}" | email: "${u.email}" | bal: ${u.deposit_balance} | map: ${JSON.stringify(u.deposit_balances)}`);
        }
    });

    console.log('\n=== ALL DEPOSIT TRANSACTIONS ===');
    const txResp = await fetchFirestoreCollection('deposit_transactions');
    const allTxs = (txResp.documents || []).map(parseDoc);

    allTxs.sort((a, b) => {
        const tA = new Date(a.createdAt || 0).getTime();
        const tB = new Date(b.createdAt || 0).getTime();
        return tA - tB;
    });

    allTxs.forEach((tx, i) => {
        console.log(`[TX #${i+1}] ${tx.id} | date: ${tx.createdAt} | type: ${tx.type || tx.transactionType} | amount: ${tx.amount} | finalAmount: ${tx.finalAmount} | user: "${tx.guestName}" / "${tx.guestEmail}" (${tx.userId}) | prev: ${tx.previousBalance} -> new: ${tx.newBalance}`);
    });

    process.exit(0);
}

run().catch(console.error);
