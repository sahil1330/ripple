# Graph model (contracts-v1, part 1)

Source of design: `RIPPLE_PLAN.md` §4. Syntax confirmed by the Day-1 smoke tests (`graph/NOTES.md`).
Changing anything here needs a PR labelled `contract`, approved by both @sahil1330 and @harsh-gupta-10.

## Conventions
- **Tenancy:** one FalkorDB graph per company, key `ripple:<tenant>` (`ripple:handbook-demo`, `ripple:acme-synthetic`). Tenant ids never contain `:`.
- **Every node** has the label `:Entity` **plus** exactly one main label, and these properties:
  `id` (string, unique within the tenant, prefixed by kind, e.g. `fv:vpn:v1`), `kind` (= main label), `synthetic` (bool).
  The UI and queries group by the `kind` property, never by label position.
- **Time:** epoch-milliseconds integers everywhere. `valid_to = null` means "current version".
- **Direction:** dependency edges point **dependent → dependency** (e.g. `Plan -DEPENDS_ON-> FactVersion`). Every such edge is mirrored by a materialised `FEEDS {w:1}` edge **dependency → dependent**, so `algo.bfs` / `algo.SSpaths` / `algo.betweenness` can run over a single relationship type (they are outgoing-only, see NOTES).

## Nodes
| Label | Properties (besides id, kind, synthetic) | id prefix |
|---|---|---|
| `Fact` | key (e.g. `expense.vpn.personal_subscription`), topic, title | `fact:` |
| `FactVersion` | fact_key, value (string), unit (nullable), excerpt, valid_from, valid_to, source_url, commit_sha, mr_url | `fv:` |
| `Change` | fact_key, detected_at, commit_sha, mr_url, title, status (`open`/`resolving`/`resolved`) | `chg:` |
| `Doc` | title, url, doc_kind (`handbook`/`faq`/`synthetic_wiki`) | `doc:` |
| `DerivedFact` | statement, derived_at, by_agent | `df:` |
| `Plan` | title, status (`active`/`stale`/`replanned`/`done`), act_by | `plan:` |
| `Action` | title, action_kind (`approve_expense`/`send_message`/`book_travel`/`issue_card`), status (`pending`/`blocked`/`done`/`replanned`), due_at, amount (nullable number) | `act:` |
| `Person` | name, role | `person:` |
| `Team` | name | `team:` |
| `Agent` | name, agent_kind (`sentinel`/`tracer`/`fixer`/`concierge`/`worker`) | `agent:` |
| `Task` | task_kind (`trace`/`fix_doc`/`reanswer`/`replan`/`notify`), status (`open`/`claimed`/`done`/`failed`), priority (int, 1 = first), risk (float), created_at, claimed_at, done_at, outcome | `task:` |
| `Answer` | question, text, at, channel (`slack`/`web`/`email`) | `ans:` |

> Change from the v0 draft: sub-types use `doc_kind`, `action_kind`, `agent_kind`, `task_kind` because `kind` is reserved for the main label on every node.

## Relationships
| Type | From → To | Properties | Mirrored by FEEDS? |
|---|---|---|---|
| `HAS_VERSION` | Fact → FactVersion | | no |
| `SUPERSEDES` | FactVersion(new) → FactVersion(old) | | no |
| `STATES` / `CITES` | Doc → FactVersion | | yes |
| `LINKS_TO` | Doc → Doc | | no (PageRank input) |
| `DERIVED_FROM` | DerivedFact → FactVersion / DerivedFact | | yes |
| `DEPENDS_ON` | Plan / Action → FactVersion / DerivedFact / Doc | | yes |
| `PART_OF` | Action → Plan | | yes (Plan feeds its Actions) |
| `WAS_TOLD` | Person → FactVersion / DerivedFact | at, channel, answer_id | yes |
| `CACHED` | Agent → FactVersion / DerivedFact | at | yes |
| `OWNS` | Person / Agent → Plan / Action / Doc | | yes (owned thing feeds its owner) |
| `MEMBER_OF` | Person → Team | | no |
| `TALKS_WITH` | Person → Person | weight | no (WCC input) |
| `FROM` / `TO` | Change → FactVersion (old / new) | | no |
| `IMPACTS` | Change → any | hops, risk, tth_ms, severity, urgency, reach | no |
| `RESOLVED` | any → Change | at, by, how (`reanswered`/`patched`/`replanned`/`acknowledged`/`briefed`) | no |
| `FEEDS` | dependency → dependent | w (always 1) | n/a |
| `ABOUT` | Task → Change | | no |
| `TARGETS` | Task → any | | no |
| `CREATED` / `CLAIMED` | Agent → Task | at | no |
| `ANSWERED` | Answer → Person | | no |

> `ANSWERED` is new vs v0: it links the Concierge's episodic `Answer` node to who asked, so "earlier I told you" can be read back.

## Indexes (`graph/schema.py`)
`Entity(id)`, `Fact(key)`, `FactVersion(valid_to)`, `Task(status)`, `Action(status)`, `WAS_TOLD(at)`, full-text on `Doc(title)`.
