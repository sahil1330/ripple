// Record a policy change: new version SUPERSEDES old, old gets valid_to, Change -FROM-> old / -TO-> new.
// Run after both versions exist (ingest_fact_version). Idempotent via MERGE.
MATCH (old:Entity {id: $from_id}), (new:Entity {id: $to_id})
SET old.valid_to = new.valid_from
MERGE (new)-[:SUPERSEDES]->(old)
MERGE (c:Entity:Change {id: $id})
  SET c.kind = 'Change', c.fact_key = $fact_key, c.title = $title, c.label = $label,
      c.commit_sha = $commit_sha, c.mr_url = $mr_url, c.detected_at = $detected_at,
      c.status = coalesce(c.status, 'open'), c.synthetic = false
MERGE (c)-[:FROM]->(old)
MERGE (c)-[:TO]->(new)
RETURN c.id
