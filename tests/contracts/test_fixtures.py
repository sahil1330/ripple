"""Fixtures in fixtures/demo-c1 validate against contracts/openapi.yaml + events.md (issue #5).

These run in the ``contracts`` CI job without FalkorDB. ``FIXTURES`` maps each file to the
schema of the endpoint it mocks; a new fixture file must be added here or the test fails.
"""

import json
from pathlib import Path

import pytest
import yaml

from tests.contracts.openapi_schema import validate

ROOT = Path(__file__).resolve().parents[2]
DEMO = ROOT / "fixtures" / "demo-c1"
EVENT_TYPES = {
    "change.detected", "impact.computed", "task.created", "task.claimed", "task.done",
    "action.blocked", "answer.sent", "coverage.updated",
}  # fmt: skip

# file -> (endpoint it mocks, schema name, is it an array of that schema)
FIXTURES = {
    "health.json": ("GET /api/health", "HealthResponse", False),
    "tenants.json": ("GET /api/tenants", "Tenant", True),
    "graph.json": ("GET /api/graph?change_id=chg:c1", "GraphResponse", False),
    "changes.json": ("GET /api/changes", "ChangeSummary", True),
    "change-chg-c1.json": ("GET /api/changes/chg:c1", "ChangeDetail", False),
    "impact-chg-c1.json": ("GET /api/changes/chg:c1/impact", "ImpactResponse", False),
    "coverage-chg-c1-before.json": ("GET .../coverage (before Fixer)", "CoverageResponse", False),
    "coverage-chg-c1.json": ("GET /api/changes/chg:c1/coverage", "CoverageResponse", False),
    "explain-chg-c1-priya.json": ("GET /api/explain?from=chg:c1&to=person:priya", "ExplainResponse", False),
    "ask-before.json": ("POST /api/ask (before C1)", "AskResponse", False),
    "ask-after.json": ("POST /api/ask (after C1)", "AskResponse", False),
    "demo-steps.json": ("POST /api/demo/step x9", "DemoStepResponse", True),
    "demo-reset.json": ("POST /api/demo/reset", "DemoResetResponse", False),
}


def _load(name):
    return json.loads((DEMO / name).read_text())


def test_contract_files_parse():
    yaml.safe_load((ROOT / "contracts" / "openapi.yaml").read_text())
    json.loads((ROOT / "contracts" / "mcp-tools.json").read_text())


def test_fixtures_are_valid_json():
    for path in (ROOT / "fixtures").rglob("*.json"):
        json.loads(path.read_text())


def test_every_fixture_is_mapped():
    assert {p.name for p in DEMO.glob("*.json")} == set(FIXTURES)


@pytest.mark.parametrize("name", sorted(FIXTURES))
def test_fixture_matches_openapi(name):
    _, schema, is_array = FIXTURES[name]
    if is_array:
        validate(_load(name), array_of=schema)
    else:
        validate(_load(name), schema)


def test_events_log_is_valid_sse():
    lines = (DEMO / "events.jsonl").read_text().splitlines()
    events = [json.loads(line) for line in lines]
    for e in events:
        validate(e, "SseEnvelope")
    assert {e["type"] for e in events} == EVENT_TYPES  # the script exercises every event type
    assert [e["at"] for e in events] == sorted(e["at"] for e in events)
    steps = _load("demo-steps.json")
    assert events == [e for s in steps for e in s["events"]]  # the log is the steps' events in order


def test_demo_story():
    """The fixtures tell plan §9: 9 steps, v1 then v2 with memory, hero block, coverage to 100%."""
    steps = _load("demo-steps.json")
    assert [s["step"] for s in steps] == list(range(1, 10)) and {s["total_steps"] for s in steps} == {9}
    assert _load("ask-before.json")["versions"] == ["fv:vpn:v1"]
    after = _load("ask-after.json")
    assert after["versions"] == ["fv:vpn:v2"] and after["earlier_told"]["version_id"] == "fv:vpn:v1"
    blocked = [e["payload"]["action_id"] for e in steps[4]["events"] if e["type"] == "action.blocked"]
    assert "act:approve-vpn-priya" in blocked
    assert _load("coverage-chg-c1-before.json")["pct"] == 0.0
    assert _load("coverage-chg-c1.json")["pct"] == 100.0
    assert _load("change-chg-c1.json")["status"] == "resolved"
    ids = {n["id"] for n in _load("graph.json")["nodes"]}
    assert {i["id"] for i in _load("impact-chg-c1.json")["items"]} <= ids
