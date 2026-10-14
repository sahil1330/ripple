"""End-to-end C1: Sentinel -> Tracer -> worker guard -> Fixer reaches 100% coverage (issue #29)."""

from agents import fixer, sentinel, tracer, workers
from graph.tools import check_fresh, coverage, who_holds
from ingest.synthetic import DEMO_NOW_MS
from tests.graph.conftest import requires_falkordb
from tests.graph.seeded import load_demo

pytestmark = requires_falkordb


def _scenario(tenant):
    load_demo(tenant)
    sentinel.replay(tenant, "chg:c1", now=DEMO_NOW_MS)
    tracer.run(tenant, now=DEMO_NOW_MS)
    workers.run(tenant, "agent:ap-approver", now=DEMO_NOW_MS, guard=workers.direct_guard)


def test_c1_coverage_reaches_100(g, tenant):
    _scenario(tenant)
    assert coverage(tenant, "chg:c1")["pct"] == 0.0
    events = fixer.run(tenant, now=DEMO_NOW_MS + 60_000)
    pcts = [e["payload"]["pct"] for e in events if e["type"] == "coverage.updated"]
    assert pcts == sorted(pcts) and pcts[-1] == 100.0
    assert g.query("MATCH (c:Change {id:'chg:c1'}) RETURN c.status").result_set[0][0] == "resolved"
    assert who_holds(tenant, "fv:vpn:v1") == []  # nobody left believing the $150 rule
    assert fixer.step(tenant) == []  # queue empty


def test_fixer_effects(g, tenant):
    _scenario(tenant)
    events = fixer.run(tenant, now=DEMO_NOW_MS + 60_000)
    sent = [e["payload"] for e in events if e["type"] == "answer.sent"]
    priya = next(a for a in sent if a["person_id"] == "person:priya")
    assert priya["version_ids"] == ["fv:vpn:v2"] and priya["earlier_told"]["version_id"] == "fv:vpn:v1"
    # the AP plan no longer relies on the stale rule; the blocked $150 approval was cancelled
    assert check_fresh(tenant, plan_id="plan:ap-queue", now=DEMO_NOW_MS + 60_000)["fresh"] is True
    status = g.query("MATCH (a:Action {id:'act:approve-vpn-priya'}) RETURN a.status").result_set[0][0]
    assert status == "replanned"
    patch = g.query("MATCH (d:Doc {id:'doc:faq-remote'}) RETURN d.patch_draft").result_set[0][0]
    assert patch.startswith("### Remote work FAQ") and "+ Starting July 15, 2026" in patch
    real = g.query(
        "MATCH (:Doc {id:'doc:hb:finance:expenses'})-[:STATES]->(v {id:'fv:vpn:v2'}) RETURN count(v)"
    )
    assert real.result_set[0][0] == 1
    cached = g.query(
        "MATCH (:Agent {id:'agent:ap-approver'})-[:CACHED]->(v {id:'fv:vpn:v2'}) RETURN count(v)"
    )
    assert cached.result_set[0][0] == 1
