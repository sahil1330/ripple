MATCH (v:FactVersion {id: $version_id})<-[:HAS_VERSION]-(:Fact)-[:HAS_VERSION]->(cur:FactVersion)
WHERE cur.valid_to IS NULL AND cur.id <> v.id
MATCH (h)-[r:WAS_TOLD|CACHED]->(v)
WHERE ('Person' IN labels(h) OR 'Agent' IN labels(h))
OPTIONAL MATCH (h)-[ack:RESOLVED]->(:Change)-[:TO]->(cur)
WITH h, r, cur, ack WHERE ack IS NULL
RETURN h.id AS id, h.name AS name, labels(h) AS labels, type(r) AS how, r.at AS at, r.channel AS channel,
       cur.id AS current_version
ORDER BY at DESC
