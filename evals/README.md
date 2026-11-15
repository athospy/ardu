# Ardu evals

An offline harness that answers one question: **did a prompt (or model) change make the quotes
better, by more than the noise?**

```
cases.jsonl ──▶ backend/bin/generate.js ──▶ results/runs/*.jsonl ──▶ judge(s) ──▶ REPORT.md
 20 motivations    production code path       quote + gate stats      scores        means, CIs,
 (10 en, 10 es)    (prompt + 2 gates)         per case × repeat       per judge     paired diffs
```

## Method

- **Same code as production.** Quotes come from `backend/bin/generate.js`, which calls the app's
  `generateQuoteMultiStep()`: same prompt templates, sampling options and similarity gates. The
  harness never copies the prompt into Python.
- **Prompt versions are files** (`backend/src/prompts/quote/v0-baseline.js`, `v1-current.js`), so
  "before" and "after" can be rerun at any time.
- **Repeats.** Each of the 20 motivations is generated 3 times (temperature 0.8). A case's score is
  the mean of its repeats.
- **Rubric.** 1–3 on relevance, originality, inspiration and clarity: the same rubric text used
  during the original tuning ([`ardu_evals/judge.py`](ardu_evals/judge.py)).
- **Judges.** `llama3` 8B through Ollama (local, free) and Claude (`claude-opus-5-5`, low effort,
  strict JSON schema). The generator and the judge are always different models.
- **Uncertainty.** 95% bootstrap confidence intervals over the 20 cases; before/after differences
  are paired by case. With 20 cases the intervals are wide on purpose: a change whose interval
  crosses zero is not a demonstrated improvement.
- **Judge vs. human.** 30 quotes scored blind by a person (`ardu-eval sheet` / `calibrate`):
  exact agreement, within-one agreement and quadratic-weighted Cohen's kappa per dimension.

## Run it

```bash
uv sync --extra claude          # --extra claude only if you want the Claude judge
uv run pytest -q                # harness unit tests, no model needed
./scripts/run-all.sh            # every published number with the local judge
```

Single steps:

```bash
uv run ardu-eval generate --prompt v1 --model qwen2.5:1.5b --repeats 3
uv run ardu-eval judge results/runs/*.jsonl --judge ollama:llama3:latest
ANTHROPIC_API_KEY=... uv run ardu-eval judge results/runs/*.jsonl --judge claude:claude-opus-5-5
uv run ardu-eval report results/runs/*.jsonl
```

Judging is resumable: rows that already have a judge's score are skipped.

## Results

See [results/REPORT.md](results/REPORT.md) (generated) and the summary in the
[main README](../README.md#evals-what-prompt-tuning-fixed-and-what-it-didnt).

## History

`backend/scripts/gradePrompt.js` (May 2026) was the first version: 8 cases, one run, llama3 judge.
It reported relevance 1.6 → 2.3. It set the generator model through an environment variable
*after* the generator module had already read it, so it most likely generated with the model in
`.env` (llama3 8B) rather than `qwen2.5:1.5b`, with llama3 also judging its own output. This
harness replaces it and passes the model explicitly.
