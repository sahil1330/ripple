MATCH (src:Entity {id: $from_id}), (dst:Entity {id: $to_id})
WITH shortestPath((src)-[:WAS_TOLD|CACHED|OWNS|PART_OF|DEPENDS_ON|DERIVED_FROM|STATES|CITES*1..8]->(dst)) AS p
RETURN [n IN nodes(p) | coalesce(n.name, n.title, n.statement, n.id)] AS hops,
       [r IN relationships(p) | type(r)] AS via
