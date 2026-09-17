const fs = require('fs');
const path = require('path');
const https = require('https');

const tokenPath = path.join(process.env.USERPROFILE || '', '.config', 'configstore', 'firebase-tools.json');
const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
const accessToken = tokenData.tokens?.access_token;

function updateFirestoreDoc(collectionName, docId, updateFields) {
    return new Promise((resolve, reject) => {
        const url = `https://firestore.googleapis.com/v1/projects/bot-lab-21910/databases/(default)/documents/${collectionName}/${docId}?updateMask.fieldPaths=deposit_balances&updateMask.fieldPaths=deposit_balance`;
        
        const bodyData = JSON.stringify({
            name: `projects/bot-lab-21910/databases/(default)/documents/${collectionName}/${docId}`,
            fields: {
                deposit_balance: { doubleValue: updateFields.deposit_balance },
                deposit_balances: {
                    mapValue: {
                        fields: {
                            [updateFields.venueId]: { doubleValue: updateFields.deposit_balance }
                        }
                    }
                }
            }
        });

        const req = https.request(url, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(bodyData)
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
        req.write(bodyData);
        req.end();
    });
}

async function run() {
    console.log('Syncing user Шер deposit_balances map with deposit_balance (1,589,000 ₫)...');
    const res = await updateFirestoreDoc('users', 'dp1H2Q8Io5VrwpyrP0ubXHjuTp02', {
        deposit_balance: 1589000,
        venueId: 'deCg3Rq1oTawHoOImnoj'
    });
    console.log('Update successful! Updated doc:', JSON.stringify(res, null, 2));
    process.exit(0);
}

run().catch(console.error);
