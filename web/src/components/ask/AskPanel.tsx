"use client";

import React, { useState } from "react";
import { AskResponse } from "@/lib/types";
import { askConcierge } from "@/lib/api";
import {
  IconBrain,
  IconSend,
  IconExternalLink,
  IconRotateCcw,
  IconCheckCircle2,
  IconSparkles,
} from "@/components/ui/icons";

interface AskPanelProps {
  tenant: string;
  onSelectNode?: (nodeId: string) => void;
  className?: string;
}

interface Persona {
  id: string;
  name: string;
  role: string;
  avatarBg: string;
  staleFact: boolean;
  staleNote: string;
}

const PEOPLE: Persona[] = [
  {
    id: "person:priya",
    name: "Priya Sharma",
    role: "Engineering Lead",
    avatarBg: "from-amber-500 to-rose-500",
    staleFact: true,
    staleNote: "Holds v1 ($150/yr personal VPN)",
  },
  {
    id: "person:alex",
    name: "Alex Chen",
    role: "Security Analyst",
    avatarBg: "from-sky-500 to-indigo-500",
    staleFact: false,
    staleNote: "No prior VPN answer",
  },
  {
    id: "person:marcus",
    name: "Marcus Vance",
    role: "DevOps Engineer",
    avatarBg: "from-emerald-500 to-teal-500",
    staleFact: false,
    staleNote: "No prior VPN answer",
  },
];

const PRESETS = [
  "Can I expense my personal VPN subscription?",
  "What is the policy on NordLayer company VPN?",
  "Is ExpressVPN reimbursable under the new policy?",
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
    <div
      className={`border-t border-slate-800/90 bg-slate-950/90 p-4 backdrop-blur-md ${className}`}
    >
      {/* Top Header Row with Persona Selection */}
      <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-400">
            <IconBrain className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Concierge • Episodic Memory Q&amp;A
              </h3>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Tracks exactly what each person was told via FalkorDB <code className="text-indigo-300 font-mono">:WAS_TOLD</code> edges
            </p>
          </div>
        </div>

        {/* Persona Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[10px] font-semibold uppercase text-slate-400 mr-1 shrink-0">
            Persona:
          </span>
          {PEOPLE.map((p) => {
            const isSelected = p.id === askPerson;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setAskPerson(p.id);
                  setResult(null);
                }}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition shrink-0 ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-950/60 text-white shadow-md shadow-indigo-950/50 ring-1 ring-indigo-500/40"
                    : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <div
                  className={`flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-tr ${p.avatarBg} text-[9px] font-bold text-white`}
                >
                  {p.name.charAt(0)}
                </div>
                <span className="font-medium text-[11px]">{p.name}</span>
                {p.staleFact && (
                  <span className="flex h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" title="Holds stale v1" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preset Query Quick Chips */}
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
          <IconSparkles className="w-3 h-3 text-indigo-400" />
          Suggested:
        </span>
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setQuestion(preset)}
            className="rounded-full border border-slate-800 bg-slate-900/80 px-2.5 py-0.5 text-[11px] text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Question Input Form */}
      <form onSubmit={handleAsk} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={`Ask a question as ${currentPerson.name}...`}
            className="w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition shadow-inner"
          />
        </div>
        <button
          type="submit"
          disabled={isAsking}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/30 transition hover:bg-indigo-500 active:scale-95 disabled:opacity-50 shrink-0"
        >
          {isAsking ? (
            <>
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Querying...</span>
            </>
          ) : (
            <>
              <IconSend className="w-3.5 h-3.5" />
              <span>Ask Concierge</span>
            </>
          )}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="mt-3 rounded-lg border border-rose-800/50 bg-rose-950/40 p-3 text-xs text-rose-300 animate-in fade-in duration-150">
          {error}
        </div>
      )}

      {/* Response Display Box */}
      {result && (
        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs space-y-3 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Episodic Memory Invalidation Callout (Hero Ripple Feature) */}
          {result.earlier_told ? (
            <div className="rounded-lg border border-amber-500/40 bg-gradient-to-r from-amber-950/40 to-slate-900/40 p-3 text-amber-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-amber-300 text-xs">
                  <IconRotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Episodic Memory Invalidation Detected</span>
                </div>
                <span className="rounded bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 font-mono text-[9px] font-bold text-amber-300">
                  :WAS_TOLD
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-amber-100/90 leading-relaxed">
                <span className="font-semibold text-amber-300">
                  &ldquo;Earlier I told you:
                </span>{" "}
                {result.earlier_told.value}. That changed on {formatTimestamp(result.earlier_told.at)}.&rdquo;
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-amber-400/80 font-mono">
                <span>Superseded: {result.earlier_told.version_id}</span>
                <span>•</span>
                <span>Recipient: {currentPerson.name}</span>
                <span>•</span>
                <span>Channel: handbook-qa</span>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-2.5 text-emerald-300 text-[11px] flex items-center gap-2">
              <IconCheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Fresh inquiry for <strong className="text-white">{currentPerson.name}</strong> • No prior conflicting fact version in memory
              </span>
            </div>
          )}

          {/* Current Policy Answer */}
          <div className="rounded-lg border border-slate-800/80 bg-slate-950/70 p-3 text-slate-100 leading-relaxed text-xs">
            <span className="font-bold text-indigo-400 mr-1.5">Answer:</span>
            {result.answer}
          </div>

          {/* Metadata & Verification Footer */}
          <div className="flex flex-wrap items-center justify-between border-t border-slate-800/80 pt-2 text-[11px] text-slate-400 gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-400">Cited FactVersion:</span>
              {result.versions.map((ver) => (
                <button
                  key={ver}
                  type="button"
                  onClick={() => onSelectNode?.(ver)}
                  className="rounded-md bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 font-mono text-[10px] text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-400 transition"
                  title="Highlight node in graph canvas"
                >
                  {ver} ↗
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 font-mono text-[10px]">
              {result.source_url && (
                <a
                  href={result.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 hover:underline"
                >
                  <span>GitLab Source</span>
                  <IconExternalLink className="w-3 h-3" />
                </a>
              )}
              {result.answer_id && (
                <span className="text-slate-400">
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
