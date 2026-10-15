// (f) Amplifiers: betweenness over the FEEDS dependency graph.
// Without samplingSize the engine samples a few source nodes, so scores changed between runs on the
// same graph. samplingSize above the node count + a fixed seed makes it reproducible (graph/NOTES.md).
CALL algo.betweenness({nodeLabels: ['Entity'], relationshipTypes: ['FEEDS'], samplingSize: 100000, samplingSeed: 42})
YIELD node, score
WHERE score > 0
RETURN node.id AS id, score
