// Fixer/reanswer for an Agent: its memory now caches the current version (old CACHED edge kept as history).
MATCH (a:Agent {id: $agent_id})-[:CACHED]->(:FactVersion {id: $old_id})
MATCH (nv:FactVersion {id: $new_version_id})
MERGE (a)-[c:CACHED]->(nv) SET c.at = $now
MERGE (nv)-[f:FEEDS]->(a) SET f.w = 1
RETURN a.id
