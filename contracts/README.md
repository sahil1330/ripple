# contracts/ (shared: both humans approve every change, label `contract`)

These files are the seams that let the two of us work in parallel. **Status: draft v0 from `RIPPLE_PLAN.md`**, to be finalised in issues #3 (graph model + MCP tools, @sahil1330) and #4 (openapi + events, @harsh-gupta-10). Tag `contracts-v1` once both merge.

| File | What it pins down |
|---|---|
| `graph-model.md` | Node labels, relationship types, properties, tenancy, time format |
| `openapi.yaml` | REST endpoints and response shapes the web app consumes |
| `events.md` | SSE event types on `GET /api/stream` |
| `mcp-tools.json` | `ripple-mcp` tool names, params and returns |
