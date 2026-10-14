MATCH (old:FactVersion {id: $old_id})
CALL algo.bfs(old, 6, 'FEEDS') YIELD nodes
UNWIND nodes AS n
RETURN DISTINCT n.id AS id, labels(n) AS labels
