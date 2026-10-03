CREATE TABLE plugin_core_timeline_day_slots (
    date TEXT NOT NULL,
    meal_type TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('extra', 'skip')),
    label TEXT,
    before TEXT,
    created_at TEXT NOT NULL,
    PRIMARY KEY (date, meal_type)
);
