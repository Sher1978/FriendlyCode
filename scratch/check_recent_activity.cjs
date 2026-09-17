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
                    resolve({ documents: [] });
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
    console.log('=== CHECKING ALL RECENT DOCUMENTS ===');
    const cols = ['users', 'deposit_transactions', 'leads', 'venues', 'orders', 'activations'];
    for (const c of cols) {
        const resp = await fetchFirestoreCollection(c);
        const docs = (resp.documents || []).map(parseDoc);
        console.log(`\nCollection: ${c} (${docs.length} docs)`);
        docs.forEach(d => {
            const str = JSON.stringify(d);
            if (str.includes('1425') || str.includes('1,425') || str.includes('1.425')) {
                console.log(`🎯 MATCH IN ${c} [${d.id}]:`, JSON.stringify(d, null, 2));
            }
        });
    }
}

run().catch(console.error);
