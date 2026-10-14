// The Change that superseded a version (FROM = that version).
MATCH (c:Change)-[:FROM]->(:FactVersion {id: $version_id})
RETURN c.id
ORDER BY c.detected_at DESC
LIMIT 1
