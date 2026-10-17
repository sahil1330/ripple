"""FastAPI endpoints against a real FalkorDB, validated against contracts/openapi.yaml (issue #17).

Each test runs on a throwaway tenant loaded with the demo data and walks the C1 scenario the
way the UI does: ask -> Sentinel -> Tracer -> worker guard -> Fixer -> ask again.
"""

from __future__ import annotations

import json
import threading

import pytest
from fastapi.testclient import TestClient

from agents import fixer, sentinel, tracer, workers
from agents.events import EVENT_TYPES
from api import bus
from api import main as api_main
from ingest.synthetic import DEMO_NOW_MS
from tests.contracts.openapi_schema import validate
from tests.graph.conftest import g, requires_falkordb, tenant  # noqa: F401 (pytest fixtures)
from tests.graph.seeded import load_demo

pytestmark = requires_falkordb


@pytest.fixture
def client(g, tenant, monkeypatch):  # noqa: F811
    monkeypatch.setenv("RIPPLE_NOW_MS", str(DEMO_NOW_MS))
    monkeypatch.setattr(api_main, "TENANTS", [*api_main.TENANTS, {"id": tenant, "name": "test"}])
    load_demo(tenant)
    return TestClient(api_main.app)


def run_c1(tenant: str) -> list[dict]:  # noqa: F811
    events = sentinel.replay(tenant, "chg:c1", now=DEMO_NOW_MS)
    events += tracer.run(tenant, now=DEMO_NOW_MS)
    events += workers.run_all(tenant, now=DEMO_NOW_MS, guard=workers.direct_guard)
    return events + fixer.run(tenant, now=DEMO_NOW_MS)


def test_static_endpoints(client):
    assert client.get("/api/health").json() == {"ok": True}
    validate(client.get("/api/tenants").json(), array_of="Tenant")
    assert client.get("/api/graph", params={"tenant": "nope"}).status_code == 404


def test_graph_and_changes_before_replay(client, tenant):  # noqa: F811
    graph = client.get("/api/graph", params={"tenant": tenant}).json()
    validate(graph, "GraphResponse")
    kinds = {n["kind"] for n in graph["nodes"]}
    assert {"Person", "Agent", "Doc", "FactVersion", "Plan", "Action"} <= kinds
    assert not any(link["type"] == "FEEDS" for link in graph["links"])
    changes = client.get("/api/changes", params={"tenant": tenant}).json()
    validate(changes, array_of="ChangeSummary")
    assert "chg:c1" not in {c["id"] for c in changes}  # C1 is pending until the Sentinel replays it
    assert client.get("/api/changes/chg:c1", params={"tenant": tenant}).status_code == 404
    # live-mode UI loads chg:c1 views right after a reset: pending change -> whole graph, empty queue
    q = {"tenant": tenant}
    scoped = client.get("/api/graph", params={**q, "change_id": "chg:c1"}).json()
    assert len(scoped["nodes"]) == len(graph["nodes"])
    impact = client.get("/api/changes/chg:c1/impact", params=q).json()
    validate(impact, "ImpactResponse")
    assert impact["total_impacted"] == 0
    cov = client.get("/api/changes/chg:c1/coverage", params=q).json()
    validate(cov, "CoverageResponse")
    assert cov["pct"] == 0.0
    assert client.get("/api/changes/chg:nope/impact", params=q).status_code == 404


def test_full_c1_flow(client, tenant):  # noqa: F811
    q = {"tenant": tenant}
    first = client.post(
        "/api/ask", json={**q, "person_id": "person:priya", "question": "Can I expense my ExpressVPN?"}
    )
    validate(first.json(), "AskResponse")
    assert first.json()["versions"] == ["fv:vpn:v1"]

    sentinel.replay(tenant, "chg:c1", now=DEMO_NOW_MS)
    detail = client.get("/api/changes/chg:c1", params=q).json()
    validate(detail, "ChangeDetail")
    assert detail["status"] == "detected" and detail["before"]["version_id"] == "fv:vpn:v1"
    assert detail["after"]["value"].startswith("not reimbursable")
    live = client.get("/api/changes/chg:c1/impact", params=q).json()  # ranked live before the Tracer
    validate(live, "ImpactResponse")
    assert live["total_impacted"] == 24

    tracer.run(tenant, now=DEMO_NOW_MS)
    workers.run_all(tenant, now=DEMO_NOW_MS, guard=workers.direct_guard)
    impact = client.get("/api/changes/chg:c1/impact", params=q).json()
    validate(impact, "ImpactResponse")
    assert impact["total_impacted"] == 24
    assert [i["risk"] for i in impact["items"]] == sorted((i["risk"] for i in impact["items"]), reverse=True)
    vpn = next(i for i in impact["items"] if i["id"] == "act:approve-vpn-priya")
    assert vpn["status"] == "blocked" and vpn["task_id"]
    cov = client.get("/api/changes/chg:c1/coverage", params=q).json()
    validate(cov, "CoverageResponse")
    assert cov["pct"] == 0.0 and cov["impacted"] == 24

    scoped = client.get("/api/graph", params={**q, "change_id": "chg:c1"}).json()
    validate(scoped, "GraphResponse")
    ids = {n["id"] for n in scoped["nodes"]}
    assert {"chg:c1", "fv:vpn:v1", "fv:vpn:v2", "person:priya"} <= ids and len(ids) == 24 + 4
    priya = next(n for n in scoped["nodes"] if n["id"] == "person:priya")
    assert priya["status"] == "impacted" and priya["risk"] > 0

    why = client.get("/api/explain", params={**q, "from": "chg:c1", "to": "person:priya"}).json()
    validate(why, "ExplainResponse")
    assert why["hops"] == ["chg:c1", "fv:vpn:v1", "person:priya"] and why["via"] == ["FROM", "WAS_TOLD"]

    fixer.run(tenant, now=DEMO_NOW_MS)
    cov = client.get("/api/changes/chg:c1/coverage", params=q).json()
    assert cov["pct"] == 100.0
    statuses = {c["id"]: c["status"] for c in client.get("/api/changes", params=q).json()}
    assert statuses["chg:c1"] == "resolved"
    again = client.post(
        "/api/ask", json={**q, "person_id": "person:priya", "question": "Can I expense my ExpressVPN?"}
    )
    body = again.json()
    validate(body, "AskResponse")
    assert body["versions"] == ["fv:vpn:v2"] and body["earlier_told"]["version_id"] == "fv:vpn:v1"


def test_ask_unknown_topic(client, tenant):  # noqa: F811
    r = client.post("/api/ask", json={"tenant": tenant, "person_id": "person:priya", "question": "Weather?"})
    assert r.status_code == 422


def test_agent_events_match_contract(tenant, g):  # noqa: F811
    """Every event the agents emit for C1 is a valid SseEnvelope with a registered type."""
    load_demo(tenant)
    events = run_c1(tenant)
    assert {e["type"] for e in events} >= set(EVENT_TYPES)
    for e in events:
        validate(e, "SseEnvelope")
        json.dumps(e)  # serialisable for SSE


def test_stream_delivers_published_events(tenant, monkeypatch):  # noqa: F811
    """A published event arrives on /api/stream as one ``data:`` line with the envelope.

    Runs a real uvicorn server on a free port (the SSE stream never ends, which the in-process
    TestClient cannot cut off cleanly)."""
    import socket
    import time

    import httpx
    import uvicorn

    monkeypatch.setattr(api_main, "TENANTS", [*api_main.TENANTS, {"id": tenant, "name": "test"}])
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]
    server = uvicorn.Server(uvicorn.Config(api_main.app, port=port, log_level="warning"))
    threading.Thread(target=server.run, daemon=True).start()
    while not server.started:
        time.sleep(0.05)
    ev = {"type": "coverage.updated", "at": DEMO_NOW_MS, "tenant": tenant,
          "payload": {"change_id": "chg:c1", "impacted": 1, "resolved": 1, "pct": 100.0}}  # fmt: skip
    try:
        url = f"http://127.0.0.1:{port}/api/stream"
        with httpx.stream("GET", url, params={"tenant": tenant}, timeout=5) as resp:
            assert resp.headers["content-type"].startswith("text/event-stream")
            threading.Timer(0.3, bus.publish, args=([ev],)).start()
            for line in resp.iter_lines():
                if line.startswith("data:"):
                    assert json.loads(line[5:].strip()) == ev
                    break
    finally:
        server.should_exit = True


def test_ask_without_person_and_trace_fields(client, tenant, monkeypatch):  # noqa: F811
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    r = client.post("/api/ask", json={"tenant": tenant, "question": "Can I expense my ExpressVPN?"})
    body = r.json()
    validate(body, "AskResponse")
    assert r.status_code == 200 and body["llm_used"] is False and body["earlier_told"] is None
    assert body["tool_trace"][0]["cypher"] and body["fallback_reason"] == "OPENAI_API_KEY not set"
