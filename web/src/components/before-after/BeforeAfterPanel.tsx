"use client";

import React from "react";
import { ChangeDetail } from "@/lib/types";

interface BeforeAfterPanelProps {
  detail: ChangeDetail | null;
  className?: string;
}

export default function BeforeAfterPanel({ detail, className = "" }: BeforeAfterPanelProps) {
  if (!detail) {
    return (
      <div className={`p-4 text-xs text-slate-500 font-mono ${className}`}>
        No change selected.
      </div>
    );
  }

  const shortCommit = detail.commit_sha ? detail.commit_sha.slice(0, 8) : "";

  return (
    <div className={`flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4 ${className}`}>
      {/* Header with Title and Status */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-indigo-400">{detail.id}</span>
            <span
              className={`rounded px-1.5 py-0.5 font-mono text-[10px] uppercase font-semibold border ${
                detail.status === "resolved"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  : detail.status === "resolving"
                  ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                  : "bg-amber-500/20 text-amber-300 border-amber-500/30"
              }`}
            >
              {detail.status}
            </span>
          </div>
          <h3 className="mt-1 text-sm font-semibold text-slate-100">{detail.title}</h3>
        </div>
      </div>

      {/* Metadata Links */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
        <div className="flex items-center gap-1 font-mono text-[11px]">
          <span>Commit:</span>
          <code className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">{shortCommit}</code>
        </div>
        {detail.mr_url && (
          <a
            href={detail.mr_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 font-mono text-[11px] text-indigo-400 hover:text-indigo-300 underline"
          >
            <span>MR !20421</span>
            <span>↗</span>
          </a>
        )}
      </div>

      {/* Diff View: Before vs After */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {/* Before / Stale Version */}
        <div className="flex flex-col rounded border border-rose-950/60 bg-rose-950/20 p-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-rose-900/40">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-rose-400">
              Before (Stale)
            </span>
            <code className="font-mono text-[10px] text-rose-300">{detail.before.version_id}</code>
          </div>
          <div className="mt-2 text-xs font-semibold text-slate-200">{detail.before.value}</div>
          <p className="mt-1.5 text-[11px] text-slate-400 italic leading-relaxed">
            “{detail.before.excerpt}”
          </p>
          <div className="mt-auto pt-2">
            <a
              href={detail.before.source_url}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] font-mono text-slate-500 hover:text-rose-300 underline truncate block"
            >
              Source: handbook expenses.md
            </a>
          </div>
        </div>

        {/* After / Current Version */}
        <div className="flex flex-col rounded border border-emerald-950/60 bg-emerald-950/20 p-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-emerald-900/40">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              After (Current)
            </span>
            <code className="font-mono text-[10px] text-emerald-300">{detail.after.version_id}</code>
          </div>
          <div className="mt-2 text-xs font-semibold text-slate-200">{detail.after.value}</div>
          <p className="mt-1.5 text-[11px] text-slate-400 italic leading-relaxed">
            “{detail.after.excerpt}”
          </p>
          <div className="mt-auto pt-2">
            <a
              href={detail.after.source_url}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] font-mono text-slate-500 hover:text-emerald-300 underline truncate block"
            >
              Source: handbook expenses.md
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
