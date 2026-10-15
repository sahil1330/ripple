// Worker outcome for an action: 'done' (performed) or 'blocked' (freshness guard said stale).
MATCH (a:Action {id: $action_id})
SET a.status = $status, a.status_at = $now, a.blocked_reason = $reason
RETURN a.id, a.status
