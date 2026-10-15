"use client";

import React, { useState } from "react";
import { ChangeDetail } from "@/lib/types";
import { IconCopy, IconCheck, IconExternalLink } from "@/components/ui/icons";

interface BeforeAfterPanelProps {
  detail: ChangeDetail | null;
  className?: string;
}

export default function BeforeAfterPanel({ detail, className = "" }: BeforeAfterPanelProps) {
  const [copiedSha, setCopiedSha] = useState<boolean>(false);

  if (!detail) {
    return (
      <div className={`rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-500 font-mono text-center ${className}`}>
        No policy change loaded.
      </div>
    );
  }

  const shortCommit = detail.commit_sha ? detail.commit_sha.slice(0, 8) : "";

  const handleCopySha = () => {
    if (!detail.commit_sha) return;
    navigator.clipboard.writeText(detail.commit_sha);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2000);
  };

  return (
    <div className={`flex flex-col gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-xl backdrop-blur-md ${className}`}>
      {/* Header with Title and Status */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md">
              {detail.id}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase font-bold tracking-wider border ${
                detail.status === "resolved"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20"
                  : detail.status === "resolving"
                  ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 animate-pulse"
                  : "bg-amber-500/20 text-amber-300 border-amber-500/40"
              }`}
            >
              {detail.status}
            </span>
          </div>
          <h3 className="mt-1.5 text-sm font-bold text-slate-100 tracking-tight leading-snug">
            {detail.title}
          </h3>
        </div>
      </div>

      {/* File & Commit Provenance Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 bg-slate-950/60 border border-slate-800/80 rounded-lg p-2 font-mono text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">📄</span>
          <span className="text-slate-300 font-medium truncate max-w-[140px]" title="expenses.md">
            expenses.md
          </span>
          <span className="text-slate-600">•</span>
          <button
            onClick={handleCopySha}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition"
            title="Copy full commit SHA"
          >
            <span>SHA:</span>
            <code className="text-indigo-300 underline font-semibold">{shortCommit}</code>
            {copiedSha ? <IconCheck className="w-3 h-3 text-emerald-400" /> : <IconCopy className="w-3 h-3 text-slate-500" />}
          </button>
        </div>

        {detail.mr_url && (
          <a
            href={detail.mr_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold"
          >
            <span>GitLab MR !20421</span>
            <IconExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Visual Diff: Before (Stale) vs After (Current) */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {/* Before / Stale Version */}
        <div className="flex flex-col rounded-xl border border-rose-900/50 bg-rose-950/20 p-3 shadow-inner">
          <div className="flex items-center justify-between pb-1.5 border-b border-rose-900/40">
            <span className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider text-rose-400">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              Before (v1)
            </span>
            <code className="font-mono text-[10px] font-semibold text-rose-300">{detail.before.version_id}</code>
          </div>
          <div className="mt-2 text-xs font-bold text-rose-200 line-through decoration-rose-500/80">
            {detail.before.value}
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400 italic leading-relaxed">
            “{detail.before.excerpt}”
          </p>
          <div className="mt-auto pt-2.5">
            <a
              href={detail.before.source_url}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] font-mono text-slate-500 hover:text-rose-300 underline truncate block"
            >
              Source: handbook/expenses.md
            </a>
          </div>
        </div>

        {/* After / Current Version */}
        <div className="flex flex-col rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-3 shadow-inner">
          <div className="flex items-center justify-between pb-1.5 border-b border-emerald-900/40">
            <span className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              After (v2)
            </span>
            <code className="font-mono text-[10px] font-semibold text-emerald-300">{detail.after.version_id}</code>
          </div>
          <div className="mt-2 text-xs font-bold text-emerald-300">
            {detail.after.value}
          </div>
          <p className="mt-1.5 text-[11px] text-slate-300 italic leading-relaxed">
            “{detail.after.excerpt}”
          </p>
          <div className="mt-auto pt-2.5">
            <a
              href={detail.after.source_url}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] font-mono text-slate-400 hover:text-emerald-300 underline truncate block"
            >
              Source: handbook/expenses.md
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
