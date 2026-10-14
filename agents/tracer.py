"""Tracer: turns a change into a prioritised work queue (plan §5).

``step`` claims one ``trace`` task, then:
1. computes the impact set of the change's old version (``graph.impact``),
2. ranks it by time-to-harm (``agents.ranking``) and writes ``IMPACTS`` edges,
3. opens one follow-up Task per impacted entity, in risk order:

   ============================  =========  ====================================
   impacted entity               task kind  why
   ============================  =========  ====================================
   Person told v1 (WAS_TOLD)     reanswer   Concierge re-answers with the new version
   Agent that CACHED v1          reanswer   refresh the agent's memory
   Doc that STATES / CITES v1    fix_doc    Fixer drafts a patch
   Plan relying on v1            replan     recompute derived facts, replace actions
   Action, DerivedFact           (none)     covered by the plan's replan / worker guard
   anyone else (owners)          notify     brief them
   ============================  =========  ====================================

4. marks the change ``resolving`` and completes the trace task.
"""

from __future__ import annotations

from agents.events import event
from agents.ranking import rank
from agents.tasks import claim_task, complete_task, create_task
from graph.client import tenant_graph
from graph.cypher import cypher
from graph.impact import impact_of, versions_of, write_impacts
from graph.tools import now_ms

AGENT_ID = "agent:tracer"
COVERED_BY_REPLAN = {"Action", "DerivedFact"}


def task_kind_for(kind: str, direct_rels: list[str]) -> str | None:
    """Which follow-up task an impacted entity needs (None = handled via its plan)."""
    if kind in COVERED_BY_REPLAN:
        return None
    if kind == "Plan":
        return "replan"
    if kind == "Doc" and ({"STATES", "CITES"} & set(direct_rels)):
        return "fix_doc"
    if kind in ("Person", "Agent") and ({"WAS_TOLD", "CACHED"} & set(direct_rels)):
        return "reanswer"
    return "notify"


def trace(tenant: str, change_id: str, now: int) -> tuple[list[dict], list[dict]]:
    """Impact + ranking + IMPACTS + follow-up tasks for one change. Returns (ranked, events)."""
    g = tenant_graph(tenant)
    old_id, _ = versions_of(tenant, change_id)
    ranked = rank(tenant, impact_of(tenant, change_id=change_id), now=now)
    write_impacts(tenant, change_id, ranked)
    rels = dict(
        g.query(cypher("direct_exposure"), {"ids": [r["id"] for r in ranked], "old_id": old_id}).result_set
    )
    by_kind: dict[str, int] = {}
    for r in ranked:
        by_kind[r["kind"]] = by_kind.get(r["kind"], 0) + 1
    events = [
        event("impact.computed", tenant, now, change_id=change_id, impacted=len(ranked), by_kind=by_kind)
    ]
    priority = 1
    for r in ranked:
        kind = task_kind_for(r["kind"], rels.get(r["id"], []))
        if kind is None:
            continue
        tid = create_task(
            tenant, AGENT_ID, kind, change_id, r["id"], priority=priority, risk=r["risk"], now=now
        )
        events.append(event("task.created", tenant, now, task_id=tid, kind=kind, priority=priority,
                            risk=r["risk"], target_id=r["id"]))  # fmt: skip
        priority += 1
    g.query(cypher("change_set_status"), {"change_id": change_id, "status": "resolving"})
    return ranked, events


def step(tenant: str, now: int | None = None) -> list[dict]:
    """Claim and process one trace task. Returns events ([] when there is nothing to trace)."""
    at = now_ms() if now is None else now
    task = claim_task(tenant, AGENT_ID, ["trace"], now=at)
    if task is None:
        return []
    events = [event("task.claimed", tenant, at, task_id=task["id"], agent_id=AGENT_ID)]
    ranked, traced = trace(tenant, task["change_id"], at)
    events += traced
    complete_task(tenant, AGENT_ID, task["id"], f"{len(ranked)} impacted", now=at)
    events.append(event("task.done", tenant, at, task_id=task["id"], agent_id=AGENT_ID, outcome="traced"))
    return events


def run(tenant: str, now: int | None = None) -> list[dict]:
    """Loop until no trace task is open."""
    events: list[dict] = []
    while batch := step(tenant, now):
        events += batch
    return events
