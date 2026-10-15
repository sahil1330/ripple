"use client";

import React from "react";
import { CoverageResponse, SseEnvelope } from "@/lib/types";
import {
  IconZap,
  IconUser,
  IconBot,
  IconFileText,
  IconLayers,
  IconCheckCircle2,
} from "@/components/ui/icons";

interface CoverageMeterProps {
  coverage: CoverageResponse | null;
  events?: SseEnvelope[];
  className?: string;
}

export default function CoverageMeter({
  coverage,
  events = [],
  className = "",
}: CoverageMeterProps) {
  const pct = coverage?.pct ?? 0;
  const impacted = coverage?.impacted ?? 0;
  const resolved = coverage?.resolved ?? 0;
  const byKind = coverage?.by_kind ?? {};
  const isComplete = pct >= 100;

  const getKindIcon = (kind: string) => {
    switch (kind.toLowerCase()) {
      case "action":
        return <IconZap className="w-3 h-3 text-rose-400" />;
      case "person":
        return <IconUser className="w-3 h-3 text-sky-400" />;
      case "agent":
        return <IconBot className="w-3 h-3 text-purple-400" />;
      case "doc":
        return <IconFileText className="w-3 h-3 text-blue-400" />;
      case "plan":
        return <IconLayers className="w-3 h-3 text-teal-400" />;
      default:
        return <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />;
    }
  };

  const getEventBadgeStyle = (eventType: string) => {
    if (eventType.includes("blocked")) {
      return {
        dot: "bg-rose-500 shadow-rose-500/50",
        border: "border-rose-500/40 bg-rose-950/40 text-rose-300",
        label: "Freshness Guard Block",
      };
    }
    if (eventType.includes("done") || eventType.includes("resolved")) {
      return {
        dot: "bg-emerald-400 shadow-emerald-400/50",
        border: "border-emerald-500/40 bg-emerald-950/40 text-emerald-300",
        label: "Remediation Resolved",
      };
    }
    if (eventType.includes("replanned")) {
      return {
        dot: "bg-sky-400 shadow-sky-400/50",
        border: "border-sky-500/40 bg-sky-950/40 text-sky-300",
        label: "Action Replanned",
      };
    }
    if (eventType.includes("cache")) {
      return {
        dot: "bg-purple-400 shadow-purple-400/50",
        border: "border-purple-500/40 bg-purple-950/40 text-purple-300",
        label: "Cache Invalidation",
      };
    }
    return {
      dot: "bg-indigo-400 shadow-indigo-400/50",
      border: "border-indigo-500/30 bg-indigo-950/30 text-indigo-300",
      label: eventType,
    };
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl border p-4 transition-all duration-300 ${
        isComplete
          ? "border-emerald-500/50 bg-gradient-to-b from-slate-900/90 to-emerald-950/30 shadow-lg shadow-emerald-950/40"
          : "border-slate-800/80 bg-slate-900/70 shadow-md backdrop-blur-md"
      } ${className}`}
    >
      {/* Background radial glow */}
      <div
        className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full blur-3xl opacity-30 ${
          isComplete ? "bg-emerald-500" : "bg-indigo-600"
        }`}
      />

      {/* Header and Progress Percentage */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full shadow-sm ${
                isComplete
                  ? "bg-emerald-400 shadow-emerald-400 animate-pulse"
                  : "bg-indigo-400 shadow-indigo-400 animate-ping"
              }`}
            />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Remediation Coverage
            </h3>
          </div>
          <p className="text-[11px] text-slate-400">
            FalkorDB walk tracking 100% resolution
          </p>
        </div>

        <div className="text-right">
          <div className="flex items-baseline justify-end gap-1 font-mono">
            <span className="text-2xl font-black tracking-tight text-white">
              {pct}%
            </span>
          </div>
          <div className="text-[10px] font-mono text-slate-400">
            <span className={isComplete ? "font-bold text-emerald-400" : "text-indigo-300 font-semibold"}>
              {resolved}
            </span>{" "}
            of {impacted} secured
          </div>
        </div>
      </div>

      {/* 100% Remediated Milestone Banner */}
      {isComplete && (
        <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-950/50 px-3 py-1.5 text-xs text-emerald-200 shadow-sm animate-in fade-in zoom-in-95 duration-300">
          <IconCheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span className="font-semibold text-[11px]">
            100% Remediated • Zero stale actions left in graph
          </span>
        </div>
      )}

      {/* Animated Gradient Progress Bar */}
      <div className="relative mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-950/80 p-0.5 ring-1 ring-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out shadow-md ${
            isComplete
              ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 shadow-emerald-500/40"
              : "bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 shadow-indigo-500/30"
          }`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        >
          {/* Subtle shimmer animation inside bar */}
          <div className="h-full w-full bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.25)_50%,transparent_100%)] animate-shimmer" />
        </div>
      </div>

      {/* Breakdown by Kind Chips */}
      {Object.keys(byKind).length > 0 && (
        <div className="mt-3.5 space-y-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Entities by Category
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {Object.entries(byKind).map(([kind, counts]) => {
              const isDone = counts.resolved >= counts.impacted;
              return (
                <div
                  key={kind}
                  className={`flex items-center justify-between gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] transition ${
                    isDone
                      ? "border-emerald-500/30 bg-emerald-950/30 text-emerald-300"
                      : "border-slate-800/90 bg-slate-950/50 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {getKindIcon(kind)}
                    <span className="font-medium truncate">{kind}</span>
                  </div>
                  <span className="font-mono text-[10px] font-bold">
                    {counts.resolved}/{counts.impacted}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Live Agent Activity Ticker */}
      {events.length > 0 && (
        <div className="mt-3.5 border-t border-slate-800/80 pt-3">
          <div className="flex items-center justify-between mb-1.5 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <span>Live Agent Telemetry</span>
            </div>
            <span className="font-mono">{events.length} events</span>
          </div>

          <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
            {events
              .slice(-4)
              .reverse()
              .map((ev, i) => {
                const style = getEventBadgeStyle(ev.type);
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 rounded-lg bg-slate-950/70 px-2.5 py-1 text-[11px] font-mono border border-slate-800/80 transition hover:bg-slate-900/60"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full shadow-sm ${style.dot}`}
                      />
                      <span className="text-slate-200 font-semibold truncate">
                        {ev.type}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                      {new Date(ev.at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
