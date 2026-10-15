"""In-process SSE event bus for ``GET /api/stream`` (contracts/events.md).

Agents return plain event dicts (``agents.events.event``); the API publishes them here and
every open stream for that tenant receives them. Request handlers run in FastAPI's thread
pool, so ``publish`` hands events to the event loop with ``call_soon_threadsafe``.
A single process is enough for the demo; a multi-instance deploy would swap this for
Redis pub/sub (FalkorDB already runs on Redis).
"""

from __future__ import annotations

import asyncio
from collections import defaultdict

_subscribers: dict[str, set[tuple[asyncio.AbstractEventLoop, asyncio.Queue]]] = defaultdict(set)


def subscribe(tenant: str) -> asyncio.Queue:
    """Register a new stream for ``tenant``. Call from the event loop."""
    queue: asyncio.Queue = asyncio.Queue(maxsize=1000)
    _subscribers[tenant].add((asyncio.get_running_loop(), queue))
    return queue


def unsubscribe(tenant: str, queue: asyncio.Queue) -> None:
    _subscribers[tenant] = {(lp, q) for lp, q in _subscribers[tenant] if q is not queue}


def _put(queue: asyncio.Queue, event: dict) -> None:
    if not queue.full():  # a stalled client drops events rather than blocking agents
        queue.put_nowait(event)


def publish(events: list[dict]) -> None:
    """Fan events out to every stream of their tenant. Safe from any thread."""
    for ev in events:
        for loop, queue in list(_subscribers.get(ev["tenant"], ())):
            loop.call_soon_threadsafe(_put, queue, ev)
