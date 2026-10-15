# SSE Events Contract

The Ripple SSE event stream is published at:
`GET /api/stream?tenant=<tenant_id>` (Server-Sent Events, `Content-Type: text/event-stream`).

Every event adheres to a standard envelope:

```json
{
  "type": "task.claimed",
  "at": 1784046483000,
  "tenant": "handbook-demo",
  "payload": {
    "task_id": "task:reanswer:priya",
    "agent_id": "agent:concierge"
  }
}
```

- `type`: One of the 8 registered event types listed below.
- `at`: Event timestamp in epoch milliseconds.
- `tenant`: The tenant identifier (e.g. `handbook-demo`).
- `payload`: Structured dictionary with event-specific parameters.

---

## Registered Event Types

### 1. `change.detected`
Emitted when the Sentinel detects a new policy version from git or upstream source.
```json
{
  "type": "change.detected",
  "at": 1784046483000,
  "tenant": "handbook-demo",
  "payload": {
    "change_id": "chg:c1",
    "fact_key": "expense.vpn.personal_subscription",
    "old_version": "fv:vpn:v1",
    "new_version": "fv:vpn:v2",
    "source_url": "https://gitlab.com/gitlab-com/content-sites/handbook/-/merge_requests/20421"
  }
}
```

### 2. `impact.computed`
Emitted by the Tracer after walking the graph and calculating the time-to-harm ranked impact set.
```json
{
  "type": "impact.computed",
  "at": 1784046484000,
  "tenant": "handbook-demo",
  "payload": {
    "change_id": "chg:c1",
    "impacted": 8,
    "by_kind": {
      "Person": 2,
      "Agent": 1,
      "Doc": 3,
      "Plan": 1,
      "Action": 1
    }
  }
}
```

### 3. `task.created`
Emitted when a follow-up remediation task is opened in the graph.
```json
{
  "type": "task.created",
  "at": 1784046485000,
  "tenant": "handbook-demo",
  "payload": {
    "task_id": "task:reanswer:priya",
    "kind": "reanswer",
    "priority": 1,
    "risk": 0.85,
    "target_id": "person:priya"
  }
}
```

### 4. `task.claimed`
Emitted when an autonomous worker or fixer agent claims an open task atomically.
```json
{
  "type": "task.claimed",
  "at": 1784046486000,
  "tenant": "handbook-demo",
  "payload": {
    "task_id": "task:reanswer:priya",
    "agent_id": "agent:concierge"
  }
}
```

### 5. `task.done`
Emitted when a task has been successfully remediated and written with a `RESOLVED` edge.
```json
{
  "type": "task.done",
  "at": 1784046487000,
  "tenant": "handbook-demo",
  "payload": {
    "task_id": "task:reanswer:priya",
    "agent_id": "agent:concierge",
    "outcome": "reanswered person:priya with fv:vpn:v2"
  }
}
```

### 6. `action.blocked`
Emitted when a worker agent calls `check_fresh` before executing an action and freshness verification fails.
```json
{
  "type": "action.blocked",
  "at": 1784046488000,
  "tenant": "handbook-demo",
  "payload": {
    "action_id": "act:ap:vpn-approval",
    "stale_version": "fv:vpn:v1",
    "current_version": "fv:vpn:v2",
    "source_url": "https://gitlab.com/gitlab-com/content-sites/handbook/-/blob/ddd39597/content/handbook/finance/expenses.md"
  }
}
```

### 7. `answer.sent`
Emitted when the Concierge answers a question (or re-answers after policy invalidation) with episodic memory citation.
```json
{
  "type": "answer.sent",
  "at": 1784046489000,
  "tenant": "handbook-demo",
  "payload": {
    "answer_id": "ans:a1b2c3d4e5f6",
    "person_id": "person:priya",
    "version_ids": ["fv:vpn:v2"],
    "earlier_told": {
      "version_id": "fv:vpn:v1",
      "value": "reimbursable up to $150 per year",
      "at": 1784041513000,
      "text": "Earlier I told you: reimbursable up to $150 per year. That changed on Jul 15, 2026 (MR !20421)."
    }
  }
}
```

### 8. `coverage.updated`
Emitted whenever task resolutions advance the coverage meter toward 100%.
```json
{
  "type": "coverage.updated",
  "at": 1784046490000,
  "tenant": "handbook-demo",
  "payload": {
    "change_id": "chg:c1",
    "impacted": 8,
    "resolved": 4,
    "pct": 50.0
  }
}
```
