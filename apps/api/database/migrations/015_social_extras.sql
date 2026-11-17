-- Migration: Rozbudowa social — relacje (stories), rolki/muzyka/spacery w postach,
-- zaawansowana moderacja grup (poczekalnia postów, uprawnienia publikacji/komentarzy)

-- ===== Relacje (stories) — wygasaja po 24h =====
CREATE TABLE IF NOT EXISTS stories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image TEXT,                                        -- data URL albo NULL dla relacji tekstowej
    text TEXT NOT NULL DEFAULT '',
    bg_color VARCHAR(30) NOT NULL DEFAULT '#1B6B4A',   -- tlo relacji tekstowej
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS story_views (
    story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (story_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_stories_user ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at);

-- ===== Posty spolecznosciowe: typy tresci =====
ALTER TABLE user_posts ADD COLUMN IF NOT EXISTS post_type VARCHAR(20) NOT NULL DEFAULT 'text'; -- text | reel | walk
ALTER TABLE user_posts ADD COLUMN IF NOT EXISTS video TEXT;              -- data:video/... (rolka)
ALTER TABLE user_posts ADD COLUMN IF NOT EXISTS music JSONB;             -- {title, artist, url}
ALTER TABLE user_posts ADD COLUMN IF NOT EXISTS walk_id INTEGER REFERENCES walks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_posts_type ON user_posts(post_type) WHERE post_type <> 'text';

-- ===== Posty w grupach: poczekalnia + załączniki =====
ALTER TABLE group_posts ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'approved'; -- approved | pending
ALTER TABLE group_posts ADD COLUMN IF NOT EXISTS post_type VARCHAR(20) NOT NULL DEFAULT 'text';
ALTER TABLE group_posts ADD COLUMN IF NOT EXISTS video TEXT;
ALTER TABLE group_posts ADD COLUMN IF NOT EXISTS music JSONB;
ALTER TABLE group_posts ADD COLUMN IF NOT EXISTS walk_id INTEGER REFERENCES walks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_group_posts_status ON group_posts(group_id, status);

-- ===== Ustawienia moderacji grupy =====
ALTER TABLE pet_groups ADD COLUMN IF NOT EXISTS post_approval BOOLEAN NOT NULL DEFAULT false;      -- posty do poczekalni
ALTER TABLE pet_groups ADD COLUMN IF NOT EXISTS member_posting VARCHAR(20) NOT NULL DEFAULT 'everyone'; -- everyone | mods
ALTER TABLE pet_groups ADD COLUMN IF NOT EXISTS member_comments BOOLEAN NOT NULL DEFAULT true;      -- czlonkowie moga komentowac
