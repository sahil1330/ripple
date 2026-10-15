"""FastAPI app implementing contracts/openapi.yaml on top of the graph layer and agents.

Handlers stay thin: every read is a Cypher file in ``graph/queries/`` (listed in its README),
every write goes through an agent (Concierge, Sentinel, ...), and every agent event is also
published on the tenant's SSE stream (``api/bus.py``). Plain ``def`` handlers run in the
thread pool, which suits the synchronous FalkorDB client.
"""

from __future__ import annotations

import asyncio
import json

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from agents import concierge
from agents.events import event
from agents.ranking import rank
from api import bus
from graph.client import tenant_graph
from graph.cypher import cypher
from graph.impact import impact_of
from graph.tools import coverage, explain_path, now_ms

app = FastAPI(title="Ripple API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

TENANTS = [
    {"id": "handbook-demo", "name": "GitLab handbook (real changes + synthetic people)"},
    {"id": "acme-synthetic", "name": "Acme (fully synthetic)"},
]
# Change.status in the graph -> ChangeSummary.status enum in the contract.
IMPACT_KEYS = ("id", "kind", "label", "hops", "severity", "urgency", "reach", "risk", "tth_ms")
CHANGE_STATUS = {"open": "detected", "detected": "detected", "resolving": "resolving", "resolved": "resolved"}


def _graph(tenant: str):
    if tenant not in {t["id"] for t in TENANTS}:
        raise HTTPException(404, f"unknown tenant {tenant!r}")
    return tenant_graph(tenant)


def _rows(result) -> list[dict]:
    keys = [h[1] if isinstance(h, list | tuple) else h for h in result.header]
    return [dict(zip(keys, row, strict=True)) for row in result.result_set]


def _node_status(n: dict) -> str | None:
    """Node colour for the canvas: explicit status wins, then resolved > impacted, versions by validity."""
    if n["status"]:
        return n["status"]
    if n["kind"] == "FactVersion":
        return "stale" if n["valid_to"] is not None else "current"
    if n["resolved"]:
        return "resolved"
    return "impacted" if n["impacted"] else None


@app.get("/api/health")
def health() -> dict:
    return {"ok": True}


@app.get("/api/tenants")
def tenants() -> list[dict]:
    return TENANTS


@app.get("/api/graph")
def graph(tenant: str, change_id: str | None = None) -> dict:
    g = _graph(tenant)
    ids = None
    if change_id:
        scope = g.query(cypher("api_change_scope"), {"change_id": change_id}).result_set
        if not scope:
            raise HTTPException(404, f"unknown change {change_id!r}")
        ids = scope[0][0]
    nodes = [
        {"id": n["id"], "kind": n["kind"], "label": n["label"], "synthetic": bool(n["synthetic"]),
         "risk": n["risk"], "status": _node_status(n)}
        for n in _rows(g.query(cypher("api_nodes"), {"ids": ids}))
    ]  # fmt: skip
    links = _rows(g.query(cypher("api_links"), {"ids": ids}))
    return {"nodes": nodes, "links": links}


def _changes(tenant: str, change_id: str | None) -> list[dict]:
    rows = _rows(_graph(tenant).query(cypher("api_changes"), {"change_id": change_id}))
    for r in rows:
        r["status"] = CHANGE_STATUS.get(r["status"], r["status"])
    return rows


@app.get("/api/changes")
def changes(tenant: str) -> list[dict]:
    return [{k: v for k, v in r.items() if k not in ("before", "after")} for r in _changes(tenant, None)]


@app.get("/api/changes/{change_id}")
def change_detail(change_id: str, tenant: str) -> dict:
    rows = _changes(tenant, change_id)
    if not rows:
        raise HTTPException(404, f"unknown change {change_id!r}")
    return rows[0]


@app.get("/api/changes/{change_id}/impact")
def change_impact(change_id: str, tenant: str) -> dict:
    """TTH queue. After the Tracer ran it reads the IMPACTS edges; before that it ranks live
    (same impact + ranking code, nothing written), so the queue is never empty for a known change."""
    change_detail(change_id, tenant)  # 404 for unknown changes
    items = _rows(_graph(tenant).query(cypher("api_impact_queue"), {"change_id": change_id}))
    if not items:
        ranked = rank(tenant, impact_of(tenant, change_id=change_id), now=now_ms())
        flags = {n["id"]: n["synthetic"] for n in graph(tenant)["nodes"]}
        items = [
            {**{k: r[k] for k in IMPACT_KEYS}, "synthetic": flags.get(r["id"], False),
             "due_at": None, "status": "open", "task_id": None}
            for r in ranked
        ]  # fmt: skip
    for it in items:
        it["synthetic"] = bool(it["synthetic"])
    return {"change_id": change_id, "total_impacted": len(items), "items": items}


@app.get("/api/changes/{change_id}/coverage")
def change_coverage(change_id: str, tenant: str) -> dict:
    change_detail(change_id, tenant)
    return {"change_id": change_id, **coverage(tenant, change_id)}


@app.get("/api/explain")
def explain(tenant: str, from_: str = Query(alias="from"), to: str = Query()) -> dict:
    """Shortest "why" path, as id hops + relationship types + the Cypher that found it.

    Our dependency edges point dependent -> dependency (person -WAS_TOLD-> version), while the
    UI asks "from the change to X". So: a Change endpoint is replaced by its old version (and
    prepended back with its FROM edge), and if no path exists in the given direction we search
    the reverse and flip the result.
    """
    _graph(tenant)
    g = tenant_graph(tenant)
    head: list[str] = []
    src = from_
    old = g.query(cypher("change_versions"), {"change_id": from_}).result_set
    if old:
        head, src = [from_], old[0][0]
    res = explain_path(tenant, to, src)  # dependent -> dependency, then flip to read from the change
    hops = [h["id"] for h in reversed(res["hops"])]
    via = list(reversed(res["via"]))
    if not hops:
        res = explain_path(tenant, src, to)
        hops, via = [h["id"] for h in res["hops"]], list(res["via"])
    if head and hops:
        hops, via = head + hops, ["FROM", *via]
    return {"hops": hops, "via": via, "cypher": res["cypher"].strip()}


class AskRequest(BaseModel):
    tenant: str
    person_id: str
    question: str


@app.post("/api/ask")
def ask(req: AskRequest) -> dict:
    _graph(req.tenant)
    try:
        res = concierge.ask(req.tenant, req.person_id, req.question)
    except concierge.UnknownTopic as e:
        raise HTTPException(422, f"no policy fact matches this question: {e}") from e
    except KeyError as e:
        raise HTTPException(404, str(e)) from e
    sent = event("answer.sent", req.tenant, now_ms(), answer_id=res["answer_id"], person_id=req.person_id,
                 version_ids=res["versions"], earlier_told=res["earlier_told"])  # fmt: skip
    bus.publish([sent])
    return res


@app.get("/api/stream")
async def stream(tenant: str):
    """SSE: one ``data: <envelope json>`` message per agent event (default event name, so the
    browser's ``EventSource.onmessage`` receives it). Pings every 15 s keep proxies open."""
    _graph(tenant)
    queue = bus.subscribe(tenant)

    async def gen():
        try:
            while True:
                ev = await queue.get()
                yield {"data": json.dumps(ev)}
        except asyncio.CancelledError:
            raise
        finally:
            bus.unsubscribe(tenant, queue)

    return EventSourceResponse(gen(), ping=15)
