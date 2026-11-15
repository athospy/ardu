"""Generate quotes by running the production generator (backend/bin/generate.js).

The harness never re-implements the prompt in Python: it sends JSON Lines to
the Node CLI, which runs the same code path the app uses (prompt + gates).
"""

import json
import subprocess
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[2] / "backend"


def load_cases(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def generate(cases: list[dict], prompt: str, model: str, repeats: int, template_gate: bool = False) -> list[dict]:
    """Return one row per (case, repeat) with the generated quote and generator stats."""
    requests = [
        {"id": f"{case['id']}#{repeat}", "motivation": case["motivation"], "language": case["language"]}
        for repeat in range(1, repeats + 1)
        for case in cases
    ]
    stdin = "".join(json.dumps(r, ensure_ascii=False) + "\n" for r in requests)
    completed = subprocess.run(
        ["node", "bin/generate.js", "--prompt", prompt, "--model", model,
         "--template-gate", "on" if template_gate else "off"],
        cwd=BACKEND_DIR,
        input=stdin,
        capture_output=True,
        text=True,
        check=True,
    )

    by_id = {case["id"]: case for case in cases}
    rows = []
    for line in completed.stdout.splitlines():
        result = json.loads(line)
        case_id, repeat = result.pop("id").split("#")
        case = by_id[case_id]
        rows.append({
            "case_id": case_id,
            "language": case["language"],
            "motivation": case["motivation"],
            "repeat": int(repeat),
            "prompt": prompt,
            "model": model,
            "template_gate": template_gate,
            "text": result.get("text", ""),
            "error": result.get("error"),
            "attempts": result.get("attempts"),
            "rejections": result.get("rejections"),
            "duration_ms": result.get("durationMs"),
            "scores": {},
        })
    return rows
