"use client";

import { useEffect, useState } from "react";
import {
  apiMode,
  askConcierge,
  demoReset,
  demoStep,
  getChangeCoverage,
  getChangeDetail,
  getChanges,
  getChangeImpact,
  getGraph,
  getTenants,
} from "@/lib/api";
import { GraphCanvas } from "@/components/graph";
import { BeforeAfterPanel } from "@/components/before-after";
import {
  AskResponse,
  ChangeDetail,
  ChangeSummary,
  CoverageResponse,
  DemoStepResponse,
  GraphResponse,
  ImpactResponse,
  Tenant,
} from "@/lib/types";

export default function Home() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeTenant, setActiveTenant] = useState<string>("handbook-demo");
  const [changes, setChanges] = useState<ChangeSummary[]>([]);
  const [activeChange, setActiveChange] = useState<string>("chg:c1");
  const [changeDetail, setChangeDetail] = useState<ChangeDetail | null>(null);
  const [graphData, setGraphData] = useState<GraphResponse | null>(null);
  const [impactData, setImpactData] = useState<ImpactResponse | null>(null);
  const [coverageData, setCoverageData] = useState<CoverageResponse | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Ask panel state
  const [askQuestion, setAskQuestion] = useState("Can I expense my personal VPN subscription?");
  const [askPerson, setAskPerson] = useState("person:priya");
  const [askResult, setAskResult] = useState<AskResponse | null>(null);
  const [isAsking, setIsAsking] = useState(false);

  // Demo stepper state
  const [demoStepInfo, setDemoStepInfo] = useState<DemoStepResponse | null>(null);

  useEffect(() => {
    getTenants().then(setTenants).catch(console.error);
  }, []);

  useEffect(() => {
    if (!activeTenant) return;
    getChanges(activeTenant).then(setChanges).catch(console.error);
    getGraph(activeTenant, activeChange).then(setGraphData).catch(console.error);
    getChangeDetail(activeTenant, activeChange).then(setChangeDetail).catch(console.error);
    getChangeImpact(activeTenant, activeChange).then(setImpactData).catch(console.error);
    getChangeCoverage(activeTenant, activeChange).then(setCoverageData).catch(console.error);
  }, [activeTenant, activeChange]);

  const handleDemoStep = async () => {
    try {
      const step = await demoStep(activeTenant, "c1");
      setDemoStepInfo(step);
      // Refresh state
      const [g, cov] = await Promise.all([
        getGraph(activeTenant, activeChange),
        getChangeCoverage(activeTenant, activeChange),
      ]);
      setGraphData(g);
      setCoverageData(cov);
    } catch (err) {
      console.error("Demo step failed", err);
    }
  };

  const handleDemoReset = async () => {
    try {
      await demoReset(activeTenant);
      setDemoStepInfo(null);
      const [g, cov] = await Promise.all([
        getGraph(activeTenant, activeChange),
        getChangeCoverage(activeTenant, activeChange),
      ]);
      setGraphData(g);
      setCoverageData(cov);
    } catch (err) {
      console.error("Demo reset failed", err);
    }
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!askQuestion.trim()) return;
    setIsAsking(true);
    try {
      const res = await askConcierge(activeTenant, askPerson, askQuestion);
      setAskResult(res);
    } catch (err) {
      console.error("Ask failed", err);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-slate-950 font-sans text-slate-100 antialiased">
      {/* Top Navbar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/80 px-6 backdrop-blur">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 font-mono text-xs font-bold text-white shadow">
              R
            </span>
            <span className="text-lg font-bold tracking-tight text-white">Ripple</span>
          </div>
          <span className="text-xs text-slate-500">|</span>
          <select
            value={activeTenant}
            onChange={(e) => setActiveTenant(e.target.value)}
            className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200 outline-none focus:border-indigo-500"
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          {changes.length > 0 && (
            <>
              <span className="text-xs text-slate-500">|</span>
              <select
                value={activeChange}
                onChange={(e) => setActiveChange(e.target.value)}
                className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200 outline-none focus:border-indigo-500"
              >
                {changes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id}: {c.title.length > 25 ? c.title.slice(0, 23) + "..." : c.title}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        {/* Demo Controls & Mode Badge */}
        <div className="flex items-center gap-3">
          {demoStepInfo && (
            <div className="flex items-center gap-2 rounded bg-indigo-950/70 border border-indigo-800/60 px-2.5 py-1 text-xs text-indigo-300">
              <span className="font-semibold">Step {demoStepInfo.step}/{demoStepInfo.total_steps}:</span>
              <span>{demoStepInfo.name}</span>
            </div>
          )}
          <button
            onClick={handleDemoStep}
            className="rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-indigo-500 active:scale-95"
          >
            Demo Next ▶
          </button>
          <button
            onClick={handleDemoReset}
            className="rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 transition hover:bg-slate-700 active:scale-95"
          >
            Reset
          </button>
          <span
            className={`rounded px-2 py-0.5 font-mono text-[11px] font-semibold uppercase ${
              apiMode === "live"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
            }`}
          >
            mode: {apiMode}
          </span>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left / Center: Graph Canvas Area */}
        <section className="relative flex flex-1 flex-col border-r border-slate-800 bg-slate-950">
          <div className="flex h-10 items-center justify-between border-b border-slate-800/80 bg-slate-900/40 px-4 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-300">Graph Canvas</span>
              <span>•</span>
              <span>{graphData?.nodes.length ?? 0} nodes</span>
              <span>•</span>
              <span>{graphData?.links.length ?? 0} relationships</span>
            </div>
            {selectedNodeId && (
              <span className="rounded bg-indigo-500/20 px-2 py-0.5 font-mono text-[10px] text-indigo-300">
                Selected: {selectedNodeId}
              </span>
            )}
          </div>

          {/* Graph Visualization Container */}
          <div className="relative flex-1 overflow-hidden">
            {graphData ? (
              <GraphCanvas
                nodes={graphData.nodes}
                links={graphData.links}
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-slate-500 font-mono">
                Loading graph data...
              </div>
            )}
          </div>

          {/* Bottom Ask Panel (Concierge) */}
          <div className="border-t border-slate-800 bg-slate-900/60 p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                <span>Concierge (Episodic Memory Q&A)</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Asking as:</span>
                <select
                  value={askPerson}
                  onChange={(e) => setAskPerson(e.target.value)}
                  className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-xs text-slate-200"
                >
                  <option value="person:priya">Priya (Engineering Lead)</option>
                  <option value="person:alex">Alex (Security Analyst)</option>
                </select>
              </div>
            </div>

            <form onSubmit={handleAsk} className="flex gap-2">
              <input
                type="text"
                value={askQuestion}
                onChange={(e) => setAskQuestion(e.target.value)}
                placeholder="Ask a policy question..."
                className="flex-1 rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={isAsking}
                className="rounded bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
              >
                {isAsking ? "Querying..." : "Ask"}
              </button>
            </form>

            {askResult && (
              <div className="mt-3 rounded border border-slate-800 bg-slate-950/80 p-3 text-xs">
                <p className="text-slate-200 leading-relaxed">{askResult.answer}</p>
                {askResult.earlier_told && (
                  <div className="mt-2 rounded bg-amber-950/30 border border-amber-800/40 p-2 text-amber-200">
                    <span className="font-semibold">Memory Correction: </span>
                    {askResult.earlier_told.text}
                  </div>
                )}
                <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400">
                  <span>Cited version: <code className="text-indigo-400">{askResult.versions.join(", ")}</code></span>
                  {askResult.source_url && (
                    <a
                      href={askResult.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-400 underline hover:text-indigo-300"
                    >
                      View Source Diff ↗
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right Sidebar: Before/After, Coverage, Time-To-Harm Queue */}
        <aside className="flex w-96 flex-col overflow-y-auto border-l border-slate-800/60 bg-slate-900/30">
          {/* Coverage Meter */}
          <div className="border-b border-slate-800 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Remediation Coverage</span>
              <span className="font-mono font-bold text-indigo-400">
                {coverageData?.pct ?? 0}% ({coverageData?.resolved ?? 0}/{coverageData?.impacted ?? 0})
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${coverageData?.pct ?? 0}%` }}
              />
            </div>
          </div>

          {/* Before / After Panel */}
          <div className="border-b border-slate-800 p-4">
            <BeforeAfterPanel detail={changeDetail} />
          </div>

          {/* Time-To-Harm Prioritized Queue */}
          <div className="flex-1 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-300">Time-To-Harm Queue</h3>
              <span className="text-[11px] text-slate-500">{impactData?.items.length ?? 0} impacted</span>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-400">Ranked by risk = severity × urgency × reach</p>

            <div className="mt-3 space-y-2">
              {impactData?.items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedNodeId(item.id)}
                  className={`cursor-pointer rounded border p-2.5 text-xs transition ${
                    selectedNodeId === item.id
                      ? "border-indigo-500 bg-indigo-950/40"
                      : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{item.label}</span>
                    <span
                      className={`rounded px-1.5 py-0.2 font-mono text-[10px] ${
                        item.status === "blocked"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      }`}
                    >
                      {item.status ?? "open"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Kind: {item.kind}</span>
                    <span className="font-mono text-indigo-300">Risk: {item.risk}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
