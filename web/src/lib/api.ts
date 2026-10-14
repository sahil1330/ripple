// API client entry point. Mode is switched by NEXT_PUBLIC_API_MODE=mock|live (docs/WORKFLOW.md §8).
// mock: responses come from fixtures/demo-c1/ (contract owned by Person A, see contracts/openapi.yaml).
// live: calls the FastAPI backend at NEXT_PUBLIC_API_URL.
export type ApiMode = "mock" | "live";

export const apiMode: ApiMode = process.env.NEXT_PUBLIC_API_MODE === "live" ? "live" : "mock";
export const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function getJson<T>(path: string): Promise<T> {
  if (apiMode === "mock") {
    throw new Error(`mock mode not wired yet for ${path}`);
  }
  const res = await fetch(`${apiBaseUrl}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return (await res.json()) as T;
}
