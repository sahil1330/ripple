// Time-to-harm input: the soonest deadline for each impacted entity.
// Actions use due_at, Plans act_by; people/agents inherit the soonest pending Action or Plan they OWN
// (directly or through an owned Plan). Missing = null (ranking then uses a default horizon).
UNWIND $ids AS eid
MATCH (x:Entity {id: eid})
OPTIONAL MATCH (x)-[:OWNS]->(o)
OPTIONAL MATCH (a:Action)-[:PART_OF]->(o)
WITH x, collect(o.due_at) + collect(o.act_by) + collect(CASE WHEN a.status = 'pending' THEN a.due_at END) AS owned
RETURN x.id AS id, coalesce(x.due_at, x.act_by) AS own_due, owned
