"""Synthetic layer on top of the real handbook versions, checked with real FalkorDB algorithms."""

from ingest.handbook_changes import ingest
from ingest.synthetic import seed
from tests.graph.conftest import requires_falkordb

pytestmark = requires_falkordb


def test_seed_c1_impact_via_bfs(g, tenant):
    ingest(tenant, pending={"chg:c1"})
    counts = seed(tenant)
    assert counts["nodes"] == 94
    again = seed(tenant)  # idempotent: MERGE, no duplicates
    assert again == counts
    rows = g.query(
        "MATCH (old:FactVersion {id: 'fv:vpn:v1'}) CALL algo.bfs(old, 6, 'FEEDS') YIELD nodes "
        "UNWIND nodes AS n RETURN n.kind, count(n)"
    ).result_set
    by_kind = dict(rows)
    assert by_kind["Person"] >= 10 and by_kind["Agent"] >= 2 and by_kind["Plan"] >= 1
    pending = g.query(
        "MATCH (a:Action {status: 'pending'})-[:DEPENDS_ON]->(:DerivedFact)"
        "-[:DERIVED_FROM]->(:FactVersion {id: 'fv:vpn:v1'}) RETURN a.id"
    ).result_set
    assert pending == [["act:approve-vpn-priya"]]


def test_sales_is_a_separate_chat_component(g, tenant):
    ingest(tenant)
    seed(tenant)
    rows = g.query(
        "CALL algo.WCC({nodeLabels: ['Person'], relationshipTypes: ['TALKS_WITH']}) "
        "YIELD node, componentId RETURN componentId, count(node) ORDER BY count(node)"
    ).result_set
    assert [r[1] for r in rows] == [5, 19]
