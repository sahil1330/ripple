# Ripple MCP server (`ripple_mcp`)

Ripple ships its own [Model Context Protocol](https://modelcontextprotocol.io) server so any MCP client
(a worker agent, Cursor, Claude Desktop, ...) can query the company brain and call the freshness guard
before acting. Every tool is a thin wrapper over `graph.tools` / `graph.impact` / `agents.tasks`, so the
API, the agents and MCP clients run exactly the same Cypher on FalkorDB. Tool schemas are the contract in
[`contracts/mcp-tools.json`](../contracts/mcp-tools.json).

## Run it

```bash
pip install -r requirements.txt            # includes mcp>=1.2,<2
export FALKORDB_HOST=localhost FALKORDB_PORT=6379   # plus FALKORDB_PASSWORD if set
./deploy/seed.sh handbook-demo              # once, if the graph is empty

python -m ripple_mcp.server                 # stdio (what desktop clients spawn)
python -m ripple_mcp.server --read-only     # read tools only (safe for judges / exploration)
python -m ripple_mcp.server --http --port 8001   # streamable HTTP at http://localhost:8001/mcp
```

Every tool takes a `tenant` argument (`handbook-demo` or `acme-synthetic`); each tenant is its own
FalkorDB graph (`ripple:<tenant>`).

## Tools

| Tool | Kind | What it does |
|---|---|---|
| `impact_of(tenant, change_id?, version_id?, max_hops?)` | read | Everything that relies on the old version of a change (multi-hop), ranked by time-to-harm. |
| `who_holds(tenant, version_id)` | read | People and agents still holding a superseded version (told or cached, unresolved). |
| `check_fresh(tenant, plan_id?, action_id?, now?)` | read | Freshness guard: `fresh=false` lists each stale dependency with the current value and source. Call before every action. |
| `explain_path(tenant, from_id, to_id)` | read | Shortest "why" path between two entities, with the Cypher used. |
| `coverage(tenant, change_id)` | read | Impacted vs resolved counts for a change. |
| `rank_amplifiers(tenant, change_id, algo?, k?)` | read | PageRank (docs) or betweenness (anything) over who spreads the stale fact. |
| `dark_pockets(tenant, change_id)` | read | WCC components where nobody has resolved the change, plus the best hub to brief. |
| `claim_task(tenant, agent_id, kinds)` | write | Atomically claim the top open task (agents coordinate through `Task` nodes). |
| `complete_task(tenant, agent_id, task_id, outcome, failed?)` | write | Finish a claimed task. |
| `record_answer(tenant, person_id, question, version_ids, text?, channel?)` | write | Log an answer as episodic memory (`Answer` + `WAS_TOLD`). |

Write tools are hidden with `--read-only`.

## Client config

Cursor (`.cursor/mcp.json`) or Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "ripple": {
      "command": "python",
      "args": ["-m", "ripple_mcp.server", "--read-only"],
      "cwd": "/path/to/ripple",
      "env": { "FALKORDB_HOST": "localhost", "FALKORDB_PORT": "6379" }
    }
  }
}
```

For the HTTP transport, point the client at `http://localhost:8001/mcp`.

## Sample call

[`examples/mcp_client.py`](../examples/mcp_client.py) spawns the server over stdio, lists the tools and
asks the freshness guard whether the $150 VPN approval is still safe (run it after the C1 change is applied,
e.g. demo step 1 or `python -c "from ingest.handbook_changes import apply_change; apply_change('handbook-demo','chg:c1')"`):

```bash
python examples/mcp_client.py
```

Output (verified against a local FalkorDB):

```
['impact_of', 'who_holds', 'check_fresh', 'explain_path', 'coverage', 'rank_amplifiers', 'dark_pockets']
{
  "fresh": false,
  "stale": [
    {
      "via": "df:ap-vpn-rule",
      "stale_version": "fv:vpn:v1",
      "current_version": "fv:vpn:v2",
      "stale_value": "reimbursable up to $150 per year",
      "current_value": "not reimbursable; use NordLayer (company VPN)",
      "source": "https://gitlab.com/gitlab-com/content-sites/handbook/-/merge_requests/20421"
    }
  ]
}
```

The end-to-end test `tests/graph/test_mcp_stdio.py` runs the same flow in CI.

## Upstream FalkorDB-MCPServer

For free-form read-only Cypher exploration, the upstream
[FalkorDB-MCPServer](https://github.com/FalkorDB/FalkorDB-MCPServer) can run alongside `ripple_mcp`. Setup and client configs: [`FALKORDB_MCP.md`](./FALKORDB_MCP.md); ready-made configs with both servers are in [`deploy/falkordb-mcp/`](../deploy/falkordb-mcp/).
