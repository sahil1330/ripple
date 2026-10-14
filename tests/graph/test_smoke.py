"""FalkorDB Cypher smoke tests for the plan §4.4 syntax uncertainties.

Each test pins down one behaviour our queries rely on. Results are written up in
``graph/NOTES.md``; if a test here starts failing after a FalkorDB upgrade, the
matching query in ``graph/queries/`` needs its fallback.

Mini graph used by most tests (FEEDS = dependency -> dependent, w=1)::

    (v1:FactVersion) <-STATES- (d1:Doc) <-DEPENDS_ON- (p1:Plan)
    (v1) <-WAS_TOLD- (u1:Person) -TALKS_WITH-> (u2:Person)      (u3:Person) alone
    FEEDS: v1->d1, d1->p1, v1->u1
"""

import pytest

from tests.graph.conftest import requires_falkordb

pytestmark = requires_falkordb

SEED = """
CREATE (v1:Entity:FactVersion {id:'v1', kind:'FactVersion'}),
       (d1:Entity:Doc {id:'d1', kind:'Doc'}),
       (p1:Entity:Plan {id:'p1', kind:'Plan'}),
       (u1:Entity:Person {id:'u1', kind:'Person'}),
       (u2:Entity:Person {id:'u2', kind:'Person'}),
       (u3:Entity:Person {id:'u3', kind:'Person'}),
       (d1)-[:STATES]->(v1), (p1)-[:DEPENDS_ON]->(d1), (u1)-[:WAS_TOLD {at: 1}]->(v1),
       (u1)-[:TALKS_WITH {weight: 1}]->(u2),
       (v1)-[:FEEDS {w:1}]->(d1), (d1)-[:FEEDS {w:1}]->(p1), (v1)-[:FEEDS {w:1}]->(u1)
"""


@pytest.fixture
def seeded(g):
    g.query(SEED)
    return g


def rows(g, q, params=None):
    return g.query(q, params or {}).result_set


def test_return_one(g):
    assert rows(g, "RETURN 1")[0][0] == 1


def test_multi_type_variable_length(seeded):
    """Relationship-type alternation with a var-length range works (query a)."""
    got = rows(seeded, "MATCH ({id:'v1'})<-[:STATES|DEPENDS_ON|WAS_TOLD*1..6]-(x) RETURN x.id")
    assert {r[0] for r in got} == {"d1", "p1", "u1"}


BFS = "MATCH (o {id:'%s'}) CALL algo.bfs(o, 6, 'FEEDS') YIELD nodes UNWIND nodes AS n RETURN n.id"


def test_bfs_is_outgoing_and_excludes_start(seeded):
    """algo.bfs follows outgoing edges only and does not return the start node."""
    got = rows(seeded, BFS % "v1")
    assert {r[0] for r in got} == {"d1", "p1", "u1"}
    mid = rows(seeded, BFS % "d1")
    assert [r[0] for r in mid] == ["p1"]  # nothing upstream (v1) is visited


@pytest.mark.parametrize("proc", ["algo.WCC", "algo.wcc"])
def test_wcc_both_spellings(seeded, proc):
    got = rows(
        seeded,
        f"CALL {proc}({{nodeLabels:['Person'], relationshipTypes:['TALKS_WITH']}}) "
        "YIELD node, componentId RETURN node.id, componentId",
    )
    comp = {r[0]: r[1] for r in got}
    assert comp["u1"] == comp["u2"] != comp["u3"]


def test_sspaths_pathcount_is_global(seeded):
    """SSpaths `pathCount` limits the TOTAL number of paths, not per target. Use a large pathCount."""
    q = (
        "MATCH (o {id:'v1'}) CALL algo.SSpaths({sourceNode:o, relTypes:['FEEDS'], weightProp:'w', "
        "maxLen:6, relDirection:'outgoing', pathCount:%d}) YIELD path, pathWeight "
        "RETURN last(nodes(path)).id, pathWeight"
    )
    assert len(rows(seeded, q % 1)) == 1
    got = {r[0]: r[1] for r in rows(seeded, q % 1000)}
    assert got == {"d1": 1.0, "p1": 2.0, "u1": 1.0}


def test_sppaths_between_two_nodes(seeded):
    got = rows(
        seeded,
        "MATCH (s {id:'v1'}), (t {id:'p1'}) "
        "CALL algo.SPpaths({sourceNode:s, targetNode:t, relTypes:['FEEDS'], "
        "weightProp:'w', relDirection:'outgoing', pathCount:1}) YIELD path, pathWeight "
        "RETURN [n IN nodes(path) | n.id], pathWeight",
    )
    assert got == [[["v1", "d1", "p1"], 2.0]]


def test_zero_length_var_pattern(seeded):
    """`*0..n` includes the start node itself (used by check_fresh)."""
    got = rows(seeded, "MATCH ({id:'p1'})-[:DEPENDS_ON]->(d) MATCH (d)-[:STATES*0..5]->(f) RETURN f.id")
    assert {r[0] for r in got} == {"d1", "v1"}


def test_labels_in_where_and_label_order(seeded):
    got = rows(seeded, "MATCH (x) WHERE 'Doc' IN labels(x) OR 'Plan' IN labels(x) RETURN x.id")
    assert {r[0] for r in got} == {"d1", "p1"}
    # Label order follows creation order, but we still use the `kind` property for grouping.
    assert rows(seeded, "MATCH (x {id:'d1'}) RETURN labels(x)")[0][0] == ["Entity", "Doc"]


def test_shortest_path_multi_type(seeded):
    got = rows(
        seeded,
        "MATCH (s {id:'p1'}), (t {id:'v1'}) "
        "WITH shortestPath((s)-[:DEPENDS_ON|STATES|WAS_TOLD*1..8]->(t)) AS p "
        "RETURN [r IN relationships(p) | type(r)]",
    )
    assert got == [[["DEPENDS_ON", "STATES"]]]


def test_pagerank_and_betweenness(seeded):
    pr = rows(seeded, "CALL algo.pageRank('Entity', 'FEEDS') YIELD node, score RETURN node.id, score")
    assert len(pr) == 6 and all(r[1] >= 0 for r in pr)
    bc = rows(
        seeded,
        "CALL algo.betweenness({nodeLabels:['Entity'], relationshipTypes:['FEEDS'], samplingSize:64, "
        "samplingSeed:42}) YIELD node, score RETURN node.id, score",
    )
    scores = {r[0]: r[1] for r in bc}
    assert max(scores, key=scores.get) == "d1"  # only d1 sits between v1 and p1


def test_atomic_claim_second_writer_gets_no_row(g):
    """Conditional SET pattern used for Task claims: the second claim returns no row."""
    g.query("CREATE (:Entity:Task {id:'t1', status:'open'})")
    claim = "MATCH (t:Task {id:'t1', status:'open'}) SET t.status='claimed' RETURN t.id"
    assert rows(g, claim) == [["t1"]]
    assert rows(g, claim) == []


def test_counting_with_relationship_alias(seeded):
    got = rows(seeded, "MATCH (x)-[r:FEEDS]->() RETURN x.id, count(r) ORDER BY x.id")
    assert got == [["d1", 1], ["v1", 2]]


def test_index_create_twice_raises_already_indexed(g):
    """Second CREATE INDEX raises 'already indexed' -> graph/schema.py must swallow it."""
    g.query("CREATE INDEX FOR (e:Entity) ON (e.id)")
    with pytest.raises(Exception, match="already indexed"):
        g.query("CREATE INDEX FOR (e:Entity) ON (e.id)")
