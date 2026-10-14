"""FastAPI app. Endpoints follow contracts/openapi.yaml; real handlers land in the FastAPI issue."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Ripple API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/api/health")
def health() -> dict:
    return {"ok": True}


@app.get("/api/tenants")
def tenants() -> list[dict]:
    return [
        {"id": "handbook-demo", "name": "GitLab handbook (real changes + synthetic people)"},
        {"id": "acme-synthetic", "name": "Acme (fully synthetic)"},
    ]
