CREATE TABLE plugin_core_recurring_rules_new (
    id TEXT PRIMARY KEY,
    weekday INTEGER NOT NULL,
    meal_type TEXT NOT NULL,
    entry_type TEXT NOT NULL DEFAULT 'recipe',
    recipe_id TEXT REFERENCES recipes(id) ON DELETE CASCADE,
    title TEXT,
    servings REAL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

INSERT INTO plugin_core_recurring_rules_new (
    id, weekday, meal_type, entry_type, recipe_id, title, servings, created_at, updated_at
)
SELECT id, weekday, meal_type, 'recipe', recipe_id, NULL, NULL, created_at, created_at
FROM plugin_core_recurring_rules;

DROP TABLE plugin_core_recurring_rules;
ALTER TABLE plugin_core_recurring_rules_new RENAME TO plugin_core_recurring_rules;

CREATE INDEX IF NOT EXISTS idx_core_recurring_rules_weekday ON plugin_core_recurring_rules(weekday);

CREATE TABLE plugin_core_recurring_materialized_new (
    rule_id TEXT NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'approved',
    entry_id TEXT,
    PRIMARY KEY (rule_id, date)
);

INSERT INTO plugin_core_recurring_materialized_new (rule_id, date, status, entry_id)
SELECT rule_id, date, 'approved', entry_id
FROM plugin_core_recurring_materialized;

DROP TABLE plugin_core_recurring_materialized;
ALTER TABLE plugin_core_recurring_materialized_new RENAME TO plugin_core_recurring_materialized;
