// Log a general (non-policy) Concierge answer: Answer node + ANSWERED -> person, no WAS_TOLD
// (no fact version was handed out, so nothing to correct later).
MATCH (p:Person {id: $person_id})
CREATE (a:Entity:Answer {id: $answer_id, kind: 'Answer', question: $question, text: $text, at: $at,
                         channel: $channel, synthetic: true})
CREATE (a)-[:ANSWERED]->(p)
RETURN count(a)
