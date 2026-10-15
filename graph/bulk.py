"""Batched node/edge writes used by the ingesters.

Cypher cannot take a label or relationship type as a ``$parameter``, so this is
the one place where an identifier is put into the query text. It is only ever
taken from the whitelists below (contracts/graph-model.md); all *values* still
go through parameters. Writes are MERGE on ``id`` so re-running is safe.
"""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Iterable

NODE_LABELS = frozenset(
    "Fact FactVersion Change Doc DerivedFact Plan Action Person Team Agent Task Answer".split()
)
REL_TYPES = frozenset(
    "HAS_VERSION SUPERSEDES STATES CITES LINKS_TO DERIVED_FROM DEPENDS_ON PART_OF WAS_TOLD CACHED OWNS "
    "MEMBER_OF TALKS_WITH FROM TO IMPACTS RESOLVED FEEDS ABOUT TARGETS CREATED CLAIMED ANSWERED".split()
)
# Dependency edges (dependent -> dependency) that get a mirrored FEEDS {w:1} (dependency -> dependent).
FEEDS_MIRRORED = frozenset("STATES CITES DERIVED_FROM DEPENDS_ON WAS_TOLD CACHED".split())
# Reversed: a Plan feeds its Actions (Action -PART_OF-> Plan), an owned thing feeds its owner.
FEEDS_REVERSED = frozenset("PART_OF OWNS".split())


def _checked(name: str, allowed: frozenset[str]) -> str:
    if name not in allowed:
        raise ValueError(f"{name!r} is not in contracts/graph-model.md")
    return name


def with_feeds(edges: Iterable[tuple[str, str, str, dict]]) -> list[tuple[str, str, str, dict]]:
    """Return ``edges`` plus the materialised ``FEEDS {w:1}`` edge for every dependency edge.

    Edges are ``(src_id, TYPE, dst_id, props)``. ``FEEDS`` always points dependency -> dependent,
    so ``algo.bfs`` (outgoing only) from an old FactVersion reaches everything relying on it.
    """
    out = []
    for src, rel, dst, props in edges:
        out.append((src, rel, dst, props))
        if rel in FEEDS_MIRRORED or rel in FEEDS_REVERSED:
            # dependent -[DEPENDS_ON]-> dependency  =>  dependency -[FEEDS]-> dependent
            out.append((dst, "FEEDS", src, {"w": 1}))
    return out


def write_nodes(g, nodes: Iterable[dict]) -> int:
    """MERGE nodes given as dicts with at least ``id`` and ``kind`` (= main label)."""
    by_label: dict[str, list[dict]] = defaultdict(list)
    for n in nodes:
        by_label[_checked(n["kind"], NODE_LABELS)].append({"id": n["id"], "props": n})
    for label, rows in by_label.items():
        g.query(f"UNWIND $rows AS r MERGE (e:Entity:{label} {{id: r.id}}) SET e += r.props", {"rows": rows})
    return sum(len(r) for r in by_label.values())


def write_edges(g, edges: Iterable[tuple[str, str, str, dict]]) -> int:
    """MERGE edges ``(src_id, TYPE, dst_id, props)``; both endpoints must already exist."""
    by_type: dict[str, list[dict]] = defaultdict(list)
    for src, rel, dst, props in edges:
        by_type[_checked(rel, REL_TYPES)].append({"src": src, "dst": dst, "props": props})
    written = 0
    for rel, rows in by_type.items():
        res = g.query(
            "UNWIND $rows AS r MATCH (a:Entity {id: r.src}), (b:Entity {id: r.dst}) "
            f"MERGE (a)-[e:{rel}]->(b) SET e += r.props RETURN count(e)",
            {"rows": rows},
        )
        n = res.result_set[0][0]
        if n != len(rows):
            raise ValueError(f"{rel}: {len(rows) - n} edge(s) reference missing nodes")
        written += n
    return written
