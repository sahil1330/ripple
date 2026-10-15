"""Graph algorithms as agent tools (plan §4.4 f, MCP tools rank_amplifiers / dark_pockets).

* ``rank_amplifiers``: which impacted entities spread a stale fact furthest.
  ``pagerank`` ranks impacted Docs by authority in the real handbook link graph;
  ``betweenness`` ranks every impacted entity by how much stale information flows
  through it on the FEEDS graph (exact, no sampling -> deterministic).
* ``dark_pockets``: chat communities (WCC on TALKS_WITH) that contain someone
  impacted but where nobody has RESOLVED the change yet. For each, ``hub_id`` is the
  member with the highest TALKS_WITH betweenness: brief them and the news spreads.
"""

from __future__ import annotations

from graph.client import tenant_graph
from graph.cypher import cypher
from graph.impact import impact_of

ALGOS = ("pagerank", "betweenness")


def rank_amplifiers(tenant: str, change_id: str, algo: str = "betweenness", k: int = 10) -> list[dict]:
    """Top-``k`` impacted entities by PageRank (Docs) or FEEDS betweenness: ``[{id, label, score}]``."""
    if algo not in ALGOS:
        raise ValueError(f"algo must be one of {ALGOS}")
    g = tenant_graph(tenant)
    impacted = {r["id"]: r for r in impact_of(tenant, change_id=change_id)}
    if algo == "pagerank":
        rows = g.query(cypher("algo_pagerank_docs")).result_set
        scores = {r[0]: r[2] for r in rows}
    else:
        scores = dict(g.query(cypher("algo_betweenness_feeds")).result_set)
    ranked = [
        {"id": eid, "label": impacted[eid]["label"], "score": round(float(s), 6)}
        for eid, s in scores.items()
        if eid in impacted and s > 0
    ]
    ranked.sort(key=lambda r: (-r["score"], r["id"]))
    return ranked[: max(1, min(k, 50))]


def dark_pockets(tenant: str, change_id: str) -> list[dict]:
    """``[{component_id, members, hub_id}]`` for impacted chat communities with zero RESOLVED members."""
    g = tenant_graph(tenant)
    impacted = {r["id"] for r in impact_of(tenant, change_id=change_id) if r["kind"] == "Person"}
    resolved = {r[0] for r in g.query(cypher("resolved_by"), {"change_id": change_id}).result_set}
    between = dict(g.query(cypher("algos_betweenness_people")).result_set)
    pockets = []
    for component_id, members in g.query(cypher("algos_wcc_people")).result_set:
        members = sorted(members)
        if not impacted.intersection(members) or resolved.intersection(members):
            continue
        hub = max(members, key=lambda m: (between.get(m, 0.0), m in impacted, m))
        pockets.append({"component_id": component_id, "members": members, "hub_id": hub})
    return pockets
