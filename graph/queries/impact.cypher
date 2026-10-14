MATCH (old:FactVersion {id: $old_id})
MATCH p = (old)<-[:STATES|CITES|DERIVED_FROM|DEPENDS_ON|PART_OF|WAS_TOLD|CACHED|OWNS*1..6]-(x)
WITH x, min(length(p)) AS hops
RETURN labels(x) AS labels, x.id AS id, coalesce(x.name, x.title, x.statement) AS label, hops
ORDER BY hops
