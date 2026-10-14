MATCH (pl:Plan {id: $plan_id})-[:DEPENDS_ON]->(d)
MATCH (d)-[:DERIVED_FROM*0..5]->(fv:FactVersion)
WHERE fv.valid_to IS NOT NULL AND fv.valid_to <= $now
MATCH (cur:FactVersion)-[:SUPERSEDES*1..10]->(fv)
WHERE cur.valid_to IS NULL
RETURN pl.id AS plan, d.id AS via, fv.id AS stale_version, cur.id AS current_version,
       fv.value AS stale_value, cur.value AS current_value, cur.source_url AS source
