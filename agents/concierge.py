"""Concierge: user-facing Q&A that answers ONLY from the current fact version (plan §5).

Every answer:
1. routes the question to a Fact (keyword rules, deterministic for the demo),
2. answers from the version with ``valid_to IS NULL`` and cites it (version id + source URL),
3. is logged as episodic memory: ``(:Answer)-[:ANSWERED]->(person)`` and
   ``(person)-[:WAS_TOLD {at, channel, answer_id}]->(version)``,
4. if Ripple previously told this person an older version, says so ("earlier I told you ...").

This module is the deterministic template path. ``agents.llm_concierge`` puts an LLM in front of it
(tool selection over the graph + grounded phrasing) and falls back here on missing key, error or timeout.
``person_id`` may be None (anonymous asker): the answer is then not logged and has no memory line.
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


def record_answer(
    tenant: str,
    person_id: str | None,
    question: str,
    text: str,
    version_ids: list[str],
    channel: str = "web",
    now: int | None = None,
) -> str:
    """Log an answer as episodic memory (Answer + ANSWERED + WAS_TOLD + FEEDS). Returns the answer id."""
    answer_id = f"ans:{uuid.uuid4().hex[:12]}"
    if person_id is None:
        return answer_id  # anonymous: nothing to remember
    at = now_ms() if now is None else now
    params = {"person_id": person_id, "answer_id": answer_id, "question": question, "text": text,
              "at": at, "channel": channel, "version_ids": version_ids}  # fmt: skip
    if not tenant_graph(tenant).query(cypher("record_answer"), params).result_set[0][0]:
        raise KeyError(f"unknown person or versions: {person_id}, {version_ids}")
    return answer_id


def ask(
    tenant: str, person_id: str | None, question: str, channel: str = "web", now: int | None = None
) -> dict:
    """Answer ``question`` for ``person_id`` and log it. Returns the /api/ask response shape:

    ``{answer, versions, source_url, earlier_told, answer_id}``; ``earlier_told`` is None
    unless this person was told an older version before.
    """
    g = tenant_graph(tenant)
    try:
        key = route(question)
    except UnknownTopic:
        return ask_general(tenant, person_id, question, channel=channel, now=now)
    rows = g.query(cypher("fact_current"), {"key": key}).result_set
    if not rows:
        raise UnknownTopic(key)
    title, vid, value, excerpt, source, valid_from = rows[0]
    at = now_ms() if now is None else now

    earlier = earlier_told(tenant, person_id, key, vid, valid_from, source)
    answer = f"{title}: {value}. Policy text: \u201c{excerpt}\u201d (source: {source})"
    if earlier:
        answer = f"{earlier['text']} {answer}"
    answer_id = record_answer(tenant, person_id, question, answer, [vid], channel=channel, now=at)
    return {"answer": answer, "versions": [vid], "source_url": source, "earlier_told": earlier,
            "answer_id": answer_id}  # fmt: skip


def earlier_told(
    tenant: str, person_id: str | None, key: str, vid: str, valid_from: int, source: str | None
) -> dict | None:
    """The memory line: what Ripple told this person about ``key`` before the current version, if anything."""
    if person_id is None:
        return None
    g = tenant_graph(tenant)
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
    return earlier


STOPWORDS = set(
    "a an and are as at be by can could do does did for from has have how i in is it its me my of on or our "
    "should so tell that the their them there this to us was we what when where which who whom why will with "
    "would you your about any anything company know please give show list does work works".split()
)
KIND_ORDER = {"FactVersion": 0, "Team": 1, "Person": 2, "Doc": 3, "Plan": 4, "Agent": 5, "Action": 6}


def terms(question: str) -> list[str]:
    """Lower-case content words (>= 3 chars, plural 's' trimmed) used to match graph text."""
    out: list[str] = []
    for w in re.findall(r"[a-z0-9$][a-z0-9$-]+", question.lower()):
        if w in STOPWORDS or len(w) < 3:
            continue
        w = w[:-1] if len(w) > 3 and w.endswith("s") and not w.endswith("ss") else w
        if w not in out:
            out.append(w)
    return out


def _describe(rel: str, outgoing: bool, label: str, kind: str) -> str:
    phrases = {
        ("MEMBER_OF", True): "member of", ("MEMBER_OF", False): "has member",
        ("OWNS", True): "owns", ("OWNS", False): "owned by",
        ("PART_OF", True): "part of", ("PART_OF", False): "includes",
        ("DEPENDS_ON", True): "depends on", ("DEPENDS_ON", False): "relied on by",
        ("STATES", True): "states", ("STATES", False): "stated in",
        ("CITES", True): "cites", ("CITES", False): "cited by",
        ("DERIVED_FROM", True): "derived from", ("DERIVED_FROM", False): "source of",
    }  # fmt: skip
    return f"{phrases.get((rel, outgoing), rel.lower())} {label} ({kind})"


def ask_general(
    tenant: str, person_id: str | None, question: str, channel: str = "web", now: int | None = None
) -> dict:
    """Answer any company question from this tenant's graph only: match entities by text, add their
    organisational/dependency neighbours, and cite every node used. Policy facts cite the current
    version (logged as WAS_TOLD like routed answers); other answers are logged as a plain Answer."""
    g = tenant_graph(tenant)
    words = terms(question)
    if not words:
        raise UnknownTopic(question)
    kinds = r"(teams?|departments?|agents?|docs?|documents?|plans?)"
    listing = re.search(r"\b(?:what|which|list|all)\b.*\b" + kinds + r"\b", question.lower())
    if listing:
        kind = LIST_KINDS[listing.group(1).rstrip("s")]
        rows = _rows(g.query(cypher("ask_by_kind"), {"kind": kind}))
        if rows:
            names = ", ".join(r["label"] for r in rows)
            answer = (
                f"From the company graph, {len(rows)} {kind.lower()} entries: {names} (sources: "
                + ", ".join(r["id"] for r in rows)
                + ")"
            )
            return _log_note(g, person_id, question, answer, channel, now)
    hits = _rows(g.query(cypher("ask_search"), {"terms": words}))
    if not hits:
        raise UnknownTopic(question)
    best = hits[0]["score"]
    hits = sorted((h for h in hits if h["score"] == best), key=lambda h: KIND_ORDER.get(h["kind"], 9))[:4]

    lines: list[str] = []
    versions: list[str] = []
    source = None
    for h in hits:
        if h["kind"] == "FactVersion":
            versions.append(h["id"])
            source = source or h["url"]
            lines.append(f"{h['label']}: \u201c{h['detail']}\u201d")
            continue
        line = f"{h['label']} ({h['kind']})"
        if h["detail"]:
            line += f", {h['detail']}"
        ctx = _rows(g.query(cypher("ask_neighbours"), {"id": h["id"]}))
        if ctx:
            parts = [_describe(c["rel"], c["outgoing"], c["label"], c["kind"]) for c in ctx[:8]]
            line += ": " + "; ".join(parts)
        source = source or h["url"]
        lines.append(line)
    cited = ", ".join(h["id"] for h in hits)
    answer = "From the company graph: " + " | ".join(lines) + f" (sources: {cited})"
    if versions:
        at = now_ms() if now is None else now
        answer_id = record_answer(tenant, person_id, question, answer, versions, channel=channel, now=at)
        return {"answer": answer, "versions": versions, "source_url": source, "earlier_told": None,
                "answer_id": answer_id}  # fmt: skip
    res = _log_note(g, person_id, question, answer, channel, now)
    res["source_url"] = source
    return res


LIST_KINDS = {
    "team": "Team", "department": "Team", "agent": "Agent", "doc": "Doc", "document": "Doc", "plan": "Plan",
}  # fmt: skip


def _log_note(g, person_id: str | None, question: str, answer: str, channel: str, now: int | None) -> dict:
    """Log a general answer (no fact version handed out) and return the AskResponse shape."""
    answer_id = f"ans:{uuid.uuid4().hex[:12]}"
    if person_id is None:
        return {
            "answer": answer,
            "versions": [],
            "source_url": None,
            "earlier_told": None,
            "answer_id": answer_id,
        }
    params = {"person_id": person_id, "answer_id": answer_id, "question": question, "text": answer,
              "at": now_ms() if now is None else now, "channel": channel}  # fmt: skip
    if not g.query(cypher("record_answer_note"), params).result_set[0][0]:
        raise KeyError(f"unknown person: {person_id}")
    return {"answer": answer, "versions": [], "source_url": None, "earlier_told": None,
            "answer_id": answer_id}  # fmt: skip


def _rows(result) -> list[dict]:
    cols = [c[1] if isinstance(c, (list, tuple)) else c for c in result.header]
    return [dict(zip(cols, r, strict=False)) for r in result.result_set]
