// API /api/graph?change_id: ids in a change's subgraph = the change, its two versions, the fact
// and everything it IMPACTS (empty until the Tracer ran).
MATCH (c:Change {id: $change_id})-[:FROM]->(old:FactVersion), (c)-[:TO]->(new:FactVersion)
OPTIONAL MATCH (f:Fact)-[:HAS_VERSION]->(new)
OPTIONAL MATCH (c)-[:IMPACTS]->(x)
WITH c.id AS cid, old.id AS oid, new.id AS nid, collect(DISTINCT f.id) AS facts, collect(DISTINCT x.id) AS hit
RETURN [cid, oid, nid] + facts + hit AS ids
