"""Replaying C1 produces IMPACTS + prioritised tasks (issue #27 acceptance)."""

from collections import Counter

from agents import sentinel, tracer
from ingest.synthetic import DEMO_NOW_MS
from tests.graph.conftest import requires_falkordb
from tests.graph.seeded import load_demo

pytestmark = requires_falkordb


def test_replay_c1_then_trace(g, tenant):
    load_demo(tenant)
    ev = sentinel.replay(tenant, "chg:c1", now=DEMO_NOW_MS)
    assert [e["type"] for e in ev] == ["change.detected", "task.created"]
    assert ev[0]["payload"]["new_version"] == "fv:vpn:v2"

    events = tracer.run(tenant, now=DEMO_NOW_MS)
    types = Counter(e["type"] for e in events)
    assert types["impact.computed"] == 1 and types["task.done"] == 1

    impacts = g.query(
        "MATCH (:Change {id:'chg:c1'})-[i:IMPACTS]->(x) RETURN count(i), max(i.risk)"
    ).result_set
    assert impacts[0][0] == 24 and impacts[0][1] >= 1.0

    tasks = g.query(
        "MATCH (t:Task {status: 'open'})-[:TARGETS]->(x) "
        "RETURN t.task_kind, x.id, t.priority ORDER BY t.priority"
    ).result_set
    kinds = Counter(r[0] for r in tasks)
    assert kinds == {"reanswer": 13, "fix_doc": 5, "replan": 1, "notify": 2}
    # top-risk items are the two AP actions (covered by the plan replan), so the agent comes first
    assert tasks[0] == ["reanswer", "agent:ap-approver", 1]
    status = g.query("MATCH (c:Change {id:'chg:c1'}) RETURN c.status").result_set[0][0]
    assert status == "resolving"
    assert tracer.run(tenant, now=DEMO_NOW_MS) == []  # nothing left to trace


def test_task_kind_rules():
    assert tracer.task_kind_for("Action", []) is None
    assert tracer.task_kind_for("Plan", ["DEPENDS_ON"]) == "replan"
    assert tracer.task_kind_for("Doc", ["CITES"]) == "fix_doc"
    assert tracer.task_kind_for("Person", ["WAS_TOLD"]) == "reanswer"
    assert tracer.task_kind_for("Person", []) == "notify"
