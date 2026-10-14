// (e) Coverage of a change: impacted vs resolved, per kind. Relationship aliases are counted
// explicitly (FalkorDB known limitation with unreferenced relationships).
MATCH (c:Change {id: $change_id})-[i:IMPACTS]->(x)
OPTIONAL MATCH (x)-[r:RESOLVED]->(c)
WITH x.kind AS kind, count(DISTINCT x) AS impacted, count(DISTINCT CASE WHEN r IS NULL THEN NULL ELSE x END) AS resolved
RETURN kind, impacted, resolved
ORDER BY kind
