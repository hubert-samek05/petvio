-- 029: subskrypcje (plany Mini / Duża / Bardzo duża rodzina), zdarzenia płatności, dzienne zużycie AI

-- Istniejące konta dostają rok darmowego dostępu — tylko przy PIERWSZYM uruchomieniu migracji
DO $$
DECLARE first_run BOOLEAN;
BEGIN
  first_run := NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'subscription_events'
  );

  ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(20) NOT NULL DEFAULT 'mini';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_source VARCHAR(20) NOT NULL DEFAULT 'free';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_billing VARCHAR(10);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMP;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_used_at TIMESTAMP;

  CREATE TABLE IF NOT EXISTS subscription_events (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_type VARCHAR(30) NOT NULL,
      plan VARCHAR(20),
      billing VARCHAR(10),
      source VARCHAR(20),
      amount_grosz INTEGER NOT NULL DEFAULT 0,
      currency VARCHAR(3) NOT NULL DEFAULT 'PLN',
      external_id VARCHAR(255),
      note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_sub_events_user ON subscription_events(user_id);
  CREATE INDEX IF NOT EXISTS idx_sub_events_type_created ON subscription_events(event_type, created_at DESC);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_sub_events_external
    ON subscription_events(external_id) WHERE external_id IS NOT NULL;

  CREATE TABLE IF NOT EXISTS ai_usage (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day DATE NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, day)
  );

  IF first_run THEN
    UPDATE users
       SET plan = 'family', plan_source = 'grandfather', plan_expires_at = NOW() + INTERVAL '1 year'
     WHERE role <> 'admin';

    INSERT INTO subscription_events (user_id, event_type, plan, source, note)
    SELECT id, 'grandfather', 'family', 'grandfather', 'Rok darmowego dostępu dla kont założonych przed wprowadzeniem subskrypcji'
      FROM users WHERE role <> 'admin';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan, plan_source);
