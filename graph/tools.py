"""Read-only graph tools (plan §4.4 b–e). The ripple-mcp server, the API and the agents all call these.

Return shapes follow ``contracts/mcp-tools.json``. Every query lives in ``graph/queries/``.
"""

from __future__ import annotations

import time

from graph.client import tenant_graph
from graph.cypher import cypher


def now_ms() -> int:
    return int(time.time() * 1000)


def who_holds(tenant: str, version_id: str) -> list[dict]:
    """People/agents still holding ``version_id`` after it was superseded (empty if it is current)."""
    rows = tenant_graph(tenant).query(cypher("who_holds"), {"version_id": version_id}).result_set
    keys = ("id", "name", "kind", "how", "at", "channel", "current_version")
    return [dict(zip(keys, r, strict=True)) for r in rows]


def check_fresh(
    tenant: str, plan_id: str | None = None, action_id: str | None = None, now: int | None = None
) -> dict:
    """Freshness guard: ``{fresh, stale: [...]}``. Worker agents call this before every action.

    ``now`` is epoch ms (pass the fixed demo clock in demo mode). A version only counts as stale
    once its ``valid_to`` is in the past relative to ``now``.
    """
    if (plan_id is None) == (action_id is None):
        raise ValueError("pass exactly one of plan_id / action_id")
    params = {"target_id": plan_id or action_id, "now": now_ms() if now is None else now}
    rows = tenant_graph(tenant).query(cypher("check_fresh"), params).result_set
    keys = ("via", "stale_version", "current_version", "stale_value", "current_value", "source")
    stale = [dict(zip(keys, r, strict=True)) for r in rows]
    return {"fresh": not stale, "stale": stale}


def explain_path(tenant: str, from_id: str, to_id: str) -> dict:
    """Shortest dependency path ``from_id -> ... -> to_id`` with the Cypher used (for the "Why?" drawer)."""
    query = cypher("explain_path")
    rows = tenant_graph(tenant).query(query, {"from_id": from_id, "to_id": to_id}).result_set
    if not rows:
        return {"hops": [], "via": [], "cypher": query}
    return {"hops": rows[0][0], "via": rows[0][1], "cypher": query}


def coverage(tenant: str, change_id: str) -> dict:
    """``{impacted, resolved, pct, by_kind}`` from IMPACTS and RESOLVED edges of a change."""
    rows = tenant_graph(tenant).query(cypher("coverage"), {"change_id": change_id}).result_set
    by_kind = {kind: {"impacted": imp, "resolved": res} for kind, imp, res in rows}
    impacted = sum(v["impacted"] for v in by_kind.values())
    resolved = sum(v["resolved"] for v in by_kind.values())
    pct = round(100.0 * resolved / impacted, 1) if impacted else 100.0
    return {"impacted": impacted, "resolved": resolved, "pct": pct, "by_kind": by_kind}
