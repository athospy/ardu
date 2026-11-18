# Deploying Ardu

There are two separate deployments:

1. **The backend** that the mobile app talks to: API, quote job, Postgres and Ollama on one small server.
2. **The MCP demo**: a self-contained Docker stack in [`deploy/`](../deploy/) that serves the
   generator to Claude. It holds no user data and doesn't need the backend.

Neither needs a GPU. Both use `qwen2.5:1.5b`, which takes about 1.2 GB of RAM in Ollama.

## 1. Backend

Production runs on a single 2 GB VPS: Postgres, Ollama and the Node API, with a reverse proxy in front for HTTPS.

```bash
# Ollama, with the production model
curl -fsSL https://ollama.com/install.sh | sh
ollama pull qwen2.5:1.5b

# Postgres 15+: create a database and a user, then put them in DATABASE_URL

# The API
cd backend
cp .env.example .env        # then set the values below
npm ci --omit=dev
npm run migrate             # schema
npm run seed                # the curated quote library
npx pm2 start ecosystem.config.js
```

Values to set in `backend/.env`:

| Variable | Notes |
|---|---|
| `DATABASE_URL` (or `DB_*`) | Your Postgres connection. |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Long random strings, different from each other (`openssl rand -hex 32`). |
| `OLLAMA_HOST`, `OLLAMA_MODEL` | Usually `http://localhost:11434` and `qwen2.5:1.5b`. |
| `ALLOWED_ORIGINS` | Only matters for browsers; the mobile app doesn't send an Origin. |
| `NODE_ENV` | `production` (PM2 sets it). |

Things that matter on a small server:

- **Run one instance.** The AI quote job and the notification job are `node-cron` schedules inside the
  API process ([`src/jobs/`](../backend/src/jobs/)). Two instances would run each job twice.
  `ecosystem.config.js` already uses one instance in fork mode.
- **Keep Ollama to one request at a time** (`OLLAMA_NUM_PARALLEL=1`). On a 2 GB machine, add a swap
  file as a safety net.
- **Generation streams** (`stream: true`) from Ollama, so a slow generation on a busy CPU doesn't hit
  the HTTP client's timeout. Generation runs in the quote job, not inside app requests.
- **HTTPS:** put Caddy or nginx in front of port 3000, then set `API_BASE_URL` in `app/.env` to that URL.

Updating: pull the new code, `npm ci --omit=dev`, `npm run migrate`, then `npx pm2 restart ardu-backend`.

## 2. MCP demo

Everything runs in Docker: Caddy (automatic HTTPS), the MCP server, Ollama and a small Postgres
with only the public quote library. Only Caddy publishes ports (80 and 443).

```bash
# On a server with Docker, and a DNS A record for your domain pointing at it
cd deploy
cp .env.example .env
#   MCP_DOMAIN=mcp.example.com
#   MCP_TOKEN=$(openssl rand -hex 32)          # clients send this as a bearer token
#   POSTGRES_PASSWORD=$(openssl rand -hex 24)
docker compose up -d --build
docker compose exec ollama ollama pull qwen2.5:1.5b
curl https://mcp.example.com/health             # → {"ok":true}
```

The database init scripts ([`deploy/initdb/`](../deploy/initdb/)) run only when the Postgres volume
is first created: schema, the quote library and the `generation_log` table. The server refuses to
start with a `MCP_TOKEN` shorter than 32 characters, and it accepts requests only for `MCP_DOMAIN`
(DNS-rebinding protection).

On a 2-vCPU, 4 GB server (the hosted demo), the stack uses about 1.4 GB of RAM, and a generation takes
about 10 seconds. To connect a client, see [MCP server](../README.md#mcp-server-use-the-generator-from-claude).
