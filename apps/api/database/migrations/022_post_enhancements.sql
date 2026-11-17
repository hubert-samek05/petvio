-- 022: interaktywne elementy postów (jak Facebook)
ALTER TABLE user_posts ADD COLUMN IF NOT EXISTS feeling VARCHAR(60);
ALTER TABLE user_posts ADD COLUMN IF NOT EXISTS location VARCHAR(120);
ALTER TABLE user_posts ADD COLUMN IF NOT EXISTS background VARCHAR(40);
