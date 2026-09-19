CREATE TABLE IF NOT EXISTS plugin_core_translator_history (
    id TEXT PRIMARY KEY,
    recipe_id TEXT NOT NULL,
    group_id TEXT NOT NULL,
    source_lang TEXT NOT NULL,
    target_lang TEXT NOT NULL,
    status TEXT NOT NULL,
    translated_recipe_id TEXT,
    error_message TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_core_translator_history_recipe ON plugin_core_translator_history(recipe_id);
