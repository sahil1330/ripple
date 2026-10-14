"""Offline builder for ``ingest/data/handbook_docs.json`` (run once, output committed).

Reads a local clone of the public GitLab handbook and extracts, for every page under
``content/handbook/finance/``: title, public URL, a short excerpt, and the links to
other pages in that set (these become ``LINKS_TO`` edges for PageRank). Pages that
link to the expenses policy and mention a fact's topic get a ``cites`` hint.

    git clone --filter=blob:none --sparse https://gitlab.com/gitlab-com/content-sites/handbook.git
    git -C handbook sparse-checkout set content/handbook/finance
    python -m ingest.build_handbook_docs ../handbook

Only public handbook.gitlab.com URLs are kept; internal-handbook or login links are dropped.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

OUT = Path(__file__).parent / "data" / "handbook_docs.json"
SITE = "https://handbook.gitlab.com"
LINK = re.compile(r"\]\((/handbook/[^)\s#?]*)")
TITLE = re.compile(r"^title:\s*['\"]?(.+?)['\"]?\s*$", re.M)
EXPENSES = "/handbook/finance/expenses/"
# fact key -> words that show a page talks about it
TOPICS = {
    "expense.vpn.personal_subscription": r"\bVPN\b",
    "expense.travel.meals_daily_limit": r"\bmeals?\b",
    "expense.home_internet_phone.monthly_limit": r"\b(home internet|phone service|mobile phone)\b",
    "expense.coworking.rules": r"\bco-?working\b",
    "expense.new_hire.home_office_stipend": r"\bstipend\b",
}


def url_path(md: Path, root: Path) -> str:
    rel = md.relative_to(root / "content").with_suffix("")
    parts = list(rel.parts)
    if parts[-1] == "_index":
        parts = parts[:-1]
    return "/" + "/".join(parts) + "/"


def excerpt(text: str) -> str:
    body = text.split("---", 2)[-1]
    for para in re.split(r"\n\s*\n", body):
        line = " ".join(para.split())
        if "internal" in line.lower():  # never quote text that points to internal-only content
            continue
        if line and not line.startswith(("{{", "#", "|", "<", "-", "!")) and len(line) > 40:
            return re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", line)[:240]
    return ""


def build(clone: Path) -> dict:
    pages = sorted((clone / "content" / "handbook" / "finance").rglob("*.md"))
    docs = {}
    for md in pages:
        text = md.read_text(encoding="utf-8")
        path = url_path(md, clone)
        m = TITLE.search(text)
        links = sorted({p if p.endswith("/") else p + "/" for p in LINK.findall(text)})
        cites = []
        if EXPENSES in links or path == EXPENSES:
            cites = [k for k, rx in TOPICS.items() if re.search(rx, text, re.I)]
        docs[path] = {
            "id": "doc:hb" + path.removeprefix("/handbook").rstrip("/").replace("/", ":"),
            "title": m.group(1) if m else path.rstrip("/").rsplit("/", 1)[-1],
            "url": SITE + path,
            "excerpt": excerpt(text),
            "links": links,
            "cites": cites,
        }
    for d in docs.values():  # keep only links inside the extracted set
        d["links"] = [docs[p]["id"] for p in d["links"] if p in docs and docs[p]["id"] != d["id"]]
    sha = subprocess.run(
        ["git", "-C", str(clone), "rev-parse", "HEAD"], capture_output=True, text=True
    ).stdout
    return {
        "$comment": "Public GitLab handbook pages under /handbook/finance/ (c) GitLab B.V. Titles, short "
        "excerpts and links only. Built by ingest/build_handbook_docs.py.",
        "attribution": "GitLab B.V.",
        "handbook_commit": sha.strip(),
        "docs": list(docs.values()),
    }


if __name__ == "__main__":
    data = build(Path(sys.argv[1]))
    OUT.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    n_links = sum(len(d["links"]) for d in data["docs"])
    print(f"{len(data['docs'])} docs, {n_links} links -> {OUT}")
