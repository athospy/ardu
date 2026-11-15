"""Unit tests for the parts of the harness that don't need a model."""

import math

from ardu_evals.judge import parse_scores
from ardu_evals.stats import agreement, bootstrap_ci, paired_difference, summarize, weighted_kappa

GOOD = '{"relevance":3,"originality":1,"inspiration":2,"clarity":3,"reason":"Specific but cliché."}'


# ── parse_scores ────────────────────────────────────────────────────────────

def test_parses_clean_json():
    assert parse_scores(GOOD) == {
        "relevance": 3, "originality": 1, "inspiration": 2, "clarity": 3, "reason": "Specific but cliché.",
    }


def test_parses_json_inside_code_fence_and_chatter():
    raw = f"Sure! Here is my evaluation:\n```json\n{GOOD}\n```\nHope this helps."
    assert parse_scores(raw)["originality"] == 1


def test_falls_back_to_regex_when_json_is_broken():
    # A raw newline inside the reason string makes the JSON invalid.
    raw = '{"relevance": 2, "originality": 2, "inspiration": 1, "clarity": 3, "reason": "Too\nlong"}'
    scores = parse_scores(raw)
    assert (scores["relevance"], scores["inspiration"]) == (2, 1)


def test_truncated_reply_still_yields_scores():
    raw = '{"relevance":3,"originality":2,"inspiration":2,"clarity":2,"reason":"Strong opening but the'
    assert parse_scores(raw)["clarity"] == 2


def test_rejects_out_of_range_and_missing_scores():
    assert "error" in parse_scores('{"relevance":0,"originality":1,"inspiration":1,"clarity":1}')
    assert "error" in parse_scores('{"relevance":3,"originality":1}')
    assert "error" in parse_scores("I cannot score this.")


# ── stats ───────────────────────────────────────────────────────────────────

def row(case, repeat, relevance, judge="j"):
    return {"case_id": case, "repeat": repeat,
            "scores": {judge: {"relevance": relevance, "originality": 1, "inspiration": 2, "clarity": 2}}}


def test_summary_averages_repeats_per_case_first():
    rows = [row("a", 1, 3), row("a", 2, 1), row("b", 1, 2), row("b", 2, 2)]
    s = summarize(rows, "j")
    assert s["relevance"]["mean"] == 2.0  # case a = 2, case b = 2
    assert s["relevance"]["cases"] == 2
    assert s["relevance"]["repeat_spread"] == 1.0  # repeat 1 mean 2.5, repeat 2 mean 1.5


def test_paired_difference_uses_shared_cases_only():
    before = [row("a", 1, 1), row("b", 1, 2), row("c", 1, 1)]
    after = [row("a", 1, 3), row("b", 1, 2)]
    d = paired_difference(before, after, "j", "relevance")
    assert d["cases"] == 2 and d["mean"] == 1.0


def test_bootstrap_ci_brackets_the_mean_and_is_reproducible():
    values = [1, 2, 2, 3, 3, 3, 2, 1, 2, 3]
    low, high = bootstrap_ci(values)
    assert low <= sum(values) / len(values) <= high
    assert bootstrap_ci(values) == (low, high)
    assert all(math.isnan(x) for x in bootstrap_ci([2.0]))


def test_weighted_kappa_extremes():
    assert weighted_kappa([1, 2, 3, 1, 2, 3], [1, 2, 3, 1, 2, 3]) == 1.0
    assert weighted_kappa([1, 3, 1, 3], [3, 1, 3, 1]) < 0  # systematic opposite = worse than chance


def test_agreement_rates():
    a = agreement([1, 2, 3, 3], [1, 3, 1, 3])
    assert a["exact"] == 0.5 and a["within_one"] == 0.75 and a["n"] == 4
