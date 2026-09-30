from __future__ import annotations

import json
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[2]
import sys

sys.path.insert(0, str(BACKEND))

from trust.score import score

REPO = BACKEND.parent
SEED = json.loads((REPO / "data" / "sources.seed.json").read_text(encoding="utf-8"))


def _graph(conflicts):
    return {"nodes": SEED, "conflicts": conflicts}


def test_nl_doc_scope_changes_with_country():
    nl = next(s for s in SEED if s["id"] == "src-nl-2024")
    conflicts = [
        {
            "id": "c-scope",
            "sourceIds": ["src-nl-2024", "src-be-2025"],
            "topic": "remote_work_days_per_week",
            "reason": "scope_mismatch",
            "severity": "low",
        }
    ]
    be_score = score(nl, _graph(conflicts), {"country": "BE"})
    nl_score = score(nl, _graph([]), {"country": "NL"})
    be_scope = next(f for f in be_score["factors"] if f["id"] == "scope_match")
    nl_scope = next(f for f in nl_score["factors"] if f["id"] == "scope_match")
    assert be_scope["delta"] < 0
    assert nl_scope["delta"] > 0
    assert nl_score["score"] > be_score["score"]


def test_orphan_wiki_scores_below_owned_doc():
    wiki = next(s for s in SEED if s["id"] == "src-wiki-orphan")
    official = next(s for s in SEED if s["id"] == "src-be-2025")
    conflicts = [
        {
            "id": "c-wiki",
            "sourceIds": ["src-wiki-orphan", "src-be-2025"],
            "topic": "remote_work_days_per_week",
            "reason": "value_mismatch",
            "severity": "medium",
        }
    ]
    wiki_score = score(wiki, _graph(conflicts), {"country": "BE"})
    official_score = score(official, _graph(conflicts), {"country": "BE"})
    wiki_owner = next(f for f in wiki_score["factors"] if f["id"] == "has_owner")
    official_owner = next(f for f in official_score["factors"] if f["id"] == "has_owner")
    assert wiki_owner["delta"] == 0
    assert official_owner["delta"] > 0
    assert wiki_score["score"] < official_score["score"]


def test_teams_conflict_is_penalized():
    teams = next(s for s in SEED if s["id"] == "src-teams-unlimited")
    conflicts = [
        {
            "id": "c-teams",
            "sourceIds": ["src-teams-unlimited", "src-be-2025"],
            "topic": "remote_work_days_per_week",
            "reason": "unofficial_vs_official",
            "severity": "high",
        }
    ]
    with_c = score(teams, _graph(conflicts), {"country": "BE"})
    without = score(teams, _graph([]), {"country": "BE"})
    penalty = next(f for f in with_c["factors"] if f["id"] == "open_conflict_penalty")
    assert penalty["delta"] < 0
    assert with_c["score"] < without["score"]
    assert 0 <= with_c["score"] <= 100
