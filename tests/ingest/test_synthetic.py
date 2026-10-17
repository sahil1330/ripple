"""Offline checks on the seeded synthetic layer (no FalkorDB needed)."""

from collections import Counter

from graph.bulk import FEEDS_MIRRORED, FEEDS_REVERSED
from ingest.synthetic import VPN_V1, generate


def test_deterministic_for_a_seed():
    a, b = generate(42), generate(42)
    assert a.nodes == b.nodes and a.edges == b.edges
    assert generate(7).nodes != a.nodes


def test_every_node_is_synthetic_and_ids_unique():
    layer = generate()
    assert all(n["synthetic"] is True for n in layer.nodes)
    ids = [n["id"] for n in layer.nodes]
    assert len(ids) == len(set(ids))


def test_shape_matches_plan():
    kinds = Counter(n["kind"] for n in generate().nodes)
    assert kinds["Person"] == 24 and kinds["Team"] == 5 and kinds["Answer"] == 40


def test_c1_scenario_minimums():
    edges = generate().edges
    told = {s for s, r, d, _ in edges if r == "WAS_TOLD" and d == VPN_V1}
    cached = {s for s, r, d, _ in edges if r == "CACHED" and d == VPN_V1}
    assert len(told) >= 10 and "person:priya" in told
    assert len(cached) >= 2


def test_feeds_written_alongside_each_dependency_edge():
    edges = generate().edges
    feeds = {(s, d) for s, r, d, _ in edges if r == "FEEDS"}
    for s, r, d, _ in edges:
        if r in FEEDS_MIRRORED or r in FEEDS_REVERSED:
            assert (d, s) in feeds, (s, r, d)
    assert all(p == {"w": 1} for _, r, _, p in edges if r == "FEEDS")


def test_wiki_urls_are_tenant_specific():
    from ingest.synthetic import TENANT_WIKIS, generate

    for tenant, base in TENANT_WIKIS.items():
        urls = [
            n["url"] for n in generate(wiki_base=base).nodes if n.get("url", "").startswith("https://wiki.")
        ]
        assert urls and all(u.startswith(base + "/") for u in urls), tenant
    assert "acme" not in TENANT_WIKIS["handbook-demo"]
