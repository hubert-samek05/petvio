-- 023: edytor relacji — nakładki (tekst/emoji/muzyka) + wideo
ALTER TABLE stories ADD COLUMN IF NOT EXISTS media_type VARCHAR(10);
ALTER TABLE stories ADD COLUMN IF NOT EXISTS meta JSONB;
