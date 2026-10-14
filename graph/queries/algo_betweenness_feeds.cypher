// (f) Amplifiers: betweenness over the FEEDS dependency graph (fixed sampling seed = deterministic).
CALL algo.betweenness({nodeLabels: ['Entity'], relationshipTypes: ['FEEDS'], samplingSize: 64, samplingSeed: 42})
YIELD node, score
WHERE score > 0
RETURN node.id AS id, score
