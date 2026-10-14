"""The tools the server exposes must match contracts/mcp-tools.json (no FalkorDB needed)."""

import asyncio
import json
from pathlib import Path

import pytest

from ripple_mcp.server import READ_ONLY_TOOLS, build_server

CONTRACT = json.loads((Path(__file__).resolve().parents[2] / "contracts" / "mcp-tools.json").read_text())


def _listed():
    return {t.name: t for t in asyncio.run(build_server().list_tools())}


def test_exposes_exactly_the_read_only_tools():
    assert set(_listed()) == set(READ_ONLY_TOOLS)
    contract_names = {t["name"] for t in CONTRACT["tools"] if not t["write"]}
    assert set(READ_ONLY_TOOLS) <= contract_names


@pytest.mark.skipif(
    "inputSchema" not in CONTRACT["tools"][0],
    reason="contracts-v1 (#3) not merged yet: v0 has no JSON Schemas",
)
def test_params_match_contract():
    listed = _listed()
    for spec in CONTRACT["tools"]:
        if spec["name"] in listed:
            server_schema = listed[spec["name"]].inputSchema
            assert set(server_schema["properties"]) == set(spec["inputSchema"]["properties"]), spec["name"]
            assert set(server_schema.get("required", [])) == set(spec["inputSchema"]["required"]), spec[
                "name"
            ]
