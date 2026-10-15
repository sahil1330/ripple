// API /api/changes and /api/changes/{id}: change summary plus before/after version snapshots.
// $change_id = null lists every change of the tenant.
MATCH (c:Change)-[:FROM]->(old:FactVersion), (c)-[:TO]->(new:FactVersion)
WHERE $change_id IS NULL OR c.id = $change_id
RETURN c.id AS id, c.title AS title, c.fact_key AS fact_key, c.commit_sha AS commit_sha,
       c.mr_url AS mr_url, c.detected_at AS detected_at, c.status AS status,
       {version_id: old.id, value: old.value, excerpt: old.excerpt, source_url: old.source_url} AS before,
       {version_id: new.id, value: new.value, excerpt: new.excerpt, source_url: new.source_url} AS after
ORDER BY detected_at DESC, id
