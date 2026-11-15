# Eval report

Generated 2026-11-15 21:41 UTC by `ardu-eval report`.
Scores are 1–3 per dimension (mean over cases; each case = mean of its repeats).
Brackets = 95% bootstrap confidence interval over cases.

## Judge: `claude:claude-opus-5-5`

| Run | relevance | originality | inspiration | clarity | total /12 | quotes |
|---|---|---|---|---|---|---|
| v0 · qwen2.5:1.5b | 2.25 [2.10–2.40] | 1.15 [1.05–1.27] | 1.47 [1.33–1.60] | 1.60 [1.43–1.77] | 6.5 | 60 |
| v1+gate3 · qwen2.5:1.5b | 2.58 [2.40–2.77] | 1.15 [1.05–1.27] | 1.40 [1.23–1.58] | 1.78 [1.63–1.95] | 6.9 | 60 |
| v1 · gemma3:4b | 2.93 [2.85–3.00] | 1.47 [1.27–1.67] | 1.97 [1.92–2.00] | 2.27 [2.12–2.42] | 8.6 | 60 |
| v1 · qwen2.5:1.5b | 2.65 [2.50–2.80] | 1.17 [1.05–1.28] | 1.48 [1.32–1.65] | 1.93 [1.78–2.10] | 7.2 | 60 |
| v1 · qwen2.5:3b | 2.75 [2.63–2.87] | 1.28 [1.18–1.40] | 1.52 [1.37–1.67] | 1.82 [1.60–2.05] | 7.4 | 60 |

**v0 → v1+gate3 on qwen2.5:1.5b** (paired by case):

| Dimension | change | 95% CI |
|---|---|---|
| relevance | +0.33 | +0.08 to +0.58 |
| originality | +0.00 | -0.15 to +0.15 |
| inspiration | -0.07 | -0.23 to +0.08 |
| clarity | +0.18 | +0.02 to +0.35 |

**v0 → v1 on qwen2.5:1.5b** (paired by case):

| Dimension | change | 95% CI |
|---|---|---|
| relevance | +0.40 | +0.20 to +0.60 |
| originality | +0.02 | -0.13 to +0.17 |
| inspiration | +0.02 | -0.13 to +0.18 |
| clarity | +0.33 | +0.10 to +0.57 |

**v1 → v1+gate3 on qwen2.5:1.5b** (paired by case):

| Dimension | change | 95% CI |
|---|---|---|
| relevance | -0.07 | -0.23 to +0.08 |
| originality | -0.02 | -0.08 to +0.05 |
| inspiration | -0.08 | -0.22 to +0.03 |
| clarity | -0.15 | -0.33 to +0.02 |

## Judge: `ollama:llama3:latest`

| Run | relevance | originality | inspiration | clarity | total /12 | quotes |
|---|---|---|---|---|---|---|
| v0 · qwen2.5:1.5b | 1.54 [1.35–1.74] | 1.00 [1.00–1.00] | 1.02 [1.00–1.05] | 1.51 [1.33–1.68] | 5.0 | 57 |
| v1+gate3 · qwen2.5:1.5b | 1.58 [1.37–1.82] | 1.00 [1.00–1.00] | 1.05 [1.00–1.10] | 1.50 [1.32–1.68] | 5.1 | 60 |
| v1 · gemma3:4b | 1.70 [1.52–1.88] | 1.00 [1.00–1.00] | 1.00 [1.00–1.00] | 1.65 [1.48–1.82] | 5.3 | 60 |
| v1 · qwen2.5:1.5b | 1.45 [1.27–1.63] | 1.00 [1.00–1.00] | 1.00 [1.00–1.00] | 1.42 [1.27–1.58] | 4.9 | 60 |
| v1 · qwen2.5:3b | 1.38 [1.23–1.52] | 1.00 [1.00–1.00] | 1.00 [1.00–1.00] | 1.38 [1.23–1.52] | 4.8 | 56 |

**v0 → v1+gate3 on qwen2.5:1.5b** (paired by case):

| Dimension | change | 95% CI |
|---|---|---|
| relevance | +0.04 | -0.11 to +0.18 |
| originality | +0.00 | +0.00 to +0.00 |
| inspiration | +0.03 | +0.00 to +0.08 |
| clarity | -0.01 | -0.12 to +0.10 |

**v0 → v1 on qwen2.5:1.5b** (paired by case):

| Dimension | change | 95% CI |
|---|---|---|
| relevance | -0.09 | -0.27 to +0.07 |
| originality | +0.00 | +0.00 to +0.00 |
| inspiration | -0.02 | -0.05 to +0.00 |
| clarity | -0.09 | -0.23 to +0.05 |

**v1 → v1+gate3 on qwen2.5:1.5b** (paired by case):

| Dimension | change | 95% CI |
|---|---|---|
| relevance | +0.13 | +0.02 to +0.27 |
| originality | +0.00 | +0.00 to +0.00 |
| inspiration | +0.05 | +0.00 to +0.10 |
| clarity | +0.08 | -0.02 to +0.18 |

## Generator behavior

| Run | quotes | avg drafts | overlap-gate rejections | template-gate rejections | final quotes with a banned cliché | avg time (s) |
|---|---|---|---|---|---|---|
| v0 · qwen2.5:1.5b | 60 | 1.12 | 7 (12%) | 0 (0%) | 2 (3%) | 0.8 |
| v1+gate3 · qwen2.5:1.5b | 60 | 1.47 | 18 (30%) | 10 (17%) | 7 (12%) | 1.6 |
| v1 · gemma3:4b | 60 | 1.12 | 7 (12%) | 0 (0%) | 0 (0%) | 1.3 |
| v1 · qwen2.5:1.5b | 60 | 1.43 | 26 (43%) | 0 (0%) | 12 (20%) | 0.3 |
| v1 · qwen2.5:3b | 60 | 1.32 | 19 (32%) | 0 (0%) | 1 (2%) | 0.8 |

Times come from a laptop that was also running the judge, so compare them loosely.
