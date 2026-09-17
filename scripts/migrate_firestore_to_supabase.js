/**
 * Batch Migration Script: Firestore -> Supabase (GiftX)
 * Run: node scripts/migrate_firestore_to_supabase.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'bots', 'revoo-leads-bot', '.env') });

const admin = require('firebase-admin');
const { syncLeadToSupabase, isSupabaseConfigured } = require('../bots/revoo-leads-bot/supabase_sync');

// Initialize Firebase Admin
try {
  const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');
  if (require('fs').existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    admin.initializeApp({
      projectId: 'bot-lab-21910',
    });
  }
} catch (e) {
  if (!admin.apps.length) {
    admin.initializeApp({ projectId: 'bot-lab-21910' });
  }
}

const db = admin.firestore();

async function runMigration() {
  console.log('====================================================');
  console.log('🚀 ЗАПУСК МИГРАЦИИ ИЗ FIRESTORE В SUPABASE (GIFTX)');
  console.log('====================================================');

  if (!isSupabaseConfigured()) {
    console.error('❌ Ошибка: Переменные SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY не заданы в .env!');
    console.error('Пожалуйста, добавьте их в bots/revoo-leads-bot/.env');
    process.exit(1);
  }

  let migratedVenues = 0;
  let migratedLeads = 0;

  try {
    // 1. Migrate all active venues from 'venues' collection
    console.log('\n📦 [1/2] Миграция заведений из коллекции `venues`...');
    const venuesSnap = await db.collection('venues').get();
    console.log(`Найдено заведений: ${venuesSnap.size}`);

    for (const doc of venuesSnap.docs) {
      const data = doc.data();
      console.log(`⏳ Миграция заведения: ${data.name || doc.id}...`);

      const result = await syncLeadToSupabase({
        id: doc.id,
        venueId: doc.id,
        name: data.name,
        category: data.category,
        city: data.city || (data.address ? data.address.split(',')[1] : null),
        address: data.address,
        googleMapsUrl: data.googleMapsUrl,
        phone: data.phone,
        giftx: {
          name: data.name,
          address: data.address,
          maps_url: data.googleMapsUrl,
          offers: data.giftxOffers || (data.giftx ? data.giftx.offers : null) || {},
        },
        revoo: {
          name: data.name,
          niche: data.category,
          rates: data.rates ? JSON.stringify(data.rates) : null,
          deposit: data.deposit,
        },
      });

      if (result.success) {
        migratedVenues++;
      }
    }

    // 2. Migrate all leads from 'giftx_exports' / 'leads'
    console.log('\n📦 [2/2] Миграция заявок из `giftx_exports` & `leads`...');
    const exportsSnap = await db.collection('giftx_exports').get();
    console.log(`Найдено экспортов GiftX: ${exportsSnap.size}`);

    for (const doc of exportsSnap.docs) {
      const data = doc.data();
      const result = await syncLeadToSupabase(data);
      if (result.success) {
        migratedLeads++;
      }
    }

    console.log('\n====================================================');
    console.log('🎉 МИГРАЦИЯ УСПЕШНО ЗАВЕРШЕНА!');
    console.log(`✅ Заведений перенесено в Supabase: ${migratedVenues}`);
    console.log(`✅ Заявок/экспортов перенесено: ${migratedLeads}`);
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Критическая ошибка во время миграции:', err);
  }
}

runMigration();
