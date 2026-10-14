MATCH (c:Change {id: $change_id})-[i:IMPACTS]->(x)
OPTIONAL MATCH (x)-[r:RESOLVED]->(c)
WITH x.kind AS kind, count(i) AS impacted, count(r) AS resolved
RETURN kind, impacted, resolved
