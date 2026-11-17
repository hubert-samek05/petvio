-- Migration: Adoption geo
-- Wspolrzedne ogloszen adopcyjnych — filtrowanie po promieniu jak w Zaginionych.

ALTER TABLE adoption_posts ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE adoption_posts ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS idx_adoption_posts_geo ON adoption_posts(lat, lng) WHERE lat IS NOT NULL;
