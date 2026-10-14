"""Ingest the real GitLab handbook policy changes C1–C5 (plan §3.2).

The extraction is committed as data (``ingest/data/handbook_changes.json``):
each version was checked by hand against the public commit diff, so the demo
never needs a live LLM. Source: public GitLab handbook, (c) GitLab B.V.

Two-phase design so the demo can start *before* a change happens:

* ``ingest(tenant, pending={"chg:c1"})`` loads every fact, but for a pending
  change only the OLD version is loaded and it stays current (``valid_to=null``).
* ``apply_change(tenant, "chg:c1")`` is what the Sentinel calls on replay: it
  writes the new version, closes the old one and creates the Change node.

Run: ``python -m ingest.handbook_changes --tenant handbook-demo --pending chg:c1``
"""

from __future__ import annotations

import argparse
import json
from functools import cache
from pathlib import Path

from graph.client import tenant_graph
from graph.cypher import cypher

CHANGE_FIELDS = ("id", "label", "fact_key", "title", "commit_sha", "mr_url", "detected_at")
DATA_FILE = Path(__file__).parent / "data" / "handbook_changes.json"


@cache
def load_data() -> dict:
    return json.loads(DATA_FILE.read_text())


def _fact_for(key: str) -> dict:
    return next(f for f in load_data()["facts"] if f["key"] == key)


def _change(change_id: str) -> dict:
    for c in load_data()["changes"]:
        if c["id"] == change_id:
            return c
    raise KeyError(f"unknown change {change_id!r}")


def _write_version(g, fact: dict, version: dict, valid_to: int | None) -> None:
    g.query(
        cypher("ingest_fact_version"),
        {
            "fact_id": f"fact:{fact['key']}",
            "key": fact["key"],
            "topic": fact["topic"],
            "title": fact["title"],
            "v": version,
            "valid_to": valid_to,
        },
    )


def _write_change(g, change: dict) -> None:
    params = {k: change[k] for k in CHANGE_FIELDS}
    g.query(cypher("ingest_change"), {**params, "from_id": change["from"], "to_id": change["to"]})


def ingest(tenant: str, pending: set[str] | frozenset[str] = frozenset()) -> dict:
    """Load all facts and versions; changes in ``pending`` are held back for Sentinel replay.

    Returns counts, e.g. ``{"facts": 5, "versions": 10, "changes": 5}``.
    """
    g = tenant_graph(tenant)
    data = load_data()
    held_back = {_change(cid)["to"] for cid in pending}
    # A held-back version also hides every later version of the same fact.
    counts = {"facts": 0, "versions": 0, "changes": 0}
    for fact in data["facts"]:
        loaded: list[dict] = []
        for version in fact["versions"]:
            if version["id"] in held_back:
                break
            loaded.append(version)
        for i, version in enumerate(loaded):
            nxt = loaded[i + 1]["valid_from"] if i + 1 < len(loaded) else None
            _write_version(g, fact, version, valid_to=nxt)
        counts["facts"] += 1
        counts["versions"] += len(loaded)
        loaded_ids = {v["id"] for v in loaded}
        for change in data["changes"]:
            if change["fact_key"] == fact["key"] and change["to"] in loaded_ids:
                _write_change(g, change)
                counts["changes"] += 1
    return counts


def apply_change(tenant: str, change_id: str) -> dict:
    """Replay one change (used by the Sentinel): write the new version, close the old, create Change.

    Idempotent: replaying twice leaves the graph unchanged. Returns the change record.
    """
    g = tenant_graph(tenant)
    change = _change(change_id)
    fact = _fact_for(change["fact_key"])
    new = next(v for v in fact["versions"] if v["id"] == change["to"])
    _write_version(g, fact, new, valid_to=None)
    _write_change(g, change)
    return change


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Ingest real GitLab handbook changes C1–C5")
    parser.add_argument("--tenant", default="handbook-demo")
    parser.add_argument("--pending", nargs="*", default=["chg:c1"], help="changes to hold back for replay")
    args = parser.parse_args(argv)
    print(ingest(args.tenant, pending=set(args.pending)))


if __name__ == "__main__":
    main()
