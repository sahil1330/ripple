"""Regenerate the C1 fixtures from the real API against a running FalkorDB.

    python fixtures/demo-c1/generate.py   # uses FALKORDB_HOST/PORT; fixed clock RIPPLE_NOW_MS

Runs reset + the 9 demo steps on ``handbook-demo`` (this resets both demo graphs, so use a local
FalkorDB) and snapshots every endpoint at the moment
the UI shows it (graph + TTH queue right after the hero block, coverage after the Fixer).
Answer ids are random per run; everything else is deterministic (fixed clock, seeded data).
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
os.environ.setdefault("RIPPLE_NOW_MS", "1784048400000")

from fastapi.testclient import TestClient  # noqa: E402

from api import main as api_main  # noqa: E402

OUT = Path(__file__).parent
# Runs on the real demo tenant ids (a local FalkorDB: both graphs are reset). Beat 8 runs the
# second tenant, so its events carry tenant "acme-synthetic".
TENANT = "handbook-demo"


def main() -> None:
    c = TestClient(api_main.app)
    q = {"tenant": TENANT}
    files: dict[str, object] = {}

    def get(path, **params):
        r = c.get(path, params={**q, **params})
        r.raise_for_status()
        return r.json()

    def step():
        return c.post("/api/demo/step", json={**q, "scenario": "c1"}).json()

    files["demo-reset.json"] = c.post("/api/demo/reset", json=q).json()
    files["health.json"] = get("/api/health")
    files["tenants.json"] = get("/api/tenants")
    steps = [step(), step()]
    steps += [step(), step(), step()]  # Sentinel, Tracer, hero block
    files["graph.json"] = get("/api/graph", change_id="chg:c1")
    files["impact-chg-c1.json"] = get("/api/changes/chg:c1/impact")
    files["coverage-chg-c1-before.json"] = get("/api/changes/chg:c1/coverage")
    files["explain-chg-c1-priya.json"] = get("/api/explain", **{"from": "chg:c1", "to": "person:priya"})
    steps.append(step())  # Fixer
    files["coverage-chg-c1.json"] = get("/api/changes/chg:c1/coverage")
    files["changes.json"] = get("/api/changes")
    files["change-chg-c1.json"] = get("/api/changes/chg:c1")
    steps += [step(), step(), step()]
    files["demo-steps.json"] = steps

    # The two Concierge answers in AskResponse shape (taken from the demo's own answer.sent events).
    for name, s in (("ask-before.json", steps[1]), ("ask-after.json", steps[6])):
        p = s["events"][0]["payload"]
        ans = (
            api_main.tenant_graph(TENANT)
            .query("MATCH (a:Answer {id: $id}) RETURN a.text", {"id": p["answer_id"]})
            .result_set[0][0]
        )
        src = (
            api_main.tenant_graph(TENANT)
            .query("MATCH (v:FactVersion {id: $id}) RETURN v.source_url", {"id": p["version_ids"][0]})
            .result_set[0][0]
        )
        files[name] = {"answer": ans, "versions": p["version_ids"], "source_url": src,
                       "earlier_told": p["earlier_told"], "answer_id": p["answer_id"]}  # fmt: skip

    for name, body in files.items():
        (OUT / name).write_text(json.dumps(body, indent=2, ensure_ascii=False) + "\n")
    events = [e for s in steps for e in s["events"]]
    (OUT / "events.jsonl").write_text("".join(json.dumps(e, ensure_ascii=False) + "\n" for e in events))
    print(f"wrote {len(files) + 1} files to {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
