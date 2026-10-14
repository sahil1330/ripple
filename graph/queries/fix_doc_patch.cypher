// Fixer/fix_doc: store a markdown patch draft on the Doc (shown as a diff in the UI, never pushed upstream).
// For a real handbook page the source is already updated, so it also STATES/CITES the current version.
MATCH (d:Doc {id: $doc_id})-[r:STATES|CITES]->(:FactVersion {id: $old_id})
MATCH (nv:FactVersion {id: $new_version_id})
SET d.patch_draft = $patch, d.patch_at = $now
WITH d, nv, collect(type(r)) AS rels
FOREACH (_ IN CASE WHEN d.synthetic = false AND 'STATES' IN rels THEN [1] ELSE [] END | MERGE (d)-[:STATES]->(nv))
FOREACH (_ IN CASE WHEN d.synthetic = false AND NOT 'STATES' IN rels THEN [1] ELSE [] END | MERGE (d)-[:CITES]->(nv))
RETURN d.id, d.title, d.url, d.synthetic
