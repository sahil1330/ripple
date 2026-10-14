// Materialise the Tracer's impact set: Change -[IMPACTS {hops, risk, tth_ms, ...}]-> x. Idempotent (MERGE).
MATCH (c:Change {id: $change_id})
UNWIND $rows AS r
MATCH (x:Entity {id: r.id})
MERGE (c)-[i:IMPACTS]->(x)
SET i.hops = r.hops, i.risk = r.risk, i.tth_ms = r.tth_ms,
    i.severity = r.severity, i.urgency = r.urgency, i.reach = r.reach
RETURN count(i)
