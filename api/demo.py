"""Demo stepper: the 9 beats of RIPPLE_PLAN.md §9 as ``POST /api/demo/step`` (+ ``/reset``).

Every step runs the real agents against the tenant graph with a **fixed clock**
(``DEMO_NOW_MS`` plus one second per step), so a run is reproducible: reset, then step 1..9
gives the same graph state and the same events every time (only Answer ids are random).

| # | beat (plan §9)                 | what runs                                            |
|---|--------------------------------|------------------------------------------------------|
| 1 | title card                     | nothing: baseline graph, C1 pending                  |
| 2 | Priya asks (pre-change)        | Concierge answers from v1 and logs WAS_TOLD          |
| 3 | Sentinel replays ddd39597      | Sentinel writes v2 + Change, opens the trace task    |
| 4 | graph lights up, TTH queue     | Tracer: impact + ranking + IMPACTS + follow-up tasks |
| 5 | hero: approval BLOCKED         | worker agents call check_fresh over MCP              |
| 6 | Fixer works the queue          | Fixer until coverage is 100%                         |
| 7 | Priya asks again               | Concierge answers v2 with "Earlier I told you ..."   |
| 8 | Why? + tenant isolation        | coverage snapshot (UI calls /api/explain itself)     |
| 9 | closing card                   | nothing                                              |

After step 9 the next call starts over at step 1 with a fresh reset. Step state lives in
process memory per tenant; ``reset`` drops the tenant graph and reloads the seeded data.
"""

from __future__ import annotations

import threading
from collections.abc import Callable
from dataclasses import dataclass

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from agents import concierge, fixer, sentinel, tracer, workers
from agents.events import event
from api import bus
from graph.client import tenant_graph
from graph.schema import apply as apply_schema
from graph.tools import coverage
from ingest import handbook_changes, handbook_docs, synthetic
from ingest.synthetic import DEMO_NOW_MS

router = APIRouter()
CHANGE = "chg:c1"
PERSON = "person:priya"
QUESTION = "Can I expense my ExpressVPN subscription?"


def _guard(tenant: str, action_ids: list[str], now: int) -> dict[str, dict]:
    """check_fresh over MCP stdio (the real agent path); same query in-process if MCP is unavailable."""
    try:
        return workers.McpGuard()(tenant, action_ids, now)
    except Exception:  # noqa: BLE001  (a missing MCP subprocess must not break the live demo)
        return workers.direct_guard(tenant, action_ids, now)


def _ask(tenant: str, now: int) -> list[dict]:
    res = concierge.ask(tenant, PERSON, QUESTION, channel="slack", now=now)
    return [event("answer.sent", tenant, now, answer_id=res["answer_id"], person_id=PERSON,
                  version_ids=res["versions"], earlier_told=res["earlier_told"])]  # fmt: skip


def _coverage(tenant: str, now: int) -> list[dict]:
    cov = coverage(tenant, CHANGE)
    return [event("coverage.updated", tenant, now, change_id=CHANGE, impacted=cov["impacted"],
                  resolved=cov["resolved"], pct=cov["pct"])]  # fmt: skip


@dataclass(frozen=True)
class Step:
    name: str
    description: str
    run: Callable[[str, int], list[dict]]


STEPS: list[Step] = [
    Step("Title card", "When a policy changes, the page gets updated; the people and agents who learned "
         "the old version don't. Baseline graph loaded, change C1 not yet replayed.", lambda t, n: []),
    Step("Priya asks about ExpressVPN", "Concierge answers from the current version (v1: reimbursable up to "
         "$150/year) and logs WAS_TOLD as episodic memory.", _ask),
    Step("Sentinel replays commit ddd39597", "Sentinel ingests real handbook change C1 (MR !20421): writes "
         "FactVersion v2, closes v1 and opens a trace task.", lambda t, n: sentinel.replay(t, CHANGE, now=n)),
    Step("Tracer computes the impact", "One FalkorDB traversal finds everyone and everything relying on v1; "
         "time-to-harm ranks the queue and opens follow-up tasks.", lambda t, n: tracer.run(t, now=n)),
    Step("Worker agent is BLOCKED", "ap-approver calls check_fresh over MCP before approving the $150 VPN "
         "claim; the plan depends on v1, so the action is blocked with path and source.",
         lambda t, n: workers.run_all(t, now=n, guard=_guard)),
    Step("Fixer works the queue", "Agents hand off through Task nodes: re-answer people, refresh agent "
         "memory, draft doc patches, replan. Coverage climbs to 100%.", lambda t, n: fixer.run(t, now=n)),
    Step("Priya asks again", "Correct answer from v2, plus memory that corrects itself: \"Earlier I told you "
         "...; that changed on Jul 14, 2026 (MR !20421).\"", _ask),
    Step("Why? and tenant isolation", "Every decision is traceable: open Why? on any node (explain path + "
         "Cypher). Each company is its own graph.", _coverage),
    Step("Built on FalkorDB", "Tracks 01 / 02 / 03. Demo complete; the next step starts over.",
         lambda t, n: []),
]  # fmt: skip

_state: dict[str, int] = {}  # tenant -> last completed step (0 = just reset)
_lock = threading.Lock()  # steps mutate the graph; never run two at once


def reset(tenant: str) -> None:
    """Drop the tenant graph and reload the seeded baseline (C1 pending)."""
    g = tenant_graph(tenant)
    try:
        g.delete()
    except Exception:  # noqa: BLE001  (graph didn't exist yet)
        pass
    apply_schema(tenant)
    handbook_changes.ingest(tenant, pending={CHANGE})
    handbook_docs.ingest(tenant)
    synthetic.seed(tenant)
    _state[tenant] = 0


def step(tenant: str) -> dict:
    """Run the next step and return the DemoStepResponse (events are also published on SSE)."""
    with _lock:
        done = _state.get(tenant)
        if done is None or done >= len(STEPS):
            reset(tenant)
            done = 0
        n = done + 1
        s = STEPS[n - 1]
        events = s.run(tenant, DEMO_NOW_MS + n * 1000)
        _state[tenant] = n
    bus.publish(events)
    return {"step": n, "total_steps": len(STEPS), "name": s.name, "description": s.description,
            "events": events}  # fmt: skip


class DemoStepRequest(BaseModel):
    tenant: str
    scenario: str = "c1"


class DemoResetRequest(BaseModel):
    tenant: str


def _check(tenant: str, scenario: str = "c1") -> None:
    from api.main import TENANTS

    if tenant not in {t["id"] for t in TENANTS}:
        raise HTTPException(404, f"unknown tenant {tenant!r}")
    if scenario != "c1":
        raise HTTPException(422, f"unknown scenario {scenario!r} (only c1)")


@router.post("/api/demo/step")
def demo_step(req: DemoStepRequest) -> dict:
    _check(req.tenant, req.scenario)
    return step(req.tenant)


@router.post("/api/demo/reset")
def demo_reset(req: DemoResetRequest) -> dict:
    _check(req.tenant)
    with _lock:
        reset(req.tenant)
    return {"ok": True, "tenant": req.tenant}
