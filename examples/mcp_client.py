"""Sample MCP client: spawn ripple_mcp over stdio, list tools, call the freshness guard (see docs/MCP.md)."""

import os
import sys

import anyio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


async def main():
    params = StdioServerParameters(
        command=sys.executable, args=["-m", "ripple_mcp.server", "--read-only"], env=dict(os.environ)
    )
    async with stdio_client(params) as (r, w), ClientSession(r, w) as s:
        await s.initialize()
        print([t.name for t in (await s.list_tools()).tools])
        res = await s.call_tool(
            "check_fresh", {"tenant": "handbook-demo", "action_id": "act:approve-vpn-priya"}
        )
        print(res.content[0].text[:400])


anyio.run(main)
