CREATE TABLE IF NOT EXISTS special_diets (
    id SERIAL PRIMARY KEY,
    pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    diet_type VARCHAR(50) NOT NULL,
    indication TEXT,
    allowed_foods TEXT,
    forbidden_foods TEXT,
    recommendations TEXT,
    notes TEXT,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_special_diets_pet_id ON special_diets(pet_id);
CREATE INDEX IF NOT EXISTS idx_special_diets_user_id ON special_diets(user_id);
