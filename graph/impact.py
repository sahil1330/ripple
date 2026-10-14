"""Impact radius of a change (plan §4.4 a/a') and the IMPACTS writer.

``impact_of`` answers "who and what still relies on the old version?". It walks the
materialised ``FEEDS`` edges with ``algo.bfs`` (one FalkorDB call, outgoing only)
and returns each impacted entity with its hop distance. ``write_impacts`` stores
the result (plus the Tracer's risk scores) as ``(:Change)-[:IMPACTS]->(x)`` edges,
which the coverage meter and UI read.
"""

from __future__ import annotations

from graph.client import tenant_graph
from graph.cypher import cypher

MAX_HOPS = 6  # fixed depth inside the .cypher files


def versions_of(tenant: str, change_id: str) -> tuple[str, str]:
    """(old_version_id, new_version_id) of a change."""
    rows = tenant_graph(tenant).query(cypher("change_versions"), {"change_id": change_id}).result_set
    if not rows:
        raise KeyError(f"unknown change {change_id!r}")
    return rows[0][0], rows[0][1]


def impact_of(
    tenant: str, change_id: str | None = None, version_id: str | None = None, max_hops: int = MAX_HOPS
) -> list[dict]:
    """Entities relying on the old version: ``[{id, kind, label, hops}]`` ordered by hops.

    Pass ``change_id`` (uses its FROM version) or ``version_id`` directly.
    """
    if (change_id is None) == (version_id is None):
        raise ValueError("pass exactly one of change_id / version_id")
    old_id = version_id or versions_of(tenant, change_id)[0]
    rows = tenant_graph(tenant).query(cypher("impact_bfs"), {"old_id": old_id}).result_set
    return [
        {"id": r[0], "kind": r[1], "label": r[2], "hops": r[3]}
        for r in rows
        if r[3] <= min(max_hops, MAX_HOPS)
    ]


def write_impacts(tenant: str, change_id: str, rows: list[dict]) -> int:
    """Store IMPACTS edges. Each row needs ``id`` and ``hops``; risk fields are optional (set by Tracer)."""
    defaults = {"risk": None, "tth_ms": None, "severity": None, "urgency": None, "reach": None}
    payload = [{**defaults, **{k: r[k] for k in r if k in defaults or k in ("id", "hops")}} for r in rows]
    res = tenant_graph(tenant).query(cypher("write_impacts"), {"change_id": change_id, "rows": payload})
    return res.result_set[0][0] if res.result_set else 0
