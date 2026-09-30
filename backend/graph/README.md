# Graph lane (FastAPI)

From repo root:

```
cd backend
python -m pip install -r requirements.txt
python -m uvicorn graph.main:app --reload --port 8000
```

`PYTHONPATH` is set in `main.py` so `trust.score` imports. Seed is read from `/data/sources.seed.json`.
