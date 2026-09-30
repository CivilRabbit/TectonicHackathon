from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from graph.dag import build_edges, detect_conflicts
from graph.models import (
    Conflict,
    Edge,
    GraphDiff,
    GraphResponse,
    Source,
    TrustBreakdown,
    TrustChange,
)
from trust.score import score as trust_score


def compute_graph(sources: list[Source], country: str) -> GraphResponse:
    conflicts = detect_conflicts(sources, country)
    edges = build_edges(sources, conflicts)
    graph_for_trust = {
        "nodes": [s.model_dump(mode="json") for s in sources],
        "conflicts": [c.model_dump(mode="json") for c in conflicts],
    }
    trust = {}
    for src in sources:
        breakdown = trust_score(src.model_dump(mode="json"), graph_for_trust, {"country": country})
        trust[src.id] = TrustBreakdown.model_validate(breakdown)
    return GraphResponse(
        country=country,  # type: ignore[arg-type]
        nodes=sources,
        edges=edges,
        conflicts=conflicts,
        trust=trust,
    )


def diff_graphs(before: GraphResponse, after: GraphResponse) -> GraphDiff:
    before_ids = {n.id for n in before.nodes}
    added_nodes = [n for n in after.nodes if n.id not in before_ids]

    def edge_key(e: Edge) -> tuple[str, str, str]:
        return (e.from_, e.to, e.type)

    before_edges = {edge_key(e) for e in before.edges}
    added_edges = [e for e in after.edges if edge_key(e) not in before_edges]

    before_c = {c.id: c for c in before.conflicts}
    after_c = {c.id: c for c in after.conflicts}
    new_conflicts = [c for cid, c in after_c.items() if cid not in before_c]
    resolved = [c for cid, c in before_c.items() if cid not in after_c]

    changed: dict[str, TrustChange] = {}
    for sid, after_t in after.trust.items():
        before_t = before.trust.get(sid)
        if before_t is None:
            continue
        if before_t.score != after_t.score:
            changed[sid] = TrustChange(before=before_t.score, after=after_t.score)

    return GraphDiff(
        addedNodes=added_nodes,
        addedEdges=added_edges,
        newConflicts=new_conflicts,
        resolvedConflicts=resolved,
        changedTrust=changed,
    )
