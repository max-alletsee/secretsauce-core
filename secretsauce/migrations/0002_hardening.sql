-- 0002_hardening.sql: session revocation and token lookup integrity

-- Session ids revoked by logout; rows expire with the cookie they revoke.
CREATE TABLE IF NOT EXISTS revoked_sessions (
    session_id TEXT PRIMARY KEY,
    expires_at TEXT NOT NULL
);

-- Tokens are looked up by hash on every token request; a hash names one token.
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_tokens_hash ON api_tokens(token_hash);

-- The runner scans pending jobs in creation order.
CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs(status, created_at);
