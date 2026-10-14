// (b) People and agents still holding a superseded version: told it (WAS_TOLD) or cached it (CACHED),
// and not yet RESOLVED against a Change that moved the fact to the current version.
MATCH (v:FactVersion {id: $version_id})<-[:HAS_VERSION]-(:Fact)-[:HAS_VERSION]->(cur:FactVersion)
WHERE cur.valid_to IS NULL AND cur.id <> v.id
MATCH (h)-[r:WAS_TOLD|CACHED]->(v)
WHERE 'Person' IN labels(h) OR 'Agent' IN labels(h)
OPTIONAL MATCH (h)-[ack:RESOLVED]->(:Change)-[:TO]->(cur)
WITH h, r, cur, ack
WHERE ack IS NULL
RETURN h.id AS id, h.name AS name, h.kind AS kind, type(r) AS how, r.at AS at, r.channel AS channel,
       cur.id AS current_version
ORDER BY at DESC, id
