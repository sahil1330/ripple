"""End-to-end: a real MCP client talks to `python -m ripple_mcp.server` over stdio."""

import json
import os
import sys

import anyio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from ingest.handbook_changes import apply_change
from ingest.synthetic import DEMO_NOW_MS
from tests.graph.conftest import requires_falkordb
from tests.graph.seeded import load_demo

pytestmark = requires_falkordb


async def _call(tenant: str, calls: list[tuple[str, dict]]) -> list:
    env = {**os.environ, "RIPPLE_NOW_MS": str(DEMO_NOW_MS)}
    params = StdioServerParameters(command=sys.executable, args=["-m", "ripple_mcp.server"], env=env)
    out = []
    async with stdio_client(params) as (read, write), ClientSession(read, write) as session:
        await session.initialize()
        for name, args in calls:
            res = await session.call_tool(name, {"tenant": tenant, **args})
            assert not res.isError, res.content
            texts = [c.text for c in res.content]
            out.append([json.loads(t) for t in texts])
    return out


def test_stdio_freshness_guard_and_holders(g, tenant):
    load_demo(tenant)
    apply_change(tenant, "chg:c1")
    fresh, holders, impact = anyio.run(
        _call,
        tenant,
        [
            ("check_fresh", {"action_id": "act:approve-vpn-priya"}),
            ("who_holds", {"version_id": "fv:vpn:v1"}),
            ("impact_of", {"change_id": "chg:c1"}),
        ],
    )
    assert fresh[0]["fresh"] is False and fresh[0]["stale"][0]["current_version"] == "fv:vpn:v2"
    assert len(holders) == 13  # 11 people + 2 agents (list results come back one item per content block)
    assert impact[0]["id"] == "act:approve-vpn-priya" and impact[0]["tth_ms"] == 40 * 60_000
