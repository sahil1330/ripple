"""Schema + indexes for a tenant graph (plan §4.3). Draft: finalised in the schema issue.

Run: ``python -m graph.schema --tenant handbook-demo``
"""

from __future__ import annotations

import argparse

INDEXES: list[str] = [
    "CREATE INDEX FOR (e:Entity) ON (e.id)",
    "CREATE INDEX FOR (f:Fact) ON (f.key)",
    "CREATE INDEX FOR (v:FactVersion) ON (v.valid_to)",
    "CREATE INDEX FOR (t:Task) ON (t.status)",
    "CREATE INDEX FOR (a:Action) ON (a.status)",
    "CREATE INDEX FOR ()-[r:WAS_TOLD]-() ON (r.at)",
    "CALL db.idx.fulltext.createNodeIndex('Doc', 'title')",
]


def apply(tenant: str) -> None:
    from graph.client import tenant_graph

    g = tenant_graph(tenant)
    for stmt in INDEXES:
        try:
            g.query(stmt)
        except Exception as exc:  # index already exists -> keep idempotent
            if "already" not in str(exc).lower():
                raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--tenant", default="handbook-demo")
    apply(parser.parse_args().tenant)
