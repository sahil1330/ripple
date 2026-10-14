"""Pure TTH scoring (no FalkorDB)."""

from agents.ranking import HOUR_MS, score

NOW = 1_000 * HOUR_MS


def test_urgency_floors_at_one_hour():
    assert score("Action", NOW + 10 * 60_000, 0.0, NOW)["urgency"] == 1.0
    assert score("Action", NOW + 4 * HOUR_MS, 0.0, NOW)["urgency"] == 0.25


def test_severity_order_and_reach_boost():
    a = score("Action", NOW + HOUR_MS, 0.0, NOW)["risk"]
    p = score("Person", NOW + HOUR_MS, 0.0, NOW)["risk"]
    d = score("Doc", None, 1.0, NOW)
    assert a > p and d["tth_ms"] == 24 * HOUR_MS
    assert d["risk"] == round(0.4 * (1 / 24) * 2, 4)
