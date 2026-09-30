from __future__ import annotations

from collections import defaultdict, deque
from typing import Iterable

from graph.models import Conflict, Edge, Source

TOPIC = "remote_work_days_per_week"
UNOFFICIAL = {"teams", "email"}


def _norm(value: str) -> str:
    return value.strip().lower()


def _claim_value(source: Source, topic: str) -> str | None:
    for c in source.claims:
        if c.topic == topic:
            return _norm(c.value)
    return None


def _has_topic(source: Source, topic: str) -> bool:
    return _claim_value(source, topic) is not None


def _in_scope(source: Source, country: str) -> bool:
    return source.country in {country, "ALL"}


def supersedes_edges(sources: Iterable[Source]) -> list[Edge]:
    known = {s.id for s in sources}
    edges: list[Edge] = []
    for src in sources:
        for target in src.supersedesIds:
            if target in known:
                edges.append(
                    Edge(id=f"e-sup-{src.id}-{target}", from_=src.id, to=target, type="supersedes")
                )
    return edges


def reference_edges(sources: Iterable[Source]) -> list[Edge]:
    known = {s.id for s in sources}
    edges: list[Edge] = []
    for src in sources:
        for target in src.referencesIds:
            if target in known:
                edges.append(
                    Edge(id=f"e-ref-{src.id}-{target}", from_=src.id, to=target, type="references")
                )
    return edges


def supersedes_adj(sources: Iterable[Source]) -> dict[str, set[str]]:
    adj: dict[str, set[str]] = defaultdict(set)
    for e in supersedes_edges(sources):
        adj[e.from_].add(e.to)
    return adj


def reachable(adj: dict[str, set[str]], start: str, goal: str) -> bool:
    seen = {start}
    q: deque[str] = deque([start])
    while q:
        cur = q.popleft()
        if cur == goal and cur != start:
            return True
        for nxt in adj.get(cur, ()):
            if nxt not in seen:
                seen.add(nxt)
                q.append(nxt)
    return start != goal and goal in seen


def related_by_supersedes(adj: dict[str, set[str]], a: str, b: str) -> bool:
    return reachable(adj, a, b) or reachable(adj, b, a)


def superseded_ids(sources: Iterable[Source]) -> set[str]:
    return {e.to for e in supersedes_edges(sources)}


def contradict_edges(conflicts: Iterable[Conflict], sources: Iterable[Source]) -> list[Edge]:
    by_id = {s.id: s for s in sources}
    edges: list[Edge] = []
    for c in conflicts:
        if c.reason == "scope_mismatch":
            continue
        a, b = c.sourceIds
        sa, sb = by_id[a], by_id[b]
        newer, older = (sa, sb) if sa.date >= sb.date else (sb, sa)
        edges.append(
            Edge(id=f"e-con-{newer.id}-{older.id}", from_=newer.id, to=older.id, type="contradicts")
        )
    return edges


def current_official(sources: list[Source], country: str) -> Source | None:
    superseded = superseded_ids(sources)
    candidates = [
        s
        for s in sources
        if s.type == "doc"
        and s.country == country
        and s.id not in superseded
        and _has_topic(s, TOPIC)
    ]
    if not candidates:
        return None
    return max(candidates, key=lambda s: s.date)


def detect_conflicts(sources: list[Source], country: str) -> list[Conflict]:
    adj = supersedes_adj(sources)
    superseded = superseded_ids(sources)
    conflicts: list[Conflict] = []

    scoped_active = [
        s
        for s in sources
        if _in_scope(s, country) and s.id not in superseded and _has_topic(s, TOPIC)
    ]

    for i, a in enumerate(scoped_active):
        for b in scoped_active[i + 1 :]:
            va, vb = _claim_value(a, TOPIC), _claim_value(b, TOPIC)
            if va is None or vb is None or va == vb:
                continue
            if related_by_supersedes(adj, a.id, b.id):
                continue
            unofficial = (a.type in UNOFFICIAL) != (b.type in UNOFFICIAL)
            if unofficial and (a.type == "doc" or b.type == "doc"):
                reason = "unofficial_vs_official"
                severity = "high"
            else:
                reason = "value_mismatch"
                severity = "medium"
            pair = sorted([a.id, b.id])
            conflicts.append(
                Conflict(
                    id=f"c-{reason}-{pair[0]}-{pair[1]}",
                    sourceIds=pair,
                    topic=TOPIC,
                    reason=reason,
                    severity=severity,
                )
            )

    official = current_official(sources, country)
    if official:
        for s in sources:
            if s.country in {country, "ALL"}:
                continue
            if not _has_topic(s, TOPIC):
                continue
            pair = sorted([s.id, official.id])
            conflicts.append(
                Conflict(
                    id=f"c-scope_mismatch-{pair[0]}-{pair[1]}",
                    sourceIds=pair,
                    topic=TOPIC,
                    reason="scope_mismatch",
                    severity="low",
                )
            )

    return conflicts


def build_edges(sources: list[Source], conflicts: list[Conflict]) -> list[Edge]:
    return supersedes_edges(sources) + reference_edges(sources) + contradict_edges(conflicts, sources)
