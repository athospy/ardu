# Ardu backend

Express API for the Ardu app: JWT auth, the quote library, favorites, reflections and streaks, plus
two scheduled jobs that generate personalized quotes with Ollama (`qwen2.5:1.5b`) and send push
notifications. The [main README](../README.md) explains the generation pipeline and the evals;
[docs/deploy.md](../docs/deploy.md) covers running it on a server.

## Run it

```bash
cp .env.example .env
npm install
npm run dev:docker      # Postgres in Docker, then migrations, then the API on :3000 with nodemon
npm run seed            # the curated quote library (English and Spanish)
ollama pull qwen2.5:1.5b
npx jest                # unit tests; Ollama is mocked
```

Without Docker: point `DATABASE_URL` (or the `DB_*` variables) at your own Postgres, then
`npm run migrate`, `npm run seed` and `npm run dev`. `npm run migrate` records each migration in a
`migrations` table, so it is safe to run again.

## API

All routes are under `/api`. 🔒 = needs `Authorization: Bearer <access token>`.

| Area | Routes |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, 🔒 `POST /auth/logout` |
| Profile | 🔒 `GET /users/profile`, 🔒 `PUT /users/profile`, 🔒 `PUT /users/motivation`, 🔒 `PUT /users/push-token` |
| Streaks | 🔒 `GET /users/streak`, 🔒 `POST /users/streak/checkin` |
| Quotes | `GET /quotes/random`, `GET /quotes/search`, 🔒 `GET /quotes/favorites`, 🔒 `POST /quotes/:id/favorite`, 🔒 `POST /quotes/initialize`, 🔒 `POST /quotes`, 🔒 `DELETE /quotes/:id` |
| Reflections | 🔒 `GET /reflections`, 🔒 `GET /reflections/count`, 🔒 `POST /reflections`, 🔒 `DELETE /reflections/:id` |

`GET /health` (outside `/api`) reports that the server is up. The `ai` and `notifications` route
files aren't mounted: AI quotes and push notifications run only as scheduled jobs.

## Layout

```
src/
  app.js            Express setup, routes, starts the two jobs
  config/           database pool, Ollama client and the quote generator (ollama.js)
  prompts/quote/    versioned prompt templates (v0, v1)
  jobs/             node-cron schedules: AI quotes, notifications
  controllers/  routes/  middleware/  services/  utils/
bin/generate.js     JSON Lines CLI around the generator (used by the evals)
scripts/            the AI quote job and small maintenance scripts
migrations/         SQL schema, run in order by migrations/run.js
seeds/              the curated quote library
tests/              Jest tests for the generator and its gates
```
