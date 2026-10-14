// Old and new version of a change.
MATCH (c:Change {id: $change_id})-[:FROM]->(old:FactVersion), (c)-[:TO]->(new:FactVersion)
RETURN old.id, new.id
