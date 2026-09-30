"""Pure trust scorer. No FastAPI, no I/O besides loading weights.json once."""

from __future__ import annotations

import json
from datetime import date, datetime
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence, TypedDict

WEIGHTS_PATH = Path(__file__).resolve().parent / "weights.json"


class Factor(TypedDict):
    id: str
    label: str
    delta: float
    detail: str


class TrustBreakdown(TypedDict):
    score: int
    factors: list[Factor]


class UserContext(TypedDict):
    country: str


def _load_weights() -> dict[str, Any]:
    return json.loads(WEIGHTS_PATH.read_text(encoding="utf-8"))


def _parse_date(value: str) -> date:
    return datetime.fromisoformat(value[:10]).date()


def _norm(value: str) -> str:
    return str(value).strip().lower()


def _in_scope(source: Mapping[str, Any], country: str) -> bool:
    return source.get("country") in {country, "ALL"}


def _topic_values(source: Mapping[str, Any]) -> dict[str, str]:
    out: dict[str, str] = {}
    for claim in source.get("claims") or []:
        topic = claim.get("topic")
        if topic:
            out[str(topic)] = _norm(str(claim.get("value", "")))
    return out


def _newest_date(sources: Sequence[Mapping[str, Any]]) -> date | None:
    dates = [_parse_date(s["date"]) for s in sources if s.get("date")]
    return max(dates) if dates else None


def _conflict_ids(conflicts: Iterable[Mapping[str, Any]]) -> set[str]:
    ids: set[str] = set()
    for c in conflicts:
        for sid in c.get("sourceIds") or []:
            ids.add(str(sid))
    return ids


def score(
    source: Mapping[str, Any],
    graph: Mapping[str, Any],
    user_context: UserContext,
) -> TrustBreakdown:
    """Score a source 0–100 with a per-factor breakdown.

    ``graph`` must include ``nodes`` (sources) and ``conflicts``.
    Factors and numeric weights live in ``weights.json`` (tune during the demo).
    """
    weights = _load_weights()
    country = user_context["country"]
    nodes: Sequence[Mapping[str, Any]] = list(graph.get("nodes") or [])
    conflicts = list(graph.get("conflicts") or [])
    factors: list[Factor] = []

    src_type = str(source.get("type") or "doc")
    authority = float(weights["authority"].get(src_type, 0))
    factors.append(
        {
            "id": "authority",
            "label": "Source authority",
            "delta": authority,
            "detail": f"Type '{src_type}' uses the configured authority weight.",
        }
    )

    newest = _newest_date(nodes)
    recency_max = float(weights["recency_max"])
    half_life = float(weights["recency_half_life_days"])
    recency = 0.0
    if newest and source.get("date"):
        age_days = max(0, (newest - _parse_date(str(source["date"]))).days)
        recency = recency_max * (0.5 ** (age_days / half_life))
        recency = round(recency, 2)
    factors.append(
        {
            "id": "recency",
            "label": "Recency",
            "delta": recency,
            "detail": "Decays toward 0 as the source ages vs the newest source in the graph.",
        }
    )

    has_owner = source.get("owner") not in (None, "")
    owner_delta = float(weights["has_owner"]) if has_owner else 0.0
    factors.append(
        {
            "id": "has_owner",
            "label": "Named owner",
            "delta": owner_delta,
            "detail": "Full credit if owner is present; none if the source is unsigned.",
        }
    )

    scoped = _in_scope(source, country)
    if scoped:
        scope_delta = float(weights["scope_match"])
        scope_detail = f"Applies to work location {country} (source country {source.get('country')})."
    else:
        scope_delta = float(weights["scope_mismatch_penalty"])
        scope_detail = (
            f"Does not apply to work location {country} "
            f"(source country {source.get('country')})."
        )
    factors.append(
        {
            "id": "scope_match",
            "label": "Scope match",
            "delta": scope_delta,
            "detail": scope_detail,
        }
    )

    my_claims = _topic_values(source)
    corroborators = 0
    for other in nodes:
        if other.get("id") == source.get("id"):
            continue
        if not _in_scope(other, country):
            continue
        other_claims = _topic_values(other)
        for topic, value in my_claims.items():
            if other_claims.get(topic) == value and value:
                corroborators += 1
                break
    corr_delta = min(
        float(weights["corroboration_max"]),
        corroborators * float(weights["corroboration_per_source"]),
    )
    factors.append(
        {
            "id": "corroboration",
            "label": "Corroboration",
            "delta": corr_delta,
            "detail": f"{corroborators} other in-scope source(s) share a claim value.",
        }
    )

    in_conflict = str(source.get("id")) in _conflict_ids(conflicts)
    conflict_delta = float(weights["open_conflict_penalty"]) if in_conflict else 0.0
    factors.append(
        {
            "id": "open_conflict_penalty",
            "label": "Open conflict penalty",
            "delta": conflict_delta,
            "detail": "Penalty if this source is part of any open conflict for this viewer.",
        }
    )

    total = sum(f["delta"] for f in factors)
    clamped = int(round(max(0.0, min(100.0, total))))
    return {"score": clamped, "factors": factors}
