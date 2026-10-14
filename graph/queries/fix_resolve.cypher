// Mark entities as RESOLVED for a change {at, by, how}. Idempotent (MERGE).
MATCH (c:Change {id: $change_id})
UNWIND $ids AS eid
MATCH (x:Entity {id: eid})
MERGE (x)-[r:RESOLVED]->(c)
SET r.at = $now, r.by = $by, r.how = $how
RETURN count(r)
