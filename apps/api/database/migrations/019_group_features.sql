-- 019: Wydarzenia, ankiety i konkursy w grupach

-- Wydarzenia (spotkania) w grupie + odpowiedzi uczestników
CREATE TABLE IF NOT EXISTS group_events (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES pet_groups(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    location TEXT DEFAULT '',
    starts_at TIMESTAMPTZ NOT NULL,
    cover_image TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS group_event_responses (
    event_id INTEGER NOT NULL REFERENCES group_events(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('going', 'interested', 'not_going')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (event_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_group_events_group ON group_events(group_id, starts_at);

-- Ankiety w grupie + głosy (1 głos na użytkownika, można zmienić)
CREATE TABLE IF NOT EXISTS group_polls (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES pet_groups(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS group_poll_votes (
    poll_id INTEGER NOT NULL REFERENCES group_polls(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    option_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (poll_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_group_polls_group ON group_polls(group_id, created_at);

-- Konkursy: tworzą moderatorzy; zgłoszenia członków (1 na osobę); wybór zwycięzcy
CREATE TABLE IF NOT EXISTS group_contests (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES pet_groups(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    ends_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'ended')),
    winner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS group_contest_entries (
    id SERIAL PRIMARY KEY,
    contest_id INTEGER NOT NULL REFERENCES group_contests(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT DEFAULT '',
    image TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (contest_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_group_contests_group ON group_contests(group_id, created_at);
