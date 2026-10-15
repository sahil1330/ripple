// Fixer/replan: a Plan/Action that depends on a FactVersion directly now depends on the current one.
MATCH (x:Entity {id: $target_id})-[dep:DEPENDS_ON]->(old:FactVersion {id: $old_id})
MATCH (nv:FactVersion {id: $new_version_id})
MERGE (x)-[:DEPENDS_ON]->(nv)
MERGE (nv)-[f1:FEEDS]->(x) SET f1.w = 1
DELETE dep
WITH x, old
OPTIONAL MATCH (old)-[f:FEEDS]->(x)
DELETE f
RETURN count(*)
