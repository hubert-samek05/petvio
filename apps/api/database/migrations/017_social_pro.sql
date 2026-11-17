-- Migration: PsiFacebook/Messenger PRO — prywatność profilu, posty na cudzej tablicy,
-- blokady, foldery konwersacji, przypinanie i wyciszanie rozmów

-- Profil + ustawienia prywatności
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(120) NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS wall_setting VARCHAR(20) NOT NULL DEFAULT 'friends';           -- friends | nobody — kto może pisać na mojej tablicy
ALTER TABLE users ADD COLUMN IF NOT EXISTS messages_from VARCHAR(20) NOT NULL DEFAULT 'everyone';         -- everyone | friends — kto może do mnie pisać
ALTER TABLE users ADD COLUMN IF NOT EXISTS birthday_visibility VARCHAR(20) NOT NULL DEFAULT 'friends';    -- public | friends | private

-- Posty na cudzej tablicy (jak na Facebooku)
ALTER TABLE user_posts ADD COLUMN IF NOT EXISTS wall_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_user_posts_wall ON user_posts(wall_user_id);

-- Blokady użytkowników (brak wiadomości, zaproszeń i interakcji)
CREATE TABLE IF NOT EXISTS user_blocks (
    blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (blocker_id, blocked_id)
);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);

-- Messenger: foldery konwersacji + przypinanie/wyciszanie
CREATE TABLE IF NOT EXISTS message_folders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(60) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE conversation_participants ADD COLUMN IF NOT EXISTS folder_id INTEGER REFERENCES message_folders(id) ON DELETE SET NULL;
ALTER TABLE conversation_participants ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE conversation_participants ADD COLUMN IF NOT EXISTS muted BOOLEAN NOT NULL DEFAULT false;
