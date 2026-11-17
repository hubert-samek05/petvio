-- 031_frozen.sql — zamrażanie zwierząt/współdzieleń ponad limit planu (downgrade nie usuwa danych)

ALTER TABLE pets ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE pet_shares ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_pets_user_frozen ON pets (user_id) WHERE is_frozen;
CREATE INDEX IF NOT EXISTS idx_pet_shares_owner_frozen ON pet_shares (owner_id) WHERE is_frozen;
