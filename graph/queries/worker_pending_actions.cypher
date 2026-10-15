// Pending actions a worker agent owns, soonest first.
MATCH (:Agent {id: $agent_id})-[:OWNS]->(a:Action {status: 'pending'})
RETURN a.id, a.title, a.action_kind, a.due_at, a.amount
ORDER BY a.due_at, a.id
