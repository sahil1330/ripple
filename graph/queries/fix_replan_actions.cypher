// Fixer/replan: actions of the plan that relied on the stale derived fact are cancelled ('replanned');
// a human or worker re-creates them under the new rule. Returns every action of the plan.
MATCH (a:Action)-[:PART_OF]->(p:Plan {id: $plan_id})
OPTIONAL MATCH (a)-[:DEPENDS_ON]->(d:DerivedFact)
WITH a, p, collect(d.id) AS deps
SET a.status = CASE WHEN any(x IN deps WHERE x IN $stale_ids) AND a.status IN ['pending', 'blocked']
                    THEN 'replanned' ELSE a.status END
SET p.status = 'replanned'
RETURN a.id, a.status
