// API /api/graph: nodes for the canvas. $ids = null -> whole tenant, else only these ids.
// Per node: the highest IMPACTS risk (if any change impacts it) and whether it RESOLVED a change.
MATCH (n:Entity)
WHERE $ids IS NULL OR n.id IN $ids
OPTIONAL MATCH (:Change)-[i:IMPACTS]->(n)
OPTIONAL MATCH (n)-[r:RESOLVED]->(:Change)
RETURN n.id AS id, n.kind AS kind, coalesce(n.name, n.title, n.label, n.statement, n.value, n.id) AS label,
       coalesce(n.synthetic, false) AS synthetic, max(i.risk) AS risk, n.status AS status,
       n.valid_to AS valid_to, count(i) > 0 AS impacted, count(r) > 0 AS resolved
ORDER BY id
