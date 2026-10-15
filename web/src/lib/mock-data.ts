import {
  AskResponse,
  ChangeDetail,
  ChangeSummary,
  CoverageResponse,
  DemoStepResponse,
  ExplainResponse,
  GraphResponse,
  ImpactResponse,
  Tenant,
} from "./types";

import tenantsFixture from "@/fixtures/tenants.json";
import changesFixture from "@/fixtures/changes.json";
import changeDetailFixture from "@/fixtures/change-chg-c1.json";
import graphFixture from "@/fixtures/graph.json";
import impactFixture from "@/fixtures/impact-chg-c1.json";
import coverageFixture from "@/fixtures/coverage-chg-c1.json";
import explainFixture from "@/fixtures/explain-chg-c1-priya.json";
import askAfterFixture from "@/fixtures/ask-after.json";
import demoStepsFixture from "@/fixtures/demo-steps.json";

export const MOCK_TENANTS: Tenant[] = tenantsFixture as Tenant[];
export const MOCK_CHANGES: ChangeSummary[] = changesFixture as ChangeSummary[];
export const MOCK_CHANGE_DETAIL: ChangeDetail = changeDetailFixture as ChangeDetail;
export const MOCK_GRAPH: GraphResponse = graphFixture as unknown as GraphResponse;
export const MOCK_IMPACT: ImpactResponse = impactFixture as unknown as ImpactResponse;
export const MOCK_COVERAGE: CoverageResponse = coverageFixture as unknown as CoverageResponse;
export const MOCK_EXPLAIN: ExplainResponse = explainFixture as ExplainResponse;
export const MOCK_ASK: AskResponse = askAfterFixture as unknown as AskResponse;
export const MOCK_DEMO_STEPS: DemoStepResponse[] = demoStepsFixture as unknown as DemoStepResponse[];
