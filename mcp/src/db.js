// Database access for the MCP server. Every query reads the public quote
// library only (is_default = true) — never user quotes, AI quotes made for a
// user, or reflections — and uses parameters, never string interpolation.

import pg from 'pg';

export function createDb(connectionString = process.env.DATABASE_URL) {
  const pool = new pg.Pool({ connectionString, max: 3 });

  return {
    async searchQuotes({ query, language, limit }) {
      // Escape LIKE wildcards so "%" or "_" in the query match literally.
      const pattern = `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      const { rows } = await pool.query(
        `SELECT text, author, category, language
           FROM quotes
          WHERE is_default = true
            AND (text ILIKE $1 OR author ILIKE $1 OR category ILIKE $1)
            AND ($2::text IS NULL OR language = $2)
          ORDER BY id
          LIMIT $3`,
        [pattern, language ?? null, limit],
      );
      return rows;
    },

    async randomQuote({ language, category }) {
      const { rows } = await pool.query(
        `SELECT text, author, category, language
           FROM quotes
          WHERE is_default = true
            AND ($1::text IS NULL OR language = $1)
            AND ($2::text IS NULL OR category ILIKE $2)
          ORDER BY random()
          LIMIT 1`,
        [language ?? null, category ?? null],
      );
      return rows[0] ?? null;
    },

    async libraryCounts() {
      const { rows } = await pool.query(
        `SELECT language, category, COUNT(*)::int AS count
           FROM quotes
          WHERE is_default = true
          GROUP BY language, category
          ORDER BY language, count DESC, category`,
      );
      return rows;
    },

    async logGeneration(entry) {
      await pool.query(
        `INSERT INTO generation_log
           (model, prompt_version, language, ok, duration_ms, attempts, overlap_rejections, similarity_rejections)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [entry.model, entry.promptVersion, entry.language, entry.ok, entry.durationMs ?? null,
          entry.attempts ?? null, entry.overlapRejections ?? null, entry.similarityRejections ?? null],
      );
    },

    async generationStats() {
      const { rows } = await pool.query(
        `SELECT model,
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int AS last_7_days,
                COUNT(*) FILTER (WHERE NOT ok)::int AS failed,
                ROUND(AVG(duration_ms) FILTER (WHERE ok))::int AS avg_duration_ms,
                ROUND(AVG(attempts) FILTER (WHERE ok), 2)::float AS avg_drafts,
                COUNT(*) FILTER (WHERE overlap_rejections > 0)::int AS overlap_gate_retries,
                COUNT(*) FILTER (WHERE similarity_rejections > 0)::int AS similarity_gate_retries
           FROM generation_log
          GROUP BY model
          ORDER BY total DESC`,
      );
      return rows;
    },

    close: () => pool.end(),
  };
}
