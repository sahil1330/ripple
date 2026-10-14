// (f) Amplifiers: betweenness over the FEEDS dependency graph (exact, no sampling: deterministic; see graph/NOTES.md).
CALL algo.betweenness({nodeLabels: ['Entity'], relationshipTypes: ['FEEDS']})
YIELD node, score
WHERE score > 0
RETURN node.id AS id, score
