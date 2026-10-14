"""Load Cypher from ``graph/queries/<name>.cypher``.

Every query the product runs lives in that folder (AGENTS.md §6), so Python code
calls ``cypher("who_holds")`` instead of embedding query strings. Lines starting
with ``//`` are comments and are kept (FalkorDB accepts them).
"""

from __future__ import annotations

from functools import cache
from pathlib import Path

QUERIES_DIR = Path(__file__).parent / "queries"


@cache
def cypher(name: str) -> str:
    path = QUERIES_DIR / f"{name}.cypher"
    if not path.is_file():
        raise KeyError(f"no query file graph/queries/{name}.cypher")
    return path.read_text()
