CREATE TABLE plugin_ratings_scores (
    journal_id TEXT NOT NULL REFERENCES cook_journal(id) ON DELETE CASCADE,
    member_id TEXT NOT NULL REFERENCES household_members(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score IN (-1, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    PRIMARY KEY (journal_id, member_id)
);
