"""Concierge: user-facing Q&A that answers ONLY from the current fact version (plan §5).

Every answer:
1. routes the question to a Fact (keyword rules, deterministic for the demo),
2. answers from the version with ``valid_to IS NULL`` and cites it (version id + source URL),
3. is logged as episodic memory: ``(:Answer)-[:ANSWERED]->(person)`` and
   ``(person)-[:WAS_TOLD {at, channel, answer_id}]->(version)``,
4. if Ripple previously told this person an older version, says so ("earlier I told you ...").

Phrasing is templated (no LLM key needed); an LLM could rephrase ``answer`` later, but the
cited version and memory line always come from the graph.
"""

from __future__ import annotations

import re
import uuid
from datetime import UTC, datetime

from graph.client import tenant_graph
from graph.cypher import cypher
from graph.tools import now_ms

# question pattern -> fact key. First match wins.
ROUTES: list[tuple[str, str]] = [
    (r"\bvpn\b|expressvpn|nordvpn|mullvad|proton", "expense.vpn.personal_subscription"),
    (r"\bmeals?\b|per diem|dinner|lunch", "expense.travel.meals_daily_limit"),
    (r"internet|phone|mobile|broadband", "expense.home_internet_phone.monthly_limit"),
    (r"co-?working|day pass|office pass", "expense.coworking.rules"),
    (r"stipend|home[- ]office|new hire", "expense.new_hire.home_office_stipend"),
]


class UnknownTopic(LookupError):
    """The question doesn't map to any fact Ripple knows."""


def route(question: str) -> str:
    q = question.lower()
    for pattern, key in ROUTES:
        if re.search(pattern, q):
            return key
    raise UnknownTopic(question)


def _date(ms: int) -> str:
    return datetime.fromtimestamp(ms / 1000, tz=UTC).strftime("%b %-d, %Y")


def _mr_label(url: str | None) -> str:
    m = re.search(r"merge_requests/(\d+)", url or "")
    return f"MR !{m.group(1)}" if m else "the handbook"


def ask(tenant: str, person_id: str, question: str, channel: str = "web", now: int | None = None) -> dict:
    """Answer ``question`` for ``person_id`` and log it. Returns the /api/ask response shape:

    ``{answer, versions, source_url, earlier_told, answer_id}``; ``earlier_told`` is None
    unless this person was told an older version before.
    """
    g = tenant_graph(tenant)
    key = route(question)
    rows = g.query(cypher("fact_current"), {"key": key}).result_set
    if not rows:
        raise UnknownTopic(key)
    title, vid, value, excerpt, source, valid_from = rows[0]
    at = now_ms() if now is None else now

    earlier = None
    prev = g.query(cypher("earlier_told"), {"person_id": person_id, "key": key, "current_id": vid}).result_set
    if prev:
        old_id, old_value, told_at, _, _ = prev[0]
        changed = f"That changed on {_date(valid_from)} ({_mr_label(source)})."
        earlier = {
            "version_id": old_id,
            "value": old_value,
            "at": told_at,
            "text": f"Earlier I told you: {old_value}. {changed}",
        }

    answer = f"{title}: {value}. Policy text: \u201c{excerpt}\u201d (source: {source})"
    if earlier:
        answer = f"{earlier['text']} {answer}"
    answer_id = f"ans:{uuid.uuid4().hex[:12]}"
    g.query(
        cypher("record_answer"),
        {"person_id": person_id, "answer_id": answer_id, "question": question, "text": answer,
         "at": at, "channel": channel, "version_ids": [vid]},
    )  # fmt: skip
    return {"answer": answer, "versions": [vid], "source_url": source, "earlier_told": earlier,
            "answer_id": answer_id}  # fmt: skip
