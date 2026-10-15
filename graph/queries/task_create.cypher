// Open a Task for other agents: (creator)-[:CREATED]->(t)-[:ABOUT]->(change), (t)-[:TARGETS]->(target).
// MERGE on id makes re-running a creator idempotent (ids are deterministic: task:<kind>:<change>:<target>).
MATCH (a:Agent {id: $agent_id}), (c:Change {id: $change_id}), (x:Entity {id: $target_id})
MERGE (t:Entity:Task {id: $task_id})
  ON CREATE SET t.kind = 'Task', t.task_kind = $task_kind, t.status = 'open', t.priority = $priority,
                t.risk = $risk, t.created_at = $now, t.synthetic = false
MERGE (a)-[cr:CREATED]->(t)
  ON CREATE SET cr.at = $now
MERGE (t)-[:ABOUT]->(c)
MERGE (t)-[:TARGETS]->(x)
RETURN t.id, t.status
