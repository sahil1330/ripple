"""Worker agents + the freshness guard (plan §5, demo step 5).

Workers do "real work" (approve expenses, issue cards, book travel). Before EVERY action
they call ``check_fresh`` through ripple-mcp. If the action relies on a superseded fact:

* the action is marked ``blocked`` with the stale -> current version and source,
* a ``replan`` Task is handed to the Fixer (agents never call each other directly),
* an ``action.blocked`` event is emitted.

Otherwise the (simulated) action is performed and marked ``done``.

``guard`` is pluggable: ``McpGuard`` (default) talks to ``python -m ripple_mcp.server``
over stdio like any external agent would; ``direct_guard`` calls the same function
in-process (used by the API's demo stepper for speed).
"""

from __future__ import annotations

import json
import os
import sys
from collections.abc import Callable

import anyio

from agents.events import event
from agents.tasks import create_task
from graph.client import tenant_graph
from graph.cypher import cypher
from graph.tools import check_fresh, now_ms

WORKERS = ("agent:ap-approver", "agent:it-helpdesk-bot", "agent:onboarding-bot", "agent:travel-planner")
Guard = Callable[[str, list[str], int], dict[str, dict]]  # (tenant, action_ids, now) -> {action_id: result}


def direct_guard(tenant: str, action_ids: list[str], now: int) -> dict[str, dict]:
    return {a: check_fresh(tenant, action_id=a, now=now) for a in action_ids}


class McpGuard:
    """Calls ``check_fresh`` over MCP stdio (one server process per batch of actions)."""

    def __call__(self, tenant: str, action_ids: list[str], now: int) -> dict[str, dict]:
        return anyio.run(self._check_all, tenant, action_ids, now)

    @staticmethod
    async def _check_all(tenant: str, action_ids: list[str], now: int) -> dict[str, dict]:
        from mcp import ClientSession, StdioServerParameters
        from mcp.client.stdio import stdio_client

        params = StdioServerParameters(
            command=sys.executable, args=["-m", "ripple_mcp.server"], env=dict(os.environ)
        )
        out = {}
        async with stdio_client(params) as (read, write), ClientSession(read, write) as session:
            await session.initialize()
            for action_id in action_ids:
                res = await session.call_tool(
                    "check_fresh", {"tenant": tenant, "action_id": action_id, "now": now}
                )
                if res.isError:
                    raise RuntimeError(f"check_fresh failed for {action_id}: {res.content}")
                out[action_id] = json.loads(res.content[0].text)
        return out


def _reason(stale: dict) -> str:
    return (
        f"{stale['stale_version']} ({stale['stale_value']}) superseded by "
        f"{stale['current_version']} ({stale['current_value']}); source {stale['source']}"
    )


def _set_status(g, action_id: str, status: str, now: int, reason: str | None = None) -> None:
    g.query(
        cypher("action_set_status"), {"action_id": action_id, "status": status, "now": now, "reason": reason}
    )


def run(tenant: str, agent_id: str, now: int | None = None, guard: Guard | None = None) -> list[dict]:
    """Process every pending action ``agent_id`` owns. Returns events (one per blocked action)."""
    at = now_ms() if now is None else now
    g = tenant_graph(tenant)
    actions = g.query(cypher("worker_pending_actions"), {"agent_id": agent_id}).result_set
    if not actions:
        return []
    results = (guard or McpGuard())(tenant, [a[0] for a in actions], at)
    events = []
    for action_id, *_ in actions:
        res = results[action_id]
        if res["fresh"]:
            _set_status(g, action_id, "done", at)
            continue
        stale = res["stale"][0]
        _set_status(g, action_id, "blocked", at, reason=_reason(stale))
        events.append(
            event("action.blocked", tenant, at, action_id=action_id, stale_version=stale["stale_version"],
                  current_version=stale["current_version"], source_url=stale["source"], via=stale["via"])
        )  # fmt: skip
        change = g.query(cypher("change_for_version"), {"version_id": stale["stale_version"]}).result_set
        if change:  # hand the fix to the Fixer through a Task node
            tid = create_task(
                tenant, agent_id, "replan", change[0][0], action_id, priority=0, risk=1.0, now=at
            )
            events.append(
                event("task.created", tenant, at, task_id=tid, kind="replan", priority=0, risk=1.0,
                      target_id=action_id)
            )  # fmt: skip
    return events


def run_all(tenant: str, now: int | None = None, guard: Guard | None = None) -> list[dict]:
    events: list[dict] = []
    for agent_id in WORKERS:
        events += run(tenant, agent_id, now, guard)
    return events
