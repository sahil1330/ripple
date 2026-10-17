"""Load Cypher from ``graph/queries/<name>.cypher``.

Every query the product runs lives in that folder (AGENTS.md §6), so Python code
calls ``cypher("who_holds")`` instead of embedding query strings. Lines starting
with ``//`` are comments and are kept (FalkorDB accepts them).
"""

from __future__ import annotations

from contextlib import contextmanager
from contextvars import ContextVar
from functools import cache
from pathlib import Path

QUERIES_DIR = Path(__file__).parent / "queries"

# When set (see ``recording``), every query loaded is appended here so agents can show their work.
_RECORDER: ContextVar[list[str] | None] = ContextVar("cypher_recorder", default=None)


@cache
def _load(name: str) -> str:
    path = QUERIES_DIR / f"{name}.cypher"
    if not path.is_file():
        raise KeyError(f"no query file graph/queries/{name}.cypher")
    return path.read_text()


def cypher(name: str) -> str:
    text = _load(name)
    rec = _RECORDER.get()
    if rec is not None:
        rec.append(name)
    return text


@contextmanager
def recording():
    """Collect the names of the queries run inside the block: ``with recording() as names: ...``."""
    names: list[str] = []
    token = _RECORDER.set(names)
    try:
        yield names
    finally:
        _RECORDER.reset(token)


def query_text(name: str) -> str:
    """The query without ``//`` comment lines, for display in traces."""
    return "\n".join(ln for ln in _load(name).splitlines() if not ln.lstrip().startswith("//")).strip()
