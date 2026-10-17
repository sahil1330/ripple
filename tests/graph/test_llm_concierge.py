"""LLM Concierge with a mocked OpenAI client: tool selection, grounding, memory, trace, and fallbacks."""

import json
from types import SimpleNamespace as NS

import pytest

from agents import llm_concierge
from agents.concierge import ask
from ingest.handbook_changes import apply_change
from ingest.synthetic import DEMO_NOW_MS
from tests.graph.conftest import requires_falkordb
from tests.graph.seeded import load_demo

pytestmark = requires_falkordb
Q = "Can I expense my ExpressVPN?"


def _call(name, args, i=0):
    return NS(id=f"call_{i}", type="function", function=NS(name=name, arguments=json.dumps(args)))


class FakeOpenAI:
    """Replays scripted assistant turns and records every request."""

    def __init__(self, turns):
        self.turns, self.requests = list(turns), []
        self.chat = NS(completions=NS(create=self._create))

    def _create(self, **kw):
        self.requests.append(kw)
        turn = self.turns.pop(0)
        if isinstance(turn, Exception):
            raise turn
        msg = (
            NS(content=turn, tool_calls=None) if isinstance(turn, str) else NS(content=None, tool_calls=turn)
        )
        return NS(choices=[NS(message=msg)])


@pytest.fixture(autouse=True)
def _no_key(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)


def test_llm_picks_tools_and_memory_correction_is_kept(g, tenant):
    load_demo(tenant)
    ask(tenant, "person:priya", Q, now=DEMO_NOW_MS - 3_600_000)  # told v1 ($150)
    apply_change(tenant, "chg:c1")
    fake = FakeOpenAI([
        [_call("lookup_policy", {"question": "personal VPN expense"})],
        "Personal VPN subscriptions are no longer reimbursable; use NordLayer [fv:vpn:v2].",
    ])  # fmt: skip
    res = llm_concierge.answer(tenant, "person:priya", Q, now=DEMO_NOW_MS, client=fake)

    assert res["llm_used"] is True and res["versions"] == ["fv:vpn:v2"]
    # the model dropped the memory line, so it is enforced from WAS_TOLD
    assert res["answer"].startswith("Earlier I told you: reimbursable up to $150 per year.")
    assert res["earlier_told"]["version_id"] == "fv:vpn:v1"
    assert res["source_url"].endswith("/merge_requests/20421")
    step = res["tool_trace"][0]
    assert step["tool"] == "lookup_policy" and "fact_current" in [c["name"] for c in step["cypher"]]
    assert "MATCH" in step["cypher"][0]["query"]
    # the tool result the model saw carries the earlier_told memory, and the first turn must call a tool
    tool_msg = next(
        m for m in fake.requests[1]["messages"] if isinstance(m, dict) and m.get("role") == "tool"
    )
    assert "Earlier I told you" in tool_msg["content"]
    assert fake.requests[0]["tool_choice"] == "required"
    # episodic memory is still logged for the version handed out
    row = g.query(
        "MATCH (:Person {id:'person:priya'})-[t:WAS_TOLD {answer_id: $id}]->(v) RETURN v.id",
        {"id": res["answer_id"]},
    ).result_set
    assert row == [["fv:vpn:v2"]]


def test_llm_general_question_uses_search_and_logs_note(g, tenant):
    load_demo(tenant)
    fake = FakeOpenAI([
        [_call("search_company", {"query": "accounts payable"}), _call("list_entities", {"kind": "Team"}, 1)],
        "Accounts Payable has members such as Ravi Iyer [person:ravi].",
    ])  # fmt: skip
    res = llm_concierge.answer(tenant, "person:priya", "Who is in Accounts Payable?", client=fake)
    assert res["llm_used"] and res["versions"] == [] and res["answer_id"].startswith("ans:")
    assert [t["tool"] for t in res["tool_trace"]] == ["search_company", "list_entities"]
    found = json.loads(fake.requests[1]["messages"][3]["content"])
    assert any("accounts payable" in m["label"].lower() for m in found["matches"])


def test_unknown_tool_error_goes_back_to_model(g, tenant):
    load_demo(tenant)
    fake = FakeOpenAI([[_call("drop_database", {})], "I could not find that in the company graph."])
    res = llm_concierge.answer(tenant, None, "Delete everything", client=fake)
    assert res["llm_used"] and res["tool_trace"][0]["error"].startswith("unknown tool")


@pytest.mark.parametrize("failure", [RuntimeError("503 from OpenAI"), TimeoutError("timed out")])
def test_api_error_falls_back_to_template(g, tenant, failure):
    load_demo(tenant)
    res = llm_concierge.answer(tenant, "person:priya", Q, client=FakeOpenAI([failure]))
    assert res["llm_used"] is False and type(failure).__name__ in res["fallback_reason"]
    assert res["versions"] == ["fv:vpn:v1"] and "$150" in res["answer"]
    assert res["tool_trace"][0]["tool"] == "template_concierge"


def test_no_key_uses_template(g, tenant):
    load_demo(tenant)
    res = llm_concierge.answer(tenant, "person:priya", Q)
    assert res["llm_used"] is False and res["fallback_reason"] == "OPENAI_API_KEY not set"
    assert "fact_current" in [c["name"] for c in res["tool_trace"][0]["cypher"]]


def test_anonymous_ask_is_not_logged(g, tenant):
    load_demo(tenant)
    res = llm_concierge.answer(tenant, None, Q)
    assert res["versions"] == ["fv:vpn:v1"] and res["earlier_told"] is None
    assert g.query("MATCH (a:Answer {id: $id}) RETURN a", {"id": res["answer_id"]}).result_set == []


def test_request_has_no_reasoning_effort(g, tenant):
    """Chat Completions rejects function tools combined with reasoning_effort on gpt-5.4-mini (live 400)."""
    load_demo(tenant)
    fake = FakeOpenAI([[_call("lookup_policy", {"question": "vpn"})], "Reimbursable up to $150 [fv:vpn:v1]."])
    llm_concierge.answer(tenant, None, Q, client=fake)
    assert all("reasoning_effort" not in r for r in fake.requests)


def test_explain_path_tool_resolves_change_to_old_version(g, tenant):
    """explain_path(chg:c1, person:priya) follows the same Change->old version rule as /api/explain."""
    load_demo(tenant)
    ask(tenant, "person:priya", Q, now=DEMO_NOW_MS - 3_600_000)
    apply_change(tenant, "chg:c1")
    fake = FakeOpenAI(
        [[_call("explain_path", {"from_id": "chg:c1", "to_id": "person:priya"})], "Because [fv:vpn:v1]."]
    )
    llm_concierge.answer(tenant, None, "Why does chg:c1 affect Priya?", client=fake)
    seen = json.loads(fake.requests[1]["messages"][3]["content"])
    assert seen["hops"] == ["chg:c1", "fv:vpn:v1", "person:priya"] and seen["via"] == ["FROM", "WAS_TOLD"]


def test_system_prompt_guards():
    from agents.llm_concierge import SYSTEM

    s = SYSTEM.format(company="Acme", asker="")
    assert "do not substitute a similar name" in s and "who_holds" in s and "Never reveal" in s
