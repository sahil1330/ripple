"""ripple-mcp server (plan §6). Tool schemas are the contract in ``contracts/mcp-tools.json``.

Run over stdio: ``python -m ripple_mcp.server``
"""

from __future__ import annotations


def build_server():
    from mcp.server.fastmcp import FastMCP

    server = FastMCP("ripple")

    @server.tool()
    def check_fresh(tenant: str, plan_id: str | None = None, action_id: str | None = None) -> dict:
        """Freshness guard: is this plan or action relying on a superseded fact version?"""
        raise NotImplementedError("implemented in the ripple-mcp read-only tools issue")

    return server


if __name__ == "__main__":
    build_server().run()
