-- 0001_initial.sql: Kernel schema definition

CREATE TABLE IF NOT EXISTS kernel_migrations (
    number INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS household_config (
    key TEXT PRIMARY KEY,
    value JSON NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS household_members (
    id TEXT PRIMARY KEY,
    revision INTEGER NOT NULL DEFAULT 1,
    name TEXT NOT NULL,
    avatar_color TEXT,
    serving_ratio REAL NOT NULL DEFAULT 1.0,
    dietary_restrictions JSON NOT NULL DEFAULT '[]',
    allergies JSON NOT NULL DEFAULT '[]',
    disliked_ingredients JSON NOT NULL DEFAULT '[]',
    favorite_cuisines JSON NOT NULL DEFAULT '[]',
    preferred_language TEXT NOT NULL DEFAULT 'en',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    language TEXT NOT NULL,
    revision INTEGER NOT NULL DEFAULT 1,
    title TEXT NOT NULL,
    description TEXT,
    ingredients JSON NOT NULL DEFAULT '[]',
    steps JSON NOT NULL DEFAULT '[]',
    servings REAL NOT NULL DEFAULT 2,
    yield_text TEXT,
    prep_time_minutes INTEGER,
    cook_time_minutes INTEGER,
    total_time_minutes INTEGER,
    tags JSON NOT NULL DEFAULT '[]',
    source JSON,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    actor_member_id TEXT,
    origin TEXT NOT NULL DEFAULT 'member'
);
CREATE INDEX IF NOT EXISTS idx_recipes_group ON recipes(group_id);

CREATE VIRTUAL TABLE IF NOT EXISTS recipes_fts USING fts5(
    id UNINDEXED,
    group_id UNINDEXED,
    language UNINDEXED,
    title,
    description,
    ingredients,
    tags,
    tokenize='trigram'
);

CREATE TABLE IF NOT EXISTS schedule_entries (
    id TEXT PRIMARY KEY,
    revision INTEGER NOT NULL DEFAULT 1,
    date TEXT NOT NULL,
    meal_type TEXT NOT NULL,
    entry_type TEXT NOT NULL DEFAULT 'recipe',
    recipe_id TEXT REFERENCES recipes(id) ON DELETE SET NULL,
    title TEXT,
    note TEXT,
    servings_override REAL,
    position INTEGER NOT NULL DEFAULT 0,
    assigned_cook_id TEXT REFERENCES household_members(id) ON DELETE SET NULL,
    participant_member_ids JSON NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    actor_member_id TEXT,
    origin TEXT NOT NULL DEFAULT 'member'
);
CREATE INDEX IF NOT EXISTS idx_schedule_date ON schedule_entries(date);

CREATE TABLE IF NOT EXISTS cook_journal (
    id TEXT PRIMARY KEY,
    revision INTEGER NOT NULL DEFAULT 1,
    date TEXT NOT NULL,
    meal_type TEXT NOT NULL,
    recipe_id TEXT REFERENCES recipes(id) ON DELETE SET NULL,
    schedule_entry_id TEXT UNIQUE REFERENCES schedule_entries(id) ON DELETE SET NULL,
    title TEXT,
    status TEXT NOT NULL,
    servings_cooked REAL,
    servings_left REAL,
    cooked_by_member_id TEXT REFERENCES household_members(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    actor_member_id TEXT,
    origin TEXT NOT NULL DEFAULT 'member'
);
CREATE INDEX IF NOT EXISTS idx_journal_date ON cook_journal(date);

CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    sub_id TEXT,
    slot TEXT NOT NULL DEFAULT 'primary',
    filename TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_assets_entity ON assets(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS entity_attributes (
    plugin_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value_numeric REAL,
    value_text TEXT,
    value_json JSON,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (plugin_id, entity_type, entity_id, key)
);
CREATE INDEX IF NOT EXISTS idx_attrs_query ON entity_attributes(plugin_id, entity_type, key, value_numeric);
CREATE INDEX IF NOT EXISTS idx_attrs_entity ON entity_attributes(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS events (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    revision INTEGER,
    actor_member_id TEXT,
    origin TEXT NOT NULL,
    cause_seq INTEGER,
    depth INTEGER NOT NULL DEFAULT 0,
    data JSON NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS event_cursors (
    plugin_id TEXT PRIMARY KEY,
    last_seq INTEGER NOT NULL DEFAULT 0,
    failing_seq INTEGER,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT
);

CREATE TABLE IF NOT EXISTS plugins (
    id TEXT PRIMARY KEY,
    version TEXT NOT NULL,
    schema_applied INTEGER NOT NULL DEFAULT 0,
    enabled INTEGER NOT NULL DEFAULT 1,
    config JSON NOT NULL DEFAULT '{}',
    state TEXT NOT NULL,
    last_error TEXT,
    installed_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    plugin_id TEXT NOT NULL,
    job_type TEXT NOT NULL,
    status TEXT NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0,
    message TEXT,
    input JSON NOT NULL DEFAULT '{}',
    result JSON,
    error TEXT,
    created_at TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

CREATE TABLE IF NOT EXISTS api_tokens (
    id TEXT PRIMARY KEY,
    plugin_id TEXT NOT NULL,
    scope TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    label TEXT,
    created_at TEXT NOT NULL,
    last_used_at TEXT
);
