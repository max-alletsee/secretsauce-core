CREATE TABLE plugin_shortlist_entries (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL,
    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    note TEXT,
    created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_plugin_shortlist_member_recipe ON plugin_shortlist_entries(member_id, recipe_id);
