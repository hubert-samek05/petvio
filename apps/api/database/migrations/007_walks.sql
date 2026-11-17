-- Migration: Walk Tracker
-- Tabela spacerów śledzonych GPS z przypisaniem do pupila.

CREATE TABLE IF NOT EXISTS walks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    started_at TIMESTAMP NOT NULL,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    distance_meters DECIMAL(10,2) NOT NULL DEFAULT 0,
    points JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_walks_user ON walks(user_id);
CREATE INDEX IF NOT EXISTS idx_walks_pet ON walks(pet_id);
CREATE INDEX IF NOT EXISTS idx_walks_started_at ON walks(started_at DESC);
