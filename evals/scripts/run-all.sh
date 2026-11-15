#!/usr/bin/env bash
# Reproduce every published result (local Ollama, free). Takes ~1 hour on an M-series Mac.
# Needs: ollama pull qwen2.5:1.5b qwen2.5:3b gemma3:4b llama3
set -euo pipefail
cd "$(dirname "$0")/.."

run() {  # prompt model
  uv run ardu-eval generate --prompt "$1" --model "$2" --repeats 3
}

run v0 qwen2.5:1.5b     # before: Dec 2025 prompt on the production model
run v1 qwen2.5:1.5b     # after: current prompt on the production model
run v1 qwen2.5:3b       # same prompt, 2x bigger model
run v1 gemma3:4b        # same prompt, different 4B model

uv run ardu-eval judge results/runs/*.jsonl --judge ollama:llama3:latest
# Optional second judge (needs ANTHROPIC_API_KEY and `uv sync --extra claude`):
#   uv run ardu-eval judge results/runs/*.jsonl --judge claude:claude-opus-5-5
uv run ardu-eval report results/runs/*.jsonl
