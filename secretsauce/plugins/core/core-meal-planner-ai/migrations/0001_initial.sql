CREATE TABLE IF NOT EXISTS plugin_core_meal_planner_plans (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    prompt TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plugin_core_meal_planner_suggestions (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    recipe_id TEXT NOT NULL,
    recipe_title TEXT NOT NULL,
    meal_type TEXT NOT NULL,
    suggested_date TEXT,
    reasoning TEXT,
    confidence REAL,
    status TEXT NOT NULL DEFAULT 'suggested',
    timeline_entry_id TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_core_meal_planner_suggestions_plan ON plugin_core_meal_planner_suggestions(plan_id);
