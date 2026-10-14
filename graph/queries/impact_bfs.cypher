// (a') Impact radius over the materialised FEEDS edge (dependency -> dependent), hop distance included.
// FEEDS also covers PART_OF (plan -> its actions) and OWNS (thing -> its owner), so owners are reached.
// algo.bfs gives the reachable set; the var-length match gives the shortest hop count per node.
MATCH (old:FactVersion {id: $old_id})
CALL algo.bfs(old, 6, 'FEEDS') YIELD nodes
UNWIND nodes AS x
MATCH p = (old)-[:FEEDS*1..6]->(x)
WITH x, min(length(p)) AS hops
WHERE NOT 'FactVersion' IN labels(x)
RETURN x.id AS id, x.kind AS kind, coalesce(x.name, x.title, x.statement, x.id) AS label, hops
ORDER BY hops, id
