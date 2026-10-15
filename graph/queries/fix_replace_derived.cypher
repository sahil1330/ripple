// Fixer/replan: recompute a DerivedFact from the new version and swap the plan's dependency to it.
// The old DerivedFact stays in the graph (history) with superseded_by; its DEPENDS_ON/FEEDS edges to x go.
MATCH (x:Entity {id: $target_id})-[dep:DEPENDS_ON]->(old:DerivedFact {id: $old_df_id})
MATCH (nv:FactVersion {id: $new_version_id})
MERGE (n:Entity:DerivedFact {id: $new_df_id})
  ON CREATE SET n.kind = 'DerivedFact', n.statement = $statement, n.derived_at = $now,
                n.by_agent = 'agent:fixer', n.synthetic = true
MERGE (n)-[:DERIVED_FROM]->(nv)
MERGE (nv)-[f1:FEEDS]->(n) SET f1.w = 1
MERGE (x)-[:DEPENDS_ON]->(n)
MERGE (n)-[f2:FEEDS]->(x) SET f2.w = 1
SET old.superseded_by = n.id
DELETE dep
WITH x, old
OPTIONAL MATCH (old)-[f:FEEDS]->(x)
DELETE f
RETURN count(*)
