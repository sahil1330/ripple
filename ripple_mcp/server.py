"""ripple-mcp: Ripple's MCP server (plan §6). Tool schemas are the contract in ``contracts/mcp-tools.json``.

Any MCP client (a worker agent, Cursor, Claude Desktop, ...) can ask the company brain
who still holds a stale fact, or call the freshness guard before acting. This module
exposes the read-only tools; each one is a thin wrapper over ``graph.tools`` /
``graph.impact`` so the API and the agents run exactly the same Cypher.

Run over stdio: ``python -m ripple_mcp.server``
Run over HTTP:  ``python -m ripple_mcp.server --http`` (streamable HTTP on :8001)
"""

from __future__ import annotations

import argparse

from agents.ranking import rank
from graph import tools as graph_tools
from graph.impact import MAX_HOPS
from graph.impact import impact_of as graph_impact_of

READ_ONLY_TOOLS = ("impact_of", "who_holds", "check_fresh", "explain_path", "coverage")


def impact_of(
    tenant: str, change_id: str | None = None, version_id: str | None = None, max_hops: int = MAX_HOPS
) -> list[dict]:
    """Everything that relies (up to max_hops) on the old version of a change, ranked by time-to-harm risk.

    Pass change_id or version_id. Each row: id, kind, label, hops, risk, tth_ms.
    """
    rows = graph_impact_of(tenant, change_id=change_id, version_id=version_id, max_hops=max_hops)
    keep = ("id", "kind", "label", "hops", "risk", "tth_ms")
    return [{k: r[k] for k in keep} for r in rank(tenant, rows, now=graph_tools.now_ms())]


def who_holds(tenant: str, version_id: str) -> list[dict]:
    """People and agents still holding a superseded version (told or cached, not yet resolved)."""
    return graph_tools.who_holds(tenant, version_id)


def check_fresh(
    tenant: str, plan_id: str | None = None, action_id: str | None = None, now: int | None = None
) -> dict:
    """Freshness guard. Call before every action. fresh=false lists each stale dependency with the
    current value and source. now is epoch ms (defaults to server time, fixed in demo mode)."""
    return graph_tools.check_fresh(tenant, plan_id=plan_id, action_id=action_id, now=now)


def explain_path(tenant: str, from_id: str, to_id: str) -> dict:
    """Shortest 'why' path between two entities, with the Cypher used."""
    return graph_tools.explain_path(tenant, from_id, to_id)


def coverage(tenant: str, change_id: str) -> dict:
    """Impacted vs resolved counts for a change: {impacted, resolved, pct, by_kind}."""
    return graph_tools.coverage(tenant, change_id)


def build_server(port: int = 8001):
    from mcp.server.fastmcp import FastMCP

    server = FastMCP("ripple-mcp", port=port)
    for fn in (impact_of, who_holds, check_fresh, explain_path, coverage):
        server.tool(name=fn.__name__, description=fn.__doc__)(fn)
    return server


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Run the ripple-mcp server")
    parser.add_argument("--http", action="store_true", help="streamable HTTP instead of stdio")
    parser.add_argument("--port", type=int, default=8001)
    args = parser.parse_args(argv)
    build_server(args.port).run(transport="streamable-http" if args.http else "stdio")


if __name__ == "__main__":
    main()
