"use client";

import { useEffect, useState } from "react";
import {
  ApiMode,
  apiBaseUrl,
  checkApiHealth,
  demoReset,
  demoStep,
  getApiMode,
  getChangeCoverage,
  getChangeDetail,
  getChanges,
  getChangeImpact,
  getGraph,
  getTenants,
  setApiMode,
} from "@/lib/api";
import { GraphCanvas } from "@/components/graph";
import { BeforeAfterPanel } from "@/components/before-after";
import { TthQueue } from "@/components/tth-queue";
import { CoverageMeter } from "@/components/coverage";
import { WhyDrawer } from "@/components/why-drawer";
import { AskPanel } from "@/components/ask";
import { DemoStepper } from "@/components/demo";
import { subscribeToStream } from "@/lib/sse";
import {
  ChangeDetail,
  ChangeSummary,
  CoverageResponse,
  DemoStepResponse,
  GraphResponse,
  ImpactResponse,
  SseEnvelope,
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
  const [isWhyDrawerOpen, setIsWhyDrawerOpen] = useState<boolean>(false);
  const [currentMode, setCurrentMode] = useState<ApiMode>("mock");
  const [liveApiError, setLiveApiError] = useState<string | null>(null);
  const [isDemoModeActive, setIsDemoModeActive] = useState<boolean>(false);

  const handleSelectNode = (id: string | null) => {
    setSelectedNodeId(id);
    setIsWhyDrawerOpen(Boolean(id));
  };

  useEffect(() => {
    setCurrentMode(getApiMode());
    if (typeof window !== "undefined") {
      const isDemo = new URLSearchParams(window.location.search).get("demo") === "1";
      if (isDemo) setIsDemoModeActive(true);
    }
  }, []);

  // Demo stepper state
  const [demoStepInfo, setDemoStepInfo] = useState<DemoStepResponse | null>(null);
  const [liveEvents, setLiveEvents] = useState<SseEnvelope[]>([]);

  useEffect(() => {
    getTenants().then(setTenants).catch(console.error);
  }, []);

  useEffect(() => {
    if (!activeTenant) return;
    const unsubscribe = subscribeToStream(
      activeTenant,
      (ev) => {
        setLiveEvents((prev) => [...prev, ev]);
        if (ev.type === "coverage.updated") {
          const p = ev.payload as { pct?: number; impacted?: number; resolved?: number };
          if (p.pct !== undefined) {
            setCoverageData((prev) =>
              prev
                ? {
                    ...prev,
                    pct: p.pct ?? prev.pct,
                    resolved: p.resolved ?? prev.resolved,
                    impacted: p.impacted ?? prev.impacted,
                  }
                : null
            );
          }
        }
      },
      { replayMock: false }
    );
    return () => unsubscribe();
  }, [activeTenant]);

  useEffect(() => {
    if (!activeTenant) return;
    getChanges(activeTenant).then(setChanges).catch(console.error);
    getGraph(activeTenant, activeChange).then(setGraphData).catch(console.error);
    getChangeDetail(activeTenant, activeChange).then(setChangeDetail).catch(console.error);
    getChangeImpact(activeTenant, activeChange).then(setImpactData).catch(console.error);
    getChangeCoverage(activeTenant, activeChange).then(setCoverageData).catch(console.error);
  }, [activeTenant, activeChange]);

  const applyStepVisuals = (stepNum: number, events?: SseEnvelope[]) => {
    setGraphData((prev) => {
      if (!prev) return prev;
      const updatedNodes = prev.nodes.map((node) => {
        if (stepNum <= 2) {
          return { ...node, status: undefined };
        }
        if (stepNum === 3) {
          if (["Action", "Person", "Agent", "Plan", "Doc"].includes(node.kind)) {
            return { ...node, status: "impacted" };
          }
        }
        if (stepNum === 4) {
          if (node.id === "agent:ap-approver") return { ...node, status: "blocked" };
          if (["Action", "Person", "Plan", "Doc"].includes(node.kind)) return { ...node, status: "impacted" };
        }
        if (stepNum === 5) {
          if (node.id === "person:priya") return { ...node, status: "resolved" };
          if (node.id === "agent:ap-approver") return { ...node, status: "blocked" };
          if (["Action", "Plan", "Doc"].includes(node.kind)) return { ...node, status: "impacted" };
        }
        if (stepNum === 6) {
          if (node.id === "person:priya" || node.id === "agent:ap-approver") {
            return { ...node, status: "resolved" };
          }
          if (["Action", "Plan", "Doc"].includes(node.kind)) return { ...node, status: "impacted" };
        }
        if (stepNum === 7) {
          if (node.kind === "Doc" || node.id === "person:priya" || node.id === "agent:ap-approver") {
            return { ...node, status: "resolved" };
          }
          if (["Action", "Plan"].includes(node.kind)) return { ...node, status: "impacted" };
        }
        if (stepNum >= 8) {
          if (["Action", "Person", "Agent", "Plan", "Doc"].includes(node.kind)) {
            return { ...node, status: "resolved" };
          }
        }
        return node;
      });
      return { ...prev, nodes: updatedNodes };
    });

    if (events && events.length > 0) {
      setLiveEvents((prev) => [...prev, ...events]);
    }
  };

  const handleDemoStep = async () => {
    try {
      const step = await demoStep(activeTenant, "c1");
      setDemoStepInfo(step);
      applyStepVisuals(step.step, step.events);
      const stepCoveragePct = [0, 0, 0, 0, 25, 50, 87.5, 100, 100][step.step - 1] ?? 0;
      setCoverageData((prev) =>
        prev
          ? {
              ...prev,
              pct: stepCoveragePct,
              resolved: Math.round((stepCoveragePct / 100) * prev.impacted),
            }
          : prev
      );
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
      setLiveEvents([]);
    } catch (err) {
      console.error("Demo reset failed", err);
    }
  };

  const handleModeSwitch = async (newMode: ApiMode) => {
    setApiMode(newMode);
    setCurrentMode(newMode);
    setLiveApiError(null);
    try {
      if (newMode === "live") {
        const health = await checkApiHealth();
        if (!health.ok) {
          throw new Error(health.error || `Health check failed with status ${health.status}`);
        }
      }
      const [tList, cList, g, d, imp, cov] = await Promise.all([
        getTenants(),
        getChanges(activeTenant),
        getGraph(activeTenant, activeChange),
        getChangeDetail(activeTenant, activeChange),
        getChangeImpact(activeTenant, activeChange),
        getChangeCoverage(activeTenant, activeChange),
      ]);
      setTenants(tList);
      setChanges(cList);
      setGraphData(g);
      setChangeDetail(d);
      setImpactData(imp);
      setCoverageData(cov);
    } catch (err) {
      console.warn(`[Mode Switch] Error switching to ${newMode}:`, err);
      if (newMode === "live") {
        setLiveApiError(
          `Unable to connect to live API at ${apiBaseUrl} (${(err as Error).message}). Ensure backend is running.`
        );
      }
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

        {/* Demo Controls & Mode Switcher */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDemoModeActive(!isDemoModeActive)}
            className={`rounded px-2.5 py-1 text-xs font-semibold transition ${
              isDemoModeActive
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
            title="Toggle Demo Mode (?demo=1)"
          >
            🎬 Demo Mode
          </button>

          {!isDemoModeActive && (
            <>
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
            </>
          )}

          {/* Interactive API Mode Switcher */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/90 p-1 text-xs">
            <span className="px-1.5 font-mono text-[10px] uppercase font-bold text-slate-400">
              API
            </span>
            <button
              onClick={() => handleModeSwitch("mock")}
              className={`rounded px-2 py-0.5 text-[11px] font-semibold transition ${
                currentMode === "mock"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Use verified offline fixtures"
            >
              Mock
            </button>
            <button
              onClick={() => handleModeSwitch("live")}
              className={`rounded px-2 py-0.5 text-[11px] font-semibold transition ${
                currentMode === "live"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title={`Connect to live FastAPI backend at ${apiBaseUrl}`}
            >
              Live
            </button>
          </div>
        </div>
      </header>

      {/* Demo Mode Stepper Bar */}
      {isDemoModeActive && (
        <div className="border-b border-indigo-950/80 bg-slate-950/90 px-6 py-3">
          <DemoStepper
            stepInfo={demoStepInfo}
            onNext={handleDemoStep}
            onReset={handleDemoReset}
          />
        </div>
      )}

      {/* Live API Offline / Diagnostics Alert */}
      {liveApiError && (
        <div className="flex items-center justify-between border-b border-rose-800/60 bg-rose-950/40 px-6 py-2 text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <span className="font-bold">⚠️ Live API:</span>
            <span>{liveApiError}</span>
          </div>
          <button
            onClick={() => handleModeSwitch("mock")}
            className="rounded border border-rose-700 bg-rose-900/50 px-2 py-0.5 text-[11px] font-semibold text-rose-200 hover:bg-rose-800 transition"
          >
            Switch to Mock Mode
          </button>
        </div>
      )}

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
              <div className="flex items-center gap-2">
                <span className="rounded bg-indigo-500/20 px-2 py-0.5 font-mono text-[10px] text-indigo-300">
                  Selected: {selectedNodeId}
                </span>
                <button
                  onClick={() => setIsWhyDrawerOpen(true)}
                  className="rounded border border-indigo-500/40 bg-indigo-600/30 px-2 py-0.5 text-[10px] font-semibold text-indigo-200 transition hover:bg-indigo-600/50"
                >
                  Explain (Why?)
                </button>
              </div>
            )}
          </div>

          {/* Graph Visualization Container */}
          <div className="relative flex-1 overflow-hidden">
            {graphData ? (
              <GraphCanvas
                nodes={graphData.nodes}
                links={graphData.links}
                selectedNodeId={selectedNodeId}
                onSelectNode={handleSelectNode}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-slate-500 font-mono">
                Loading graph data...
              </div>
            )}

            {/* Why Drawer (Explain Path) */}
            <WhyDrawer
              isOpen={isWhyDrawerOpen}
              onClose={() => setIsWhyDrawerOpen(false)}
              selectedNodeId={selectedNodeId}
              tenant={activeTenant}
              changeId={activeChange}
              nodes={graphData?.nodes}
            />
          </div>

          {/* Bottom Ask Panel (Concierge) */}
          <AskPanel
            tenant={activeTenant}
            onSelectNode={handleSelectNode}
          />
        </section>

        {/* Right Sidebar: Before/After, Coverage, Time-To-Harm Queue */}
        <aside className="flex w-96 flex-col overflow-y-auto border-l border-slate-800/60 bg-slate-900/30">
          {/* Coverage Meter */}
          <div className="border-b border-slate-800 p-4">
            <CoverageMeter coverage={coverageData} events={liveEvents} />
          </div>

          {/* Before / After Panel */}
          <div className="border-b border-slate-800 p-4">
            <BeforeAfterPanel detail={changeDetail} />
          </div>

          {/* Time-To-Harm Prioritized Queue */}
          <div className="flex-1 p-4">
            <TthQueue
              items={impactData?.items ?? []}
              selectedId={selectedNodeId}
              onSelectItem={handleSelectNode}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
