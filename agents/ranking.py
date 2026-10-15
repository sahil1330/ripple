"""Time-to-harm (TTH) ranking of a change's impact set (plan §5).

    risk(x) = severity(kind) × urgency(x) × (1 + reach(x))

* severity: how bad it is if x acts on the stale fact. A pending Action that moves money
  or sends messages is worst (1.0); a Doc is mildest (0.4).
* urgency = 1 / max(1 h, time until x's deadline), in 1/hours. Actions/Plans have their own
  deadline; people and agents inherit the soonest one they own; others default to 24 h.
* reach: normalised PageRank for Docs (real handbook links), normalised betweenness over
  FEEDS for everything else, so hubs that relay the stale fact rank higher.

Every factor is returned, so the UI can explain "first because it auto-approves in 40 min".
"""

from __future__ import annotations

from graph.client import tenant_graph
from graph.cypher import cypher

HOUR_MS = 3_600_000
DEFAULT_HORIZON_MS = 24 * HOUR_MS
SEVERITY = {
    "Action": 1.0,
    "Plan": 0.7,
    "Agent": 0.6,  # a stale agent repeats the error to many people
    "DerivedFact": 0.6,
    "Person": 0.5,
    "Doc": 0.4,
}
DEFAULT_SEVERITY = 0.3


def _normalised(scores: dict[str, float]) -> dict[str, float]:
    top = max(scores.values(), default=0.0)
    return {k: v / top for k, v in scores.items()} if top > 0 else {}


def reach_scores(tenant: str) -> dict[str, float]:
    """id -> reach in [0, 1]: PageRank for Docs, betweenness on FEEDS for the rest."""
    g = tenant_graph(tenant)
    pr = {r[0]: r[2] for r in g.query(cypher("algo_pagerank_docs")).result_set}
    bc = dict(g.query(cypher("algo_betweenness_feeds")).result_set)
    return {**_normalised(bc), **_normalised(pr)}  # docs: PageRank wins


def deadlines(tenant: str, ids: list[str]) -> dict[str, int | None]:
    """id -> soonest deadline (epoch ms) from tth_due.cypher, or None."""
    rows = tenant_graph(tenant).query(cypher("tth_due"), {"ids": ids}).result_set
    out = {}
    for eid, own_due, owned in rows:
        candidates = [d for d in [own_due, *owned] if d is not None]
        out[eid] = min(candidates) if candidates else None
    return out


def score(kind: str, due_at: int | None, reach: float, now: int) -> dict:
    """Factor breakdown for one entity. Pure function: easy to unit-test and explain."""
    tth_ms = (due_at - now) if due_at is not None else DEFAULT_HORIZON_MS
    urgency = 1.0 / max(1.0, tth_ms / HOUR_MS)
    severity = SEVERITY.get(kind, DEFAULT_SEVERITY)
    risk = severity * urgency * (1.0 + reach)
    return {
        "severity": severity,
        "urgency": round(urgency, 4),
        "reach": round(reach, 4),
        "risk": round(risk, 4),
        "tth_ms": tth_ms,
    }


def rank(tenant: str, impacted: list[dict], now: int) -> list[dict]:
    """Rank ``impacted`` rows (from ``graph.impact.impact_of``) by risk, highest first.

    Each row gains severity / urgency / reach / risk / tth_ms. Ties break on hops, then id.
    """
    reach = reach_scores(tenant)
    due = deadlines(tenant, [r["id"] for r in impacted])
    ranked = [{**r, **score(r["kind"], due.get(r["id"]), reach.get(r["id"], 0.0), now)} for r in impacted]
    ranked.sort(key=lambda r: (-r["risk"], r["hops"], r["id"]))
    return ranked
