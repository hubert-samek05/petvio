-- Migration: Pet Sharing
-- Udostępnianie profili zwierząt innym użytkownikom (rodzina, petsitter, weterynarz)

CREATE TABLE IF NOT EXISTS pet_shares (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitee_email VARCHAR(255) NOT NULL,
    invitee_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'family',
    permissions JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP,
    UNIQUE(owner_id, invitee_email)
);

CREATE TABLE IF NOT EXISTS pet_share_pets (
    share_id INTEGER NOT NULL REFERENCES pet_shares(id) ON DELETE CASCADE,
    pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    PRIMARY KEY (share_id, pet_id)
);

CREATE INDEX IF NOT EXISTS idx_pet_shares_owner ON pet_shares(owner_id);
CREATE INDEX IF NOT EXISTS idx_pet_shares_email ON pet_shares(invitee_email);
CREATE INDEX IF NOT EXISTS idx_pet_shares_invitee ON pet_shares(invitee_user_id);
CREATE INDEX IF NOT EXISTS idx_pet_share_pets_pet ON pet_share_pets(pet_id);
