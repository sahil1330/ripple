"use client";

import React, { useState } from "react";
import { ImpactItem } from "@/lib/types";

interface TthQueueProps {
  items: ImpactItem[];
  selectedId?: string | null;
  onSelectItem?: (id: string | null) => void;
  className?: string;
}

export default function TthQueue({
  items,
  selectedId,
  onSelectItem,
  className = "",
}: TthQueueProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const sortedItems = [...items].sort((a, b) => b.risk - a.risk);

  const formatTth = (ms: number) => {
    const hours = Math.round((ms / 3600000) * 10) / 10;
    if (hours < 1) return `${Math.round(ms / 60000)}m`;
    return `${hours}h`;
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div>
          <h3 className="text-xs font-semibold text-slate-200">Time-To-Harm Priority Queue</h3>
          <p className="text-[11px] text-slate-400">Ranked by risk = severity × urgency × (1 + reach)</p>
        </div>
        <span className="rounded bg-indigo-500/20 px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-300">
          {items.length} Impacted
        </span>
      </div>

      <div className="space-y-2 overflow-y-auto pr-1">
        {sortedItems.map((item, index) => {
          const isSelected = selectedId === item.id;
          const isHovered = hoveredId === item.id;

          return (
            <div
              key={item.id}
              onClick={() => onSelectItem?.(isSelected ? null : item.id)}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`relative cursor-pointer rounded-lg border p-3 text-xs transition duration-150 ${
                isSelected
                  ? "border-indigo-500 bg-indigo-950/50 shadow-md shadow-indigo-950/50"
                  : "border-slate-800/90 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70"
              }`}
            >
              {/* Item Top Row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-800 font-mono text-[10px] font-bold text-slate-300">
                    #{index + 1}
                  </span>
                  <span className="font-semibold text-slate-100 leading-snug">{item.label}</span>
                </div>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold border ${
                    item.status === "blocked"
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse"
                      : item.status === "resolved"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                  }`}
                >
                  {item.status ?? "open"}
                </span>
              </div>

              {/* Item Factors Summary */}
              <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-slate-800/80 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                    {item.kind}
                  </span>
                  <span>{item.hops} {item.hops === 1 ? "hop" : "hops"}</span>
                  <span>•</span>
                  <span>TTH: {formatTth(item.tth_ms)}</span>
                </div>
                <div className="flex items-center gap-1 font-mono font-bold text-indigo-400">
                  <span>Risk:</span>
                  <span>{item.risk}</span>
                </div>
              </div>

              {/* Factor Breakdown Tooltip */}
              {isHovered && (
                <div className="absolute left-0 right-0 -bottom-1 translate-y-full z-30 rounded-lg border border-slate-700 bg-slate-900 p-2.5 shadow-2xl text-[11px] backdrop-blur">
                  <div className="font-semibold text-slate-200 border-b border-slate-800 pb-1 mb-1.5">
                    Time-To-Harm Formula Breakdown
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-300 font-mono">
                    <div>Severity: <span className="text-indigo-300">{item.severity}</span></div>
                    <div>Urgency: <span className="text-indigo-300">{item.urgency}</span></div>
                    <div>Reach: <span className="text-indigo-300">{item.reach}</span></div>
                    <div>TTH Window: <span className="text-indigo-300">{formatTth(item.tth_ms)}</span></div>
                  </div>
                  <div className="mt-1.5 text-[10px] text-slate-400">
                    {item.kind === "Action"
                      ? "Top priority: pending action that auto-approves money on stale fact."
                      : item.kind === "Person"
                      ? "Held old fact in episodic memory; needs Concierge correction."
                      : item.kind === "Doc"
                      ? "High handbook page reach; needs documentation patch."
                      : "Dependent entity in active plan."}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
