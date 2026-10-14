# Graph model (draft v0, finalise in #3)

Source of truth for design: `RIPPLE_PLAN.md` §4. Summary:

- **Tenancy:** one FalkorDB graph per company, key `ripple:<tenant>` (e.g. `ripple:handbook-demo`, `ripple:acme-synthetic`).
- **Every node** carries label `:Entity`, a unique `id`, a `kind` property equal to its main label, and `synthetic: true|false`.
- **Time:** epoch-milliseconds integers everywhere (`valid_from`, `valid_to`, `at`, `due_at`, ...). `valid_to = null` means current.

## Nodes
| Label | Key properties |
|---|---|
| `Fact` | id, key, topic, title |
| `FactVersion` | id, fact_key, value, unit, excerpt, valid_from, valid_to, source_url, commit_sha, mr_url |
| `Change` | id, fact_key, detected_at, commit_sha, mr_url, status (`open`/`resolving`/`resolved`) |
| `Doc` | id, title, url, kind (`handbook`/`faq`/`synthetic_wiki`), synthetic |
| `DerivedFact` | id, statement, derived_at, by_agent |
| `Plan` | id, title, status, act_by, synthetic |
| `Action` | id, kind, status (`pending`/`blocked`/`done`/`replanned`), due_at, amount |
| `Person` | id, name, role, synthetic |
| `Team` | id, name |
| `Agent` | id, name, kind (`sentinel`/`tracer`/`fixer`/`concierge`/`worker`) |
| `Task` | id, kind (`trace`/`fix_doc`/`reanswer`/`replan`/`notify`), status (`open`/`claimed`/`done`/`failed`), priority, risk, created_at, claimed_at, done_at |
| `Answer` | id, question, text, at, channel |

## Relationships
`HAS_VERSION` (Fact→FactVersion), `SUPERSEDES` (new→old), `STATES`/`CITES` (Doc→FactVersion), `LINKS_TO` (Doc→Doc),
`DERIVED_FROM`, `DEPENDS_ON`, `PART_OF`, `WAS_TOLD {at, channel, answer_id}` (Person→version), `CACHED {at}` (Agent→version),
`OWNS`, `MEMBER_OF`, `TALKS_WITH {weight}`, `FROM`/`TO` (Change→old/new version), `IMPACTS {hops, risk, tth_ms}`,
`RESOLVED {at, by, how}`, `FEEDS {w:1}` (materialised dependency→dependent edge for algorithms), `ABOUT`/`TARGETS`, `CREATED`/`CLAIMED`.
