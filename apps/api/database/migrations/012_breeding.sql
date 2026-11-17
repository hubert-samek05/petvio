-- Migration: Breeding
-- Cykle rujowe, ciaze i mioty przypisane do pupili uzytkownika

CREATE TABLE IF NOT EXISTS breeding_cycles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    mated BOOLEAN DEFAULT FALSE,
    mating_date DATE,
    partner_name VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS breeding_pregnancies (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    mating_date DATE NOT NULL,
    expected_due_date DATE NOT NULL,
    confirmed BOOLEAN DEFAULT FALSE,
    confirmation_date DATE,
    vet_visits INTEGER DEFAULT 0,
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ongoing',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS breeding_litters (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    birth_date DATE NOT NULL,
    puppies_count INTEGER NOT NULL,
    alive_count INTEGER NOT NULL DEFAULT 0,
    partner_name VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_breeding_cycles_pet ON breeding_cycles(pet_id);
CREATE INDEX IF NOT EXISTS idx_breeding_pregnancies_pet ON breeding_pregnancies(pet_id);
CREATE INDEX IF NOT EXISTS idx_breeding_litters_pet ON breeding_litters(pet_id);
