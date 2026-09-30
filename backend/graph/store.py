from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

from graph.models import Source, SourceCreate

REPO_ROOT = Path(__file__).resolve().parents[2]
SEED_PATH = REPO_ROOT / "data" / "sources.seed.json"

_sources: list[dict] = []
_counter = 0


def _load_seed() -> list[dict]:
    raw = json.loads(SEED_PATH.read_text(encoding="utf-8"))
    return [Source.model_validate(item).model_dump(mode="json") for item in raw]


def reset() -> None:
    global _sources, _counter
    _sources = _load_seed()
    _counter = 0


def all_sources() -> list[Source]:
    return [Source.model_validate(s) for s in _sources]


def get(source_id: str) -> Source | None:
    for s in _sources:
        if s["id"] == source_id:
            return Source.model_validate(s)
    return None


def add(create: SourceCreate) -> Source:
    global _counter
    _counter += 1
    source_id = f"src-added-{_counter}"
    while any(s["id"] == source_id for s in _sources):
        _counter += 1
        source_id = f"src-added-{_counter}"
    data = create.model_dump(mode="json")
    data["id"] = source_id
    source = Source.model_validate(data)
    _sources.append(source.model_dump(mode="json"))
    return source


def snapshot() -> list[dict]:
    return deepcopy(_sources)


reset()
