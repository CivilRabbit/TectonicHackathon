# Trust scores (lane 4)

Pure function: `score(source, graph, userContext) -> { score, factors[] }`.

Tune the demo by editing `weights.json` only (no code change):

| Factor | Demo slider |
|--------|-------------|
| `authority.doc` / `.email` / `.teams` | How much a PDF beats chat |
| `recency_max` / `recency_half_life_days` | How fast old docs decay |
| `has_owner` | Penalty for unsigned wiki |
| `scope_match` / `scope_mismatch_penalty` | Country dropdown story |
| `corroboration_*` | Same claim, other sources |
| `open_conflict_penalty` | Highlight disputed nodes |

No LLM. Graph imports this package; do not add FastAPI here.

Run tests from `backend/`: `python -m pytest trust/tests -q`
