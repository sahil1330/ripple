// (f) Who bridges conversations: betweenness on TALKS_WITH.
// samplingSize above the node count + a fixed seed = every node is a source, reproducible (graph/NOTES.md).
CALL algo.betweenness({nodeLabels: ['Person'], relationshipTypes: ['TALKS_WITH'], samplingSize: 100000, samplingSeed: 42})
YIELD node, score
RETURN node.id AS id, score
