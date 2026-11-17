-- Ostatnia znana lokalizacja uzytkownika (do alertow o zaginionych zwierzetach w promieniu km)
ALTER TABLE users ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

-- Czyszczenie starych zgloszen po dacie
CREATE INDEX IF NOT EXISTS idx_lost_pets_created_at ON lost_pets (created_at);
CREATE INDEX IF NOT EXISTS idx_lost_pets_geo ON lost_pets (last_seen_lat, last_seen_lng) WHERE status = 'lost';
