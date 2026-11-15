"""LLM-as-judge: score a quote 1-3 on four dimensions.

The rubric text is the one used for the original prompt tuning (May 2026), so
old and new numbers mean the same thing. Two judges share it:

- OllamaJudge  local model (default llama3 8B), free, parsed defensively
               because small models break JSON now and then.
- ClaudeJudge  Claude through the Anthropic API with a strict JSON schema
               (optional; needs the `claude` extra and an API key).
"""

import json
import re
import urllib.request

DIMENSIONS = ("relevance", "originality", "inspiration", "clarity")

RUBRIC = """You are a strict quality evaluator for motivational quotes. Be critical and differentiate scores — do not give 2 to everything.

MOTIVATION: "{motivation}"
LANGUAGE: {language}
QUOTE: "{quote}"

Score each dimension from 1 to 3:
- relevance: 1=no connection to motivation, 2=loosely related, 3=directly addresses motivation
- originality: 1=generic cliché ("one step at a time", "believe in yourself"), 2=somewhat fresh, 3=distinctive phrasing
- inspiration: 1=flat or empty, 2=mildly motivating, 3=genuinely energizing
- clarity: 1=confusing or awkward wording, 2=acceptable, 3=crisp and impactful

Return ONLY this JSON with no extra text:
{{"relevance":0,"originality":0,"inspiration":0,"clarity":0,"reason":"REPLACE WITH one critical sentence explaining the main strength or weakness"}}"""


def build_prompt(motivation: str, language: str, quote: str) -> str:
    return RUBRIC.format(motivation=motivation, language=language, quote=quote)


def parse_scores(raw: str) -> dict:
    """Extract scores from a judge reply.

    Returns {"relevance": int, ..., "reason": str} or {"error": "..."}.
    Handles code fences, text around the JSON, and (as a fallback) broken
    JSON where only the "key": digit pairs are readable.
    """
    text = re.sub(r"```(?:json)?", "", raw).strip()

    # First complete {...} object, tracking nesting depth.
    depth, start, candidate = 0, -1, None
    for i, char in enumerate(text):
        if char == "{":
            if start == -1:
                start = i
            depth += 1
        elif char == "}" and start != -1:
            depth -= 1
            if depth == 0:
                candidate = text[start:i + 1]
                break

    parsed = None
    if candidate:
        try:
            parsed = json.loads(candidate)
        except json.JSONDecodeError:
            parsed = None

    if parsed is None:
        # Fallback: pull the digits straight out of the raw text.
        parsed = {}
        for dim in DIMENSIONS:
            match = re.search(rf'"{dim}"\s*:\s*(\d)', text)
            if match:
                parsed[dim] = int(match.group(1))
        reason = re.search(r'"reason"\s*:\s*"([^"]*)', text)
        parsed["reason"] = reason.group(1) if reason else ""

    scores = {}
    for dim in DIMENSIONS:
        value = parsed.get(dim)
        if not isinstance(value, int) or not 1 <= value <= 3:
            return {"error": f"missing or out-of-range {dim!r} in: {raw[:120]!r}"}
        scores[dim] = value
    scores["reason"] = str(parsed.get("reason", ""))
    return scores


class OllamaJudge:
    def __init__(self, model: str = "llama3:latest", host: str = "http://localhost:11434"):
        self.name = f"ollama:{model}"
        self.model = model
        self.host = host.rstrip("/")

    def score(self, motivation: str, language: str, quote: str) -> dict:
        body = json.dumps({
            "model": self.model,
            "prompt": build_prompt(motivation, language, quote),
            "stream": False,
            "options": {"temperature": 0.1, "num_predict": 300},
        }).encode()
        request = urllib.request.Request(f"{self.host}/api/generate", data=body,
                                         headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(request, timeout=300) as response:
            raw = json.loads(response.read())["response"]
        return parse_scores(raw)


SCORE_SCHEMA = {
    "type": "object",
    "properties": {
        **{dim: {"type": "integer", "enum": [1, 2, 3]} for dim in DIMENSIONS},
        "reason": {"type": "string"},
    },
    "required": [*DIMENSIONS, "reason"],
    "additionalProperties": False,
}


class ClaudeJudge:
    """Same rubric, scored by Claude. Structured outputs guarantee valid JSON."""

    def __init__(self, model: str = "claude-opus-5-5"):
        import anthropic  # optional dependency: `uv sync --extra claude`

        self.name = f"claude:{model}"
        self.model = model
        self.client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY (or an `ant auth login` profile)

    def score(self, motivation: str, language: str, quote: str) -> dict:
        response = self.client.beta.messages.create(
            model=self.model,
            max_tokens=2000,
            # Scoring a one-line quote is easy; low effort keeps cost and latency down.
            output_config={"effort": "low", "format": {"type": "json_schema", "schema": SCORE_SCHEMA}},
            # If Claude declines (unlikely here), the API retries on a fallback model.
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            messages=[{"role": "user", "content": build_prompt(motivation, language, quote)}],
        )
        if response.stop_reason == "refusal":
            return {"error": "refused"}
        text = next((block.text for block in response.content if block.type == "text"), "")
        return parse_scores(text)


def make_judge(spec: str):
    """'ollama:llama3:latest' or 'claude:claude-opus-5-5' -> judge instance."""
    kind, _, model = spec.partition(":")
    if kind == "ollama":
        return OllamaJudge(model or "llama3:latest")
    if kind == "claude":
        return ClaudeJudge(model or "claude-opus-5-5")
    raise ValueError(f"Unknown judge {spec!r}; use ollama:<model> or claude:<model>")
