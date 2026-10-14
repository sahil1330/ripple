// Current version of a fact (what the Concierge is allowed to answer from).
MATCH (f:Fact {key: $key})-[:HAS_VERSION]->(v:FactVersion)
WHERE v.valid_to IS NULL
RETURN f.title AS title, v.id AS id, v.value AS value, v.excerpt AS excerpt,
       coalesce(v.mr_url, v.source_url) AS source, v.valid_from AS valid_from
