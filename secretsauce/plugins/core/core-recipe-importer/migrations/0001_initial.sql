CREATE TABLE IF NOT EXISTS plugin_core_recipe_importer_history (
    id TEXT PRIMARY KEY,
    source_type TEXT NOT NULL,
    source_url TEXT,
    title TEXT,
    status TEXT NOT NULL,
    recipe_id TEXT,
    error_message TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_core_recipe_importer_history_date ON plugin_core_recipe_importer_history(created_at);
