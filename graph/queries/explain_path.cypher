// (d) Why is X affected? Shortest path from an entity to a version (or any entity it relies on),
// following dependency edges (dependent -> dependency). Endpoints are bound first (FalkorDB rule).
MATCH (src:Entity {id: $from_id}), (dst:Entity {id: $to_id})
WITH shortestPath((src)-[:WAS_TOLD|CACHED|OWNS|PART_OF|DEPENDS_ON|DERIVED_FROM|STATES|CITES*1..8]->(dst)) AS p
WHERE p IS NOT NULL
RETURN [n IN nodes(p) | {id: n.id, kind: n.kind, label: coalesce(n.name, n.title, n.statement, n.value, n.id)}]
         AS hops,
       [r IN relationships(p) | type(r)] AS via
