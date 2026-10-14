// (c) Freshness guard for a Plan or an Action (any row = stale, no rows = fresh).
// An Action inherits its Plan's dependencies (PART_OF*0..1). A dependency can be a FactVersion
// directly or a DerivedFact chain (DERIVED_FROM*0..5) that ends in a version closed before $now.
MATCH (s:Entity {id: $target_id})
WHERE 'Plan' IN labels(s) OR 'Action' IN labels(s)
// WITH barrier: FalkorDB v6.0 otherwise pushes the labels() filter onto the wrong scan (see graph/NOTES.md).
WITH s
MATCH (s)-[:PART_OF*0..1]->(owner)-[:DEPENDS_ON]->(d)
MATCH (d)-[:DERIVED_FROM*0..5]->(fv:FactVersion)
WHERE fv.valid_to IS NOT NULL AND fv.valid_to <= $now
MATCH (cur:FactVersion)-[:SUPERSEDES*1..10]->(fv)
WHERE cur.valid_to IS NULL
RETURN DISTINCT d.id AS via, fv.id AS stale_version, cur.id AS current_version,
       fv.value AS stale_value, cur.value AS current_value, coalesce(cur.mr_url, cur.source_url) AS source
ORDER BY via, stale_version
