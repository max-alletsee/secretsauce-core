CREATE TABLE IF NOT EXISTS plugin_core_ai_provider_usage (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    calling_plugin TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    call_type TEXT NOT NULL,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    estimated_cost_usd REAL DEFAULT 0.0
);

CREATE INDEX IF NOT EXISTS idx_core_ai_provider_usage_timestamp ON plugin_core_ai_provider_usage(timestamp);
CREATE INDEX IF NOT EXISTS idx_core_ai_provider_usage_plugin ON plugin_core_ai_provider_usage(calling_plugin);
