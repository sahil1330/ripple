"use client";

import React from "react";
import { CoverageResponse, SseEnvelope } from "@/lib/types";

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

  return (
    <div className={`flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4 ${className}`}>
      {/* Header and Progress Percentage */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="text-xs font-semibold text-slate-200">Remediation Coverage</h3>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span className="font-bold text-indigo-400 text-sm">{pct}%</span>
          <span className="text-slate-400">({resolved}/{impacted})</span>
        </div>
      </div>

      {/* Animated Gradient Progress Bar */}
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 transition-all duration-700 ease-out shadow-lg shadow-indigo-500/20"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>

      {/* Breakdown by Kind */}
      {Object.keys(byKind).length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {Object.entries(byKind).map(([kind, counts]) => {
            const isDone = counts.resolved >= counts.impacted;
            return (
              <span
                key={kind}
                className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-mono border ${
                  isDone
                    ? "border-emerald-500/30 bg-emerald-950/30 text-emerald-300"
                    : "border-slate-800 bg-slate-800/60 text-slate-300"
                }`}
              >
                <span className="font-semibold">{kind}:</span>
                <span>{counts.resolved}/{counts.impacted}</span>
              </span>
            );
          })}
        </div>
      )}

      {/* Live Agent Activity Ticker */}
      {events.length > 0 && (
        <div className="mt-1 border-t border-slate-800/80 pt-2">
          <div className="flex items-center justify-between mb-1 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            <span>Live Agent Activity</span>
            <span>{events.length} events</span>
          </div>
          <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
            {events.slice(-4).reverse().map((ev, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 rounded bg-slate-950/70 px-2 py-1 text-[11px] font-mono border border-slate-800/60"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      ev.type.includes("blocked")
                        ? "bg-rose-400"
                        : ev.type.includes("done")
                        ? "bg-emerald-400"
                        : "bg-indigo-400"
                    }`}
                  />
                  <span className="text-slate-300 font-medium">{ev.type}</span>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {new Date(ev.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
