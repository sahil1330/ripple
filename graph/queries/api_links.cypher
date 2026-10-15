// API /api/graph: links for the canvas. Bookkeeping edges are hidden (FEEDS mirrors dependency
// edges for algorithms; IMPACTS/RESOLVED are drawn as node colour instead).
MATCH (a:Entity)-[r]->(b:Entity)
WHERE ($ids IS NULL OR (a.id IN $ids AND b.id IN $ids))
  AND NOT type(r) IN ['FEEDS', 'IMPACTS', 'RESOLVED']
RETURN a.id AS source, b.id AS target, type(r) AS type
ORDER BY source, target, type
