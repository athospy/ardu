#!/bin/sh
# Runs once, when the Postgres volume is first created: schema, the public
# quote library, and the MCP demo's stats table. No user data is ever loaded.
set -e
for f in /ardu/migrations/*.sql /ardu/seeds/default_quotes.sql /ardu/mcp-sql/*.sql; do
  echo "ardu init: $f"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -q -f "$f"
done
