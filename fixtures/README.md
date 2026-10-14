# fixtures/

Canonical demo data and the mock contract for the UI. **@sahil1330 writes, @harsh-gupta-10 reviews.** Shape changes need the `contract` label and both approvals.

- `demo-c1/`: one JSON file per endpoint response for the C1 (personal VPN) scenario, `events.jsonl` (scripted SSE log) and `demo-steps.json` (plan §9). The web app's mock mode replays these; backend contract tests assert real responses match their shape.
