# agents/

Plain Python loops over `Task` nodes (plan §5). Agents never message each other directly:
create `Task {status:'open'}` → atomic claim → complete + `RESOLVED`.

| Agent | Module (todo) |
|---|---|
| Sentinel | `sentinel.py` |
| Tracer | `tracer.py` (+ `ranking.py` time-to-harm) |
| Fixer | `fixer.py` |
| Concierge | `concierge.py` |
| Workers (ap-approver, onboarding-bot, travel-planner) | `workers.py`, must call `check_fresh` before every action |
