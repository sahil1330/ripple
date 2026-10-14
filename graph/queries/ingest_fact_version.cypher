// Upsert a Fact and one of its FactVersions (ingest/handbook_changes.py). Idempotent via MERGE on id.
MERGE (f:Entity:Fact {id: $fact_id})
  SET f.kind = 'Fact', f.key = $key, f.topic = $topic, f.title = $title, f.synthetic = false
MERGE (v:Entity:FactVersion {id: $v.id})
  SET v.kind = 'FactVersion', v.fact_key = $key, v.value = $v.value, v.unit = $v.unit,
      v.excerpt = $v.excerpt, v.valid_from = $v.valid_from, v.valid_to = $valid_to,
      v.source_url = $v.source_url, v.commit_sha = $v.commit_sha, v.mr_url = $v.mr_url,
      v.synthetic = false
MERGE (f)-[:HAS_VERSION]->(v)
RETURN v.id
