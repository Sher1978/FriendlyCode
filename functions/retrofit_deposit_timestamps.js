const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { readFileSync } = require('fs');
const { join } = require('path');

const serviceAccountPath = join(__dirname, '..', 'tmp_b2b_keys.json');
let serviceAccount;
try {
    serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    if (!serviceAccount.project_id) {
        serviceAccount.project_id = 'bot-lab-21910';
    }
} catch (e) {
    console.error('Could not load service account key:', e);
    process.exit(1);
}

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function run() {
    console.log('Starting deposit timestamps retrofit...');
    const snapshot = await db.collection('deposit_transactions').get();
    
    let updatedCount = 0;
    const batch = db.batch();
    
    const defaultDate = new Date();
    defaultDate.setHours(12, 0, 0, 0);
    
    snapshot.forEach(doc => {
        const data = doc.data();
        let needsUpdate = false;
        
        if (!data.createdAt && !data.timestamp) {
            batch.update(doc.ref, {
                createdAt: defaultDate,
                timestamp: defaultDate
            });
            needsUpdate = true;
        } else if (!data.createdAt) {
             batch.update(doc.ref, {
                createdAt: data.timestamp
            });
            needsUpdate = true;
        } else if (!data.timestamp) {
             batch.update(doc.ref, {
                timestamp: data.createdAt
            });
            needsUpdate = true;
        }
        
        if (needsUpdate) {
            updatedCount++;
        }
    });
    
    if (updatedCount > 0) {
        console.log(`Committing updates for ${updatedCount} transactions...`);
        await batch.commit();
        console.log('Update complete.');
    } else {
        console.log('No transactions needed updating.');
    }
}

run().catch(console.error);
