CREATE TABLE plugin_core_ratings_scores (
    timeline_entry_id TEXT NOT NULL REFERENCES timeline_entries(id) ON DELETE CASCADE,
    member_id TEXT NOT NULL REFERENCES household_members(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score IN (-1, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    PRIMARY KEY (timeline_entry_id, member_id)
);
