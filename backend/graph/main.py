from __future__ import annotations

import os
import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from graph.compute import compute_graph, diff_graphs
from graph.models import AddSourceResponse, SourceCreate, SourceDetail
from graph import store

ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if o.strip()
]

app = FastAPI(title="Northwind Knowledge Graph", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

CountryQuery = Query(..., pattern="^(BE|NL)$")


def dump(model) -> JSONResponse:
    return JSONResponse(model.model_dump(mode="json", by_alias=True))


@app.get("/graph")
def get_graph(country: str = CountryQuery):
    return dump(compute_graph(store.all_sources(), country))


@app.get("/sources/{source_id}")
def get_source(source_id: str, country: str = CountryQuery):
    if not source_id.replace("-", "").replace("_", "").isalnum():
        raise HTTPException(status_code=400, detail="invalid id")
    source = store.get(source_id)
    if source is None:
        raise HTTPException(status_code=404, detail="source not found")
    graph = compute_graph(store.all_sources(), country)
    trust = graph.trust[source.id]
    return dump(
        SourceDetail(
            source=source,
            trust=trust,
            scopeMatch=source.country in {country, "ALL"},
        )
    )


@app.post("/sources")
def add_source(body: SourceCreate, country: str = CountryQuery):
    before = compute_graph(store.all_sources(), country)
    source = store.add(body)
    after = compute_graph(store.all_sources(), country)
    return dump(AddSourceResponse(source=source, diff=diff_graphs(before, after), graph=after))


@app.post("/reset")
def reset(country: str = Query("BE", pattern="^(BE|NL)$")):
    store.reset()
    return dump(compute_graph(store.all_sources(), country))
