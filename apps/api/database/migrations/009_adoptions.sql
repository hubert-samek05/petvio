-- Migration: Adoptions
-- Ogłoszenia adopcyjne widoczne dla wszystkich użytkowników + polubienia

CREATE TABLE IF NOT EXISTS adoption_posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pet_name VARCHAR(100) NOT NULL,
    species VARCHAR(50) NOT NULL DEFAULT 'dog',
    breed VARCHAR(100),
    age_value INTEGER,
    age_unit VARCHAR(10) DEFAULT 'years',
    gender VARCHAR(20),
    size VARCHAR(20),
    description TEXT NOT NULL,
    location VARCHAR(255),
    city VARCHAR(100),
    vaccinated BOOLEAN DEFAULT FALSE,
    sterilized BOOLEAN DEFAULT FALSE,
    owner_phone VARCHAR(30),
    photo TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS adoption_likes (
    post_id INTEGER NOT NULL REFERENCES adoption_posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_adoption_posts_status ON adoption_posts(status);
CREATE INDEX IF NOT EXISTS idx_adoption_posts_city ON adoption_posts(city);
CREATE INDEX IF NOT EXISTS idx_adoption_posts_user ON adoption_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_adoption_likes_post ON adoption_likes(post_id);
