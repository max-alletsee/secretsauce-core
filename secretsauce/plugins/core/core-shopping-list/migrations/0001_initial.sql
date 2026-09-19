CREATE TABLE IF NOT EXISTS plugin_core_shopping_list_staples (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    default_quantity REAL NOT NULL DEFAULT 1.0,
    unit TEXT,
    category TEXT NOT NULL DEFAULT 'Pantry',
    always_include INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plugin_core_shopping_list_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    quantity REAL,
    unit TEXT,
    category TEXT NOT NULL DEFAULT 'Other',
    checked INTEGER NOT NULL DEFAULT 0,
    source_type TEXT NOT NULL DEFAULT 'manual',
    source_ref TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plugin_core_shopping_list_checked_state (
    item_key TEXT PRIMARY KEY,
    checked INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
);
