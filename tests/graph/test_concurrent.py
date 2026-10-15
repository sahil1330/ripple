"""Two tenants isolated + concurrent agent run (issue #32)."""

from __future__ import annotations

import threading

from agents import concurrent
from graph.client import tenant_graph
from ingest import synthetic
from ingest.synthetic import DEMO_NOW_MS
from tests.graph.conftest import requires_falkordb

pytestmark = requires_falkordb


def _people(tenant):
    q = "MATCH (p:Person) RETURN p.name ORDER BY p.name"
    return [r[0] for r in tenant_graph(tenant).query(q).result_set]


def test_tenant_seeds_differ_offline():
    a = synthetic.generate(synthetic.TENANT_SEEDS["handbook-demo"])
    b = synthetic.generate(synthetic.TENANT_SEEDS["acme-synthetic"])
    assert {n["id"] for n in a.nodes if n["kind"] == "Person"} >= {"person:priya"}
    assert [n.get("name") for n in a.nodes] != [n.get("name") for n in b.nodes]


def test_two_tenants_run_concurrently_and_stay_isolated(tenant):
    a, b = f"{tenant}-a", f"{tenant}-b"
    seen: list[tuple[str, str]] = []
    lock = threading.Lock()

    def publish(events):
        with lock:
            seen.extend((e["tenant"], threading.current_thread().name) for e in events)

    try:
        concurrent.load(a)
        concurrent.load(b, seed=synthetic.TENANT_SEEDS["acme-synthetic"])  # a different company
        before_a = _people(a)
        summaries = concurrent.run_concurrently([a, b], now=DEMO_NOW_MS, publish=publish, reload=False)

        assert [s["tenant"] for s in summaries] == [a, b]
        assert all(s["coverage"]["pct"] == 100.0 for s in summaries)
        assert summaries[0]["thread"] != summaries[1]["thread"]  # really in parallel threads
        assert {t for t, _ in seen} == {a, b}
        # events of each tenant came from that tenant's own thread only
        threads = {t: {th for tt, th in seen if tt == t} for t in (a, b)}
        assert len(threads[a]) == len(threads[b]) == 1 and threads[a] != threads[b]

        # isolation: tenant A's graph is untouched by B's run and by B's extra people
        assert _people(a) == before_a
        assert set(_people(b)) - set(before_a)  # B has people A doesn't
        for t, summary in zip((a, b), summaries, strict=True):
            q = "MATCH (x)-[:RESOLVED]->(:Change {id: 'chg:c1'}) RETURN count(DISTINCT x)"
            assert tenant_graph(t).query(q).result_set[0][0] == summary["coverage"]["resolved"]
    finally:
        for t in (a, b):
            try:
                tenant_graph(t).delete()
            except Exception:  # noqa: BLE001
                pass
