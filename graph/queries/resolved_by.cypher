// Everyone/everything that has RESOLVED a change (acknowledged, re-answered, patched, replanned, briefed).
MATCH (x)-[r:RESOLVED]->(:Change {id: $change_id})
RETURN DISTINCT x.id AS id, count(r) AS times
