# Upstream FalkorDB-MCPServer (Read-Only) Integration Guide

> Ripple's own MCP server (`ripple_mcp`, tools and config) is documented in [`MCP.md`](./MCP.md). This page covers the upstream server for free-form read-only Cypher exploration.

Owner: `@harsh-gupta-10` (Person B). Area: `area:mcp`. Reference: `RIPPLE_PLAN.md` §6.

This document details client configuration and usage instructions for connecting external AI assistants, inspectors, and judges directly to Ripple's company brain via the official **FalkorDB MCP Server** ([`@falkordb/mcpserver`](https://github.com/FalkorDB/FalkorDB-MCPServer)) with read-only enforcement.

---

## 1. Two MCP Servers in Ripple

Ripple leverages MCP across two distinct surfaces:

1. **`ripple-mcp` (Custom Python MCP Server):**
   - Implemented in `ripple_mcp/`.
   - Exposes `impact_of`, `who_holds`, `check_fresh`, `explain_path`, `coverage`, `rank_amplifiers`, `dark_pockets` (read) and `claim_task`, `complete_task`, `record_answer` (write; hidden with `--read-only`). See [`MCP.md`](./MCP.md).
   - Drives agent coordination and the real-time freshness guard.

2. **`FalkorDB-MCPServer` (Upstream Node.js MCP Server):**
   - Official package: `@falkordb/mcpserver` via `npx`.
   - Purpose: Judge-facing and developer-facing exploratory read-only access to the underlying knowledge graph.
   - Run strictly with `FALKORDB_DEFAULT_READONLY=true`.
   - **Demo line:** *"Any MCP client can ask Ripple's graph who still believes the old VPN policy."*

---

## 2. Client Configurations

### Configuration Schema

To prevent accidental mutations to core state, the server must be configured with:
- `FALKORDB_DEFAULT_READONLY: "true"`
- Port `6379` (local Docker or FalkorDB Cloud)

### A. Cursor Editor (`.cursor/mcp.json`)

Add the following to your project's `.cursor/mcp.json` or global Cursor settings:

```json
{
  "mcpServers": {
    "ripple-brain": {
      "command": "npx",
      "args": ["-y", "@falkordb/mcpserver"],
      "env": {
        "FALKORDB_HOST": "localhost",
        "FALKORDB_PORT": "6379",
        "FALKORDB_DEFAULT_READONLY": "true"
      }
    }
  }
}
```

### B. Claude Desktop (`claude_desktop_config.json`)

On Linux (`~/.config/Claude/claude_desktop_config.json`) or macOS (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "ripple-brain": {
      "command": "npx",
      "args": ["-y", "@falkordb/mcpserver"],
      "env": {
        "FALKORDB_HOST": "localhost",
        "FALKORDB_PORT": "6379",
        "FALKORDB_DEFAULT_READONLY": "true"
      }
    }
  }
}
```

Pre-configured copies are available at:
- [`deploy/falkordb-mcp/mcp-config.json`](../deploy/falkordb-mcp/mcp-config.json)
- [`deploy/falkordb-mcp/claude_desktop_config.json`](../deploy/falkordb-mcp/claude_desktop_config.json)

---

## 3. Available Read-Only Tools

When connected via `@falkordb/mcpserver` with `FALKORDB_DEFAULT_READONLY=true`:

| Tool | Description | Status |
|---|---|---|
| `list_graphs` | Lists all active graphs (e.g. `ripple:handbook-demo`) | Enabled |
| `get_graph_schema` | Returns node labels, relationship types, and properties | Enabled |
| `query_graph_readonly` | Executes Cypher queries in read-only mode | Enabled |
| `get_node_schema` | Inspects node properties | Enabled |
| `get_relationship_schema` | Inspects relationship schemas | Enabled |
| `create_graph` | Graph creation | **Disabled** (returns error) |
| `delete_graph` | Graph deletion | **Disabled** (returns error) |

---

## 4. Hero Demo Query: "Who still believes the old VPN policy?"

Any LLM connected to the MCP server can directly answer questions about stale fact holders.

### Natural Language Prompt to MCP Client:
> *"Query the `ripple:handbook-demo` graph to find every person, agent, and pending action that is still holding or relying on the old personal VPN policy version (`fv:vpn:v1`)."*

### Executed Cypher Query:

```cypher
// 1. Find people who were told the old version
MATCH (p:Person)-[:WAS_TOLD]->(a:Answer)-[:CITES]->(fv:FactVersion {id: 'fv:vpn:v1'})
RETURN
  'Person' AS kind,
  p.id AS entity_id,
  p.name AS name,
  p.role AS role,
  a.text AS context

UNION ALL

// 2. Find worker agents caching the old version
MATCH (ag:Agent)-[:CACHED]->(fv:FactVersion {id: 'fv:vpn:v1'})
RETURN
  'Agent' AS kind,
  ag.id AS entity_id,
  ag.name AS name,
  ag.role AS role,
  'Cached fact in local memory' AS context

UNION ALL

// 3. Find pending actions dependent on the old version
MATCH (act:Action)-[:DEPENDS_ON]->(fv:FactVersion {id: 'fv:vpn:v1'})
RETURN
  'Action' AS kind,
  act.id AS entity_id,
  act.title AS name,
  act.status AS role,
  ('Amount: $' + toString(act.amount)) AS context;
```

### Result Grounding:
- **People:** Priya Sharma and 10 other team members were told "$150/year reimbursement" via Slack.
- **Agents:** `ap-approver` and `it-helpdesk-bot` hold cached copies of `fv:vpn:v1`.
- **Actions:** Pending expense approval `act:c1:ap:1` ($150 VPN expense) is blocked by Ripple's freshness guard.
