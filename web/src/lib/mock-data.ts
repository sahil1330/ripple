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

export const MOCK_TENANTS: Tenant[] = [
  { id: "handbook-demo", name: "GitLab handbook (real changes + synthetic people)" },
  { id: "acme-synthetic", name: "Acme (fully synthetic)" },
];

export const MOCK_CHANGES: ChangeSummary[] = [
  {
    id: "chg:c1",
    title: "Personal VPN subscriptions no longer reimbursable",
    fact_key: "expense.vpn.personal_subscription",
    commit_sha: "ddd395971ee181bee9e00d23d34e1001489d76ef",
    mr_url: "https://gitlab.com/gitlab-com/content-sites/handbook/-/merge_requests/20421",
    detected_at: 1784046483000,
    status: "resolved",
  },
];

export const MOCK_CHANGE_DETAIL: ChangeDetail = {
  id: "chg:c1",
  title: "Personal VPN subscriptions no longer reimbursable",
  fact_key: "expense.vpn.personal_subscription",
  commit_sha: "ddd395971ee181bee9e00d23d34e1001489d76ef",
  mr_url: "https://gitlab.com/gitlab-com/content-sites/handbook/-/merge_requests/20421",
  detected_at: 1784046483000,
  status: "resolved",
  before: {
    version_id: "fv:vpn:v1",
    value: "reimbursable up to $150 per year",
    excerpt: "Policy is set at $150 per year. Yearly subscription can be submitted in one claim.",
    source_url:
      "https://gitlab.com/gitlab-com/content-sites/handbook/-/blob/513d7f5347609cc9ca089f607794e362237e4fc7/content/handbook/finance/expenses.md",
  },
  after: {
    version_id: "fv:vpn:v2",
    value: "not reimbursable; use NordLayer (company VPN)",
    excerpt:
      "Starting July 15, 2026, GitLab no longer reimburses personal VPN subscriptions (such as ExpressVPN, Proton, Mullvad, and similar services) through expense claims. Team members who need VPN access should use NordLayer, GitLab's company-provisioned VPN solution.",
    source_url:
      "https://gitlab.com/gitlab-com/content-sites/handbook/-/blob/ddd395971ee181bee9e00d23d34e1001489d76ef/content/handbook/finance/expenses.md",
  },
};

export const MOCK_GRAPH: GraphResponse = {
  nodes: [
    { id: "chg:c1", kind: "Change", label: "Change C1: Personal VPN", synthetic: false, status: "resolved" },
    { id: "fv:vpn:v1", kind: "FactVersion", label: "VPN v1 ($150 reimbursable)", synthetic: false, status: "stale" },
    { id: "fv:vpn:v2", kind: "FactVersion", label: "VPN v2 (NordLayer only)", synthetic: false, status: "current" },
    { id: "fact:expense.vpn.personal_subscription", kind: "Fact", label: "Policy: Personal VPN", synthetic: false },
    { id: "person:priya", kind: "Person", label: "Priya (Engineering Lead)", synthetic: true, risk: 1.4, status: "resolved" },
    { id: "person:alex", kind: "Person", label: "Alex (Security Analyst)", synthetic: true, risk: 0.5, status: "resolved" },
    { id: "agent:ap-approver", kind: "Agent", label: "AP Approver Agent", synthetic: true, risk: 1.2, status: "resolved" },
    { id: "doc:handbook:expenses", kind: "Doc", label: "Expenses Handbook", synthetic: false, risk: 0.88, status: "resolved" },
    { id: "doc:handbook:tools", kind: "Doc", label: "Tools Handbook", synthetic: false, risk: 0.64, status: "resolved" },
    { id: "doc:handbook:security", kind: "Doc", label: "Security & VPN Handbook", synthetic: false, risk: 0.56, status: "resolved" },
    { id: "plan:ap:jul-expenses", kind: "Plan", label: "July Expenses Plan", synthetic: true, risk: 1.05, status: "resolved" },
    { id: "act:ap:vpn-approval", kind: "Action", label: "Approve $150 VPN (Priya)", synthetic: true, risk: 2.1, status: "blocked" },
  ],
  links: [
    { source: "chg:c1", target: "fv:vpn:v2", type: "CREATES" },
    { source: "fv:vpn:v2", target: "fv:vpn:v1", type: "SUPERSEDES" },
    { source: "fv:vpn:v2", target: "fact:expense.vpn.personal_subscription", type: "VERSION_OF" },
    { source: "person:priya", target: "fv:vpn:v1", type: "WAS_TOLD" },
    { source: "person:alex", target: "fv:vpn:v1", type: "WAS_TOLD" },
    { source: "agent:ap-approver", target: "fv:vpn:v1", type: "CACHED" },
    { source: "doc:handbook:expenses", target: "fv:vpn:v1", type: "STATES" },
    { source: "doc:handbook:tools", target: "fv:vpn:v1", type: "CITES" },
    { source: "doc:handbook:security", target: "fv:vpn:v1", type: "CITES" },
    { source: "plan:ap:jul-expenses", target: "fv:vpn:v1", type: "DEPENDS_ON" },
    { source: "act:ap:vpn-approval", target: "plan:ap:jul-expenses", type: "PART_OF" },
  ],
};

export const MOCK_IMPACT: ImpactResponse = {
  change_id: "chg:c1",
  total_impacted: 8,
  items: [
    {
      id: "act:ap:vpn-approval",
      kind: "Action",
      label: "Approve $150 VPN expense (Priya)",
      synthetic: true,
      hops: 2,
      severity: 1.0,
      urgency: 1.5,
      reach: 0.4,
      risk: 2.1,
      tth_ms: 2400000,
      due_at: 1784048883000,
      status: "blocked",
      task_id: "task:replan:ap",
    },
    {
      id: "person:priya",
      kind: "Person",
      label: "Priya (Engineering Lead)",
      synthetic: true,
      hops: 1,
      severity: 0.5,
      urgency: 1.2,
      reach: 0.6,
      risk: 1.4,
      tth_ms: 3000000,
      due_at: 1784049483000,
      status: "resolved",
      task_id: "task:reanswer:priya",
    },
    {
      id: "agent:ap-approver",
      kind: "Agent",
      label: "AP Approver Agent",
      synthetic: true,
      hops: 1,
      severity: 0.6,
      urgency: 1.0,
      reach: 0.5,
      risk: 1.2,
      tth_ms: 3600000,
      due_at: 1784050083000,
      status: "resolved",
      task_id: "task:reanswer:ap-approver",
    },
    {
      id: "plan:ap:jul-expenses",
      kind: "Plan",
      label: "July Expenses Plan",
      synthetic: true,
      hops: 1,
      severity: 0.7,
      urgency: 1.0,
      reach: 0.5,
      risk: 1.05,
      tth_ms: 3600000,
      due_at: 1784050083000,
      status: "resolved",
      task_id: "task:replan:ap",
    },
    {
      id: "doc:handbook:expenses",
      kind: "Doc",
      label: "Expenses Handbook",
      synthetic: false,
      hops: 1,
      severity: 0.4,
      urgency: 1.0,
      reach: 1.2,
      risk: 0.88,
      tth_ms: 86400000,
      due_at: 1784132883000,
      status: "resolved",
      task_id: "task:fix:expenses",
    },
    {
      id: "doc:handbook:tools",
      kind: "Doc",
      label: "Tools Handbook",
      synthetic: false,
      hops: 1,
      severity: 0.4,
      urgency: 1.0,
      reach: 0.6,
      risk: 0.64,
      tth_ms: 86400000,
      due_at: 1784132883000,
      status: "resolved",
      task_id: "task:fix:tools",
    },
    {
      id: "doc:handbook:security",
      kind: "Doc",
      label: "Security & VPN Handbook",
      synthetic: false,
      hops: 1,
      severity: 0.4,
      urgency: 1.0,
      reach: 0.4,
      risk: 0.56,
      tth_ms: 86400000,
      due_at: 1784132883000,
      status: "resolved",
      task_id: "task:fix:security",
    },
    {
      id: "person:alex",
      kind: "Person",
      label: "Alex (Security Analyst)",
      synthetic: true,
      hops: 1,
      severity: 0.5,
      urgency: 0.8,
      reach: 0.25,
      risk: 0.5,
      tth_ms: 14400000,
      due_at: 1784060883000,
      status: "resolved",
      task_id: "task:reanswer:alex",
    },
  ],
};

export const MOCK_COVERAGE: CoverageResponse = {
  change_id: "chg:c1",
  impacted: 8,
  resolved: 8,
  pct: 100.0,
  by_kind: {
    Action: { impacted: 1, resolved: 1 },
    Person: { impacted: 2, resolved: 2 },
    Agent: { impacted: 1, resolved: 1 },
    Plan: { impacted: 1, resolved: 1 },
    Doc: { impacted: 3, resolved: 3 },
  },
};

export const MOCK_EXPLAIN: ExplainResponse = {
  hops: ["chg:c1", "fv:vpn:v2", "fv:vpn:v1", "person:priya"],
  via: ["CREATES", "SUPERSEDES", "WAS_TOLD"],
  cypher:
    "MATCH (a:Entity {id: $from_id}), (b:Entity {id: $to_id}), p = shortestPath((a)-[:FEEDS|SUPERSEDES|WAS_TOLD*]-(b)) RETURN [n in nodes(p) | n.id] AS hops, [r in relationships(p) | type(r)] AS via",
};

export const MOCK_ASK: AskResponse = {
  answer:
    "Earlier I told you: reimbursable up to $150 per year. That changed on Jul 15, 2026 (MR !20421). Personal VPN subscriptions: not reimbursable; use NordLayer (company VPN). Policy text: “Starting July 15, 2026, GitLab no longer reimburses personal VPN subscriptions through expense claims. Team members who need VPN access should use NordLayer, GitLab's company-provisioned VPN solution.” (source: https://gitlab.com/gitlab-com/content-sites/handbook/-/blob/ddd395971ee181bee9e00d23d34e1001489d76ef/content/handbook/finance/expenses.md)",
  versions: ["fv:vpn:v2"],
  source_url:
    "https://gitlab.com/gitlab-com/content-sites/handbook/-/blob/ddd395971ee181bee9e00d23d34e1001489d76ef/content/handbook/finance/expenses.md",
  earlier_told: {
    version_id: "fv:vpn:v1",
    value: "reimbursable up to $150 per year",
    at: 1784041513000,
    text: "Earlier I told you: reimbursable up to $150 per year. That changed on Jul 15, 2026 (MR !20421).",
  },
  answer_id: "ans:c1demo001",
};

export const MOCK_DEMO_STEPS: DemoStepResponse[] = [
  {
    step: 1,
    total_steps: 9,
    name: "Kickoff: baseline state",
    description: "Handbook v1 active: personal VPN is reimbursable up to $150/year. Priya asked earlier and was told v1.",
    events: [],
  },
  {
    step: 2,
    total_steps: 9,
    name: "Sentinel: commit detected",
    description: "Sentinel observes commit ddd39597 in GitLab handbook: personal VPN is no longer reimbursable.",
    events: [
      {
        type: "change.detected",
        at: 1784046483000,
        tenant: "handbook-demo",
        payload: {
          change_id: "chg:c1",
          fact_key: "expense.vpn.personal_subscription",
          old_version: "fv:vpn:v1",
          new_version: "fv:vpn:v2",
          source_url: "https://gitlab.com/gitlab-com/content-sites/handbook/-/merge_requests/20421",
        },
      },
    ],
  },
  {
    step: 3,
    total_steps: 9,
    name: "Tracer: time-to-harm computed",
    description: "Tracer traverses the graph over FEEDS relationships, ranks 8 impacted holders by time-to-harm, and creates remediation tasks.",
    events: [
      {
        type: "impact.computed",
        at: 1784046484000,
        tenant: "handbook-demo",
        payload: {
          change_id: "chg:c1",
          impacted: 8,
          by_kind: { Action: 1, Person: 2, Agent: 1, Plan: 1, Doc: 3 },
        },
      },
    ],
  },
  {
    step: 4,
    total_steps: 9,
    name: "Freshness Guard: block stale action",
    description: "AP Approver agent invokes check_fresh before approving Priya's $150 claim. Stale fact detected; action is blocked.",
    events: [
      {
        type: "action.blocked",
        at: 1784046485000,
        tenant: "handbook-demo",
        payload: {
          action_id: "act:ap:vpn-approval",
          stale_version: "fv:vpn:v1",
          current_version: "fv:vpn:v2",
          source_url: "https://gitlab.com/gitlab-com/content-sites/handbook/-/blob/ddd39597/content/handbook/finance/expenses.md",
        },
      },
    ],
  },
  {
    step: 5,
    total_steps: 9,
    name: "Concierge: re-answer Priya with memory line",
    description: "Concierge resolves Priya's task with episodic memory citation: 'Earlier I told you... That changed on Jul 15, 2026.'",
    events: [
      {
        type: "answer.sent",
        at: 1784046486000,
        tenant: "handbook-demo",
        payload: {
          answer_id: "ans:c1demo001",
          person_id: "person:priya",
          version_ids: ["fv:vpn:v2"],
        },
      },
      {
        type: "coverage.updated",
        at: 1784046486500,
        tenant: "handbook-demo",
        payload: { change_id: "chg:c1", impacted: 8, resolved: 2, pct: 25.0 },
      },
    ],
  },
  {
    step: 6,
    total_steps: 9,
    name: "Fixer: refresh agent memory",
    description: "AP Approver's cache is refreshed to v2, unblocking safe future approvals under the new policy.",
    events: [
      {
        type: "task.done",
        at: 1784046487000,
        tenant: "handbook-demo",
        payload: { task_id: "task:reanswer:ap-approver", agent_id: "agent:fixer", outcome: "refreshed memory to fv:vpn:v2" },
      },
      {
        type: "coverage.updated",
        at: 1784046487500,
        tenant: "handbook-demo",
        payload: { change_id: "chg:c1", impacted: 8, resolved: 4, pct: 50.0 },
      },
    ],
  },
  {
    step: 7,
    total_steps: 9,
    name: "Fixer: draft handbook doc patches",
    description: "Fixer generates diff patches for Expenses, Tools, and Security handbook pages citing v2.",
    events: [
      {
        type: "coverage.updated",
        at: 1784046488000,
        tenant: "handbook-demo",
        payload: { change_id: "chg:c1", impacted: 8, resolved: 7, pct: 87.5 },
      },
    ],
  },
  {
    step: 8,
    total_steps: 9,
    name: "Replan: swap dependency & complete",
    description: "AP approval plan replaces the blocked $150 action with NordLayer provisioning.",
    events: [
      {
        type: "coverage.updated",
        at: 1784046489000,
        tenant: "handbook-demo",
        payload: { change_id: "chg:c1", impacted: 8, resolved: 8, pct: 100.0 },
      },
    ],
  },
  {
    step: 9,
    total_steps: 9,
    name: "100% Coverage Reached",
    description: "All 8 impacted entities resolved. Change chg:c1 marked 'resolved'. Full explainable graph trail preserved.",
    events: [],
  },
];
