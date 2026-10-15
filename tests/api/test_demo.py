"""Demo stepper (issue #31): 9 steps from plan §9, reproducible 3x in a row, contract shapes."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from api import demo
from api import main as api_main
from tests.contracts.openapi_schema import validate
from tests.graph.conftest import g, requires_falkordb, tenant  # noqa: F401 (pytest fixtures)

pytestmark = requires_falkordb
STEPS_FIXTURE = Path(__file__).resolve().parents[2] / "fixtures" / "demo-c1" / "demo-steps.json"


@pytest.fixture
def client(g, tenant, monkeypatch):  # noqa: F811
    monkeypatch.setattr(api_main, "TENANTS", [*api_main.TENANTS, {"id": tenant, "name": "test"}])
    return TestClient(api_main.app)


def _signature(resp: dict) -> list:
    """What must be identical across runs: step, name and each event's type + payload (answer ids aside)."""
    out = []
    for e in resp["events"]:
        payload = {k: v for k, v in e["payload"].items() if k != "answer_id"}
        out.append((e["type"], e["at"], json.dumps(payload, sort_keys=True)))
    return [resp["step"], resp["name"], out]


def _run(client, tenant) -> list[dict]:  # noqa: F811
    assert client.post("/api/demo/reset", json={"tenant": tenant}).json() == {"ok": True, "tenant": tenant}
    return [client.post("/api/demo/step", json={"tenant": tenant, "scenario": "c1"}).json() for _ in range(9)]


def test_nine_steps_reproducible_three_times(client, tenant):  # noqa: F811
    runs = [_run(client, tenant) for _ in range(3)]
    for steps in runs:
        for s in steps:
            validate(s, "DemoStepResponse")
        assert [s["step"] for s in steps] == list(range(1, 10)) and steps[0]["total_steps"] == 9
    sigs = [[_signature(s) for s in steps] for steps in runs]
    assert sigs[0] == sigs[1] == sigs[2]

    steps = runs[0]
    types = [{e["type"] for e in s["events"]} for s in steps]
    assert types[0] == set() and types[8] == set()
    assert types[1] == {"answer.sent"} and types[2] == {"change.detected", "task.created"}
    assert "impact.computed" in types[3]
    blocked = [e["payload"] for e in steps[4]["events"] if e["type"] == "action.blocked"]
    # The hero block. Other seeded actions that rely on older superseded facts (C2-C5) block too.
    vpn = next(b for b in blocked if b["action_id"] == "act:approve-vpn-priya")
    assert vpn["stale_version"] == "fv:vpn:v1" and vpn["current_version"] == "fv:vpn:v2"
    # The Fixer also handles replans for older changes (C2-C5); follow C1's meter only.
    cov = [e["payload"]["pct"] for e in steps[5]["events"]
           if e["type"] == "coverage.updated" and e["payload"]["change_id"] == "chg:c1"]  # fmt: skip
    assert cov == sorted(cov) and cov[-1] == 100.0
    # beat 8: the other tenant ran in its own graph; this tenant's coverage is unchanged (100% before/after)
    beat8 = steps[7]["events"]
    assert {e["tenant"] for e in beat8} == {tenant, "handbook-demo"}
    mine = [e["payload"]["pct"] for e in beat8 if e["tenant"] == tenant]
    assert mine == [100.0, 100.0]
    first, again = steps[1]["events"][0]["payload"], steps[6]["events"][0]["payload"]
    assert first["version_ids"] == ["fv:vpn:v1"] and first["earlier_told"] is None
    assert again["version_ids"] == ["fv:vpn:v2"] and again["earlier_told"]["version_id"] == "fv:vpn:v1"


def test_step_after_nine_wraps_to_fresh_run(client, tenant):  # noqa: F811
    _run(client, tenant)
    again = client.post("/api/demo/step", json={"tenant": tenant}).json()
    assert again["step"] == 1


def test_matches_fixture_shapes(client, tenant):  # noqa: F811
    """Same step names and event types per step as fixtures/demo-c1/demo-steps.json (issue #5)."""
    if not STEPS_FIXTURE.exists():
        pytest.skip("fixtures/demo-c1 not merged yet (#5)")
    fixture = json.loads(STEPS_FIXTURE.read_text())
    real = _run(client, tenant)
    assert [s["name"] for s in real] == [s["name"] for s in fixture]
    assert [sorted({e["type"] for e in s["events"]}) for s in real] == [
        sorted({e["type"] for e in s["events"]}) for s in fixture
    ]


def test_rejects_unknown(client):
    assert client.post("/api/demo/step", json={"tenant": "nope"}).status_code == 404
    bad = {"tenant": "handbook-demo", "scenario": "c9"}
    assert client.post("/api/demo/step", json=bad).status_code == 422


def test_steps_table_matches_docstring():
    assert len(demo.STEPS) == 9
