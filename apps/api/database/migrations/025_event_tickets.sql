-- 025: bilety do wydarzeń grupowych
ALTER TABLE group_events ADD COLUMN IF NOT EXISTS tickets_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE group_events ADD COLUMN IF NOT EXISTS ticket_price NUMERIC(10,2);
ALTER TABLE group_events ADD COLUMN IF NOT EXISTS ticket_total INT;
ALTER TABLE group_events ADD COLUMN IF NOT EXISTS ticket_info TEXT DEFAULT '';

CREATE TABLE IF NOT EXISTS group_event_tickets (
    event_id INTEGER NOT NULL REFERENCES group_events(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (event_id, user_id)
);
