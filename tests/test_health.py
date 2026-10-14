from fastapi.testclient import TestClient

from api.main import app
from graph.client import graph_name


def test_health():
    assert TestClient(app).get("/api/health").json() == {"ok": True}


def test_graph_name_per_tenant():
    assert graph_name("handbook-demo") == "ripple:handbook-demo"
