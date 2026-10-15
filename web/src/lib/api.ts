// API client entry point. Mode is switched by NEXT_PUBLIC_API_MODE=mock|live (docs/WORKFLOW.md §8).
// mock: responses come from canonical C1 mock fixtures (contracts/openapi.yaml).
// live: calls the FastAPI backend at NEXT_PUBLIC_API_URL.
import {
  MOCK_ASK,
  MOCK_CHANGE_DETAIL,
  MOCK_CHANGES,
  MOCK_COVERAGE,
  MOCK_DEMO_STEPS,
  MOCK_EXPLAIN,
  MOCK_GRAPH,
  MOCK_IMPACT,
  MOCK_TENANTS,
} from "./mock-data";
import {
  AskResponse,
  ChangeDetail,
  ChangeSummary,
  CoverageResponse,
  DemoResetResponse,
  DemoStepResponse,
  ExplainResponse,
  GraphResponse,
  ImpactResponse,
  Tenant,
} from "./types";

export type ApiMode = "mock" | "live";

export const apiMode: ApiMode = process.env.NEXT_PUBLIC_API_MODE === "live" ? "live" : "mock";
export const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${apiBaseUrl}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

export async function postJson<T, B = unknown>(path: string, body: B): Promise<T> {
  const res = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

// Typed client operations matching contracts/openapi.yaml

export async function getTenants(): Promise<Tenant[]> {
  if (apiMode === "mock") return MOCK_TENANTS;
  return getJson<Tenant[]>("/api/tenants");
}

export async function getGraph(tenant: string, changeId?: string): Promise<GraphResponse> {
  if (apiMode === "mock") return MOCK_GRAPH;
  const q = new URLSearchParams({ tenant });
  if (changeId) q.set("change_id", changeId);
  return getJson<GraphResponse>(`/api/graph?${q.toString()}`);
}

export async function getChanges(tenant: string): Promise<ChangeSummary[]> {
  if (apiMode === "mock") return MOCK_CHANGES;
  return getJson<ChangeSummary[]>(`/api/changes?tenant=${encodeURIComponent(tenant)}`);
}

export async function getChangeDetail(tenant: string, id: string): Promise<ChangeDetail> {
  if (apiMode === "mock") return MOCK_CHANGE_DETAIL;
  return getJson<ChangeDetail>(`/api/changes/${encodeURIComponent(id)}?tenant=${encodeURIComponent(tenant)}`);
}

export async function getChangeImpact(tenant: string, id: string): Promise<ImpactResponse> {
  if (apiMode === "mock") return MOCK_IMPACT;
  return getJson<ImpactResponse>(`/api/changes/${encodeURIComponent(id)}/impact?tenant=${encodeURIComponent(tenant)}`);
}

export async function getChangeCoverage(tenant: string, id: string): Promise<CoverageResponse> {
  if (apiMode === "mock") return MOCK_COVERAGE;
  return getJson<CoverageResponse>(`/api/changes/${encodeURIComponent(id)}/coverage?tenant=${encodeURIComponent(tenant)}`);
}

export async function explainPath(tenant: string, fromId: string, toId: string): Promise<ExplainResponse> {
  if (apiMode === "mock") return MOCK_EXPLAIN;
  const q = new URLSearchParams({ tenant, from: fromId, to: toId });
  return getJson<ExplainResponse>(`/api/explain?${q.toString()}`);
}

export async function askConcierge(tenant: string, personId: string, question: string): Promise<AskResponse> {
  if (apiMode === "mock") return MOCK_ASK;
  return postJson<AskResponse>("/api/ask", { tenant, person_id: personId, question });
}

let mockCurrentStep = 0;

export async function demoStep(tenant: string, scenario: string = "c1"): Promise<DemoStepResponse> {
  if (apiMode === "mock") {
    const step = MOCK_DEMO_STEPS[mockCurrentStep % MOCK_DEMO_STEPS.length];
    mockCurrentStep = (mockCurrentStep + 1) % MOCK_DEMO_STEPS.length;
    return step;
  }
  return postJson<DemoStepResponse>("/api/demo/step", { tenant, scenario });
}

export async function demoReset(tenant: string): Promise<DemoResetResponse> {
  if (apiMode === "mock") {
    mockCurrentStep = 0;
    return { ok: true, tenant };
  }
  return postJson<DemoResetResponse>("/api/demo/reset", { tenant });
}
