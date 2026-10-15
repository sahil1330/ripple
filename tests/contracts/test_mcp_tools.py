"""contracts/mcp-tools.json must stay a set of valid JSON Schemas (one per ripple-mcp tool)."""

import json
from pathlib import Path

import jsonschema

ROOT = Path(__file__).resolve().parents[2]
EXPECTED = {
    "impact_of", "who_holds", "check_fresh", "explain_path", "coverage",
    "rank_amplifiers", "dark_pockets", "claim_task", "complete_task", "record_answer",
}  # fmt: skip


def load():
    return json.loads((ROOT / "contracts" / "mcp-tools.json").read_text())["tools"]


def test_tool_names_match_plan():
    assert {t["name"] for t in load()} == EXPECTED


def test_schemas_are_valid_and_take_tenant():
    for t in load():
        jsonschema.Draft202012Validator.check_schema(t["inputSchema"])
        jsonschema.Draft202012Validator.check_schema(t["outputSchema"])
        assert "tenant" in t["inputSchema"]["required"], t["name"]


def test_write_tools_flagged():
    writes = {t["name"] for t in load() if t["write"]}
    assert writes == {"claim_task", "complete_task", "record_answer"}
