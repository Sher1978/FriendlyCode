-- ==============================================================================
-- GIFTX & REVOO DATABASE SCHEMA (SUPABASE POSTGRESQL)
-- Run this SQL in your Supabase Project: SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Venues / Merchants Table (GiftX Partner Establishments)
CREATE TABLE IF NOT EXISTS public.giftx_venues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    revoo_venue_id TEXT UNIQUE NOT NULL,               -- Foreign identifier linked to Revoo Firestore
    name TEXT NOT NULL,
    niche TEXT,
    city TEXT,
    address TEXT,
    google_maps_url TEXT,
    rating NUMERIC(2, 1),
    reviews_count INT,
    working_hours TEXT,
    phone TEXT,
    photo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    raw_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 3-Tier Gift Offers Table (Silver, Gold, Platinum)
CREATE TABLE IF NOT EXISTS public.giftx_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES public.giftx_venues(id) ON DELETE CASCADE,
    tier TEXT NOT NULL CHECK (tier IN ('silver', 'gold', 'platinum')),
    description TEXT NOT NULL,
    terms TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Venue Contacts / Owners Table
CREATE TABLE IF NOT EXISTS public.giftx_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES public.giftx_venues(id) ON DELETE CASCADE,
    contact_name TEXT,
    user_role TEXT,
    phone TEXT,
    telegram_username TEXT,
    telegram_chat_id BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Indexes for Fast Searching & Deduplication
CREATE INDEX IF NOT EXISTS idx_giftx_venues_revoo_id ON public.giftx_venues(revoo_venue_id);
CREATE INDEX IF NOT EXISTS idx_giftx_venues_city ON public.giftx_venues(city);
CREATE INDEX IF NOT EXISTS idx_giftx_offers_venue_id ON public.giftx_offers(venue_id);
CREATE INDEX IF NOT EXISTS idx_giftx_contacts_venue_id ON public.giftx_contacts(venue_id);

-- 6. Row Level Security (RLS) - Public Read, Service Role Write
ALTER TABLE public.giftx_venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.giftx_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.giftx_contacts ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active venues and offers
CREATE POLICY "Public Read Active Venues" 
    ON public.giftx_venues 
    FOR SELECT 
    USING (is_active = TRUE);

CREATE POLICY "Public Read Active Offers" 
    ON public.giftx_offers 
    FOR SELECT 
    USING (is_active = TRUE);

-- Allow full access for backend service role
CREATE POLICY "Service Role Full Access Venues" 
    ON public.giftx_venues 
    FOR ALL 
    USING (auth.role() = 'service_role');

CREATE POLICY "Service Role Full Access Offers" 
    ON public.giftx_offers 
    FOR ALL 
    USING (auth.role() = 'service_role');

CREATE POLICY "Service Role Full Access Contacts" 
    ON public.giftx_contacts 
    FOR ALL 
    USING (auth.role() = 'service_role');
