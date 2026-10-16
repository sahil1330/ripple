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
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"chat" | "inbox">("chat");
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

  const tabs = (
    <nav className="flex items-center gap-1 rounded-[10px] bg-obsidian p-1 shadow-[var(--shadow-soft)]">
      {(["assistant", "graph"] as Tab[]).map((t) => (
        <button
          key={t}
          onClick={() => {
            setTab(t);
            setMenuOpen(false);
          }}
          className={`min-h-11 flex-1 rounded-[7px] px-3 text-[13px] font-medium transition lg:min-h-0 lg:flex-none lg:py-1 ${tab === t ? "bg-graphite text-white shadow-[var(--shadow-soft)]" : "text-ash hover:text-white"}`}
        >
          {t === "assistant" ? "Assistant" : "Company graph"}
        </button>
      ))}
    </nav>
  );
  const demoControls = (
    <div className="flex items-center gap-2">
      <span className="eyebrow">Demo</span>
      <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-ash lg:max-w-[220px] lg:flex-none" title={demo?.name}>
        {demo ? `${demo.step}/${demo.total} · ${demo.name}` : "ready"}
      </span>
      <button onClick={() => runDemo(false)} disabled={demoBusy} className="btn-ghost min-h-11 px-3 disabled:opacity-50 lg:min-h-0 lg:px-2.5 lg:py-1">
        Next step
      </button>
      <button onClick={() => runDemo(true)} disabled={demoBusy} aria-label="Reset demo" title="Reset demo" className="btn-ghost min-h-11 min-w-11 px-2.5 disabled:opacity-50 lg:min-h-0 lg:min-w-0 lg:py-1">
        ↺
      </button>
      <span className={`rounded-[6px] bg-graphite px-1.5 py-0.5 font-mono text-[10px] uppercase ${mode === "live" ? "text-mint" : "text-ash"}`}>{mode}</span>
    </div>
  );
  const totalUnread = departments.reduce((s, d) => s + unread(d.id), 0);

  const inboxList = (
    <>
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
          onExplain={() => {
            setMobileView("chat");
            if (activeDept) explain(n, activeDept.name, activeDept.id);
          }}
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
              onExplain={() => {
                setMobileView("chat");
                explain(n, "the whole company", COMPANY_WIDE);
              }}
              disabled={busy}
              compact
            />
          ))}
        </>
      )}
    </>
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* Top bar */}
      <header className="relative flex h-14 shrink-0 items-center gap-3 border-b border-graphite px-3 pt-[env(safe-area-inset-top)] lg:gap-4 lg:px-4">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rotate-45 rounded-[3px] bg-coral" />
          <span className="text-[13px] font-medium">Ripple</span>
        </div>
        <span className="h-5 w-px bg-graphite" />
        <label className="relative flex min-w-0 items-center">
          <span className="sr-only">Company</span>
          <select
            value={tenant}
            onChange={(e) => setTenant(e.target.value)}
            className="min-h-11 max-w-[160px] appearance-none truncate rounded-[8px] bg-obsidian pl-3 pr-8 text-[13px] font-medium text-white shadow-[var(--shadow-soft)] focus:outline-none lg:min-h-0 lg:py-1.5"
          >
            {(tenants.length ? tenants : [{ id: tenant, name: tenant }]).map((t) => (
              <option key={t.id} value={t.id}>
                {companyName(t.name, t.id)}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2.5 text-[10px] text-smoke">▾</span>
        </label>
        <span className="hidden truncate font-mono text-[11px] text-smoke xl:inline">{current?.name}</span>

        <div className="mx-auto hidden lg:block">{tabs}</div>
        <div className="hidden lg:block">{demoControls}</div>

        <button
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Menu"
          aria-expanded={menuOpen}
          className="btn-ghost ml-auto flex h-11 w-11 items-center justify-center lg:hidden"
        >
          {menuOpen ? "✕" : "☰"}
        </button>
        {menuOpen && (
          <div className="rise absolute inset-x-2 top-[calc(100%+8px)] z-40 space-y-3 rounded-[16px] bg-ink p-3 shadow-[var(--shadow-key),0_20px_40px_rgba(0,0,0,0.6)] lg:hidden">
            {tabs}
            <div className="border-t border-graphite pt-3">{demoControls}</div>
            {current?.name && <div className="font-mono text-[11px] text-smoke">{current.name}</div>}
          </div>
        )}
      </header>

      {error && <div className="border-b border-graphite bg-ember/40 px-4 py-1.5 font-mono text-[11px] text-coral">{error}</div>}

      {tab === "assistant" ? (
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* Mobile/tablet: department chips + chat/inbox switch */}
          <div className="shrink-0 space-y-2 border-b border-graphite px-3 py-2 lg:hidden">
            <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 [scrollbar-width:none]">
              {departments.map((d) => {
                const u = unread(d.id);
                return (
                  <button
                    key={d.id}
                    onClick={() => setDept(d.id)}
                    className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[13px] font-medium transition ${dept === d.id ? "bg-graphite text-white shadow-[var(--shadow-soft)]" : "bg-obsidian text-ash"}`}
                  >
                    {d.name}
                    {u > 0 && <span className="rounded-full bg-coral px-1.5 font-mono text-[10px] leading-[18px] text-canvas">{u}</span>}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex flex-1 rounded-[10px] bg-obsidian p-1">
                {(["chat", "inbox"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setMobileView(v)}
                    className={`min-h-11 flex-1 rounded-[7px] text-[13px] font-medium capitalize ${mobileView === v ? "bg-graphite text-white" : "text-ash"}`}
                  >
                    {v === "chat" ? "Chat" : `Inbox${notifications.length ? ` · ${notifications.length}` : ""}`}
                  </button>
                ))}
              </div>
              {activeDept && (
                <select
                  aria-label="Asking as"
                  value={asker ?? ""}
                  onChange={(e) => setAsker(e.target.value)}
                  className="min-h-11 w-[132px] appearance-none truncate rounded-[10px] bg-obsidian px-3 text-[13px] text-white shadow-[var(--shadow-soft)] focus:outline-none"
                >
                  {activeDept.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Desktop: departments sidebar */}
          <aside className="hidden w-[240px] shrink-0 flex-col border-r border-graphite lg:flex">
            <div className="eyebrow px-4 pb-2 pt-5">Departments{totalUnread ? ` · ${totalUnread} new` : ""}</div>
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
          <main className={`min-h-0 min-w-0 flex-1 ${mobileView === "chat" ? "" : "hidden lg:block"}`}>
            <Chat company={company} asker={askerLabel} messages={messages} busy={busy} starters={starters} onSend={send} />
          </main>

          {/* Inbox: full-height view on mobile, side panel on desktop */}
          <aside
            className={`min-h-0 flex-1 flex-col lg:flex lg:w-[340px] lg:flex-none lg:border-l lg:border-graphite ${mobileView === "inbox" ? "flex" : "hidden"}`}
          >
            <div className="hidden items-baseline justify-between px-5 pb-3 pt-5 lg:flex">
              <div>
                <div className="eyebrow">Inbox</div>
                <div className="mt-1 text-[15px] font-medium">{activeDept?.name ?? "—"}</div>
              </div>
              <span className="font-mono text-[11px] text-smoke">{notifications.length} changes</span>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 lg:pt-0">{inboxList}</div>
          </aside>
        </div>
      ) : (
        <div className="relative min-h-0 flex-1">{graph && <GraphCanvas nodes={graph.nodes} links={graph.links} />}</div>
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
      <button onClick={onExplain} disabled={disabled} className="btn-primary mt-3 min-h-11 w-full lg:min-h-0 lg:py-2">
        Get explanation
      </button>
    </div>
  );
}
