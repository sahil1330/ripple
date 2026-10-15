"""Task handoff: priority order, idempotent create, and no double claims under concurrency."""

import threading

from agents.tasks import claim_task, complete_task, create_task
from graph.client import tenant_graph
from ingest.handbook_changes import apply_change
from tests.graph.conftest import requires_falkordb
from tests.graph.seeded import load_demo

pytestmark = requires_falkordb
PEOPLE = [f"person:{i:02d}" for i in range(7, 24)]


def _setup(tenant, n_tasks: int):
    load_demo(tenant)
    apply_change(tenant, "chg:c1")
    for i, pid in enumerate(PEOPLE[:n_tasks]):
        create_task(tenant, "agent:tracer", "reanswer", "chg:c1", pid, priority=i, now=1)


def test_claim_order_create_idempotent_and_complete(g, tenant):
    _setup(tenant, 3)
    create_task(tenant, "agent:tracer", "reanswer", "chg:c1", PEOPLE[0], priority=0, now=2)  # same id again
    assert g.query("MATCH (t:Task) RETURN count(t)").result_set[0][0] == 3
    first = claim_task(tenant, "agent:fixer", ["reanswer"], now=10)
    assert first["target_id"] == PEOPLE[0] and first["status"] == "claimed" and first["change_id"] == "chg:c1"
    assert claim_task(tenant, "agent:fixer", ["fix_doc"], now=10) is None  # wrong kind
    assert complete_task(tenant, "agent:concierge", first["id"], "nope") is False  # not the claimer
    assert complete_task(tenant, "agent:fixer", first["id"], "reanswered") is True
    row = g.query("MATCH (a:Agent)-[:CLAIMED]->(t:Task {id: $id}) RETURN a.id, t.status", {"id": first["id"]})
    assert row.result_set == [["agent:fixer", "done"]]


def test_two_agents_never_claim_the_same_task(g, tenant):
    n = 12
    _setup(tenant, n)
    claimed: dict[str, list[str]] = {"agent:fixer": [], "agent:concierge": []}
    barrier = threading.Barrier(2)

    def worker(agent_id):
        tenant_graph(tenant)  # warm the shared client
        barrier.wait()
        while (task := claim_task(tenant, agent_id, ["reanswer"])) is not None:
            claimed[agent_id].append(task["id"])

    threads = [threading.Thread(target=worker, args=(a,)) for a in claimed]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    all_ids = claimed["agent:fixer"] + claimed["agent:concierge"]
    assert len(all_ids) == n and len(set(all_ids)) == n  # every task once, none twice
    edges = g.query("MATCH (:Agent)-[c:CLAIMED]->(t:Task) RETURN t.id, count(c)").result_set
    assert all(cnt == 1 for _, cnt in edges)
