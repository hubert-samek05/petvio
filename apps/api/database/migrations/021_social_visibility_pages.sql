-- Migration: widoczność postów + strony firmowe (PetvioBook)

-- 1. Prywatność postów: public | friends | only_me
ALTER TABLE user_posts
  ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) NOT NULL DEFAULT 'public'
  CHECK (visibility IN ('public', 'friends', 'only_me'));

-- 2. Posty publikowane jako strona firmowa
ALTER TABLE user_posts
  ADD COLUMN IF NOT EXISTS page_id INTEGER;

CREATE TABLE IF NOT EXISTS business_pages (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    category VARCHAR(60) NOT NULL DEFAULT 'other',
    description TEXT,
    email VARCHAR(254),
    phone VARCHAR(30),
    website VARCHAR(255),
    address VARCHAR(255),
    city VARCHAR(100),
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    opening_hours JSONB DEFAULT '{}'::jsonb,
    avatar_url TEXT,
    cover_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE user_posts
  DROP CONSTRAINT IF EXISTS user_posts_page_id_fkey,
  ADD CONSTRAINT user_posts_page_id_fkey
    FOREIGN KEY (page_id) REFERENCES business_pages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_business_pages_owner ON business_pages(owner_id);
CREATE INDEX IF NOT EXISTS idx_business_pages_city ON business_pages(city);
CREATE INDEX IF NOT EXISTS idx_user_posts_visibility ON user_posts(visibility);
CREATE INDEX IF NOT EXISTS idx_user_posts_page ON user_posts(page_id) WHERE page_id IS NOT NULL;
