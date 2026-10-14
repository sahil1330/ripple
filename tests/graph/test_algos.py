"""rank_amplifiers / dark_pockets on the seeded C1 graph: deterministic (fixed sampling seed)."""

from graph.algos import dark_pockets, rank_amplifiers
from ingest.handbook_changes import apply_change
from tests.graph.conftest import requires_falkordb
from tests.graph.seeded import load_demo

pytestmark = requires_falkordb


def _c1(tenant):
    load_demo(tenant)
    apply_change(tenant, "chg:c1")


def test_rank_amplifiers_is_deterministic(g, tenant):
    _c1(tenant)
    bc = rank_amplifiers(tenant, "chg:c1", "betweenness", k=5)
    assert bc == rank_amplifiers(tenant, "chg:c1", "betweenness", k=5)
    assert bc[0]["id"] == "df:ap-vpn-rule"  # the derived AP rule relays v1 to the plan, actions and agent
    pr = rank_amplifiers(tenant, "chg:c1", "pagerank", k=3)
    assert pr[0]["id"] == "doc:hb:finance:expenses"
    assert all(r["id"].startswith("doc:") for r in pr)


def test_dark_pockets_and_resolution(g, tenant):
    _c1(tenant)
    pockets = dark_pockets(tenant, "chg:c1")
    assert pockets == dark_pockets(tenant, "chg:c1")
    assert len(pockets) == 2  # nobody resolved yet: both chat communities with impacted people are dark
    sales = next(p for p in pockets if len(p["members"]) == 5)
    assert sales["hub_id"] in sales["members"]
    g.query(
        "MATCH (p:Person {id: $id}), (c:Change {id: 'chg:c1'}) CREATE (p)-[:RESOLVED {how: 'briefed'}]->(c)",
        {"id": sales["hub_id"]},
    )
    assert [len(p["members"]) for p in dark_pockets(tenant, "chg:c1")] == [19]
