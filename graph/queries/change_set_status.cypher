// Move a Change through open -> resolving -> resolved.
MATCH (c:Change {id: $change_id})
SET c.status = $status
RETURN c.id, c.status
