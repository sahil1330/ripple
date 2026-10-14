"""FalkorDB connection helpers. One graph per tenant: ``ripple:<tenant>`` (plan §4)."""

from __future__ import annotations

import os
from functools import lru_cache

GRAPH_PREFIX = "ripple:"


def graph_name(tenant: str) -> str:
    """Return the FalkorDB graph key for a tenant, e.g. ``ripple:handbook-demo``."""
    if not tenant or ":" in tenant:
        raise ValueError(f"invalid tenant id: {tenant!r}")
    return f"{GRAPH_PREFIX}{tenant}"


@lru_cache(maxsize=1)
def db():
    """Shared FalkorDB client built from FALKORDB_* env vars."""
    from falkordb import FalkorDB

    return FalkorDB(
        host=os.getenv("FALKORDB_HOST", "localhost"),
        port=int(os.getenv("FALKORDB_PORT", "6379")),
        username=os.getenv("FALKORDB_USERNAME") or None,
        password=os.getenv("FALKORDB_PASSWORD") or None,
    )


def tenant_graph(tenant: str):
    """Select the tenant's graph. Always pass Cypher parameters, never format strings."""
    return db().select_graph(graph_name(tenant))
