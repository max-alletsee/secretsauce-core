CREATE TABLE IF NOT EXISTS plugin_recurring_rules (
    id TEXT PRIMARY KEY,
    weekday INTEGER NOT NULL,
    meal_type TEXT NOT NULL,
    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_recurring_rules_weekday ON plugin_recurring_rules(weekday);
