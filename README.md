# Northwind Knowledge Graph

Hackathon PoC: **which source can I trust, and does it apply to me?**

Fictional company **Northwind People**. Invented hybrid-work-day rules only — not real policy.

Work location is a dropdown (`BE` / `NL`), not a login. All seed data is public demo data. `country` only changes **trust and scope**, not access control.

## Quick start

Terminal 1:

```
cd backend
python -m pip install -r requirements.txt
python -m uvicorn graph.main:app --port 8000
```

Terminal 2:

```
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — pick Belgium, click conflicting nodes, then **Add Sam’s email** (or the form). Switch to Netherlands to see the NL policy become in-scope.

Reset: button in the UI or `POST http://localhost:8000/reset`

Tune trust live: edit `backend/trust/weights.json` and reload the graph (no code change).

## Demo script

See [data/DEMO.md](data/DEMO.md).

## Contract

[contracts/](contracts/) — types, JSON Schema, example GET `/graph` and POST diff.

## Security (demo)

- No secrets. Copy `.env.example` → `.env` if needed. Never commit `.env`.
- CORS allowlist (`CORS_ORIGINS`), not `*`.
- POST `/sources` validated (enums, length caps, `extra=forbid`).
- GET `/sources/{id}`: id pattern, 404 if unknown, `country` enum required.
- Country is **not** authorization.

## Lanes

See [AGENTS.md](AGENTS.md).
