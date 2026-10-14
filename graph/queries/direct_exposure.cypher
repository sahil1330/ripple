// How each impacted entity touches the old version directly (WAS_TOLD / CACHED / STATES / CITES ...).
// Used by the Tracer to choose the task kind. Entities with no direct edge (e.g. owners) return no row.
UNWIND $ids AS eid
MATCH (x:Entity {id: eid})-[r]->(:FactVersion {id: $old_id})
RETURN x.id, collect(type(r)) AS rels
