"""Freshness guard: ap-approver's $150 VPN approval is BLOCKED with path + source (issue #28)."""

from agents import sentinel, workers
from ingest.synthetic import DEMO_NOW_MS
from tests.graph.conftest import requires_falkordb
from tests.graph.seeded import load_demo

pytestmark = requires_falkordb


def _status(g, action_id):
    return g.query(
        "MATCH (a:Action {id: $id}) RETURN a.status, a.blocked_reason", {"id": action_id}
    ).result_set[0]


def test_ap_approver_blocked_over_mcp(g, tenant):
    load_demo(tenant)
    sentinel.replay(tenant, "chg:c1", now=DEMO_NOW_MS)
    events = workers.run(tenant, "agent:ap-approver", now=DEMO_NOW_MS)  # real MCP stdio round-trip
    blocked = [e["payload"] for e in events if e["type"] == "action.blocked"]
    vpn = next(b for b in blocked if b["action_id"] == "act:approve-vpn-priya")
    assert vpn["stale_version"] == "fv:vpn:v1" and vpn["current_version"] == "fv:vpn:v2"
    assert vpn["via"] == "df:ap-vpn-rule" and vpn["source_url"].endswith("/merge_requests/20421")
    status, reason = _status(g, "act:approve-vpn-priya")
    assert status == "blocked" and "superseded by fv:vpn:v2" in reason
    replan = g.query(
        "MATCH (:Agent {id:'agent:ap-approver'})-[:CREATED]->(t:Task {task_kind:'replan'})-[:TARGETS]->"
        "(:Action {id:'act:approve-vpn-priya'}) MATCH (t)-[:ABOUT]->(c:Change) RETURN t.status, c.id"
    ).result_set
    assert replan == [["open", "chg:c1"]]


def test_before_the_change_the_action_goes_through(g, tenant):
    load_demo(tenant)  # C1 not replayed: v1 is still current
    before = DEMO_NOW_MS - 3_600_000
    workers.run(tenant, "agent:ap-approver", now=before, guard=workers.direct_guard)
    assert _status(g, "act:approve-vpn-priya")[0] == "done"


def test_direct_and_mcp_guards_agree(g, tenant):
    load_demo(tenant)
    sentinel.replay(tenant, "chg:c1", now=DEMO_NOW_MS)
    ids = ["act:approve-vpn-priya", "act:issue-cards"]
    assert workers.McpGuard()(tenant, ids, DEMO_NOW_MS) == workers.direct_guard(tenant, ids, DEMO_NOW_MS)
