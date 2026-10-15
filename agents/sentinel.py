"""Sentinel: watches handbook diffs and turns a commit into graph facts (plan §5).

For the demo, "watching" = replaying one of the hand-verified real commits from
``ingest/data/handbook_changes.json`` (C1 = ddd39597, MR !20421). Replay writes the new
FactVersion, closes the old one (``valid_to``), links ``SUPERSEDES`` and the Change
(``FROM``/``TO``) and opens a ``trace`` Task for the Tracer.
"""

from __future__ import annotations

from agents.events import event
from agents.tasks import create_task
from graph.tools import now_ms
from ingest.handbook_changes import apply_change

AGENT_ID = "agent:sentinel"
TRACE_PRIORITY = 0  # tracing always comes first


def replay(tenant: str, change_id: str, now: int | None = None) -> list[dict]:
    """Replay a real handbook change. Idempotent. Returns the SSE events it caused."""
    at = now_ms() if now is None else now
    change = apply_change(tenant, change_id)
    task = create_task(tenant, AGENT_ID, "trace", change_id, change_id, priority=TRACE_PRIORITY, now=at)
    return [
        event(
            "change.detected",
            tenant,
            at,
            change_id=change_id,
            fact_key=change["fact_key"],
            old_version=change["from"],
            new_version=change["to"],
            source_url=change["mr_url"],
        ),  # fmt: skip
        event(
            "task.created",
            tenant,
            at,
            task_id=task,
            kind="trace",
            priority=TRACE_PRIORITY,
            risk=None,
            target_id=change_id,
        ),  # fmt: skip
    ]
