// Departments = Team nodes in the tenant graph. Any impacted entity is routed to the team(s) it
// belongs to by walking organisational edges (MEMBER_OF, OWNS, PART_OF; plus DEPENDS_ON through
// derived facts), e.g. act:approve-vpn-priya -PART_OF-> plan:ap-queue <-OWNS- person:ravi -MEMBER_OF-> team:ap.
import orgFixture from "@/fixtures/org.json";
import { GraphResponse, ImpactItem } from "./types";

export interface Department {
  id: string;
  name: string;
  members: { id: string; label: string }[];
}

const ORG_EDGES = new Set(["MEMBER_OF", "OWNS", "PART_OF", "DEPENDS_ON"]);
export const COMPANY_WIDE = "company";

export function withOrgFallback(graph: GraphResponse): GraphResponse {
  // The mock graph fixture is change-scoped and has no Team nodes; fill in the org layer from org.json.
  if (graph.nodes.some((n) => n.kind === "Team")) return graph;
  const org = orgFixture as unknown as GraphResponse;
  const ids = new Set(graph.nodes.map((n) => n.id));
  return {
    nodes: [...graph.nodes, ...org.nodes.filter((n) => !ids.has(n.id))],
    links: [...graph.links, ...org.links],
  };
}

export function buildDepartments(graph: GraphResponse): {
  departments: Department[];
  teamOf: (id: string) => string[];
} {
  const label = new Map(graph.nodes.map((n) => [n.id, n.label]));
  const kind = new Map(graph.nodes.map((n) => [n.id, n.kind]));
  const adj = new Map<string, string[]>();
  for (const l of graph.links) {
    if (!ORG_EDGES.has(l.type)) continue;
    const s = typeof l.source === "string" ? l.source : (l.source as { id: string }).id;
    const t = typeof l.target === "string" ? l.target : (l.target as { id: string }).id;
    // never walk through fact versions: they are shared by everyone and would merge all teams
    if (kind.get(s) === "FactVersion" || kind.get(t) === "FactVersion") continue;
    adj.set(s, [...(adj.get(s) ?? []), t]);
    adj.set(t, [...(adj.get(t) ?? []), s]);
  }
  const teams = graph.nodes.filter((n) => n.kind === "Team");
  const departments: Department[] = teams
    .map((t) => ({
      id: t.id,
      name: t.label,
      members: graph.links
        .filter((l) => l.type === "MEMBER_OF" && l.target === t.id && kind.get(l.source) === "Person")
        .map((l) => ({ id: l.source, label: label.get(l.source) ?? l.source })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const cache = new Map<string, string[]>();
  const teamOf = (id: string): string[] => {
    if (cache.has(id)) return cache.get(id)!;
    // BFS, stop at the shallowest depth that reaches any team
    let frontier = [id];
    const seen = new Set(frontier);
    let found: string[] = [];
    for (let depth = 0; depth < 5 && frontier.length && !found.length; depth++) {
      const next: string[] = [];
      for (const n of frontier) {
        for (const m of adj.get(n) ?? []) {
          if (seen.has(m)) continue;
          seen.add(m);
          if (kind.get(m) === "Team") found.push(m);
          // teams are endpoints: don't walk team -> other members' docs
          else next.push(m);
        }
      }
      frontier = next;
    }
    if (kind.get(id) === "Team") found = [id];
    found = [...new Set(found)];
    cache.set(id, found);
    return found;
  };
  return { departments, teamOf };
}

export interface DeptNotification {
  changeId: string;
  title: string;
  factKey?: string;
  detectedAt: number;
  status: string;
  items: ImpactItem[];
}

export function groupImpact(
  teamOf: (id: string) => string[],
  changes: { id: string; title: string; fact_key?: string; detected_at: number; status: string; items: ImpactItem[] }[]
): Map<string, DeptNotification[]> {
  const out = new Map<string, DeptNotification[]>();
  for (const c of changes) {
    const byTeam = new Map<string, ImpactItem[]>();
    for (const it of c.items) {
      const ts = teamOf(it.id);
      for (const t of ts.length ? ts : [COMPANY_WIDE]) byTeam.set(t, [...(byTeam.get(t) ?? []), it]);
    }
    for (const [t, items] of byTeam) {
      const n: DeptNotification = {
        changeId: c.id,
        title: c.title,
        factKey: c.fact_key,
        detectedAt: c.detected_at,
        status: c.status,
        items: items.sort((a, b) => b.risk - a.risk),
      };
      out.set(t, [...(out.get(t) ?? []), n]);
    }
  }
  for (const list of out.values()) list.sort((a, b) => b.detectedAt - a.detectedAt);
  return out;
}

// A natural question per policy fact, so "Get explanation" hits the Concierge's policy route.
const FACT_QUESTIONS: [RegExp, string][] = [
  [/vpn/, "Can I still expense my personal VPN?"],
  [/meals/, "What is the travel meal limit now?"],
  [/internet|phone/, "Is my home internet and phone bill covered?"],
  [/cowork/, "Do I need approval for a co-working day pass?"],
  [/stipend|new_hire/, "How does the new hire home office stipend work now?"],
];

export function questionForFact(factKey: string | undefined, title: string): string {
  const key = (factKey ?? "").toLowerCase();
  for (const [re, q] of FACT_QUESTIONS) if (re.test(key)) return q;
  return `What changed about "${title}"?`;
}

export function companyName(tenantName: string | undefined, tenantId: string): string {
  const base = (tenantName ?? tenantId).split(/[\s(]/)[0];
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : tenantId;
}
