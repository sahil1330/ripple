// The question a person asked when they were told the old version (to re-answer the same question).
MATCH (p:Person {id: $person_id})-[t:WAS_TOLD]->(:FactVersion {id: $old_id})
OPTIONAL MATCH (a:Answer {id: t.answer_id})
RETURN a.question
ORDER BY t.at DESC
LIMIT 1
