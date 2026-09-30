# Demo script — Northwind People (invented rules only)

**Moment of doubt:** two sources disagree. Which can I trust, and does it apply to me?

**User:** work location dropdown, not a login. Start on **Belgium (BE)**.

## 30-second pitch

Knowledge is a timeline of sources, not a single wiki page. Official docs, Teams, and email sit on one graph. Edges show supersedes / contradicts / references. Conflicts are highlighted. Each source has a trust score with a factor breakdown. Changing country recomputes “does this apply to me?” Adding a source recalculates the graph and shows a diff.

## Start state (seed)

| Say this | Click |
|----------|--------|
| 2025 BE policy says **3 days** and **supersedes** the 2023 **2-day** PDF | `src-be-2025` → `src-be-2023` |
| A Teams message says **unlimited** — unofficial vs official, high conflict | `src-teams-unlimited` |
| The NL PDF says **4 days** — low trust / scope mismatch for a BE viewer | `src-nl-2024` |
| An ownerless wiki still says **2 days** — contradicts the current official doc | `src-wiki-orphan` |

Expected start conflicts (BE): unofficial vs official (Teams vs 2025 doc), value mismatch (wiki vs 2025 doc), scope mismatch (NL vs BE official).

Switch dropdown to **Netherlands (NL)**: NL doc trust goes up; BE-only official is out of scope.

## Live add

POST `/sources?country=BE` with `demo-source.add.json` (or use the form).

Sam’s email says **2 days** and **references** the 2025 PDF → new high conflict with the official **3-day** doc. UI should pulse the new node, new edges, and new conflict.

## Reset

POST `/reset` before the next jury run.
