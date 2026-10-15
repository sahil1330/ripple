// API /api/changes/{id}/impact: the Tracer's materialised IMPACTS edges, highest risk first,
// with the entity's deadline, status and the follow-up Task the Tracer opened for it.
MATCH (c:Change {id: $change_id})-[i:IMPACTS]->(x)
OPTIONAL MATCH (x)-[r:RESOLVED]->(c)
OPTIONAL MATCH (t:Task)-[:TARGETS]->(x)
WHERE (t)-[:ABOUT]->(c)
WITH c, i, x, r, collect(t.id) AS tasks
RETURN x.id AS id, x.kind AS kind, coalesce(x.name, x.title, x.statement, x.id) AS label,
       coalesce(x.synthetic, false) AS synthetic, i.hops AS hops, i.severity AS severity,
       i.urgency AS urgency, i.reach AS reach, i.risk AS risk, i.tth_ms AS tth_ms,
       coalesce(x.due_at, x.act_by) AS due_at,
       CASE WHEN r IS NOT NULL THEN 'resolved' ELSE coalesce(x.status, 'open') END AS status,
       head(tasks) AS task_id
ORDER BY risk DESC, hops, id
