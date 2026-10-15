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
import KeyboardShortcutsModal from "@/components/ui/KeyboardShortcutsModal";
import {
  IconBrain,
  IconHelpCircle,
  IconRotateCcw,
} from "@/components/ui/icons";
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
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [isAskCollapsed, setIsAskCollapsed] = useState<boolean>(false);

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
          const p = ev.payload as { change_id?: string; pct?: number; impacted?: number; resolved?: number };
          if (p.change_id && p.change_id !== activeChange) return;
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
  }, [activeTenant, activeChange]);

  useEffect(() => {
    if (!activeTenant) return;
    getChanges(activeTenant).then(setChanges).catch(console.error);
    getGraph(activeTenant, activeChange).then(setGraphData).catch(console.error);
    getChangeDetail(activeTenant, activeChange).then(setChangeDetail).catch(console.error);
    getChangeImpact(activeTenant, activeChange).then(setImpactData).catch(console.error);
    getChangeCoverage(activeTenant, activeChange).then(setCoverageData).catch(console.error);
  }, [activeTenant, activeChange]);

  // Global '?' hotkey for shortcuts dialog
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleDemoStep = async () => {
    try {
      const step = await demoStep(activeTenant, "c1");
      setDemoStepInfo(step);

      // Reload live graph, impact queue, and coverage from API
      const [g, imp, cov] = await Promise.all([
        getGraph(activeTenant, activeChange),
        getChangeImpact(activeTenant, activeChange),
        getChangeCoverage(activeTenant, activeChange),
      ]);
      setGraphData(g);
      setImpactData(imp);
      setCoverageData(cov);

      if (step.events && step.events.length > 0) {
        setLiveEvents((prev) => [...prev, ...step.events]);
        // Update node statuses dynamically based on real events
        setGraphData((prev) => {
          if (!prev) return prev;
          let updatedNodes = [...prev.nodes];
          for (const ev of step.events) {
            const p = ev.payload as Record<string, unknown>;
            if (ev.type === "action.blocked" && p?.action_id) {
              updatedNodes = updatedNodes.map((n) =>
                n.id === p.action_id ? { ...n, status: "blocked" } : n
              );
            } else if (ev.type === "task.done" && p?.target_id) {
              updatedNodes = updatedNodes.map((n) =>
                n.id === p.target_id ? { ...n, status: "resolved" } : n
              );
            } else if (ev.type === "answer.sent" && p?.person_id) {
              updatedNodes = updatedNodes.map((n) =>
                n.id === p.person_id ? { ...n, status: "resolved" } : n
              );
            }
          }
          return { ...prev, nodes: updatedNodes };
        });
      }
    } catch (err) {
      console.error("Demo step failed", err);
    }
  };

  const handleDemoReset = async () => {
    try {
      await demoReset(activeTenant);
      setDemoStepInfo(null);
      const [g, imp, cov] = await Promise.all([
        getGraph(activeTenant, activeChange),
        getChangeImpact(activeTenant, activeChange),
        getChangeCoverage(activeTenant, activeChange),
      ]);
      setGraphData(g);
      setImpactData(imp);
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
    <div className="flex h-screen flex-col bg-[#060911] font-sans text-slate-100 antialiased selection:bg-indigo-500/30 selection:text-white">
      {/* Top Navbar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-5 backdrop-blur-md z-20">
        <div className="flex items-center gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white shadow-lg shadow-indigo-600/30">
              <IconBrain className="w-4 h-4 text-white" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-400"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                  Ripple
                </span>
                <span className="rounded bg-indigo-500/10 border border-indigo-500/30 px-1.5 py-0.2 font-mono text-[9px] font-bold text-indigo-300">
                  FalkorDB
                </span>
              </div>
            </div>
          </div>

          {/* Hackathon Track Badges */}
          <div className="hidden lg:flex items-center gap-1.5 border-l border-slate-800/80 pl-3">
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
              Track 01: Company Brain
            </span>
            <span className="rounded-full bg-slate-800/60 border border-slate-700/60 px-2 py-0.5 text-[10px] font-medium text-slate-400">
              Track 02: Multi-Agent
            </span>
            <span className="rounded-full bg-slate-800/60 border border-slate-700/60 px-2 py-0.5 text-[10px] font-medium text-slate-400">
              Track 03: Explainability
            </span>
          </div>

          <span className="text-xs text-slate-700">|</span>

          {/* Tenant Selector */}
          <div className="flex items-center gap-1.5">
            <select
              value={activeTenant}
              onChange={(e) => setActiveTenant(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-1 text-xs text-slate-200 outline-none focus:border-indigo-500 transition"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  Tenant: {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Policy Change Selector */}
          {changes.length > 0 && (
            <div className="flex items-center gap-1.5">
              <select
                value={activeChange}
                onChange={(e) => setActiveChange(e.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-1 text-xs text-slate-200 outline-none focus:border-indigo-500 transition max-w-[220px]"
              >
                {changes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Policy: {c.title.length > 25 ? c.title.slice(0, 23) + "..." : c.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Demo Controls, Keyboard Shortcuts & Mode Switcher */}
        <div className="flex items-center gap-2.5">
          {/* Shortcuts Help Button */}
          <button
            type="button"
            onClick={() => setIsShortcutsOpen(true)}
            className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-700 transition"
            title="Keyboard shortcuts (?)"
          >
            <IconHelpCircle className="w-3.5 h-3.5" />
            <kbd className="hidden sm:inline font-mono text-[9px] text-slate-400">?</kbd>
          </button>

          {/* Demo Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsDemoModeActive(!isDemoModeActive)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              isDemoModeActive
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "border border-slate-800 bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
            title="Toggle Demo Mode (?demo=1)"
          >
            <span>🎬 Demo Mode</span>
          </button>

          {!isDemoModeActive && (
            <div className="flex items-center gap-1.5">
              {demoStepInfo && (
                <div className="hidden md:flex items-center gap-2 rounded-lg bg-indigo-950/70 border border-indigo-800/60 px-2.5 py-1 text-xs text-indigo-300">
                  <span className="font-bold">Step {demoStepInfo.step}/{demoStepInfo.total_steps}:</span>
                  <span className="truncate max-w-[140px]">{demoStepInfo.name}</span>
                </div>
              )}
              <button
                type="button"
                onClick={handleDemoStep}
                className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 active:scale-95"
              >
                <span>Next ▶</span>
              </button>
              <button
                type="button"
                onClick={handleDemoReset}
                className="rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-xs text-slate-300 transition hover:bg-slate-800 active:scale-95"
                title="Reset scenario (Hotkey: R)"
              >
                <IconRotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Interactive API Mode Switcher */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/90 p-0.5 text-xs">
            <span className="px-1.5 font-mono text-[9px] uppercase font-bold text-slate-400">
              API
            </span>
            <button
              onClick={() => handleModeSwitch("mock")}
              className={`rounded-md px-2 py-0.5 text-[11px] font-bold transition ${
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
              className={`rounded-md px-2 py-0.5 text-[11px] font-bold transition flex items-center gap-1 ${
                currentMode === "live"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title={`Connect to live FastAPI backend at ${apiBaseUrl}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${currentMode === "live" ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
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
        <section className="relative flex flex-1 flex-col border-r border-slate-800/80 bg-[#060911]">
          {/* Subheader bar above Canvas */}
          <div className="flex h-10 items-center justify-between border-b border-slate-800/80 bg-slate-950/50 px-4 text-xs text-slate-400 backdrop-blur-sm">
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Live FalkorDB Graph
              </span>
              <span>•</span>
              <span className="font-mono text-slate-300">{graphData?.nodes.length ?? 0} nodes</span>
              <span>•</span>
              <span className="font-mono text-slate-300">{graphData?.links.length ?? 0} edges</span>
            </div>

            <div className="flex items-center gap-2">
              {selectedNodeId && (
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-indigo-500/20 border border-indigo-500/40 px-2 py-0.5 font-mono text-[10px] text-indigo-300 font-bold">
                    Selected: {selectedNodeId}
                  </span>
                  <button
                    onClick={() => setIsWhyDrawerOpen(true)}
                    className="rounded-md border border-indigo-500/40 bg-indigo-600/30 px-2.5 py-0.5 text-[10px] font-bold text-indigo-200 transition hover:bg-indigo-600/50 shadow-sm"
                  >
                    Explain (Why?) ↗
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsAskCollapsed(!isAskCollapsed)}
                className="text-[11px] text-slate-400 hover:text-slate-200 transition"
                title={isAskCollapsed ? "Expand Concierge Q&A" : "Collapse Concierge Q&A for full graph view"}
              >
                {isAskCollapsed ? "▲ Show Concierge" : "▼ Hide Concierge"}
              </button>
            </div>
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
                Loading FalkorDB graph topology...
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
          {!isAskCollapsed && (
            <AskPanel
              tenant={activeTenant}
              onSelectNode={handleSelectNode}
            />
          )}
        </section>

        {/* Right Sidebar: Coverage, Before/After, Time-To-Harm Queue */}
        <aside className="flex w-[400px] flex-col overflow-y-auto border-l border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
          {/* Coverage Meter */}
          <div className="border-b border-slate-800/80 p-4">
            <CoverageMeter coverage={coverageData} events={liveEvents} />
          </div>

          {/* Before / After Panel */}
          <div className="border-b border-slate-800/80 p-4">
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

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}
