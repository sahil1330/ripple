import { AskResponse, ChangeDetail, ExplainResponse, ImpactItem } from "@/lib/types";

export interface ExplanationPayload {
  department: string;
  change: ChangeDetail | null;
  changeTitle: string;
  path: ExplainResponse | null;
  pathTarget: ImpactItem | null;
  items: ImpactItem[];
  answer: AskResponse | null;
}

export type ChatMessage =
  | { id: string; role: "user"; text: string; context?: string }
  | { id: string; role: "assistant"; kind: "answer"; answer: AskResponse }
  | { id: string; role: "assistant"; kind: "explanation"; data: ExplanationPayload }
  | { id: string; role: "assistant"; kind: "text"; text: string; tone?: "error" | "info" };
