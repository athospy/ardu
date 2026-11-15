-- Demo-only table: one row per generate_quote call, numbers only.
-- The user's motivation and the generated text are never stored here.
CREATE TABLE IF NOT EXISTS generation_log (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    model VARCHAR(100) NOT NULL,
    prompt_version VARCHAR(20) NOT NULL,
    language VARCHAR(10) NOT NULL,
    ok BOOLEAN NOT NULL,
    duration_ms INT,
    attempts INT,
    overlap_rejections INT,
    similarity_rejections INT
);

CREATE INDEX IF NOT EXISTS idx_generation_log_created_at ON generation_log(created_at);
