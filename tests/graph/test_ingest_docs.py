"""Real handbook Doc graph: STATES the current version, and algo.pageRank runs on LINKS_TO."""

from graph.cypher import cypher
from ingest import handbook_changes, handbook_docs
from tests.graph.conftest import requires_falkordb

pytestmark = requires_falkordb


def test_docs_graph_and_pagerank(g, tenant):
    handbook_changes.ingest(tenant, pending={"chg:c1"})
    counts = handbook_docs.ingest(tenant)
    assert counts["docs"] >= 30
    states = g.query("MATCH (:Doc {id: 'doc:hb:finance:expenses'})-[:STATES]->(v) RETURN v.id ORDER BY v.id")
    ids = [r[0] for r in states.result_set]
    assert "fv:vpn:v1" in ids  # C1 still pending -> the page states the $150 version
    assert "fv:cowork:v3" in ids
    top = g.query(cypher("algo_pagerank_docs")).result_set[:10]
    assert len(top) == 10 and top[0][2] >= top[-1][2] > 0
