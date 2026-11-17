-- 018: poprawa stref czasowych (TIMESTAMP -> TIMESTAMPTZ) + potwierdzenia odczytania w Messengerze
-- Uwaga: istniejące wartości są interpretowane w strefie ustawionej dla sesji (wcześniej zapisywano
-- czas lokalny serwera DB), więc konwersja zachowuje te same punkty w czasie.

ALTER TABLE messages ALTER COLUMN created_at TYPE timestamptz;
ALTER TABLE conversations ALTER COLUMN created_at TYPE timestamptz;
ALTER TABLE conversation_participants ALTER COLUMN created_at TYPE timestamptz;
ALTER TABLE message_folders ALTER COLUMN created_at TYPE timestamptz;
ALTER TABLE user_posts ALTER COLUMN created_at TYPE timestamptz, ALTER COLUMN updated_at TYPE timestamptz;
ALTER TABLE user_post_comments ALTER COLUMN created_at TYPE timestamptz;
ALTER TABLE user_post_reactions ALTER COLUMN created_at TYPE timestamptz;
ALTER TABLE stories ALTER COLUMN created_at TYPE timestamptz, ALTER COLUMN expires_at TYPE timestamptz;
ALTER TABLE story_views ALTER COLUMN created_at TYPE timestamptz;
ALTER TABLE friendships ALTER COLUMN created_at TYPE timestamptz, ALTER COLUMN updated_at TYPE timestamptz;
ALTER TABLE follows ALTER COLUMN created_at TYPE timestamptz;
ALTER TABLE user_blocks ALTER COLUMN created_at TYPE timestamptz;
ALTER TABLE notifications ALTER COLUMN created_at TYPE timestamptz, ALTER COLUMN read_at TYPE timestamptz;
ALTER TABLE group_posts ALTER COLUMN created_at TYPE timestamptz, ALTER COLUMN updated_at TYPE timestamptz;
ALTER TABLE group_post_comments ALTER COLUMN created_at TYPE timestamptz;
ALTER TABLE group_post_reactions ALTER COLUMN created_at TYPE timestamptz;
ALTER TABLE group_members ALTER COLUMN created_at TYPE timestamptz;
ALTER TABLE pet_groups ALTER COLUMN created_at TYPE timestamptz, ALTER COLUMN updated_at TYPE timestamptz;
ALTER TABLE walks ALTER COLUMN started_at TYPE timestamptz, ALTER COLUMN created_at TYPE timestamptz, ALTER COLUMN updated_at TYPE timestamptz;

-- Messenger: moment przeczytania rozmowy (do statusu „Wyświetlono")
ALTER TABLE conversation_participants ADD COLUMN IF NOT EXISTS last_read_at timestamptz;
