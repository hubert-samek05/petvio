ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_cancel_at_period_end BOOLEAN NOT NULL DEFAULT false;
