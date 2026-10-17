from fastapi.testclient import TestClient

from api.main import app
from graph.client import graph_name


def test_health():
    assert TestClient(app).get("/api/health").json() == {"ok": True}


def test_graph_name_per_tenant():
    assert graph_name("handbook-demo") == "ripple:handbook-demo"


def test_change_date_is_commit_date_in_utc():
    """'That changed on ...' is the commit time in UTC (C1 ddd39597 -> Jul 14, 2026), whatever the TZ."""
    import os
    import time

    from agents.concierge import _date

    old = os.environ.get("TZ")
    os.environ["TZ"] = "Asia/Kolkata"
    time.tzset()
    try:
        assert _date(1784046483000) == "Jul 14, 2026"
    finally:
        if old is None:
            os.environ.pop("TZ")
        else:
            os.environ["TZ"] = old
        time.tzset()
