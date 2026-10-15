"use client";

import React, { useMemo, useState } from "react";
import { ImpactItem } from "@/lib/types";
import {
  IconZap,
  IconUser,
  IconBot,
  IconFileText,
  IconLayers,
  IconShieldAlert,
  IconSearch,
} from "@/components/ui/icons";

interface TthQueueProps {
  items: ImpactItem[];
  selectedId?: string | null;
  onSelectItem?: (id: string | null) => void;
  className?: string;
}

type FilterStatus = "all" | "blocked" | "impacted" | "resolved";

export default function TthQueue({
  items,
  selectedId,
  onSelectItem,
  className = "",
}: TthQueueProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const formatTth = (ms: number) => {
    const hours = Math.round((ms / 3600000) * 10) / 10;
    if (hours < 1) return `${Math.round(ms / 60000)}m`;
    return `${hours}h`;
  };

  const getRiskTier = (risk: number) => {
    if (risk >= 100) return { label: "CRITICAL", color: "bg-rose-500/20 text-rose-300 border-rose-500/40" };
    if (risk >= 50) return { label: "HIGH", color: "bg-amber-500/20 text-amber-300 border-amber-500/40" };
    if (risk >= 20) return { label: "MED", color: "bg-sky-500/20 text-sky-300 border-sky-500/40" };
    return { label: "LOW", color: "bg-slate-700/30 text-slate-400 border-slate-700/50" };
  };

  const getKindIcon = (kind: string) => {
    switch (kind.toLowerCase()) {
      case "action":
        return <IconZap className="w-3.5 h-3.5 text-rose-400" />;
      case "person":
        return <IconUser className="w-3.5 h-3.5 text-sky-400" />;
      case "agent":
        return <IconBot className="w-3.5 h-3.5 text-purple-400" />;
      case "doc":
        return <IconFileText className="w-3.5 h-3.5 text-blue-400" />;
      case "plan":
        return <IconLayers className="w-3.5 h-3.5 text-teal-400" />;
      default:
        return <span className="h-2 w-2 rounded-full bg-slate-400" />;
    }
  };

  const counts = useMemo(() => {
    const c = { all: items.length, blocked: 0, impacted: 0, resolved: 0 };
    items.forEach((item) => {
      if (item.status === "blocked") c.blocked++;
      else if (item.status === "resolved") c.resolved++;
      else c.impacted++;
    });
    return c;
  }, [items]);

  const filteredItems = useMemo(() => {
    return [...items]
      .filter((item) => {
        if (statusFilter === "blocked") return item.status === "blocked";
        if (statusFilter === "resolved") return item.status === "resolved";
        if (statusFilter === "impacted") return item.status !== "blocked" && item.status !== "resolved";
        return true;
      })
      .filter((item) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          item.label.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q) ||
          item.kind.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.risk - a.risk);
  }, [items, statusFilter, searchQuery]);

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Header and Title */}
      <div className="flex flex-col gap-1 pb-2 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconShieldAlert className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Time-To-Harm Priority Queue
            </h3>
          </div>
          <span className="rounded-full bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-300">
            {items.length} Tracked
          </span>
        </div>
        <p className="text-[11px] text-slate-400 font-mono">
          risk = severity × urgency × (1 + reach)
        </p>
      </div>

      {/* Filter Tabs & Quick Search */}
      <div className="space-y-2">
        <div className="flex items-center gap-1 rounded-lg border border-slate-800/80 bg-slate-950/60 p-1 text-xs">
          <button
            onClick={() => setStatusFilter("all")}
            className={`flex-1 rounded px-2 py-1 text-[11px] font-semibold transition ${
              statusFilter === "all"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All ({counts.all})
          </button>
          <button
            onClick={() => setStatusFilter("blocked")}
            className={`flex-1 rounded px-2 py-1 text-[11px] font-semibold transition flex items-center justify-center gap-1 ${
              statusFilter === "blocked"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm"
                : "text-slate-400 hover:text-rose-300"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
            Blocked ({counts.blocked})
          </button>
          <button
            onClick={() => setStatusFilter("impacted")}
            className={`flex-1 rounded px-2 py-1 text-[11px] font-semibold transition flex items-center justify-center gap-1 ${
              statusFilter === "impacted"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                : "text-slate-400 hover:text-amber-300"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Open ({counts.impacted})
          </button>
          <button
            onClick={() => setStatusFilter("resolved")}
            className={`flex-1 rounded px-2 py-1 text-[11px] font-semibold transition flex items-center justify-center gap-1 ${
              statusFilter === "resolved"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                : "text-slate-400 hover:text-emerald-300"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Fixed ({counts.resolved})
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter queue by entity or kind..."
            className="w-full rounded-lg border border-slate-800 bg-slate-950/70 pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500/80 transition"
          />
        </div>
      </div>

      {/* Queue Items */}
      <div className="space-y-2 overflow-y-auto pr-1 max-h-[calc(100vh-420px)] min-h-[160px]">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-slate-500">
            <span>No matching entities in queue</span>
          </div>
        ) : (
          filteredItems.map((item, index) => {
            const isSelected = selectedId === item.id;
            const isHovered = hoveredId === item.id;
            const tier = getRiskTier(item.risk);

            const isBlocked = item.status === "blocked";
            const isResolved = item.status === "resolved";

            return (
              <div
                key={item.id}
                onClick={() => onSelectItem?.(isSelected ? null : item.id)}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`relative cursor-pointer rounded-xl border p-3 text-xs transition-all duration-200 ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-950/40 shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-500/50"
                    : isBlocked
                    ? "border-rose-900/50 bg-rose-950/20 hover:border-rose-700/80 hover:bg-rose-950/30"
                    : isResolved
                    ? "border-emerald-950/40 bg-slate-900/40 hover:border-emerald-800/60 opacity-80"
                    : "border-slate-800/80 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900/80"
                }`}
              >
                {/* Left status color strip */}
                <div
                  className={`absolute left-0 top-2 bottom-2 w-1 rounded-r ${
                    isBlocked
                      ? "bg-rose-500 shadow-sm shadow-rose-500/50"
                      : isResolved
                      ? "bg-emerald-400"
                      : "bg-amber-400"
                  }`}
                />

                {/* Top Row: Rank, Kind Icon, Label, Status Badge */}
                <div className="flex items-start justify-between gap-2 pl-1.5">
                  <div className="flex items-start gap-2 truncate">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md font-mono text-[10px] font-bold ${
                        index === 0
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      #{index + 1}
                    </span>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        {getKindIcon(item.kind)}
                        <span className="font-semibold text-slate-100 truncate">
                          {item.label}
                        </span>
                      </div>
                      <div className="font-mono text-[10px] text-slate-400 truncate">
                        {item.id}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold border ${tier.color}`}
                    >
                      {tier.label}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold border ${
                        isBlocked
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"
                          : isResolved
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      }`}
                    >
                      {item.status ?? "open"}
                    </span>
                  </div>
                </div>

                {/* Factors Summary Row */}
                <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 pl-1.5">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-slate-800/80 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                      {item.hops} {item.hops === 1 ? "hop" : "hops"}
                    </span>
                    <span>•</span>
                    <span className="font-mono text-slate-300">
                      TTH: {formatTth(item.tth_ms)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-mono font-bold">
                    <span className="text-slate-400 text-[10px]">Risk:</span>
                    <span className={item.risk >= 100 ? "text-rose-400 text-xs" : "text-indigo-400"}>
                      {item.risk}
                    </span>
                  </div>
                </div>

                {/* Factor Breakdown Card when Hovered */}
                {isHovered && (
                  <div className="absolute left-0 right-0 -bottom-2 translate-y-full z-40 rounded-xl border border-slate-700 bg-slate-950/95 p-3 shadow-2xl text-[11px] backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
                      <span className="font-bold text-slate-200">
                        Time-To-Harm Formula
                      </span>
                      <span className="font-mono text-[10px] text-indigo-400">
                        {item.severity} × {item.urgency} × (1 + {item.reach}) = {item.risk}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-300 font-mono text-[10px]">
                      <div>Severity: <span className="text-indigo-300 font-bold">{item.severity}</span></div>
                      <div>Urgency: <span className="text-indigo-300 font-bold">{item.urgency}</span></div>
                      <div>Reach: <span className="text-indigo-300 font-bold">{item.reach}</span></div>
                      <div>TTH Window: <span className="text-indigo-300 font-bold">{formatTth(item.tth_ms)}</span></div>
                    </div>

                    <div className="mt-2 text-[10px] text-slate-400 leading-normal border-t border-slate-800/60 pt-1.5">
                      {item.kind === "Action"
                        ? "🚨 Critical: Pending financial approval action relying on stale policy. Automatically blocked by Ripple Freshness Guard."
                        : item.kind === "Person"
                        ? "Held old fact version in episodic memory. Concierge must re-answer with explicit invalidation."
                        : item.kind === "Doc"
                        ? "Public handbook documentation page with high readership. Automated patch required."
                        : "Dependent plan entity requiring replanning with company-approved tools."}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
