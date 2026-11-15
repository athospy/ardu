"""Small statistics helpers (standard library only).

How uncertainty is reported:
- Each test case is scored on several repeats. A case's score is the mean of
  its repeats, so the unit of analysis is the case, not the single quote.
- 95% confidence intervals come from a bootstrap over cases: resample the
  cases with replacement many times and take the 2.5th/97.5th percentiles
  of the mean. With 20 cases the intervals are wide, and that is the point:
  they show how much a difference could be noise.
- A before/after comparison is paired (same cases on both sides), so the
  bootstrap resamples per-case differences.
"""

import random
import statistics
from collections import defaultdict

from .judge import DIMENSIONS

BOOTSTRAP_SAMPLES = 5000
SEED = 7  # fixed so reports are reproducible


def case_means(rows: list[dict], judge: str, dim: str) -> dict[str, float]:
    """Mean score per case (over repeats) for one judge and dimension; skips judge errors."""
    per_case = defaultdict(list)
    for row in rows:
        score = row.get("scores", {}).get(judge, {})
        if dim in score:
            per_case[row["case_id"]].append(score[dim])
    return {case: statistics.fmean(values) for case, values in per_case.items()}


def bootstrap_ci(values: list[float]) -> tuple[float, float]:
    if len(values) < 2:
        return (float("nan"), float("nan"))
    rng = random.Random(SEED)
    means = sorted(
        statistics.fmean(rng.choices(values, k=len(values))) for _ in range(BOOTSTRAP_SAMPLES)
    )
    return (means[int(0.025 * BOOTSTRAP_SAMPLES)], means[int(0.975 * BOOTSTRAP_SAMPLES) - 1])


def summarize(rows: list[dict], judge: str) -> dict:
    """Per-dimension mean, 95% CI and run-to-run spread for one result file."""
    summary = {}
    for dim in DIMENSIONS:
        means = case_means(rows, judge, dim)
        values = list(means.values())
        if not values:
            continue
        repeat_means = []
        for repeat in sorted({row["repeat"] for row in rows}):
            scores = [row["scores"][judge][dim] for row in rows
                      if row["repeat"] == repeat and dim in row.get("scores", {}).get(judge, {})]
            if scores:
                repeat_means.append(statistics.fmean(scores))
        summary[dim] = {
            "mean": statistics.fmean(values),
            "ci95": bootstrap_ci(values),
            "repeat_spread": (max(repeat_means) - min(repeat_means)) if len(repeat_means) > 1 else 0.0,
            "cases": len(values),
        }
    totals = [sum(score[d] for d in DIMENSIONS)
              for row in rows if all(d in (score := row.get("scores", {}).get(judge, {})) for d in DIMENSIONS)]
    summary["total"] = {"mean": statistics.fmean(totals) if totals else float("nan"), "quotes": len(totals)}
    summary["judge_errors"] = sum(1 for row in rows if "error" in row.get("scores", {}).get(judge, {}))
    return summary


def paired_difference(before: list[dict], after: list[dict], judge: str, dim: str) -> dict:
    """Mean of (after - before) over shared cases, with a bootstrap 95% CI."""
    a, b = case_means(before, judge, dim), case_means(after, judge, dim)
    shared = sorted(set(a) & set(b))
    diffs = [b[case] - a[case] for case in shared]
    if not diffs:
        return {"mean": float("nan"), "ci95": (float("nan"), float("nan")), "cases": 0}
    return {"mean": statistics.fmean(diffs), "ci95": bootstrap_ci(diffs), "cases": len(diffs)}


def weighted_kappa(a: list[int], b: list[int], categories=(1, 2, 3)) -> float:
    """Quadratic-weighted Cohen's kappa: 1 = perfect agreement, 0 = chance level.

    Quadratic weights count a 1-vs-3 disagreement as worse than 1-vs-2,
    which fits an ordered 1-3 scale.
    """
    if not a or len(a) != len(b):
        return float("nan")
    k = len(categories)
    index = {c: i for i, c in enumerate(categories)}
    n = len(a)
    observed = [[0.0] * k for _ in range(k)]
    for x, y in zip(a, b):
        observed[index[x]][index[y]] += 1 / n
    row = [sum(observed[i]) for i in range(k)]
    col = [sum(observed[i][j] for i in range(k)) for j in range(k)]
    weight = lambda i, j: ((i - j) ** 2) / ((k - 1) ** 2)
    disagreement_observed = sum(weight(i, j) * observed[i][j] for i in range(k) for j in range(k))
    disagreement_expected = sum(weight(i, j) * row[i] * col[j] for i in range(k) for j in range(k))
    if disagreement_expected == 0:
        return 1.0 if disagreement_observed == 0 else float("nan")
    return 1 - disagreement_observed / disagreement_expected


def agreement(a: list[int], b: list[int]) -> dict:
    """Exact match rate, within-one-point rate, and weighted kappa between two raters."""
    pairs = list(zip(a, b))
    return {
        "n": len(pairs),
        "exact": sum(x == y for x, y in pairs) / len(pairs) if pairs else float("nan"),
        "within_one": sum(abs(x - y) <= 1 for x, y in pairs) / len(pairs) if pairs else float("nan"),
        "kappa": weighted_kappa(a, b),
    }
