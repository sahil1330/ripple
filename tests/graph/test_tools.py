"""who_holds / check_fresh / explain_path / coverage on the seeded demo graph."""

import pytest

from graph import tools
from graph.impact import impact_of, write_impacts
from ingest.handbook_changes import apply_change
from ingest.synthetic import DEMO_NOW_MS
from tests.graph.conftest import requires_falkordb
from tests.graph.seeded import load_demo

pytestmark = requires_falkordb


@pytest.fixture
def c1(g, tenant):
    """Demo graph right after Sentinel replayed C1."""
    load_demo(tenant)
    apply_change(tenant, "chg:c1")
    return tenant


def test_who_holds_before_and_after_change(g, tenant):
    load_demo(tenant)
    assert tools.who_holds(tenant, "fv:vpn:v1") == []  # still current -> nobody is "stale"
    apply_change(tenant, "chg:c1")
    holders = tools.who_holds(tenant, "fv:vpn:v1")
    people = [h for h in holders if h["kind"] == "Person"]
    agents = {h["id"] for h in holders if h["kind"] == "Agent"}
    assert len(people) == 11 and agents == {"agent:ap-approver", "agent:it-helpdesk-bot"}
    assert all(h["current_version"] == "fv:vpn:v2" for h in holders)
    priya = next(h for h in holders if h["id"] == "person:priya")
    assert priya["how"] == "WAS_TOLD" and isinstance(priya["at"], int)


def test_resolved_holder_drops_out(g, c1):
    g.query(
        "MATCH (p:Person {id:'person:priya'}), (c:Change {id:'chg:c1'}) "
        "CREATE (p)-[:RESOLVED {at: $at}]->(c)",
        {"at": DEMO_NOW_MS},
    )
    assert "person:priya" not in {h["id"] for h in tools.who_holds(c1, "fv:vpn:v1")}


def test_check_fresh_blocks_the_vpn_approval(g, c1):
    res = tools.check_fresh(c1, action_id="act:approve-vpn-priya", now=DEMO_NOW_MS)
    assert res["fresh"] is False
    (s,) = [x for x in res["stale"] if x["stale_version"] == "fv:vpn:v1"]
    assert s["via"] == "df:ap-vpn-rule" and s["current_version"] == "fv:vpn:v2"
    assert s["source"].endswith("/merge_requests/20421")


def test_check_fresh_respects_now_and_unrelated_plans(g, c1):
    before_change = DEMO_NOW_MS - 24 * 3600 * 1000
    assert tools.check_fresh(c1, action_id="act:approve-vpn-priya", now=before_change)["fresh"] is True
    # meals changed long ago (C2 ingested), so the offsite plan is stale too, via its derived budget
    off = tools.check_fresh(c1, plan_id="plan:offsite", now=DEMO_NOW_MS)
    assert [x["via"] for x in off["stale"]] == ["df:offsite-meals"]
    with pytest.raises(ValueError):
        tools.check_fresh(c1)


def test_explain_path_priya_and_owner(g, c1):
    res = tools.explain_path(c1, "person:priya", "fv:vpn:v1")
    assert res["via"] == ["WAS_TOLD"] and res["hops"][0]["label"] == "Priya Sharma"
    ravi = tools.explain_path(c1, "person:ravi", "fv:vpn:v1")
    assert ravi["via"] == ["OWNS", "DEPENDS_ON", "DERIVED_FROM"]
    assert "shortestPath" in ravi["cypher"]
    assert tools.explain_path(c1, "fv:vpn:v1", "person:priya")["hops"] == []


def test_coverage_counts(g, c1):
    rows = impact_of(c1, change_id="chg:c1")
    write_impacts(c1, "chg:c1", rows)
    cov = tools.coverage(c1, "chg:c1")
    assert cov["impacted"] == len(rows) and cov["resolved"] == 0 and cov["pct"] == 0.0
    g.query("MATCH (p:Person {id:'person:priya'}), (c:Change {id:'chg:c1'}) CREATE (p)-[:RESOLVED]->(c)")
    cov = tools.coverage(c1, "chg:c1")
    assert cov["by_kind"]["Person"]["resolved"] == 1
    assert cov["pct"] == round(100 / len(rows), 1)
