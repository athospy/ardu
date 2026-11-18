#!/usr/bin/env bash
# Re-run every experiment behind the published results. Generation samples at
# temperature 0.8, so a re-run gives new quotes and slightly different numbers.
# Takes ~1 hour on an M-series Mac. Needs:
#   ollama pull qwen2.5:1.5b qwen2.5:3b gemma3:4b llama3
# Optional: ANTHROPIC_API_KEY (and `uv sync --extra claude`) for the Claude judge,
# which the README's main table uses (~$1.50 for all 300 quotes).
set -euo pipefail
cd "$(dirname "$0")/.."

run() {  # prompt model [extra args]
  uv run ardu-eval generate --prompt "$1" --model "$2" --repeats 3 "${@:3}"
}

run v0 qwen2.5:1.5b                    # before: Dec 2025 prompt on the production model
run v1 qwen2.5:1.5b                    # after: current prompt on the production model
run v1 qwen2.5:1.5b --template-gate    # current prompt + gate 3 (cliché filter)
run v1 qwen2.5:3b                      # same prompt, 2x bigger model
run v1 gemma3:4b                       # same prompt, different 4B model

uv run ardu-eval judge results/runs/*.jsonl --judge ollama:llama3:latest
if [[ -n "${ANTHROPIC_API_KEY:-}" ]]; then
  uv run ardu-eval judge results/runs/*.jsonl --judge claude:claude-opus-5-5
else
  echo "ANTHROPIC_API_KEY not set: skipping the Claude judge."
fi

# Human calibration needs a person: `ardu-eval sheet` makes a blind sheet,
# then `ardu-eval calibrate results/human/sheet.csv` compares it with the judges.
uv run ardu-eval report results/runs/*.jsonl
