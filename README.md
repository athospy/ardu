# Ardu

**A motivational-quotes app whose AI runs on a 1.5B-parameter model on a 2 GB VPS — and the evals that show what prompt tuning can and can't fix at that size.**

Ardu (iOS and Android, English and Spanish) asks people what they're working toward and writes
short quotes about it. The quotes come from `qwen2.5:1.5b` running under Ollama on the same small
server as the API: no hosted LLM, no per-token bill. This repo has the full app, the backend, the
eval harness used to tune the prompt, and an MCP server so Claude can use the generator directly.

- **App:** in beta on iOS and Android ([Android beta on Google Play](https://play.google.com/apps/testing/dev.santiagomorel.ardu)). More at [santiagomorel.dev](https://santiagomorel.dev).
- **Evals:** [results and method](#evals-what-prompt-tuning-fixed-and-what-it-didnt) · [full report](evals/results/REPORT.md)
- **MCP:** [connect it to Claude](#mcp-server-use-the-generator-from-claude)

## How it works

```mermaid
flowchart LR
    subgraph Phone
        A[Expo / React Native app]
    end
    subgraph VPS["2 GB VPS"]
        B[Express API<br/>JWT auth, rate limits]
        C[(Postgres<br/>users, quotes, reflections)]
        D[Quote job<br/>node-cron]
        E[Ollama<br/>qwen2.5:1.5b]
    end
    A -- REST --> B
    B --> C
    D -- "pending AI quotes" --> C
    D -- "prompt v1 (streaming)" --> E
    E -- draft --> G{Gates}
    G -- "echoes the motivation /<br/>repeats an old quote" --> E
    G -- accepted --> C
    B -- Expo push --> A
```

**Generation path** ([`backend/src/config/ollama.js`](backend/src/config/ollama.js)):

1. Build the prompt from a versioned template ([`backend/src/prompts/quote/`](backend/src/prompts/quote/)).
2. Stream the completion from Ollama. Streaming keeps the HTTP connection alive on a slow CPU box.
3. Run two cheap gates on the draft. A failed draft is regenerated (up to 2 drafts in total):
   - **Overlap gate:** share of the draft's words that also appear in the motivation. Above 30%, the model just echoed the input.
   - **Similarity gate:** shared words divided by the larger quote's word count, compared against the person's recent quotes. Above 75%, it's a repeat.
4. Strip wrapping quotes and save the result.

## Evals: what prompt tuning fixed, and what it didn't

Every configuration generated 60 quotes (20 motivations, 10 English and 10 Spanish, × 3 runs) through
the production code path ([`backend/bin/generate.js`](backend/bin/generate.js)). Two LLM judges scored
each quote 1–3 on relevance, originality, inspiration and clarity: a local `llama3` 8B and Claude
(`claude-opus-5-5`). Then a human scored 30 of the quotes blind, to check the judges.
Method and commands: [`evals/`](evals/). Every number: [`evals/results/REPORT.md`](evals/results/REPORT.md).

**Claude judge, mean of 60 quotes per row** (1–3 per dimension, total out of 12). The last column
needs no judge: it counts final quotes that still contain a cliché from the prompt's ban list.

| Generator | relevance | originality | inspiration | clarity | total | banned cliché in final quote |
|---|---|---|---|---|---|---|
| prompt v0 · qwen2.5:1.5b | 2.25 | 1.15 | 1.47 | 1.60 | 6.5 | 3% |
| prompt v1 · qwen2.5:1.5b (production) | 2.65 | 1.17 | 1.48 | 1.93 | 7.2 | 20% |
| prompt v1 + gate 3 · qwen2.5:1.5b | 2.58 | 1.15 | 1.40 | 1.78 | 6.9 | 12% |
| prompt v1 · qwen2.5:3b | 2.75 | 1.28 | 1.52 | 1.82 | 7.4 | 2% |
| prompt v1 · gemma3:4b | **2.93** | **1.47** | **1.97** | **2.27** | **8.6** | 0% |

What this shows:

1. **The tuned prompt reads clearer. Its relevance gain is unconfirmed.** Paired by motivation, Claude
   sees v0 → v1 clarity +0.33 (95% CI +0.10 to +0.57) and relevance +0.40 (+0.20 to +0.60). The blind
   human scores back the clarity gain (+0.67 on the sampled quotes) but not the relevance gain (+0.06).
2. **At 1.5B, naming the clichés to avoid makes the model use them.** v1 added a ban list ("Empower",
   "Embrace", "one step at a time"…), and banned clichés in final quotes went from 3% to 20%. The same
   prompt on 3B and 4B models: 2% and 0%.
3. **A regex filter (gate 3) treats the symptom, not the quality.** Rejecting drafts with a banned
   cliché cut them to 12% (only 2 drafts are allowed), Claude scored the quotes no better, and every
   rejection costs another full generation. It stays off.
4. **Model size beats prompt work here.** No prompt moved originality or inspiration at 1.5B;
   `gemma3:4b` is the only model that did. It needs more than 3 GB of RAM, so it doesn't fit the current
   2 GB server: that is the next decision, not another prompt.
5. **The prompt fights its own gate.** v1 asks for a concrete reference to the motivation, and the
   overlap gate rejects drafts that reuse too many of its words: 43% of v1 quotes needed a retry (12% for v0).

**How far to trust the judges.** The 8B judge gave every quote the lowest originality and inspiration
score, so it can't tell configurations apart. Claude agrees with the human scorer more often than
llama3 on every dimension, but still only slightly: quadratic-weighted kappa 0.06–0.20, within one
point 83–93% of the time, and it is much stricter on originality and inspiration. Read the table as
direction, not as calibrated quality. 30 human-scored quotes from one person is a small check.

An earlier grader (May 2026) reported a large relevance gain. It set the generator model after the
code had already read it, so it most likely tested the wrong model; [`evals/README.md`](evals/README.md)
has the details. This harness passes the model explicitly and replaces it.

## MCP server: use the generator from Claude

[`mcp/`](mcp/) exposes four tools:

| Tool | What it does |
|---|---|
| `generate_quote(motivation, language)` | Runs the production generator (same prompt, model and gates) and returns the quote, drafts used and timing. Saves nothing. |
| `search_quotes(query, language?, limit?)` | Searches the curated quote library by text, author or category. |
| `random_quote(language?, category?)` | One random quote from the library. |
| `get_stats()` | Library size, demo generation stats (volume, latency, gate retries) and the latest eval scores. |

It only reads the curated library; real users' quotes and reflections aren't reachable. The
generation log stores numbers only (latency, drafts, gate rejections), never what was typed.

**Local (Claude Code or Claude Desktop, stdio):** needs Postgres with the library loaded and Ollama
running (see [Run it locally](#run-it-locally)).

```bash
claude mcp add ardu -e DATABASE_URL=postgresql://ardu_user:ardu_password@localhost:5432/quotes_app \
  -- node /path/to/ardu/mcp/src/stdio.js
```

For Claude Desktop, add the same command to `claude_desktop_config.json` under `mcpServers`.

**Remote (Streamable HTTP + bearer token):** [`deploy/`](deploy/) runs the server behind Caddy with
HTTPS. A hosted demo runs at `https://mcp.ardu.santiagomorel.dev/mcp` (token-protected).

```bash
# Claude Code
claude mcp add --transport http ardu https://<your-domain>/mcp \
  --header "Authorization: Bearer <MCP_TOKEN>"
```

In claude.ai: **Customize → Connectors → Add custom connector**. Set the URL to
`https://<your-domain>/mcp` and Authentication to *No sign-in*. Then add a request header
`authorization` with the value `Bearer <MCP_TOKEN>`.

## Run it locally

Requirements: Node 20+, Docker, [Ollama](https://ollama.com), and [uv](https://docs.astral.sh/uv/) for the evals.

```bash
ollama pull qwen2.5:1.5b            # the production model
ollama pull llama3                  # the eval judge (8B)

# Backend: Postgres in Docker, API on :3000
cd backend
cp .env.example .env
npm install
npm run dev:docker                  # starts Postgres, runs migrations, starts the API
npm run seed                        # loads the curated quote library
npx jest                            # unit tests (no model needed)

# Generate one quote with the production code path
echo '{"id":"1","motivation":"learning to code","language":"en"}' | node bin/generate.js

# Evals
cd ../evals
uv run pytest -q                    # harness unit tests
./scripts/run-all.sh                # every published number (~1 hour on an M-series Mac)

# MCP server tests
cd ../mcp && npm install && npm test

# App (needs Xcode or Android Studio)
cd ../app && npm install && cp .env.example .env && npx expo run:ios
```

## Repository layout

```
app/        React Native (Expo) client
backend/    Express API, Postgres migrations, quote generator, cron jobs
evals/      Python eval harness, test cases, results
mcp/        MCP server (stdio + Streamable HTTP)
deploy/     Docker Compose stack for the hosted MCP demo
```

## License

Code: [MIT](LICENSE). The Ardu name, logo, app icon and screenshots are not covered by the
license; all rights reserved.
