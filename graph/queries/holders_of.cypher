// Current holders/dependents of a fact version: people told it, agents caching it, and anything
// (actions, plans, derived facts, docs) that relies on it through up to 3 dependency hops.
MATCH (v:FactVersion {id: $version_id})
CALL {
  WITH v
  MATCH (n:Entity)-[r:WAS_TOLD|CACHED]->(v)
  RETURN n, type(r) AS via, 1 AS hops
  UNION
  WITH v
  MATCH p = (n:Entity)-[:DEPENDS_ON|DERIVED_FROM|STATES|CITES*1..3]->(v)
  RETURN n, 'RELIES_ON' AS via, length(p) AS hops
}
WITH n, collect(DISTINCT via) AS vias, min(hops) AS hops
WHERE NOT n.kind IN ['Answer', 'Task']
RETURN n.id AS id, n.kind AS kind, coalesce(n.name, n.title, n.statement, n.value, n.id) AS label, vias, hops
ORDER BY hops, kind, id
LIMIT 50
