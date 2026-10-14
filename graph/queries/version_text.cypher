// Value and excerpt of one FactVersion.
MATCH (v:FactVersion {id: $id})
RETURN v.value, v.excerpt
