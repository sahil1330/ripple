"""Loading C1–C5 into FalkorDB, with C1 held back and then replayed (Sentinel path)."""

from ingest.handbook_changes import apply_change, ingest
from tests.graph.conftest import requires_falkordb

pytestmark = requires_falkordb

CURRENT = "MATCH (:Fact {key: $key})-[:HAS_VERSION]->(v:FactVersion) WHERE v.valid_to IS NULL RETURN v.id"


def test_ingest_with_c1_pending(g, tenant):
    counts = ingest(tenant, pending={"chg:c1"})
    assert counts == {"facts": 5, "versions": 10, "changes": 5}
    cur = g.query(CURRENT, {"key": "expense.vpn.personal_subscription"}).result_set
    assert cur == [["fv:vpn:v1"]]  # before replay, the $150 rule is still current
    # co-working has a 3-version SUPERSEDES chain
    chain = g.query(
        "MATCH (:FactVersion {id:'fv:cowork:v3'})-[:SUPERSEDES*1..10]->(o) RETURN o.id ORDER BY o.id"
    )
    assert [r[0] for r in chain.result_set] == ["fv:cowork:v1", "fv:cowork:v2"]


def test_apply_change_replays_c1_idempotently(g, tenant):
    ingest(tenant, pending={"chg:c1"})
    for _ in range(2):
        apply_change(tenant, "chg:c1")
    cur = g.query(CURRENT, {"key": "expense.vpn.personal_subscription"}).result_set
    assert cur == [["fv:vpn:v2"]]
    row = g.query(
        "MATCH (c:Change {id:'chg:c1'})-[:FROM]->(o), (c)-[:TO]->(n)-[s:SUPERSEDES]->(o) "
        "RETURN o.valid_to = n.valid_from, c.status, count(s)"
    ).result_set
    assert row == [[True, "open", 1]]
    assert g.query("MATCH (n:Entity) RETURN count(n)").result_set[0][0] == 5 + 11 + 6
