"""Impact radius on the seeded demo graph (C1 = personal VPN)."""

import time
from collections import Counter

from graph.cypher import cypher
from graph.impact import impact_of, write_impacts
from ingest.handbook_changes import apply_change
from tests.graph.conftest import requires_falkordb
from tests.graph.seeded import load_demo

pytestmark = requires_falkordb


def _c1(g, tenant):
    load_demo(tenant)
    apply_change(tenant, "chg:c1")


def test_c1_impact_set(g, tenant):
    _c1(g, tenant)
    rows = impact_of(tenant, change_id="chg:c1")
    kinds = Counter(r["kind"] for r in rows)
    ids = {r["id"] for r in rows}
    assert {"person:priya", "agent:ap-approver", "agent:it-helpdesk-bot", "act:approve-vpn-priya"} <= ids
    assert kinds["Person"] >= 11 and kinds["Agent"] == 2 and kinds["Plan"] == 1
    assert "fv:vpn:v2" not in ids  # the new version is never "impacted"
    hops = {r["id"]: r["hops"] for r in rows}
    assert hops["person:priya"] == 1 and hops["df:ap-vpn-rule"] == 1
    assert hops["plan:ap-queue"] == 2 and hops["act:approve-vpn-priya"] == 2


def test_bfs_matches_pure_cypher_variant(g, tenant):
    """(a) and (a') must agree on every node reachable without PART_OF/OWNS."""
    _c1(g, tenant)
    pure = {r[0]: r[3] for r in g.query(cypher("impact"), {"old_id": "fv:vpn:v1"}).result_set}
    bfs = {r["id"]: r["hops"] for r in impact_of(tenant, version_id="fv:vpn:v1")}
    for node_id, hops in pure.items():
        assert bfs[node_id] <= hops


def test_max_hops_filter_and_speed(g, tenant):
    _c1(g, tenant)
    start = time.perf_counter()
    rows = impact_of(tenant, change_id="chg:c1", max_hops=1)
    assert (time.perf_counter() - start) < 0.2
    assert rows and all(r["hops"] == 1 for r in rows)


def test_write_impacts_idempotent(g, tenant):
    _c1(g, tenant)
    rows = impact_of(tenant, change_id="chg:c1")
    assert write_impacts(tenant, "chg:c1", rows) == len(rows)
    write_impacts(tenant, "chg:c1", [{**r, "risk": 0.5} for r in rows])
    res = g.query("MATCH (:Change {id:'chg:c1'})-[i:IMPACTS]->() RETURN count(i), min(i.risk)").result_set
    assert res == [[len(rows), 0.5]]
