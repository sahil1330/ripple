"""Ingest real handbook pages as ``Doc`` nodes + ``LINKS_TO`` + ``STATES``/``CITES`` (plan §3.3).

Data comes from ``ingest/data/handbook_docs.json`` (built offline by
``ingest/build_handbook_docs.py`` from the public handbook; titles, short
excerpts and links only, (c) GitLab B.V.).

* ``LINKS_TO``: real hyperlinks between finance pages -> input for ``algo.pageRank``.
* The expenses policy page ``STATES`` the version of each fact that is current in
  the graph at ingest time; other pages that link to it and talk about a fact ``CITES`` it.

Run after ``ingest.handbook_changes``: ``python -m ingest.handbook_docs --tenant handbook-demo``
"""

from __future__ import annotations

import argparse
import json
from functools import cache
from pathlib import Path

from graph.bulk import with_feeds, write_edges, write_nodes
from graph.client import tenant_graph
from graph.cypher import cypher

DATA_FILE = Path(__file__).parent / "data" / "handbook_docs.json"
POLICY_PAGE = "doc:hb:finance:expenses"


@cache
def load_data() -> dict:
    return json.loads(DATA_FILE.read_text())


def ingest(tenant: str) -> dict:
    g = tenant_graph(tenant)
    docs = load_data()["docs"]
    nodes = [
        {"id": d["id"], "kind": "Doc", "title": d["title"], "url": d["url"], "excerpt": d["excerpt"],
         "doc_kind": "handbook", "synthetic": False}
        for d in docs
    ]  # fmt: skip
    keys = sorted({k for d in docs for k in d["cites"]})
    current = dict(g.query(cypher("current_versions"), {"keys": keys}).result_set)
    edges: list[tuple[str, str, str, dict]] = []
    for d in docs:
        edges += [(d["id"], "LINKS_TO", target, {}) for target in d["links"]]
        rel = "STATES" if d["id"] == POLICY_PAGE else "CITES"
        edges += [(d["id"], rel, current[k], {}) for k in d["cites"] if k in current]
    return {"docs": write_nodes(g, nodes), "edges": write_edges(g, with_feeds(edges))}


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Ingest handbook finance pages as Doc nodes")
    parser.add_argument("--tenant", default="handbook-demo")
    print(ingest(parser.parse_args(argv).tenant))


if __name__ == "__main__":
    main()
