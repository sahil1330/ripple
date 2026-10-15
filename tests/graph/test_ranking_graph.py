"""TTH ranking on the seeded C1 graph: the ap-approver's VPN approval must rank first."""

from agents.ranking import rank
from graph.impact import impact_of
from ingest.handbook_changes import apply_change
from ingest.synthetic import DEMO_NOW_MS
from tests.graph.conftest import requires_falkordb
from tests.graph.seeded import load_demo

pytestmark = requires_falkordb


def test_c1_ranking(g, tenant):
    load_demo(tenant)
    apply_change(tenant, "chg:c1")
    ranked = rank(tenant, impact_of(tenant, change_id="chg:c1"), now=DEMO_NOW_MS)
    top = ranked[0]
    assert top["id"] == "act:approve-vpn-priya"
    assert top["tth_ms"] == 40 * 60_000 and top["severity"] == 1.0
    assert all(set(r) >= {"risk", "severity", "urgency", "reach", "tth_ms"} for r in ranked)
    risks = [r["risk"] for r in ranked]
    assert risks == sorted(risks, reverse=True)
    assert rank(tenant, impact_of(tenant, change_id="chg:c1"), now=DEMO_NOW_MS) == ranked  # deterministic
