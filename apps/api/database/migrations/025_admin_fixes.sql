-- 025: ustawienia aplikacji + moderacja miejsc dla panelu admina
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Status moderacji trzymamy osobno, bo "Place" nalezy do roli petvio
-- (petvio_user nie moze wykonac ALTER). Domyslny status: approved.
CREATE TABLE IF NOT EXISTS place_moderation (
  place_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'approved',
  admin_notes TEXT,
  reviewed_by INTEGER,
  reviewed_at TIMESTAMPTZ
);
