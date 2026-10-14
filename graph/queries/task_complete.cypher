// Finish a task the agent holds. Only 'claimed' tasks claimed by this agent can be completed.
MATCH (t:Task {id: $task_id, status: 'claimed', claimed_by: $agent_id})
SET t.status = $status, t.done_at = $now, t.outcome = $outcome
RETURN t.id, t.status
