/**
 * Supabase Sync Service for GiftX Database
 * Bridges Revoo Onboarding Leads & Venues with GiftX PostgreSQL backend
 */

const path = require('path');
const fs = require('fs');

// Attempt to load .env from current or parent directories
try {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
} catch (e) {}

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseClient = null;
let isConfigured = false;

if (SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes('your-project')) {
  try {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
    });
    isConfigured = true;
    console.log('⚡ [Supabase] Подключение к базе GiftX инициализировано:', SUPABASE_URL);
  } catch (err) {
    console.warn('⚠️ [Supabase] Ошибка инициализации клиента:', err.message);
  }
} else {
  console.log('ℹ️ [Supabase] Ключи доступа не настроены (добавьте SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в .env)');
}

/**
 * Synchronize a Lead or Venue to GiftX Supabase database
 * @param {Object} leadData - Full structured onboarding or venue object
 */
async function syncLeadToSupabase(leadData) {
  if (!isConfigured || !supabaseClient) {
    console.log('ℹ️ [Supabase Sync] Пропущено: ключи Supabase не настроены в .env.');
    return { success: false, reason: 'credentials_missing' };
  }

  try {
    const leadId = leadData.leadId || leadData.venueId || leadData.id || `lead_${Date.now()}`;
    const giftx = leadData.giftx || {};
    const revoo = leadData.revoo || {};
    const google = leadData.google || {};
    const contact = leadData.contact || {};

    const venueName = giftx.name || revoo.name || leadData.name || 'Безымянное заведение';
    const niche = giftx.niche || revoo.niche || leadData.category || leadData.niche || null;
    const city = giftx.city || revoo.city || leadData.city || null;
    const address = giftx.address || revoo.address || leadData.address || null;
    const mapsUrl = giftx.maps_url || revoo.maps_url || google.canonicalUrl || leadData.googleMapsUrl || null;
    
    // Rating parsing
    let ratingNum = null;
    if (google.rating) {
      const match = String(google.rating).match(/([0-5][.,]\d)/);
      if (match) ratingNum = parseFloat(match[1].replace(',', '.'));
    }
    
    // Reviews count parsing
    let reviewsNum = null;
    if (google.reviewsCount) {
      const rMatch = String(google.reviewsCount).replace(/\s+/g, '').match(/(\d+)/);
      if (rMatch) reviewsNum = parseInt(rMatch[1], 10);
    }

    const phone = contact.phone || google.phone || leadData.phone || null;
    const workingHours = google.workingHours || null;
    const photoUrl = google.photoUrl || null;

    // 1. Upsert Venue Record
    const venuePayload = {
      revoo_venue_id: leadId,
      name: venueName,
      niche: niche,
      city: city,
      address: address,
      google_maps_url: mapsUrl,
      rating: ratingNum,
      reviews_count: reviewsNum,
      working_hours: workingHours,
      phone: phone,
      photo_url: photoUrl,
      is_active: true,
      raw_metadata: {
        revoo_rates: revoo.rates || null,
        revoo_deposit: revoo.deposit || null,
        revoo_time_limit: revoo.time_limit || null,
        synced_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    };

    const { data: venueRow, error: venueErr } = await supabaseClient
      .from('giftx_venues')
      .upsert(venuePayload, { onConflict: 'revoo_venue_id' })
      .select()
      .single();

    if (venueErr) {
      throw new Error(`Ошибка сохранения giftx_venues: ${venueErr.message}`);
    }

    const supabaseVenueId = venueRow.id;

    // 2. Upsert GiftX Offers (Silver, Gold, Platinum)
    const offers = [];
    const giftxOffers = giftx.offers || leadData.giftxOffers || {};
    
    if (giftxOffers.silver && !giftxOffers.silver.includes('пропущено')) {
      offers.push({ venue_id: supabaseVenueId, tier: 'silver', description: giftxOffers.silver });
    }
    if (giftxOffers.gold && !giftxOffers.gold.includes('пропущено')) {
      offers.push({ venue_id: supabaseVenueId, tier: 'gold', description: giftxOffers.gold });
    }
    if (giftxOffers.platinum && !giftxOffers.platinum.includes('пропущено')) {
      offers.push({ venue_id: supabaseVenueId, tier: 'platinum', description: giftxOffers.platinum });
    }

    if (offers.length > 0) {
      // Clear existing offers for this venue to prevent duplicates
      await supabaseClient.from('giftx_offers').delete().eq('venue_id', supabaseVenueId);
      const { error: offersErr } = await supabaseClient.from('giftx_offers').insert(offers);
      if (offersErr) {
        console.warn('⚠️ [Supabase Sync] Ошибка вставки офферов:', offersErr.message);
      }
    }

    // 3. Upsert Contact Info
    const contactName = contact.name || leadData.contactName || null;
    const userRole = contact.role || leadData.userRole || null;
    const tgUser = leadData.telegramUser || {};

    if (contactName || phone || tgUser.id) {
      await supabaseClient.from('giftx_contacts').delete().eq('venue_id', supabaseVenueId);
      await supabaseClient.from('giftx_contacts').insert({
        venue_id: supabaseVenueId,
        contact_name: contactName,
        user_role: userRole,
        phone: phone,
        telegram_username: tgUser.username || null,
        telegram_chat_id: tgUser.id || null,
      });
    }

    console.log(`✅ [Supabase Sync] Успешно синхронизировано заведение: "${venueName}" (ID: ${supabaseVenueId})`);
    return {
      success: true,
      supabaseVenueId: supabaseVenueId,
      giftxUrl: `https://giftx.app/v/${supabaseVenueId}`,
    };
  } catch (err) {
    console.error('❌ [Supabase Sync Error]:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  syncLeadToSupabase,
  isSupabaseConfigured: () => isConfigured,
};
