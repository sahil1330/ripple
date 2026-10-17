# Cypher queries

Every query the product runs lives here as a `.cypher` file and is listed in the README "Cypher & algorithms" section.
Rules: parameters only (`$name`, never string concatenation; no params in `LIMIT`/`SKIP`), times are epoch-ms integers, reference relationship aliases when counting.

Draft queries from `RIPPLE_PLAN.md` §4.4 (untested until the smoke-test issue confirms syntax):

| File | Purpose |
|---|---|
| `impact.cypher` | (a) impact radius: multi-type variable-length traversal from an old FactVersion |
| `impact_bfs.cypher` | (a') impact radius: `algo.bfs` over `FEEDS` + hop count (used by `graph/impact.py`) |
| `who_holds.cypher` | (b) people and agents still holding a superseded version |
| `check_fresh.cypher` | (c) freshness guard for a plan; any row = stale |
| `explain_path.cypher` | (d) shortest "why" path between two entities |
| `coverage.cypher` | (e) impacted vs resolved per kind for a Change |
| `ingest_fact_version.cypher` | upsert a Fact + FactVersion (handbook ingest) |
| `ingest_change.cypher` | record a Change: SUPERSEDES, close old `valid_to`, FROM/TO (ingest + Sentinel replay) |

| `current_versions.cypher` | current FactVersion id per fact key (doc ingest) |
| `algo_pagerank_docs.cypher` | (f) PageRank over real handbook `LINKS_TO` (doc authority) |
| `change_versions.cypher` | old (FROM) and new (TO) version of a Change |
| `write_impacts.cypher` | Tracer output: MERGE `IMPACTS {hops, risk, tth_ms, severity, urgency, reach}` |
| `tth_due.cypher` | time-to-harm: soonest deadline per impacted entity (own or inherited via OWNS) |
| `algo_betweenness_feeds.cypher` | (f) betweenness over `FEEDS` (reach factor, amplifiers) |
| `fact_current.cypher` | current version of a fact (Concierge answers only from it) |
| `earlier_told.cypher` | episodic memory: last older version this person was told |
| `record_answer.cypher` | log Answer + ANSWERED + WAS_TOLD {at, channel, answer_id} + FEEDS |
| `algos_wcc_people.cypher` | (f) chat communities: `algo.WCC` on `TALKS_WITH` (dark pockets) |
| `algos_betweenness_people.cypher` | (f) chat bridges: betweenness on `TALKS_WITH` (pocket hub) |
| `resolved_by.cypher` | entities that RESOLVED a change |
| `task_create.cypher` | open a handoff Task (CREATED / ABOUT / TARGETS), idempotent |
| `task_claim.cypher` | atomic claim of the best open task of given kinds |
| `task_complete.cypher` | finish a task held by this agent |
| `change_set_status.cypher` | Change status open → resolving → resolved |
| `direct_exposure.cypher` | which edge types link each impacted entity to the old version (task kind choice) |
| `worker_pending_actions.cypher` | pending actions a worker agent owns |
| `action_set_status.cypher` | worker outcome: done / blocked (+ reason) |
| `change_for_version.cypher` | the Change that superseded a version |
| `fix_stale_deps.cypher` | Fixer: dependencies of a plan/action that lead to the old version |
| `fix_replace_derived.cypher` | Fixer: recompute a DerivedFact from the new version and swap the dependency |
| `fix_repoint_dependency.cypher` | Fixer: re-point a direct version dependency to the current version |
| `fix_replan_actions.cypher` | Fixer: cancel actions built on the stale rule, plan → replanned |
| `fix_plan_of.cypher` | plan an action belongs to |
| `fix_refresh_agent_cache.cypher` | Fixer: agent memory now CACHED the current version |
| `fix_doc_patch.cypher` | Fixer: markdown patch draft on a Doc (+ re-point real handbook pages) |
| `fix_last_question.cypher` | question a person asked when told the old version |
| `fix_resolve.cypher` | write RESOLVED {at, by, how} → Change |
| `version_text.cypher` | value + excerpt of a FactVersion |
| `doc_title.cypher` | title of a Doc |
| `api_nodes.cypher` | API `/api/graph`: canvas nodes with risk + resolved flags |
| `api_links.cypher` | API `/api/graph`: canvas links (hides FEEDS/IMPACTS/RESOLVED) |
| `api_change_scope.cypher` | API `/api/graph?change_id`: ids in a change's impact subgraph |
| `api_changes.cypher` | API `/api/changes[/{id}]`: summary + before/after snapshots |
| `api_impact_queue.cypher` | API `/api/changes/{id}/impact`: TTH queue from IMPACTS + task ids |

Load a query from Python with `graph.cypher.cypher("<name>")`.
| `version_fact_key.cypher` | LLM Concierge: map a full-text FactVersion hit to its fact key |
| `ask_search.cypher` | general Concierge retrieval: entities matching question terms (current versions only) |
| `ask_neighbours.cypher` | general Concierge context: MEMBER_OF/OWNS/PART_OF/DEPENDS_ON/... neighbours of a hit |
| `record_answer_note.cypher` | log a general answer (Answer + ANSWERED, no WAS_TOLD) |
| `ask_by_kind.cypher` | general Concierge: list teams / agents / docs / plans for "what X do we have?" |
