"""Schema + indexes for a tenant graph (plan §4.3, contracts/graph-model.md).

FalkorDB is schemaless, so "schema" here means the indexes our queries rely on:
every lookup by ``id`` goes through the ``Entity(id)`` range index, and the
freshness guard filters ``FactVersion.valid_to``.

Idempotent: FalkorDB raises "already indexed" when an index exists; we skip it.

Run: ``python -m graph.schema --tenant handbook-demo``
"""

from __future__ import annotations

import argparse

# (description, Cypher). Kept as plain strings: no parameters are allowed in DDL.
INDEXES: list[tuple[str, str]] = [
    ("Entity(id)", "CREATE INDEX FOR (e:Entity) ON (e.id)"),
    ("Fact(key)", "CREATE INDEX FOR (f:Fact) ON (f.key)"),
    ("FactVersion(valid_to)", "CREATE INDEX FOR (v:FactVersion) ON (v.valid_to)"),
    ("Task(status)", "CREATE INDEX FOR (t:Task) ON (t.status)"),
    ("Action(status)", "CREATE INDEX FOR (a:Action) ON (a.status)"),
    ("WAS_TOLD(at)", "CREATE INDEX FOR ()-[r:WAS_TOLD]-() ON (r.at)"),
    ("Doc(title) fulltext", "CALL db.idx.fulltext.createNodeIndex('Doc', 'title')"),
]


def _already_exists(exc: Exception) -> bool:
    msg = str(exc).lower()
    return "already indexed" in msg or "already exists" in msg


def apply(tenant: str) -> dict[str, str]:
    """Create every index on ``ripple:<tenant>``. Returns {index: "created" | "exists"}."""
    from graph.client import tenant_graph

    g = tenant_graph(tenant)
    result: dict[str, str] = {}
    for name, stmt in INDEXES:
        try:
            g.query(stmt)
            result[name] = "created"
        except Exception as exc:
            if not _already_exists(exc):
                raise
            result[name] = "exists"
    return result


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Create Ripple indexes for a tenant graph")
    parser.add_argument("--tenant", default="handbook-demo")
    args = parser.parse_args(argv)
    for name, status in apply(args.tenant).items():
        print(f"{name:24} {status}")


if __name__ == "__main__":
    main()
