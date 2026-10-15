// Log one Concierge answer: Answer node, ANSWERED -> person, WAS_TOLD {at, channel, answer_id} -> each
// version used, plus the mirrored FEEDS {w:1} edge (version -> person) so impact analysis sees it.
MATCH (p:Person {id: $person_id})
CREATE (a:Entity:Answer {id: $answer_id, kind: 'Answer', question: $question, text: $text, at: $at,
                         channel: $channel, synthetic: true})
CREATE (a)-[:ANSWERED]->(p)
WITH a, p
UNWIND $version_ids AS vid
MATCH (v:FactVersion {id: vid})
MERGE (p)-[t:WAS_TOLD]->(v)
SET t.at = $at, t.channel = $channel, t.answer_id = $answer_id
MERGE (v)-[f:FEEDS]->(p)
SET f.w = 1
RETURN count(t)
