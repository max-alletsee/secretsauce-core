CREATE TABLE plugin_core_recurring_materialized (
    rule_id TEXT NOT NULL,
    date TEXT NOT NULL,
    entry_id TEXT NOT NULL,
    PRIMARY KEY (rule_id, date)
);
