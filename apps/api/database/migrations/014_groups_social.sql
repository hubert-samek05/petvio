-- Migration: Grupy + posty spolecznosciowe (tablica)
-- Grupy w stylu FB: publiczne/prywatne, czlonkowie, moderatorzy, posty, reakcje, komentarze

CREATE TABLE IF NOT EXISTS pet_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    description TEXT DEFAULT '',
    category VARCHAR(30) NOT NULL DEFAULT 'general',
    privacy VARCHAR(20) NOT NULL DEFAULT 'public',   -- public | private
    cover_url TEXT,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS group_members (
    group_id INTEGER NOT NULL REFERENCES pet_groups(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member',      -- owner | moderator | member
    status VARCHAR(20) NOT NULL DEFAULT 'active',    -- active | pending
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_posts (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES pet_groups(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL DEFAULT '',
    images JSONB NOT NULL DEFAULT '[]',
    pinned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS group_post_reactions (
    post_id INTEGER NOT NULL REFERENCES group_posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_post_comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES group_posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Posty spolecznosciowe na tablicy uzytkownika / feedzie
CREATE TABLE IF NOT EXISTS user_posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL DEFAULT '',
    images JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_post_reactions (
    post_id INTEGER NOT NULL REFERENCES user_posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS user_post_comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES user_posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_status ON group_members(group_id, status);
CREATE INDEX IF NOT EXISTS idx_group_posts_group ON group_posts(group_id, pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_post_comments_post ON group_post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_user_posts_created ON user_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_post_comments_post ON user_post_comments(post_id);
