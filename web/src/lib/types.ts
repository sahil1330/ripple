// Shared response types. Kept in sync with contracts/openapi.yaml.
export type NodeKind =
  | "Fact"
  | "FactVersion"
  | "Change"
  | "Doc"
  | "DerivedFact"
  | "Plan"
  | "Action"
  | "Person"
  | "Team"
  | "Agent"
  | "Task"
  | "Answer";

export interface Tenant {
  id: string;
  name: string;
}

export interface GraphNode {
  id: string;
  kind: NodeKind;
  label: string;
  synthetic: boolean;
  risk?: number | null;
  status?: string | null;
}

export interface GraphLink {
  source: string;
  target: string;
  type: string;
}

export interface GraphResponse {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface ChangeSummary {
  id: string;
  title: string;
  fact_key?: string;
  commit_sha: string;
  mr_url?: string | null;
  detected_at: number;
  status: "detected" | "resolving" | "resolved" | string;
}

export interface FactVersionSnapshot {
  version_id: string;
  value: string;
  excerpt: string;
  source_url: string;
}

export interface ChangeDetail {
  id: string;
  title: string;
  fact_key?: string;
  commit_sha: string;
  mr_url?: string | null;
  detected_at: number;
  status: string;
  before: FactVersionSnapshot;
  after: FactVersionSnapshot;
}

export interface ImpactItem {
  id: string;
  kind: string;
  label: string;
  synthetic: boolean;
  hops: number;
  severity: number;
  urgency: number;
  reach: number;
  risk: number;
  tth_ms: number;
  due_at?: number | null;
  status?: string;
  task_id?: string | null;
}

export interface ImpactResponse {
  change_id: string;
  total_impacted: number;
  items: ImpactItem[];
}

export interface KindCount {
  impacted: number;
  resolved: number;
}

export interface CoverageResponse {
  change_id: string;
  impacted: number;
  resolved: number;
  pct: number;
  by_kind: Record<string, KindCount>;
}

export interface ExplainResponse {
  hops: string[];
  via: string[];
  cypher: string;
}

export interface EarlierTold {
  version_id: string;
  value: string;
  at: number;
  text: string;
}

export interface AskResponse {
  answer: string;
  versions: string[];
  source_url?: string | null;
  earlier_told?: EarlierTold | null;
  answer_id: string;
  /** LLM Concierge (additive, optional): true when an LLM chose the graph tools and wrote the answer. */
  llm_used?: boolean;
  model?: string | null;
  fallback_reason?: string | null;
  tool_trace?: ToolTraceStep[];
}

export interface ToolTraceStep {
  tool: string;
  args: Record<string, unknown>;
  cypher: { name: string; query: string }[];
  error?: string;
}

export interface SseEnvelope {
  type:
    | "change.detected"
    | "impact.computed"
    | "task.created"
    | "task.claimed"
    | "task.done"
    | "action.blocked"
    | "answer.sent"
    | "coverage.updated"
    | string;
  at: number;
  tenant: string;
  payload: Record<string, unknown>;
}

export interface DemoStepResponse {
  step: number;
  total_steps: number;
  name: string;
  description: string;
  events: SseEnvelope[];
}

export interface DemoResetResponse {
  ok: boolean;
  tenant: string;
}
