"""SSE event envelopes (contracts/events.md): ``{type, at, tenant, payload}``.

Agents return the events they caused; the API (#17) publishes them on ``/api/stream``.
Keeping this a plain function makes agents testable without a running server.
"""

from __future__ import annotations

EVENT_TYPES = (
    "change.detected", "impact.computed", "task.created", "task.claimed", "task.done",
    "action.blocked", "answer.sent", "coverage.updated",
)  # fmt: skip


def event(type: str, tenant: str, at: int, **payload) -> dict:
    if type not in EVENT_TYPES:
        raise ValueError(f"unknown event type {type!r}")
    return {"type": type, "at": at, "tenant": tenant, "payload": payload}
