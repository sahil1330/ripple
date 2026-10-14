// Atomic claim: pick the best open task of the wanted kinds and flip it to 'claimed' in ONE query.
// FalkorDB runs write queries on a graph one at a time, so two agents can never claim the same task:
// the second one no longer sees status = 'open' and gets the next task (or no row).
MATCH (a:Agent {id: $agent_id})
MATCH (t:Task {status: 'open'})
WHERE t.task_kind IN $kinds
WITH a, t
ORDER BY t.priority ASC, t.risk DESC, t.created_at ASC, t.id ASC
LIMIT 1
SET t.status = 'claimed', t.claimed_at = $now, t.claimed_by = a.id
CREATE (a)-[cl:CLAIMED {at: $now}]->(t)
WITH t
MATCH (t)-[:ABOUT]->(c:Change), (t)-[:TARGETS]->(x)
RETURN t.id, t.task_kind, t.status, t.priority, t.risk, x.id, c.id
