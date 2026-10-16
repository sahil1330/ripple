"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  askConcierge,
  demoReset,
  demoStep,
  explainPath,
  getApiMode,
  getChangeDetail,
  getChangeImpact,
  getChanges,
  getGraph,
  getTenants,
} from "@/lib/api";
import { subscribeToStream } from "@/lib/sse";
import { GraphResponse, Tenant } from "@/lib/types";
import {
  COMPANY_WIDE,
  DeptNotification,
  buildDepartments,
  companyName,
  groupImpact,
  questionForFact,
  withOrgFallback,
} from "@/lib/departments";
import { GraphCanvas } from "@/components/graph";
import { Chat } from "@/components/assistant/Chat";
import { ChatMessage } from "@/components/assistant/types";

type Tab = "assistant" | "graph";
const PREFERRED_ASKERS = ["person:priya", "person:ravi"];
let seq = 0;
const nid = () => `m${++seq}`;

function ago(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function Home() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenant, setTenant] = useState("handbook-demo");
  const [tab, setTab] = useState<Tab>("assistant");
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [inbox, setInbox] = useState<Map<string, DeptNotification[]>>(new Map());
  const [dept, setDept] = useState<string | null>(null);
  const [asker, setAsker] = useState<string | null>(null);
  const [read, setRead] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState<{ step: number; total: number; name: string } | null>(null);
  const [demoBusy, setDemoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"mock" | "live">("mock");
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMode(getApiMode());
  }, []);
  useEffect(() => {
    getTenants().then(setTenants).catch(() => setError("Can't reach the Ripple API."));
  }, []);

  const org = useMemo(() => (graph ? buildDepartments(withOrgFallback(graph)) : null), [graph]);
  const departments = useMemo(() => org?.departments ?? [], [org]);
  const current = tenants.find((t) => t.id === tenant);
  const company = companyName(current?.name, tenant);

  const loadInbox = useCallback(
    async (g: GraphResponse | null) => {
      if (!g) return;
      const { teamOf } = buildDepartments(withOrgFallback(g));
      const changes = await getChanges(tenant);
      const withItems = await Promise.all(
        changes.map(async (c) => {
          const imp = await getChangeImpact(tenant, c.id).catch(() => null);
          return { ...c, items: imp?.items ?? [] };
        })
      );
      setInbox(groupImpact(teamOf, withItems.filter((c) => c.items.length > 0)));
    },
    [tenant]
  );

  const reload = useCallback(async () => {
    try {
      const g = await getGraph(tenant);
      setGraph(g);
      await loadInbox(g);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [tenant, loadInbox]);

  // tenant switch: everything is scoped to the selected company's graph
  useEffect(() => {
    setMessages([]);
    setRead(new Set());
    setDept(null);
    setAsker(null);
    setDemo(null);
    reload();
  }, [tenant, reload]);

  useEffect(() => {
    const unsub = subscribeToStream(tenant, () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(reload, 700);
    });
    return () => unsub();
  }, [tenant, reload]);

  // default department: Engineering if present, else the first one with notifications
  useEffect(() => {
    if (dept || !departments.length) return;
    const eng = departments.find((d) => d.id === "team:eng");
    setDept((eng ?? departments.find((d) => inbox.has(d.id)) ?? departments[0]).id);
  }, [departments, inbox, dept]);

  const activeDept = departments.find((d) => d.id === dept);
  useEffect(() => {
    if (!activeDept) return;
    const pref = activeDept.members.find((m) => PREFERRED_ASKERS.includes(m.id));
    setAsker((pref ?? activeDept.members[0])?.id ?? null);
  }, [activeDept]);
  const askerLabel = activeDept?.members.find((m) => m.id === asker)?.label ?? "guest";

  const notifications = (dept && inbox.get(dept)) || [];
  const companyWide = inbox.get(COMPANY_WIDE) ?? [];
  const unread = (d: string) => (inbox.get(d) ?? []).filter((n) => !read.has(`${d}|${n.changeId}`)).length;

  const push = (m: ChatMessage) => setMessages((prev) => [...prev, m]);

  const send = async (q: string) => {
    push({ id: nid(), role: "user", text: q });
    if (!asker) {
      push({ id: nid(), role: "assistant", kind: "text", text: "Pick a department first so I know who is asking.", tone: "error" });
      return;
    }
    setBusy(true);
    try {
      const answer = await askConcierge(tenant, asker, q);
      push({ id: nid(), role: "assistant", kind: "answer", answer });
    } catch (e) {
      const msg = e instanceof Error && e.message.includes("422")
        ? `I couldn't find anything about that in ${company}'s graph. Try asking about a policy, a team, a person, a doc or an agent.`
        : "Something went wrong reaching the assistant. Try again in a moment.";
      push({ id: nid(), role: "assistant", kind: "text", text: msg, tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const explain = async (n: DeptNotification, deptName: string, deptId: string) => {
    setRead((prev) => new Set(prev).add(`${deptId}|${n.changeId}`));
    push({ id: nid(), role: "user", text: `Explain “${n.title}” for ${deptName}`, context: "From your inbox" });
    setBusy(true);
    const target = n.items.find((i) => i.id === asker) ?? n.items[0] ?? null;
    const [detail, path, answer] = await Promise.allSettled([
      getChangeDetail(tenant, n.changeId),
      target ? explainPath(tenant, n.changeId, target.id) : Promise.reject(),
      asker ? askConcierge(tenant, asker, questionForFact(n.factKey, n.title)) : Promise.reject(),
    ]);
    push({
      id: nid(),
      role: "assistant",
      kind: "explanation",
      data: {
        department: deptName,
        changeTitle: n.title,
        change: detail.status === "fulfilled" ? detail.value : null,
        path: path.status === "fulfilled" ? path.value : null,
        pathTarget: target,
        items: n.items,
        answer: answer.status === "fulfilled" ? answer.value : null,
      },
    });
    setBusy(false);
  };

  const runDemo = async (reset = false) => {
    setDemoBusy(true);
    try {
      if (reset) {
        await demoReset(tenant);
        setDemo(null);
        setMessages([]);
        setRead(new Set());
      } else {
        const s = await demoStep(tenant, "c1");
        setDemo({ step: s.step, total: s.total_steps, name: s.name });
      }
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDemoBusy(false);
    }
  };

  const firstDept = departments[0]?.name ?? "Engineering";
  const starters = [
    "Can I expense my personal VPN?",
    `Who is in ${firstDept}?`,
    "What agents do we have?",
    "What is the travel meal limit?",
  ];

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-graphite px-4">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rotate-45 rounded-[3px] bg-coral" />
          <span className="text-[13px] font-medium">Ripple</span>
        </div>
        <span className="h-5 w-px bg-graphite" />
        <label className="relative flex items-center">
          <span className="sr-only">Company</span>
          <select
            value={tenant}
            onChange={(e) => setTenant(e.target.value)}
            className="appearance-none rounded-[8px] bg-obsidian py-1.5 pl-3 pr-8 text-[13px] font-medium text-white shadow-[var(--shadow-soft)] focus:outline-none"
          >
            {(tenants.length ? tenants : [{ id: tenant, name: tenant }]).map((t) => (
              <option key={t.id} value={t.id}>
                {companyName(t.name, t.id)}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2.5 text-[10px] text-smoke">▾</span>
        </label>
        <span className="hidden font-mono text-[11px] text-smoke lg:inline">{current?.name}</span>

        <nav className="mx-auto flex items-center gap-1 rounded-[10px] bg-obsidian p-1 shadow-[var(--shadow-soft)]">
          {(["assistant", "graph"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-[7px] px-3 py-1 text-[13px] font-medium capitalize transition ${tab === t ? "bg-graphite text-white shadow-[var(--shadow-soft)]" : "text-ash hover:text-white"}`}
            >
              {t === "assistant" ? "Assistant" : "Company graph"}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <span className="eyebrow hidden md:inline">Demo</span>
          <span className="max-w-[220px] truncate font-mono text-[11px] text-ash" title={demo?.name}>
            {demo ? `${demo.step}/${demo.total} · ${demo.name}` : "ready"}
          </span>
          <button onClick={() => runDemo(false)} disabled={demoBusy} className="btn-ghost px-2.5 py-1 disabled:opacity-50">
            Next step
          </button>
          <button onClick={() => runDemo(true)} disabled={demoBusy} className="btn-ghost px-2.5 py-1 disabled:opacity-50" title="Reset demo">
            ↺
          </button>
          <span className={`rounded-[6px] bg-graphite px-1.5 py-0.5 font-mono text-[10px] uppercase ${mode === "live" ? "text-mint" : "text-ash"}`}>
            {mode}
          </span>
        </div>
      </header>

      {error && (
        <div className="border-b border-graphite bg-ember/40 px-4 py-1.5 font-mono text-[11px] text-coral">{error}</div>
      )}

      {tab === "assistant" ? (
        <div className="flex min-h-0 flex-1">
          {/* Departments */}
          <aside className="flex w-[240px] shrink-0 flex-col border-r border-graphite">
            <div className="eyebrow px-4 pb-2 pt-5">Departments</div>
            <div className="flex-1 space-y-0.5 overflow-y-auto px-2">
              {departments.map((d) => {
                const u = unread(d.id);
                return (
                  <button
                    key={d.id}
                    onClick={() => setDept(d.id)}
                    className={`flex w-full items-center justify-between rounded-[8px] px-3 py-2 text-left text-[13px] font-medium transition ${dept === d.id ? "bg-graphite text-white shadow-[var(--shadow-soft)]" : "text-ash hover:bg-obsidian hover:text-white"}`}
                  >
                    <span className="truncate">{d.name}</span>
                    {u > 0 ? (
                      <span className="rounded-full bg-coral px-1.5 font-mono text-[10px] font-medium leading-[18px] text-canvas">{u}</span>
                    ) : (
                      <span className="font-mono text-[10px] text-smoke">{d.members.length}</span>
                    )}
                  </button>
                );
              })}
              {departments.length === 0 && <div className="px-3 py-2 text-[12px] text-smoke">Loading…</div>}
            </div>
            {activeDept && (
              <div className="border-t border-graphite p-3">
                <div className="eyebrow mb-1.5">Asking as</div>
                <select
                  value={asker ?? ""}
                  onChange={(e) => setAsker(e.target.value)}
                  className="w-full appearance-none rounded-[8px] bg-obsidian px-3 py-2 text-[13px] text-white shadow-[var(--shadow-soft)] focus:outline-none"
                >
                  {activeDept.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </aside>

          {/* Chat */}
          <main className="min-w-0 flex-1">
            <Chat company={company} asker={askerLabel} messages={messages} busy={busy} starters={starters} onSend={send} />
          </main>

          {/* Inbox */}
          <aside className="flex w-[340px] shrink-0 flex-col border-l border-graphite">
            <div className="flex items-baseline justify-between px-5 pb-3 pt-5">
              <div>
                <div className="eyebrow">Inbox</div>
                <div className="mt-1 text-[15px] font-medium">{activeDept?.name ?? "—"}</div>
              </div>
              <span className="font-mono text-[11px] text-smoke">{notifications.length} changes</span>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-4">
              {notifications.length === 0 && (
                <div className="rounded-[16px] border border-dashed border-slate px-4 py-6 text-center">
                  <div className="text-[13px] text-ash">No fact changes affect {activeDept?.name ?? "this team"} right now.</div>
                  <div className="mt-1 font-mono text-[11px] text-smoke">Run the demo to replay the VPN policy change.</div>
                </div>
              )}
              {notifications.map((n) => (
                <NotificationCard
                  key={n.changeId}
                  n={n}
                  unread={!read.has(`${dept}|${n.changeId}`)}
                  onExplain={() => activeDept && explain(n, activeDept.name, activeDept.id)}
                  disabled={busy}
                />
              ))}
              {companyWide.length > 0 && (
                <>
                  <div className="eyebrow px-2 pb-1 pt-4">Company-wide</div>
                  {companyWide.map((n) => (
                    <NotificationCard
                      key={`cw-${n.changeId}`}
                      n={n}
                      unread={!read.has(`${COMPANY_WIDE}|${n.changeId}`)}
                      onExplain={() => explain(n, "the whole company", COMPANY_WIDE)}
                      disabled={busy}
                      compact
                    />
                  ))}
                </>
              )}
            </div>
          </aside>
        </div>
      ) : (
        <div className="relative min-h-0 flex-1">
          {graph && <GraphCanvas nodes={graph.nodes} links={graph.links} />}
        </div>
      )}
    </div>
  );
}

function NotificationCard({
  n,
  unread,
  onExplain,
  disabled,
  compact,
}: {
  n: DeptNotification;
  unread: boolean;
  onExplain: () => void;
  disabled: boolean;
  compact?: boolean;
}) {
  const blocked = n.items.filter((i) => i.status === "blocked").length;
  const people = n.items.filter((i) => i.kind === "Person").length;
  const resolved = n.items.filter((i) => i.status === "resolved").length;
  return (
    <div className={`card-key rise p-4 ${compact ? "opacity-80" : ""}`}>
      <div className="flex items-center gap-2">
        {unread && <span className="h-1.5 w-1.5 rounded-full bg-coral" />}
        <span className="eyebrow">Fact changed · {ago(n.detectedAt)}</span>
      </div>
      <div className="mt-2 text-[14px] font-medium leading-snug text-white">{n.title}</div>
      <div className="mt-2 flex flex-wrap gap-1.5 font-mono text-[11px]">
        <span className="rounded-[6px] bg-graphite px-1.5 py-0.5 text-ash">{n.items.length} affected</span>
        {people > 0 && <span className="rounded-[6px] bg-graphite px-1.5 py-0.5 text-ash">{people} people</span>}
        {blocked > 0 && <span className="rounded-[6px] bg-graphite px-1.5 py-0.5 text-coral">{blocked} blocked</span>}
        {resolved > 0 && <span className="rounded-[6px] bg-graphite px-1.5 py-0.5 text-mint">{resolved} fixed</span>}
      </div>
      <button onClick={onExplain} disabled={disabled} className="btn-primary mt-3 w-full py-2">
        Get explanation
      </button>
    </div>
  );
}
