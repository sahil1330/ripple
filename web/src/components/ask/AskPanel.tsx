"use client";

import React, { useState } from "react";
import { AskResponse } from "@/lib/types";
import { askConcierge } from "@/lib/api";

interface AskPanelProps {
  tenant: string;
  onSelectNode?: (nodeId: string) => void;
  className?: string;
}

const PEOPLE = [
  {
    id: "person:priya",
    name: "Priya Sharma",
    role: "Engineering Lead",
    staleFact: true,
  },
  {
    id: "person:alex",
    name: "Alex Chen",
    role: "Security Analyst",
    staleFact: false,
  },
  {
    id: "person:marcus",
    name: "Marcus Vance",
    role: "DevOps Engineer",
    staleFact: false,
  },
];

const PRESETS = [
  "Can I expense my personal VPN subscription?",
  "What is the policy on NordLayer company VPN?",
  "Is ExpressVPN reimbursable?",
];

export default function AskPanel({
  tenant,
  onSelectNode,
  className = "",
}: AskPanelProps) {
  const [askPerson, setAskPerson] = useState<string>("person:priya");
  const [question, setQuestion] = useState<string>(
    "Can I expense my personal VPN subscription?"
  );
  const [result, setResult] = useState<AskResponse | null>(null);
  const [isAsking, setIsAsking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const currentPerson = PEOPLE.find((p) => p.id === askPerson) || PEOPLE[0];

  const handleAsk = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!question.trim()) return;

    setIsAsking(true);
    setError(null);

    try {
      const res = await askConcierge(tenant, askPerson, question);
      setResult(res);
    } catch (err: unknown) {
      console.error("Ask query failed:", err);
      const msg = err instanceof Error ? err.message : "Failed to query Concierge";
      setError(msg);
    } finally {
      setIsAsking(false);
    }
  };

  const formatTimestamp = (epochMs: number) => {
    return new Date(epochMs).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className={`border-t border-slate-800 bg-slate-900/60 p-4 ${className}`}>
      {/* Top Header Row */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
          <h3 className="text-xs font-semibold text-slate-200">
            Concierge (Episodic Memory Q&amp;A)
          </h3>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            • Remembers prior answers per person
          </span>
        </div>

        {/* Persona Selector */}
        <div className="flex items-center gap-2 text-xs">
          <label htmlFor="persona-select" className="text-slate-400 text-[11px]">
            Asking as:
          </label>
          <select
            id="persona-select"
            value={askPerson}
            onChange={(e) => {
              setAskPerson(e.target.value);
              setResult(null);
            }}
            className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200 outline-none focus:border-indigo-500"
          >
            {PEOPLE.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.role}) {p.staleFact ? "• Holds v1" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Preset Query Chips */}
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">
          Quick Prompts:
        </span>
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setQuestion(preset)}
            className="rounded-full border border-slate-700/80 bg-slate-800/60 px-2.5 py-0.5 text-[10px] text-slate-300 transition hover:border-slate-600 hover:bg-slate-700 hover:text-white"
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Query Input Bar */}
      <form onSubmit={handleAsk} className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a policy question..."
          className="flex-1 rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={isAsking}
          className="rounded bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {isAsking ? "Querying..." : "Ask"}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="mt-3 rounded border border-rose-800/40 bg-rose-950/30 p-2.5 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Response Box */}
      {result && (
        <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/80 p-3.5 text-xs space-y-2.5">
          {/* Episodic Memory Correction Callout (Key Ripple Feature) */}
          {result.earlier_told ? (
            <div className="rounded-md border border-amber-500/40 bg-amber-950/30 p-3 text-amber-200">
              <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500/20 text-[10px]">
                  ↺
                </span>
                <span>Episodic Memory Invalidation</span>
              </div>
              <p className="mt-1 text-[11px] text-amber-100/90 leading-relaxed">
                <span className="font-semibold text-amber-300">Earlier I told you: </span>
                {result.earlier_told.value}. That changed on {formatTimestamp(result.earlier_told.at)}.
              </p>
              <div className="mt-1.5 flex items-center gap-2 text-[10px] text-amber-400/80 font-mono">
                <span>Superseded: {result.earlier_told.version_id}</span>
                <span>•</span>
                <span>FalkorDB :WAS_TOLD edge detected</span>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-emerald-500/20 bg-emerald-950/20 p-2 text-emerald-300 text-[11px] flex items-center gap-1.5">
              <span>✓</span>
              <span>
                Fresh inquiry for {currentPerson.name} (no prior conflicting fact version in memory)
              </span>
            </div>
          )}

          {/* Current Answer */}
          <div className="text-slate-200 leading-relaxed text-xs">
            {result.answer}
          </div>

          {/* Metadata & Verification Footer */}
          <div className="flex flex-wrap items-center justify-between border-t border-slate-800/80 pt-2 text-[11px] text-slate-400 gap-2">
            <div className="flex items-center gap-2">
              <span>Cited FactVersion:</span>
              {result.versions.map((ver) => (
                <button
                  key={ver}
                  type="button"
                  onClick={() => onSelectNode?.(ver)}
                  className="rounded bg-indigo-500/10 border border-indigo-500/30 px-1.5 py-0.5 font-mono text-[10px] text-indigo-300 hover:bg-indigo-500/20 transition"
                  title="View node in graph"
                >
                  {ver}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {result.source_url && (
                <a
                  href={result.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 underline hover:text-indigo-300"
                >
                  View Source Diff ↗
                </a>
              )}
              {result.answer_id && (
                <span className="font-mono text-[10px] text-slate-400">
                  id: {result.answer_id}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
