"""Seeded synthetic layer for tenant ``handbook-demo`` (plan §3.4). Every node is ``synthetic: true``.

The real policy versions come from ``ingest/handbook_changes.py``; this module adds the
made-up company around them: people, teams, Concierge answers (who was told which
version), docs/wiki pages quoting a version, plans and pending actions that depend
on a version, and worker agents that cached a version.

``generate(seed)`` is pure (no database) and deterministic, so it can be tested offline
and the demo is identical on every run. ``seed(tenant)`` writes it to FalkorDB.

Demo anchor (scenario C1, personal VPN):
* Priya Sharma was told "$150/year" by the Concierge, plus 10 other people.
* Worker agents ``ap-approver`` and ``it-helpdesk-bot`` cached the $150 rule.
* Plan "Expense approvals queue" has a pending $150 VPN approval due 40 min after DEMO_NOW.

Run: ``python -m ingest.synthetic --tenant handbook-demo --seed 42``
"""

from __future__ import annotations

import argparse
import random
from dataclasses import dataclass, field

from graph.bulk import with_feeds, write_edges, write_nodes
from graph.client import tenant_graph

MIN = 60_000
HOUR = 60 * MIN
DAY = 24 * HOUR
# Fixed demo clock: 2026-07-14 17:00 UTC, ~30 min after the real C1 commit ddd39597 (16:28 UTC).
DEMO_NOW_MS = 1_784_048_400_000

TEAMS = {
    "team:ap": "Accounts Payable",
    "team:people": "People Ops",
    "team:it": "IT",
    "team:eng": "Engineering",
    "team:sales": "Sales",
}
FIRST = "Aarav Ana Ben Chen Dara Elif Femi Gita Hana Ivan Jonas Kofi Lena Mateo Noor Omar Rosa Sven Tara Yuki Zoe Leo Mia".split()
LAST = "Okafor Novak Silva Tanaka Kim Haddad Rossi Becker Mensah Ivanova Costa Patel Larsen Cruz Nagy Moreau".split()

# version id the C1 scenario revolves around
VPN_V1 = "fv:vpn:v1"


@dataclass
class Layer:
    nodes: list[dict] = field(default_factory=list)
    edges: list[tuple[str, str, str, dict]] = field(default_factory=list)

    def node(self, kind: str, id: str, **props) -> str:
        self.nodes.append({"id": id, "kind": kind, "synthetic": True, **props})
        return id

    def edge(self, src: str, rel: str, dst: str, **props) -> None:
        self.edges.append((src, rel, dst, props))


def _people(rng: random.Random, layer: Layer) -> dict[str, list[str]]:
    """24 people in 5 teams. Priya (Engineering) and Ravi (AP lead) are fixed for the demo script."""
    for tid, name in TEAMS.items():
        layer.node("Team", tid, name=name)
    roster = {t: [] for t in TEAMS}
    fixed = [
        ("person:priya", "Priya Sharma", "Backend Engineer", "team:eng"),
        ("person:ravi", "Ravi Iyer", "AP Lead", "team:ap"),
    ]
    sizes = {"team:ap": 4, "team:people": 4, "team:it": 4, "team:eng": 7, "team:sales": 5}
    names = rng.sample([f"{f} {lname}" for f in FIRST for lname in LAST], 22)
    for pid, name, role, team in fixed:
        layer.node("Person", pid, name=name, role=role)
        roster[team].append(pid)
    i = 0
    for team, size in sizes.items():
        while len(roster[team]) < size:
            pid = f"person:{len(layer.nodes):02d}"
            layer.node("Person", pid, name=names[i], role=f"{TEAMS[team]} team member")
            roster[team].append(pid)
            i += 1
    for team, members in roster.items():
        for pid in members:
            layer.edge(pid, "MEMBER_OF", team)
    return roster


def _chat_graph(rng: random.Random, layer: Layer, roster: dict[str, list[str]]) -> None:
    """TALKS_WITH: dense inside teams, a few bridges. Sales has no bridge -> a 'dark pocket' for WCC."""
    for members in roster.values():
        for a, b in zip(members, members[1:], strict=False):  # chain keeps each team connected
            layer.edge(a, "TALKS_WITH", b, weight=rng.randint(3, 10))
        for _ in range(len(members) // 2):
            a, b = rng.sample(members, 2)
            layer.edge(a, "TALKS_WITH", b, weight=rng.randint(1, 5))
    bridges = [("team:eng", "team:it"), ("team:it", "team:ap"), ("team:ap", "team:people")]
    for t1, t2 in bridges:
        layer.edge(roster[t1][0], "TALKS_WITH", roster[t2][0], weight=2)


# (version, how many people were told it, channel) -> ~40 Concierge answers in total
ANSWER_PLAN = [
    (VPN_V1, 11, "Can I expense my ExpressVPN subscription?", "Yes, personal VPN is reimbursable up to $150/year."),
    ("fv:meals:v1", 8, "What's the daily meal limit when travelling?", "Up to $100 per day."),
    ("fv:netphone:v1", 8, "My internet bill is $95, will it be covered?", "The limit is $80, but higher claims "
     "are considered case by case."),
    ("fv:cowork:v1", 7, "Do I need approval for a co-working day pass?", "No, up to 5 one-off days a month "
     "need no approval."),
    ("fv:stipend:v1", 6, "How do I get my home-office stipend?", "You'll receive a $1,500 virtual card."),
]  # fmt: skip


def _answers(rng: random.Random, layer: Layer, roster: dict[str, list[str]]) -> None:
    everyone = [p for members in roster.values() for p in members]
    n = 0
    for version, count, question, text in ANSWER_PLAN:
        told = rng.sample([p for p in everyone if p != "person:priya"], count)
        if version == VPN_V1:
            told[0] = "person:priya"  # demo step 2: Priya asks about ExpressVPN
        for pid in told:
            n += 1
            aid = f"ans:{n:03d}"
            at = DEMO_NOW_MS - rng.randint(2 * HOUR, 30 * DAY)
            channel = rng.choice(["slack", "web", "email"])
            layer.node("Answer", aid, question=question, text=text, at=at, channel=channel)
            layer.edge(aid, "ANSWERED", pid)
            layer.edge(pid, "WAS_TOLD", version, at=at, channel=channel, answer_id=aid)


def _agents(layer: Layer) -> None:
    for aid, kind in [
        ("sentinel", "sentinel"),
        ("tracer", "tracer"),
        ("fixer", "fixer"),
        ("concierge", "concierge"),
    ]:
        layer.node("Agent", f"agent:{aid}", name=aid, agent_kind=kind)
    workers = {
        "ap-approver": [VPN_V1, "fv:netphone:v1", "fv:meals:v1"],
        "it-helpdesk-bot": [VPN_V1, "fv:netphone:v1"],
        "onboarding-bot": ["fv:stipend:v1"],
        "travel-planner": ["fv:meals:v1", "fv:cowork:v1"],
    }
    for name, cached in workers.items():
        layer.node("Agent", f"agent:{name}", name=name, agent_kind="worker")
        for i, version in enumerate(cached):
            layer.edge(f"agent:{name}", "CACHED", version, at=DEMO_NOW_MS - (3 + i) * DAY)


def _docs(layer: Layer, roster: dict[str, list[str]]) -> None:
    """Synthetic internal wiki pages that quote a policy version (clearly not GitLab's)."""
    docs = [
        ("doc:wiki-it-onboarding", "IT onboarding checklist", "synthetic_wiki", "STATES", VPN_V1, "team:it"),
        ("doc:faq-remote", "Remote work FAQ", "faq", "CITES", VPN_V1, "team:people"),
        ("doc:wiki-travel-security", "Security tips for travel", "synthetic_wiki", "CITES", VPN_V1, "team:it"),
        ("doc:wiki-offsite-howto", "How to run a team offsite", "synthetic_wiki", "CITES", "fv:meals:v1", "team:people"),
        ("doc:faq-expenses", "Expenses FAQ (internal copy)", "faq", "STATES", "fv:netphone:v1", "team:ap"),
        ("doc:wiki-new-hire", "New-hire week 1 guide", "synthetic_wiki", "STATES", "fv:stipend:v1", "team:people"),
    ]  # fmt: skip
    for did, title, doc_kind, rel, version, owner_team in docs:
        layer.node("Doc", did, title=title, url=f"https://wiki.acme.example/{did[4:]}", doc_kind=doc_kind)
        layer.edge(did, rel, version)
        layer.edge(roster[owner_team][0], "OWNS", did)
    layer.edge("doc:faq-remote", "LINKS_TO", "doc:wiki-it-onboarding")
    layer.edge("doc:wiki-travel-security", "LINKS_TO", "doc:faq-remote")
    layer.edge("doc:wiki-new-hire", "LINKS_TO", "doc:wiki-it-onboarding")


def _plans(layer: Layer, roster: dict[str, list[str]]) -> None:
    """Plans + actions that rely on a version, directly or via a DerivedFact (plan §3.4)."""
    df = layer.node  # alias for readability below
    df(
        "DerivedFact",
        "df:ap-vpn-rule",
        statement="Auto-approve personal VPN claims up to $150/year",
        derived_at=DEMO_NOW_MS - 20 * DAY,
        by_agent="agent:ap-approver",
    )
    layer.edge("df:ap-vpn-rule", "DERIVED_FROM", VPN_V1)
    df(
        "DerivedFact",
        "df:offsite-meals",
        statement="Offsite meal budget = 3 days × 12 people × $100 = $3,600",
        derived_at=DEMO_NOW_MS - 10 * DAY,
        by_agent="agent:travel-planner",
    )
    layer.edge("df:offsite-meals", "DERIVED_FROM", "fv:meals:v1")

    ap, eng, people, sales = (
        roster["team:ap"],
        roster["team:eng"],
        roster["team:people"],
        roster["team:sales"],
    )
    plans = [
        ("plan:ap-queue", "Expense approvals queue (AP worker agent)", 2 * HOUR, "person:ravi",
         ["df:ap-vpn-rule"]),  # the phone rule is a dependency of the phone action only
        ("plan:offsite", "Q4 Bengaluru offsite: meal budget", 9 * DAY, eng[1], ["df:offsite-meals"]),
        ("plan:onboard-nov", "Onboard 3 new hires in Nov: stipend cards", 5 * DAY, people[1], ["fv:stipend:v1"]),
        ("plan:emea-trips", "EMEA sales trip bookings", 3 * DAY, sales[0], ["fv:meals:v1", "fv:cowork:v1"]),
    ]  # fmt: skip
    for pid, title, act_in, owner, deps in plans:
        layer.node("Plan", pid, title=title, status="active", act_by=DEMO_NOW_MS + act_in)
        layer.edge(owner, "OWNS", pid)
        for d in deps:
            layer.edge(pid, "DEPENDS_ON", d)

    actions = [
        # id, title, kind, plan, due in, amount, owner agent, depends on
        ("act:approve-vpn-priya", "Approve Priya's ExpressVPN claim ($150)", "approve_expense", "plan:ap-queue",
         40 * MIN, 150.0, "agent:ap-approver", "df:ap-vpn-rule"),
        ("act:approve-phone-ap", "Approve $95 phone bill (over $80, exception)", "approve_expense", "plan:ap-queue",
         90 * MIN, 95.0, "agent:ap-approver", "fv:netphone:v1"),
        ("act:book-offsite-dinners", "Book offsite dinners within $3,600", "book_travel", "plan:offsite",
         8 * DAY, 3600.0, "agent:travel-planner", "df:offsite-meals"),
        ("act:issue-cards", "Issue 3 × $1,500 virtual cards", "issue_card", "plan:onboard-nov",
         4 * DAY, 4500.0, "agent:onboarding-bot", "fv:stipend:v1"),
        ("act:book-emea-cowork", "Book 4 co-working day passes in Berlin", "book_travel", "plan:emea-trips",
         2 * DAY, 400.0, "agent:travel-planner", "fv:cowork:v1"),
    ]  # fmt: skip
    for aid, title, kind, plan, due_in, amount, owner, dep in actions:
        layer.node("Action", aid, title=title, action_kind=kind, status="pending",
                   due_at=DEMO_NOW_MS + due_in, amount=amount)  # fmt: skip
        layer.edge(aid, "PART_OF", plan)
        layer.edge(aid, "DEPENDS_ON", dep)
        layer.edge(owner, "OWNS", aid)
    _ = ap  # AP team is represented by Ravi (fixed demo character)


def generate(seed: int = 42) -> Layer:
    """Build the whole synthetic layer in memory. Same seed -> identical output."""
    rng = random.Random(seed)
    layer = Layer()
    roster = _people(rng, layer)
    _chat_graph(rng, layer, roster)
    _answers(rng, layer, roster)
    _agents(layer)
    _docs(layer, roster)
    _plans(layer, roster)
    layer.edges = with_feeds(layer.edges)
    return layer


def seed(tenant: str, seed: int = 42) -> dict:
    """Write the synthetic layer. Needs the handbook versions first (``ingest.handbook_changes``)."""
    g = tenant_graph(tenant)
    layer = generate(seed)
    return {"nodes": write_nodes(g, layer.nodes), "edges": write_edges(g, layer.edges)}


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Write the seeded synthetic layer")
    parser.add_argument("--tenant", default="handbook-demo")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args(argv)
    print(seed(args.tenant, args.seed))


if __name__ == "__main__":
    main()
