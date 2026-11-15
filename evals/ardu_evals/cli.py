"""ardu-eval: generate quotes, judge them, and write the report.

    uv run ardu-eval generate --prompt v1 --model qwen2.5:1.5b --repeats 3
    uv run ardu-eval judge results/runs/*.jsonl --judge ollama:llama3:latest
    uv run ardu-eval report results/runs/*.jsonl
    uv run ardu-eval sheet results/runs/v0__qwen2.5-1.5b.jsonl results/runs/v1__qwen2.5-1.5b.jsonl
    uv run ardu-eval calibrate results/human/sheet.csv

Each run file is JSON Lines: one row per (case, repeat) with the quote, the
generator's stats, and a "scores" map keyed by judge name. Judging is
resumable: rows that already have a judge's score are skipped.
"""

import argparse
import csv
import json
import random
import sys
from datetime import datetime, timezone
from itertools import combinations
from pathlib import Path

from . import stats
from .generate import generate, load_cases
from .judge import DIMENSIONS, make_judge

EVALS_DIR = Path(__file__).resolve().parents[1]
RUNS_DIR = EVALS_DIR / "results" / "runs"
HUMAN_DIR = EVALS_DIR / "results" / "human"
HUMAN = "human"


def read_rows(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def write_rows(path: Path, rows: list[dict]) -> None:
    path.write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows), encoding="utf-8")


def run_label(rows: list[dict]) -> str:
    return f"{rows[0]['prompt']} · {rows[0]['model']}"


# ── commands ────────────────────────────────────────────────────────────────

def cmd_generate(args) -> None:
    cases = load_cases(Path(args.cases))
    out = Path(args.out) if args.out else RUNS_DIR / f"{args.prompt}__{args.model.replace(':', '-')}.jsonl"
    print(f"Generating {len(cases)} cases × {args.repeats} repeats with prompt {args.prompt} on {args.model}…")
    rows = generate(cases, args.prompt, args.model, args.repeats)
    out.parent.mkdir(parents=True, exist_ok=True)
    write_rows(out, rows)
    failed = sum(1 for r in rows if r["error"])
    print(f"Wrote {len(rows)} rows to {out} ({failed} generation errors)")


def cmd_judge(args) -> None:
    judge = make_judge(args.judge)
    for path in map(Path, args.files):
        rows = read_rows(path)
        todo = [r for r in rows if not r["error"] and judge.name not in r["scores"]]
        print(f"{path.name}: judging {len(todo)} quotes with {judge.name}")
        for i, row in enumerate(todo, 1):
            try:
                row["scores"][judge.name] = judge.score(row["motivation"], row["language"], row["text"])
            except Exception as error:  # network/model failure: record it, keep going
                row["scores"][judge.name] = {"error": f"{type(error).__name__}: {error}"}
            if i % 10 == 0 or i == len(todo):
                write_rows(path, rows)  # save progress so an interrupted run can resume
                print(f"  {i}/{len(todo)}")


def fmt_ci(entry: dict) -> str:
    low, high = entry["ci95"]
    return f"{entry['mean']:.2f} [{low:.2f}–{high:.2f}]"


def cmd_report(args) -> None:
    runs = {Path(f).stem: read_rows(Path(f)) for f in args.files}
    judges = sorted({j for rows in runs.values() for r in rows for j in r["scores"]})
    lines = [
        "# Eval report",
        "",
        f"Generated {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')} by `ardu-eval report`.",
        "Scores are 1–3 per dimension (mean over cases; each case = mean of its repeats).",
        "Brackets = 95% bootstrap confidence interval over cases.",
        "",
    ]
    summary_json = {"runs": {}, "comparisons": []}

    for judge in judges:
        lines += [f"## Judge: `{judge}`", "", "| Run | " + " | ".join(DIMENSIONS) + " | total /12 | quotes |",
                  "|---|" + "---|" * (len(DIMENSIONS) + 2)]
        for name, rows in runs.items():
            s = stats.summarize(rows, judge)
            if not any(d in s for d in DIMENSIONS):
                continue
            summary_json["runs"].setdefault(name, {"label": run_label(rows)})[judge] = s
            cells = [fmt_ci(s[d]) for d in DIMENSIONS]
            lines.append(f"| {run_label(rows)} | " + " | ".join(cells)
                         + f" | {s['total']['mean']:.1f} | {s['total']['quotes']} |")
        lines.append("")

        # Paired before/after: same model, different prompt.
        pairs = [(a, b) for a, b in combinations(runs, 2)
                 if runs[a][0]["model"] == runs[b][0]["model"] and runs[a][0]["prompt"] != runs[b][0]["prompt"]]
        for a, b in pairs:
            before, after = sorted((runs[a], runs[b]), key=lambda rows: rows[0]["prompt"])
            lines += [f"**{before[0]['prompt']} → {after[0]['prompt']} on {after[0]['model']}** (paired by case):", "",
                      "| Dimension | change | 95% CI |", "|---|---|---|"]
            comparison = {"judge": judge, "before": run_label(before), "after": run_label(after), "dims": {}}
            for dim in DIMENSIONS:
                d = stats.paired_difference(before, after, judge, dim)
                comparison["dims"][dim] = d
                lines.append(f"| {dim} | {d['mean']:+.2f} | {d['ci95'][0]:+.2f} to {d['ci95'][1]:+.2f} |")
            summary_json["comparisons"].append(comparison)
            lines.append("")

    lines += ["## Generator behavior", "", "| Run | quotes | avg drafts | overlap-gate rejections | avg time (s) |",
              "|---|---|---|---|---|"]
    for name, rows in runs.items():
        ok = [r for r in rows if not r["error"]]
        rejected = sum(r["rejections"]["overlap"] for r in ok)
        lines.append(f"| {run_label(rows)} | {len(ok)} | {sum(r['attempts'] for r in ok) / len(ok):.2f} "
                     f"| {rejected} ({rejected / len(ok):.0%}) | {sum(r['duration_ms'] for r in ok) / len(ok) / 1000:.1f} |")
    lines.append("")

    calibration = HUMAN_DIR / "calibration.json"
    if calibration.exists():
        result = json.loads(calibration.read_text())
        lines += ["## Judge vs. human", "",
                  f"{result['n_items']} quotes scored blind by a human. Agreement with each judge "
                  "(exact match, within one point, quadratic-weighted Cohen's kappa):", "",
                  "| Judge | Dimension | exact | within 1 | kappa |", "|---|---|---|---|---|"]
        for judge, dims in result["judges"].items():
            for dim, a in dims.items():
                lines.append(f"| `{judge}` | {dim} | {a['exact']:.0%} | {a['within_one']:.0%} | {a['kappa']:.2f} |")
        lines.append("")

    out = EVALS_DIR / "results" / "REPORT.md"
    out.write_text("\n".join(lines), encoding="utf-8")
    (EVALS_DIR / "results" / "summary.json").write_text(json.dumps(summary_json, indent=2, ensure_ascii=False))
    print(f"Wrote {out} and summary.json")


def cmd_sheet(args) -> None:
    """Blind scoring sheet: random quotes, no prompt/model/judge info."""
    pool = [(Path(f).stem, r) for f in args.files for r in read_rows(Path(f)) if not r["error"]]
    picked = random.Random(stats.SEED).sample(pool, args.n)
    HUMAN_DIR.mkdir(parents=True, exist_ok=True)
    key = {}
    with open(HUMAN_DIR / "sheet.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["item", "language", "motivation", "quote", *DIMENSIONS])
        for i, (run, row) in enumerate(picked, 1):
            writer.writerow([i, row["language"], row["motivation"], row["text"], "", "", "", ""])
            key[i] = {"run": run, "case_id": row["case_id"], "repeat": row["repeat"]}
    (HUMAN_DIR / "sheet-key.json").write_text(json.dumps(key, indent=2))
    print(f"Wrote {HUMAN_DIR / 'sheet.csv'} ({args.n} quotes). Fill in 1–3 per dimension, then run `calibrate`.")


def cmd_calibrate(args) -> None:
    key = json.loads((HUMAN_DIR / "sheet-key.json").read_text())
    runs = {}
    human, judged = {d: [] for d in DIMENSIONS}, {}
    with open(args.sheet, encoding="utf-8") as f:
        for item in csv.DictReader(f):
            ref = key[item["item"]]
            rows = runs.setdefault(ref["run"], read_rows(RUNS_DIR / f"{ref['run']}.jsonl"))
            row = next(r for r in rows if r["case_id"] == ref["case_id"] and r["repeat"] == ref["repeat"])
            human_scores = {d: int(item[d]) for d in DIMENSIONS}
            for judge, scores in row["scores"].items():
                if "error" in scores:
                    continue
                for dim in DIMENSIONS:
                    pair = judged.setdefault(judge, {}).setdefault(dim, ([], []))
                    pair[0].append(human_scores[dim])
                    pair[1].append(scores[dim])
            for dim in DIMENSIONS:
                human[dim].append(human_scores[dim])
    result = {
        "n_items": len(human[DIMENSIONS[0]]),
        "judges": {judge: {dim: stats.agreement(*pair) for dim, pair in dims.items()} for judge, dims in judged.items()},
    }
    (HUMAN_DIR / "calibration.json").write_text(json.dumps(result, indent=2))
    for judge, dims in result["judges"].items():
        print(judge)
        for dim, a in dims.items():
            print(f"  {dim:12} exact {a['exact']:.0%}  within-1 {a['within_one']:.0%}  kappa {a['kappa']:.2f}")


def main(argv=None) -> None:
    parser = argparse.ArgumentParser(prog="ardu-eval", description=__doc__.split("\n\n")[0])
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("generate", help="generate quotes with the production generator")
    p.add_argument("--prompt", default="v1")
    p.add_argument("--model", default="qwen2.5:1.5b")
    p.add_argument("--repeats", type=int, default=3)
    p.add_argument("--cases", default=str(EVALS_DIR / "cases.jsonl"))
    p.add_argument("--out")
    p.set_defaults(func=cmd_generate)

    p = sub.add_parser("judge", help="score run files with a judge (resumable)")
    p.add_argument("files", nargs="+")
    p.add_argument("--judge", default="ollama:llama3:latest", help="ollama:<model> or claude:<model>")
    p.set_defaults(func=cmd_judge)

    p = sub.add_parser("report", help="write results/REPORT.md and results/summary.json")
    p.add_argument("files", nargs="+")
    p.set_defaults(func=cmd_report)

    p = sub.add_parser("sheet", help="make a blind human-scoring sheet")
    p.add_argument("files", nargs="+")
    p.add_argument("--n", type=int, default=30)
    p.set_defaults(func=cmd_sheet)

    p = sub.add_parser("calibrate", help="compare the filled sheet with each judge")
    p.add_argument("sheet")
    p.set_defaults(func=cmd_calibrate)

    args = parser.parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    sys.exit(main())
