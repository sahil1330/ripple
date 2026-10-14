// Fixer/replan: the direct dependencies of a Plan or Action that lead back to the old version.
MATCH (x:Entity {id: $target_id})-[dep:DEPENDS_ON]->(d)
MATCH (d)-[:DERIVED_FROM*0..5]->(:FactVersion {id: $old_id})
RETURN DISTINCT d.id, d.kind, d.statement
