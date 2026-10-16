// General Concierge "what X do we have?": list entities of one kind in this tenant's graph.
MATCH (n:Entity {kind: $kind})
RETURN n.id AS id, coalesce(n.name, n.title, n.statement, n.id) AS label
ORDER BY label
LIMIT 25
