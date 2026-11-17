-- Migration: Lost Pets
-- Zgłoszenia zaginionych zwierząt widoczne dla wszystkich użytkowników

CREATE TABLE IF NOT EXISTS lost_pets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pet_id INTEGER REFERENCES pets(id) ON DELETE SET NULL,
    pet_name VARCHAR(100) NOT NULL,
    species VARCHAR(50) NOT NULL DEFAULT 'dog',
    breed VARCHAR(100),
    color VARCHAR(100),
    age INTEGER,
    gender VARCHAR(20),
    description TEXT NOT NULL,
    distinguishing_features TEXT,
    last_seen_location VARCHAR(255) NOT NULL,
    last_seen_city VARCHAR(100),
    last_seen_lat DECIMAL(9,6),
    last_seen_lng DECIMAL(9,6),
    last_seen_date DATE NOT NULL,
    reward VARCHAR(100),
    owner_phone VARCHAR(30),
    photo TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'lost',
    found_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lost_pets_status ON lost_pets(status);
CREATE INDEX IF NOT EXISTS idx_lost_pets_city ON lost_pets(last_seen_city);
CREATE INDEX IF NOT EXISTS idx_lost_pets_user ON lost_pets(user_id);
CREATE INDEX IF NOT EXISTS idx_lost_pets_date ON lost_pets(last_seen_date DESC);
