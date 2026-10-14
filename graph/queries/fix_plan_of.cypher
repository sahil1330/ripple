// The plan an action belongs to (null if none).
MATCH (a:Action {id: $action_id})
OPTIONAL MATCH (a)-[:PART_OF]->(p:Plan)
RETURN p.id
