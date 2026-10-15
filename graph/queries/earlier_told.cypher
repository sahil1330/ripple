// Episodic memory: the most recent time this person was told an OLDER version of the fact.
MATCH (p:Person {id: $person_id})-[t:WAS_TOLD]->(old:FactVersion {fact_key: $key})
WHERE old.id <> $current_id
RETURN old.id AS version_id, old.value AS value, t.at AS at, t.channel AS channel, t.answer_id AS answer_id
ORDER BY t.at DESC
LIMIT 1
