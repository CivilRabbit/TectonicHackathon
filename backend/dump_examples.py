"""Dump contract example JSON from the live compute path."""

from __future__ import annotations

import json
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND))

from graph.compute import compute_graph, diff_graphs
from graph.models import Source, SourceCreate
from graph import store


def dump(model) -> dict:
    return json.loads(model.model_dump_json(by_alias=True))


def main() -> None:
    repo = BACKEND.parent
    out = repo / "contracts" / "examples"
    out.mkdir(parents=True, exist_ok=True)

    store.reset()
    start = compute_graph(store.all_sources(), "BE")
    (out / "graph.BE.start.json").write_text(
        json.dumps(dump(start), indent=2) + "\n", encoding="utf-8"
    )
    start_nl = compute_graph(store.all_sources(), "NL")
    (out / "graph.NL.start.json").write_text(
        json.dumps(dump(start_nl), indent=2) + "\n", encoding="utf-8"
    )

    add_path = repo / "data" / "demo-source.add.json"
    create = SourceCreate.model_validate(json.loads(add_path.read_text(encoding="utf-8")))
    store.add(create)
    after = compute_graph(store.all_sources(), "BE")
    diff = diff_graphs(start, after)

    # Stable id in the example for the frontend mock
    added = after.nodes[-1]
    payload = dump(diff)
    (out / "graph.BE.diff-after-email.json").write_text(
        json.dumps(payload, indent=2) + "\n", encoding="utf-8"
    )
    detail = {
        "source": dump(added),
        "trust": dump(after.trust[added.id]) if hasattr(after.trust[added.id], "model_dump_json") else after.trust[added.id],
        "scopeMatch": True,
    }
    if not isinstance(detail["trust"], dict):
        detail["trust"] = json.loads(after.trust[added.id].model_dump_json())
    elif "model_dump_json" in dir(after.trust[added.id]):
        detail["trust"] = json.loads(after.trust[added.id].model_dump_json())
    (out / "source.detail.json").write_text(json.dumps(detail, indent=2) + "\n", encoding="utf-8")
    (out / "graph.BE.after-email.json").write_text(
        json.dumps(dump(after), indent=2) + "\n", encoding="utf-8"
    )
    print("wrote", out)


if __name__ == "__main__":
    main()
