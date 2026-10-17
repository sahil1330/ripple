// Fact key of a fact version (LLM Concierge: map a full-text hit to its policy fact).
MATCH (v:FactVersion {id: $id})
RETURN v.fact_key AS key
