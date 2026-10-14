"""Fixer: works the Tracer's queue until coverage reaches 100% (plan §5, demo step 6).

It claims tasks by priority (lowest number first) and, per kind:

* ``reanswer``: Person -> the Concierge re-answers their original question from the
  current version (logged as a new Answer + WAS_TOLD). Agent -> its memory now caches
  the current version.
* ``fix_doc``: stores a markdown patch draft on the Doc (shown as a diff, never pushed
  upstream). Real handbook pages are already updated upstream, so they now STATE/CITE v2.
* ``replan``: recomputes derived facts from the new version, re-points direct
  dependencies, cancels actions built on the stale rule. An Action's replan (from the
  freshness guard) replans its whole Plan. Everything touched is RESOLVED.
* ``notify``: briefs the owner (RESOLVED how='briefed').

Every handled entity gets ``(x)-[:RESOLVED {at, by, how}]->(change)``; when coverage is
100% the Change is marked ``resolved``.
"""

from __future__ import annotations

from agents import concierge
from agents.events import event
from agents.tasks import claim_task, complete_task
from graph.client import tenant_graph
from graph.cypher import cypher
from graph.impact import versions_of
from graph.tools import coverage, now_ms

AGENT_ID = "agent:fixer"
KINDS = ["replan", "reanswer", "fix_doc", "notify"]


def _resolve(g, change_id: str, ids: list[str], how: str, now: int) -> None:
    g.query(
        cypher("fix_resolve"), {"change_id": change_id, "ids": ids, "now": now, "by": AGENT_ID, "how": how}
    )


def _version_value(g, version_id: str) -> tuple[str, str]:
    row = g.query(cypher("version_text"), {"id": version_id}).result_set
    return row[0][0], row[0][1]


def replan(g, target_id: str, old_id: str, new_id: str, now: int) -> list[str]:
    """Replan ``target_id`` (Plan or Action) onto ``new_id``. Returns ids that are now resolved."""
    plan_id = target_id
    if target_id.startswith("act:"):
        plan_id = g.query(cypher("fix_plan_of"), {"action_id": target_id}).result_set[0][0] or target_id
    new_value, _ = _version_value(g, new_id)
    touched = [plan_id]
    stale_dfs = []
    for dep_id, dep_kind, statement in g.query(
        cypher("fix_stale_deps"), {"target_id": plan_id, "old_id": old_id}
    ).result_set:
        if dep_kind == "DerivedFact":
            new_df = f"{dep_id}:r{now}"
            g.query(cypher("fix_replace_derived"), {
                "target_id": plan_id, "old_df_id": dep_id, "new_version_id": new_id, "new_df_id": new_df,
                "statement": f"Replanned: {new_value} (was: {statement})", "now": now,
            })  # fmt: skip
            stale_dfs.append(dep_id)
            touched.append(dep_id)
        else:
            g.query(
                cypher("fix_repoint_dependency"),
                {"target_id": plan_id, "old_id": old_id, "new_version_id": new_id},
            )
    if plan_id.startswith("plan:"):
        rows = g.query(cypher("fix_replan_actions"), {"plan_id": plan_id, "stale_ids": stale_dfs}).result_set
        touched += [r[0] for r in rows]
    if target_id not in touched:
        touched.append(target_id)
    return touched


def doc_patch(old_excerpt: str, new_excerpt: str, title: str) -> str:
    """Markdown diff shown in the UI (Fixer never pushes it anywhere)."""
    return f"### {title}\n```diff\n- {old_excerpt}\n+ {new_excerpt}\n```"


def handle(tenant: str, task: dict, now: int) -> tuple[str, list[dict]]:
    """Do the work for one claimed task. Returns (outcome, extra events)."""
    g = tenant_graph(tenant)
    change_id, target = task["change_id"], task["target_id"]
    old_id, new_id = versions_of(tenant, change_id)
    events: list[dict] = []
    kind = task["task_kind"]

    if kind == "reanswer" and target.startswith("person:"):
        rows = g.query(cypher("fix_last_question"), {"person_id": target, "old_id": old_id}).result_set
        question = rows[0][0] if rows and rows[0][0] else "What is the current policy?"
        ans = concierge.ask(tenant, target, question, channel="slack", now=now)
        events.append(event("answer.sent", tenant, now, answer_id=ans["answer_id"], person_id=target,
                            version_ids=ans["versions"], earlier_told=ans["earlier_told"]))  # fmt: skip
        _resolve(g, change_id, [target], "reanswered", now)
        return "reanswered", events
    if kind == "reanswer":  # an Agent: refresh its memory
        g.query(cypher("fix_refresh_agent_cache"), {"agent_id": target, "old_id": old_id,
                                                     "new_version_id": new_id, "now": now})  # fmt: skip
        _resolve(g, change_id, [target], "reanswered", now)
        return "memory refreshed", events
    if kind == "fix_doc":
        _, old_excerpt = _version_value(g, old_id)
        _, new_excerpt = _version_value(g, new_id)
        title = g.query(cypher("doc_title"), {"id": target}).result_set[0][0]
        patch = doc_patch(old_excerpt, new_excerpt, title)
        params = {"doc_id": target, "old_id": old_id, "new_version_id": new_id, "patch": patch, "now": now}
        g.query(cypher("fix_doc_patch"), params)
        _resolve(g, change_id, [target], "patched", now)
        return "patch drafted", events
    if kind == "replan":
        touched = replan(g, target, old_id, new_id, now)
        _resolve(g, change_id, touched, "replanned", now)
        return f"replanned {len(touched)}", events
    _resolve(g, change_id, [target], "briefed", now)  # notify
    return "briefed", events


def step(tenant: str, now: int | None = None) -> list[dict]:
    """Claim and handle one task. Returns events ([] when the queue is empty)."""
    at = now_ms() if now is None else now
    task = claim_task(tenant, AGENT_ID, KINDS, now=at)
    if task is None:
        return []
    events = [event("task.claimed", tenant, at, task_id=task["id"], agent_id=AGENT_ID)]
    outcome, extra = handle(tenant, task, at)
    complete_task(tenant, AGENT_ID, task["id"], outcome, now=at)
    events += extra
    events.append(event("task.done", tenant, at, task_id=task["id"], agent_id=AGENT_ID, outcome=outcome))
    cov = coverage(tenant, task["change_id"])
    events.append(event("coverage.updated", tenant, at, change_id=task["change_id"], impacted=cov["impacted"],
                        resolved=cov["resolved"], pct=cov["pct"]))  # fmt: skip
    if cov["impacted"] and cov["resolved"] == cov["impacted"]:
        tenant_graph(tenant).query(
            cypher("change_set_status"), {"change_id": task["change_id"], "status": "resolved"}
        )
    return events


def run(tenant: str, now: int | None = None, max_steps: int = 500) -> list[dict]:
    events: list[dict] = []
    for _ in range(max_steps):
        batch = step(tenant, now)
        if not batch:
            break
        events += batch
    return events
