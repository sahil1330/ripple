// Current (valid_to IS NULL) version id per fact key, for the given keys.
UNWIND $keys AS key
MATCH (:Fact {key: key})-[:HAS_VERSION]->(v:FactVersion)
WHERE v.valid_to IS NULL
RETURN key, v.id
