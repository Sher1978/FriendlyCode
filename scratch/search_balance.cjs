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
    console.log('=== SEARCHING FOR 1425000 IN USERS & TRANSACTIONS ===');
    const usersResp = await fetchFirestoreCollection('users');
    const users = (usersResp.documents || []).map(parseDoc);

    console.log(`Checking ${users.length} users...`);
    users.forEach(u => {
        const balStr = JSON.stringify(u);
        if (balStr.includes('1425000') || balStr.includes('1.425') || u.deposit_balance === 1425000) {
            console.log(`🎯 FOUND IN USER DOC [${u.id}]:`, JSON.stringify(u, null, 2));
        }
    });

    const txResp = await fetchFirestoreCollection('deposit_transactions');
    const allTxs = (txResp.documents || []).map(parseDoc);
    console.log(`Checking ${allTxs.length} deposit_transactions...`);

    allTxs.forEach(tx => {
        const txStr = JSON.stringify(tx);
        if (txStr.includes('1425000') || tx.amount === 1425000 || tx.finalAmount === 1425000 || tx.newBalance === 1425000 || tx.previousBalance === 1425000) {
            console.log(`🎯 FOUND IN TX DOC [${tx.id}]:`, JSON.stringify(tx, null, 2));
        }
    });

    // Also check leads collection or venues collection
    console.log('\nChecking leads collection...');
    try {
        const leadsResp = await fetchFirestoreCollection('leads');
        const leads = (leadsResp.documents || []).map(parseDoc);
        leads.forEach(l => {
            const lStr = JSON.stringify(l);
            if (lStr.includes('1425000')) {
                console.log(`🎯 FOUND IN LEAD DOC [${l.id}]:`, JSON.stringify(l, null, 2));
            }
        });
    } catch(e) {
        console.log('Leads check error:', e.message);
    }

    process.exit(0);
}

run().catch(console.error);
