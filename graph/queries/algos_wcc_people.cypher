// (f) Chat communities: weakly connected components of the synthetic TALKS_WITH graph.
CALL algo.WCC({nodeLabels: ['Person'], relationshipTypes: ['TALKS_WITH']})
YIELD node, componentId
RETURN componentId, collect(node.id) AS members
ORDER BY componentId
