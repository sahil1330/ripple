// Context for one retrieved entity: its organisational / dependency neighbours (both directions).
MATCH (n:Entity {id: $id})-[r]->(m)
WHERE m:Entity
  AND type(r) IN ['MEMBER_OF', 'OWNS', 'PART_OF', 'DEPENDS_ON', 'STATES', 'CITES', 'DERIVED_FROM']
  AND NOT m.kind IN ['Answer', 'Task']
  AND (m.kind <> 'FactVersion' OR m.valid_to IS NULL)
RETURN type(r) AS rel, true AS outgoing, m.id AS id, m.kind AS kind,
       coalesce(m.name, m.title, m.statement, m.value, m.id) AS label
LIMIT 8
UNION
MATCH (n:Entity {id: $id})<-[r]-(m)
WHERE m:Entity
  AND type(r) IN ['MEMBER_OF', 'OWNS', 'PART_OF', 'DEPENDS_ON', 'STATES', 'CITES', 'DERIVED_FROM']
  AND NOT m.kind IN ['Answer', 'Task']
  AND (m.kind <> 'FactVersion' OR m.valid_to IS NULL)
RETURN type(r) AS rel, false AS outgoing, m.id AS id, m.kind AS kind,
       coalesce(m.name, m.title, m.statement, m.value, m.id) AS label
LIMIT 8
