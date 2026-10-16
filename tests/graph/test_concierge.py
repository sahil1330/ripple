"""Concierge on the seeded demo graph: plan §9 steps 2 and 7 (Priya asks before and after C1)."""

from agents.concierge import ask
from graph.tools import who_holds
from ingest.handbook_changes import apply_change
from ingest.synthetic import DEMO_NOW_MS
from tests.graph.conftest import requires_falkordb
from tests.graph.seeded import load_demo

pytestmark = requires_falkordb
Q = "Can I expense my ExpressVPN?"


def test_before_and_after_change(g, tenant):
    load_demo(tenant)
    before = ask(tenant, "person:priya", Q, now=DEMO_NOW_MS - 3_600_000)
    assert before["versions"] == ["fv:vpn:v1"] and "$150" in before["answer"]
    assert before["earlier_told"] is None

    apply_change(tenant, "chg:c1")
    after = ask(tenant, "person:priya", Q, now=DEMO_NOW_MS)
    assert after["versions"] == ["fv:vpn:v2"]
    assert after["source_url"].endswith("/merge_requests/20421")
    assert after["earlier_told"]["version_id"] == "fv:vpn:v1"
    assert after["answer"].startswith("Earlier I told you: reimbursable up to $150 per year.")
    assert "MR !20421" in after["answer"]


def test_answer_is_logged_as_episodic_memory(g, tenant):
    load_demo(tenant)
    apply_change(tenant, "chg:c1")
    res = ask(tenant, "person:priya", Q, channel="slack", now=DEMO_NOW_MS)
    row = g.query(
        "MATCH (a:Answer {id: $id})-[:ANSWERED]->(p:Person)-[t:WAS_TOLD]->(v:FactVersion {id: 'fv:vpn:v2'}) "
        "MATCH (v)-[f:FEEDS]->(p) RETURN p.id, t.at, t.channel, t.answer_id, f.w",
        {"id": res["answer_id"]},
    ).result_set
    assert row == [["person:priya", DEMO_NOW_MS, "slack", res["answer_id"], 1]]
    # being told v2 does not by itself resolve the old exposure; Fixer writes RESOLVED (#29)
    assert "person:priya" in {h["id"] for h in who_holds(tenant, "fv:vpn:v1")}


def test_general_question_about_a_team(g, tenant):
    load_demo(tenant)
    res = ask(tenant, "person:priya", "Who is in Accounts Payable?", now=DEMO_NOW_MS)
    assert "team:ap" in res["answer"] and "Ravi Iyer" in res["answer"]
    assert res["versions"] == [] and res["earlier_told"] is None
    row = g.query("MATCH (a:Answer {id: $id})-[:ANSWERED]->(p:Person) RETURN p.id", {"id": res["answer_id"]})
    assert row.result_set == [["person:priya"]]


def test_general_question_about_a_person(g, tenant):
    load_demo(tenant)
    res = ask(tenant, "person:ravi", "What does Priya Sharma work on?", now=DEMO_NOW_MS)
    assert "person:priya" in res["answer"] and "Engineering" in res["answer"]


def test_unknown_general_question_still_raises(g, tenant):
    load_demo(tenant)
    import pytest

    from agents.concierge import UnknownTopic

    with pytest.raises(UnknownTopic):
        ask(tenant, "person:priya", "zzqx flibbertigibbet?", now=DEMO_NOW_MS)


def test_general_listing_question(g, tenant):
    load_demo(tenant)
    res = ask(tenant, "person:priya", "What agents do we have?", now=DEMO_NOW_MS)
    assert "agent:ap-approver" in res["answer"] and res["versions"] == []
