"""graph.schema.apply must create all indexes and be safe to run twice."""

from graph import schema
from tests.graph.conftest import requires_falkordb

pytestmark = requires_falkordb


def test_apply_is_idempotent(g, tenant):
    first = schema.apply(tenant)
    assert set(first.values()) == {"created"}
    second = schema.apply(tenant)
    assert set(second.values()) == {"exists"}


def test_entity_id_index_is_used(g, tenant):
    schema.apply(tenant)
    plan = "\n".join(str(x) for x in g.explain("MATCH (e:Entity {id: $id}) RETURN e", {"id": "x"}))
    assert "Index Scan" in plan
