// General Concierge retrieval: entities in this tenant's graph whose text matches any query term.
// Only current fact versions; Answers/Tasks/Changes are bookkeeping and are skipped. Score = matched terms, terms in the name/title count triple.
MATCH (n:Entity)
WHERE NOT n.kind IN ['Answer', 'Task', 'Change', 'Fact']
  AND (n.kind <> 'FactVersion' OR n.valid_to IS NULL)
WITH n, toLower(coalesce(n.name, '') + ' ' + coalesce(n.title, '') + ' ' + coalesce(n.statement, '') + ' ' +
                coalesce(n.value, '') + ' ' + coalesce(n.excerpt, '') + ' ' + coalesce(n.role, '') + ' ' + n.id) AS txt,
     toLower(coalesce(n.name, n.title, n.statement, n.value, n.id)) AS lbl
WITH n, size([t IN $terms WHERE txt CONTAINS t]) + 2 * size([t IN $terms WHERE lbl CONTAINS t]) AS score
WHERE score > 0
RETURN n.id AS id, n.kind AS kind, coalesce(n.name, n.title, n.statement, n.value, n.id) AS label,
       coalesce(n.role, n.excerpt, n.statement, '') AS detail, coalesce(n.mr_url, n.source_url, n.url) AS url,
       score
ORDER BY score DESC, kind
LIMIT 8
