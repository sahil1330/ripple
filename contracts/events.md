# SSE events (draft v0, finalise in #4)

Stream: `GET /api/stream?tenant=<id>` (Server-Sent Events). Every event:

```json
{ "type": "task.claimed", "at": 1760000000000, "tenant": "handbook-demo", "payload": { } }
```

| type | payload (draft) |
|---|---|
| `change.detected` | `{change_id, fact_key, old_version, new_version, source_url}` |
| `impact.computed` | `{change_id, impacted: n, by_kind: {...}}` |
| `task.created` | `{task_id, kind, priority, risk, target_id}` |
| `task.claimed` | `{task_id, agent_id}` |
| `task.done` | `{task_id, agent_id, outcome}` |
| `action.blocked` | `{action_id, stale_version, current_version, source_url}` |
| `answer.sent` | `{answer_id, person_id, version_ids, earlier_told?}` |
| `coverage.updated` | `{change_id, impacted, resolved, pct}` |
