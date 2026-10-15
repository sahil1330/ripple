// (f) Who bridges conversations: betweenness on TALKS_WITH (exact, no sampling: deterministic).
CALL algo.betweenness({nodeLabels: ['Person'], relationshipTypes: ['TALKS_WITH']})
YIELD node, score
RETURN node.id AS id, score
