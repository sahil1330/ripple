// (a) Impact radius: everything that (transitively) relies on the old version of a change,
// with the hop distance. Pure Cypher, multi-type var-length (confirmed in graph/NOTES.md).
// Direction: dependent -[dependency edge]-> dependency, so we walk the edges backwards.
// Params: $old_id. Max depth is fixed at 6 (no params in var-length bounds); callers filter on hops.
MATCH (old:FactVersion {id: $old_id})
MATCH p = (old)<-[:STATES|CITES|DERIVED_FROM|DEPENDS_ON|WAS_TOLD|CACHED*1..6]-(x)
WITH x, min(length(p)) AS hops
RETURN x.id AS id, x.kind AS kind, coalesce(x.name, x.title, x.statement, x.id) AS label, hops
ORDER BY hops, id
