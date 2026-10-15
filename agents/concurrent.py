"""Run the full C1 agent loop on several tenants at once (plan §10.4, issue #32).

Each tenant is its own FalkorDB graph (``ripple:<tenant>``), so tenants share no state: the
same agents (Sentinel -> Tracer -> worker guard -> Fixer) run in one thread per tenant and
only ever touch their own graph. Events are handed to ``publish`` as soon as each agent
finishes, so a live ticker shows the tenants interleaving.

    python -m agents.concurrent handbook-demo acme-synthetic
"""

from __future__ import annotations

import argparse
import threading
import time
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor

from agents import fixer, sentinel, tracer, workers
from graph.tools import coverage, now_ms
from ingest import handbook_changes, handbook_docs, synthetic

CHANGE = "chg:c1"
Publish = Callable[[list[dict]], None]


def load(tenant: str, seed: int | None = None) -> None:
    """Fresh baseline for one tenant: real handbook facts (C1 pending), docs, its synthetic company
    (``seed`` defaults to ``synthetic.TENANT_SEEDS``)."""
    from graph.client import tenant_graph
    from graph.schema import apply as apply_schema

    try:
        tenant_graph(tenant).delete()
    except Exception:  # noqa: BLE001  (graph didn't exist)
        pass
    apply_schema(tenant)
    handbook_changes.ingest(tenant, pending={CHANGE})
    handbook_docs.ingest(tenant)
    synthetic.seed(tenant, seed)


def run_tenant(tenant: str, now: int, publish: Publish, guard: workers.Guard | None = None) -> dict:
    """The C1 loop for one tenant. Returns a summary with per-phase wall-clock times (ms)."""
    phases = [
        ("sentinel", lambda: sentinel.replay(tenant, CHANGE, now=now)),
        ("tracer", lambda: tracer.run(tenant, now=now)),
        ("workers", lambda: workers.run_all(tenant, now=now, guard=guard or workers.direct_guard)),
        ("fixer", lambda: fixer.run(tenant, now=now)),
    ]
    timings, count = {}, 0
    for name, fn in phases:
        t0 = time.perf_counter()
        events = fn()
        timings[name] = round((time.perf_counter() - t0) * 1000, 1)
        count += len(events)
        publish(events)
    return {"tenant": tenant, "events": count, "coverage": coverage(tenant, CHANGE), "ms": timings,
            "thread": threading.current_thread().name}  # fmt: skip


def run_concurrently(
    tenants: list[str], now: int | None = None, publish: Publish | None = None, reload: bool = True
) -> list[dict]:
    """Run ``run_tenant`` for every tenant in parallel threads. ``publish`` must be thread-safe
    (``api.bus.publish`` is). Returns one summary per tenant, in input order."""
    at = now_ms() if now is None else now
    if reload:
        for t in tenants:
            load(t)
    with ThreadPoolExecutor(max_workers=len(tenants), thread_name_prefix="tenant") as pool:
        futures = [pool.submit(run_tenant, t, at, publish or (lambda _events: None)) for t in tenants]
        return [f.result() for f in futures]


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Run the C1 agent loop on several tenants concurrently")
    parser.add_argument("tenants", nargs="+")
    args = parser.parse_args(argv)
    lock = threading.Lock()

    def ticker(events: list[dict]) -> None:
        with lock:
            for e in events:
                print(f"{e['tenant']:>16}  {e['type']:<17} {e['payload'].get('task_id') or ''}")

    for summary in run_concurrently(args.tenants, publish=ticker):
        print(summary)


if __name__ == "__main__":
    main()
