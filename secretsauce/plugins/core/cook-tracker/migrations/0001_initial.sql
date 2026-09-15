CREATE TABLE plugin_cook_tracker_leftovers (
    schedule_entry_id TEXT PRIMARY KEY REFERENCES schedule_entries(id) ON DELETE CASCADE,
    journal_id TEXT REFERENCES cook_journal(id) ON DELETE CASCADE
);

CREATE TABLE plugin_cook_tracker_carryovers (
    journal_id TEXT PRIMARY KEY REFERENCES cook_journal(id) ON DELETE CASCADE,
    servings_left REAL NOT NULL DEFAULT 1,
    resolved_by_entry_id TEXT REFERENCES schedule_entries(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);
