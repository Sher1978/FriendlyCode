import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
const serviceAccountPath = join(__dirname, '..', 'tmp_b2b_keys.json');
let serviceAccount;
try {
    serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
} catch (e) {
    console.error('Could not load service account key from tmp_b2b_keys.json:', e);
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
    
    // Default timestamp: Today 12:00:00 (Local time)
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
             // In case some queries use timestamp explicitly
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
