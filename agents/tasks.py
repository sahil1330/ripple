"""Task handoff model (plan §5 "Shared state and handoffs").

Agents never call each other. They coordinate only through ``Task`` nodes in the tenant
graph:

1. ``create_task``: ``(creator)-[:CREATED]->(t:Task {status:'open'})-[:ABOUT]->(change)``
   and ``-[:TARGETS]->(entity)``. Ids are deterministic, so re-running a creator is safe.
2. ``claim_task``: one Cypher query picks the highest-priority open task of the given
   kinds and sets ``status='claimed'``. FalkorDB serialises writes per graph, so this
   is atomic: two agents never get the same task (see tests/graph/test_tasks.py).
3. ``complete_task``: ``status='done'`` (or ``'failed'``) with an outcome. Writing
   ``RESOLVED`` on the target is the job of the agent doing the work (Fixer, #29).
"""

from __future__ import annotations

from graph.client import tenant_graph
from graph.cypher import cypher
from graph.tools import now_ms

TASK_KINDS = ("trace", "fix_doc", "reanswer", "replan", "notify")


def task_id(task_kind: str, change_id: str, target_id: str) -> str:
    """Deterministic id: one task of a kind per (change, target)."""
    return f"task:{task_kind}:{change_id.removeprefix('chg:')}:{target_id}"


def create_task(
    tenant: str,
    agent_id: str,
    task_kind: str,
    change_id: str,
    target_id: str,
    priority: int = 100,
    risk: float = 0.0,
    now: int | None = None,
) -> str:
    """Open a task (idempotent). Lower ``priority`` = handled first."""
    if task_kind not in TASK_KINDS:
        raise ValueError(f"task_kind must be one of {TASK_KINDS}")
    tid = task_id(task_kind, change_id, target_id)
    params = {"agent_id": agent_id, "change_id": change_id, "target_id": target_id, "task_id": tid,
              "task_kind": task_kind, "priority": priority, "risk": risk,
              "now": now_ms() if now is None else now}  # fmt: skip
    rows = tenant_graph(tenant).query(cypher("task_create"), params).result_set
    if not rows:
        raise KeyError(f"agent, change or target missing: {agent_id}, {change_id}, {target_id}")
    return tid


def claim_task(tenant: str, agent_id: str, kinds: list[str] | tuple[str, ...], now: int | None = None):
    """Atomically claim the best open task of ``kinds``. Returns the task dict or None."""
    params = {"agent_id": agent_id, "kinds": list(kinds), "now": now_ms() if now is None else now}
    rows = tenant_graph(tenant).query(cypher("task_claim"), params).result_set
    if not rows:
        return None
    tid, kind, status, priority, risk, target, change = rows[0]
    return {"id": tid, "task_kind": kind, "status": status, "priority": priority, "risk": risk,
            "target_id": target, "change_id": change}  # fmt: skip


def complete_task(
    tenant: str, agent_id: str, task_id: str, outcome: str, failed: bool = False, now: int | None = None
) -> bool:
    """Mark a task this agent claimed as done/failed. False if it wasn't claimed by ``agent_id``."""
    params = {"task_id": task_id, "agent_id": agent_id, "outcome": outcome,
              "status": "failed" if failed else "done", "now": now_ms() if now is None else now}  # fmt: skip
    return bool(tenant_graph(tenant).query(cypher("task_complete"), params).result_set)
