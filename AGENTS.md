# AGENTS.md

Hackathon PoC for SD Worx: visualise fragmented knowledge as a DAG, highlight conflicts, score trust.

## Stack

- Frontend: React + TypeScript + Vite + React Flow (`/frontend`)
- API: Python FastAPI, in-memory store (`/backend/graph`)
- Trust: pure function + `weights.json` (`/backend/trust`) — no FastAPI, no LLM
- Seed: `/data` fictional Northwind People rules only

## Folder ownership — do not edit other lanes' folders or `/contracts` without asking

| Path | Owner |
|------|--------|
| `/data` | Data + story |
| `/frontend` | Frontend |
| `/backend/graph` | Graph API |
| `/backend/trust` | Trust scores |
| `/contracts` | Shared — freeze after T+1h |

Graph **reads** `/data/*.json`. Trust must not import FastAPI.

## Product rules

- Country is a **work-location dropdown** (`BE` | `NL`), not an account. It only changes trust/scope, not secrecy.
- Canonical claim topic: `remote_work_days_per_week`
- Edge `from` = newer/challenger, `to` = older/target
- Core demo must run with **no API keys**
- Invented rules only — never real payroll/legal policy

## Git

Branches: `data/seed-story`, `frontend/graph-ui`, `graph/api`, `trust/score`, `chore/contracts`.  
Rotate merger at checkpoints after a 2-minute shout. No force-push to `main`.
