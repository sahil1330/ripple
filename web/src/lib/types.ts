// Shared response types. Keep in sync with contracts/openapi.yaml (changes need the `contract` label).
export type NodeKind =
  | "Fact" | "FactVersion" | "Change" | "Doc" | "DerivedFact" | "Plan"
  | "Action" | "Person" | "Team" | "Agent" | "Task" | "Answer";

export interface GraphNode {
  id: string;
  kind: NodeKind;
  label: string;
  synthetic: boolean;
  risk?: number;
  status?: string;
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
