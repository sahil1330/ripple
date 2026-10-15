"use client";

import React, { useEffect, useState } from "react";
import { ExplainResponse, GraphNode } from "@/lib/types";
import { explainPath } from "@/lib/api";

interface WhyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNodeId: string | null;
  tenant: string;
  changeId: string;
  nodes?: GraphNode[];
}

export default function WhyDrawer({
  isOpen,
  onClose,
  selectedNodeId,
  tenant,
  changeId,
  nodes = [],
}: WhyDrawerProps) {
  const [explainData, setExplainData] = useState<ExplainResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !selectedNodeId) {
      setExplainData(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    explainPath(tenant, changeId, selectedNodeId)
      .then((data) => {
        if (isMounted) {
          setExplainData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Failed to fetch explain path:", err);
          setError("Failed to resolve explanation path from FalkorDB");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedNodeId, tenant, changeId]);

  if (!isOpen || !selectedNodeId) return null;

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  const handleCopyCypher = () => {
    if (!explainData?.cypher) return;
    navigator.clipboard.writeText(explainData.cypher);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getNodeKindColor = (id: string, defaultKind?: string) => {
    const kind = defaultKind || (id.includes(":") ? id.split(":")[0] : "");
    switch (kind.toLowerCase()) {
      case "change":
      case "chg":
        return "bg-rose-500/20 text-rose-300 border-rose-500/30";
      case "factversion":
      case "fv":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "person":
        return "bg-sky-500/20 text-sky-300 border-sky-500/30";
      case "agent":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      case "doc":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "plan":
      case "action":
        return "bg-teal-500/20 text-teal-300 border-teal-500/30";
      default:
        return "bg-slate-700/40 text-slate-300 border-slate-600/30";
    }
  };

  return (
    <div
      className="absolute inset-y-0 right-0 z-30 flex w-96 max-w-full flex-col border-l border-slate-800 bg-slate-950/95 shadow-2xl backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Why is this impacted explanation drawer"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-indigo-500/20 text-xs font-bold text-indigo-400">
            ?
          </span>
          <div>
            <h2 className="text-xs font-semibold text-slate-100">Why is this impacted?</h2>
            <p className="text-[10px] text-slate-400">Explainable FalkorDB dependency trail</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
          title="Close drawer"
        >
          <span className="text-sm font-bold">✕</span>
        </button>
      </div>

      {/* Target Entity Overview */}
      <div className="border-b border-slate-800/80 bg-slate-900/30 px-4 py-3">
        <div className="text-[10px] uppercase tracking-wider text-slate-400">Target Entity</div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="font-mono text-xs font-semibold text-indigo-300 break-all">
            {selectedNodeId}
          </span>
          {selectedNode && (
            <span
              className={`rounded border px-2 py-0.5 text-[10px] font-medium uppercase ${getNodeKindColor(
                selectedNode.id,
                selectedNode.kind
              )}`}
            >
              {selectedNode.kind}
            </span>
          )}
        </div>
        {selectedNode?.label && selectedNode.label !== selectedNode.id && (
          <div className="mt-1 text-xs text-slate-300">{selectedNode.label}</div>
        )}
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent mb-2"></div>
            <span className="text-xs font-mono">Tracing graph path...</span>
          </div>
        )}

        {error && (
          <div className="rounded border border-rose-800/50 bg-rose-950/30 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        {!loading && explainData && (
          <>
            {/* Path Hops Chain */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-wide uppercase text-slate-400">
                  Dependency Path ({explainData.hops.length} Hops)
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {explainData.hops[0]} → {explainData.hops[explainData.hops.length - 1]}
                </span>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 space-y-2">
                {explainData.hops.map((hop, idx) => {
                  const viaRel = explainData.via[idx];
                  return (
                    <div key={`hop-${hop}-${idx}`} className="flex flex-col">
                      {/* Hop Node Card */}
                      <div className="flex items-center justify-between rounded bg-slate-850 border border-slate-700/60 px-3 py-2 text-xs">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 font-mono text-[10px] font-bold text-slate-300">
                            {idx + 1}
                          </span>
                          <span className="font-mono text-slate-200 truncate">{hop}</span>
                        </div>
                        <span
                          className={`rounded border px-1.5 py-0.5 text-[9px] font-medium uppercase shrink-0 ${getNodeKindColor(
                            hop
                          )}`}
                        >
                          {hop.split(":")[0] || "Entity"}
                        </span>
                      </div>

                      {/* Relationship Connector */}
                      {viaRel && (
                        <div className="my-1 flex items-center justify-center gap-1.5 text-slate-500">
                          <div className="h-3 w-px bg-indigo-500/40"></div>
                          <span className="rounded bg-indigo-950/80 border border-indigo-700/50 px-2 py-0.5 font-mono text-[9px] font-bold text-indigo-300 tracking-wider">
                            :{viaRel}
                          </span>
                          <div className="h-3 w-px bg-indigo-500/40"></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Explanatory Narrative */}
            <div className="rounded-lg border border-indigo-950/60 bg-indigo-950/20 p-3 text-xs text-indigo-200/90 leading-relaxed">
              <span className="font-semibold text-indigo-300">Explainable Impact: </span>
              Change <code className="text-rose-300 font-mono">{explainData.hops[0]}</code> introduced a new fact
              version that superseded stale state. Target entity{" "}
              <code className="text-amber-300 font-mono">
                {explainData.hops[explainData.hops.length - 1]}
              </code>{" "}
              was reached across {explainData.hops.length - 1} relationship hops via{" "}
              <span className="font-mono text-indigo-300">{explainData.via.join(" → ")}</span>.
            </div>

            {/* Cypher Query Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-wide uppercase text-slate-400">
                  FalkorDB Cypher Query
                </span>
                <button
                  onClick={handleCopyCypher}
                  className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
                >
                  {copied ? "Copied!" : "Copy Cypher"}
                </button>
              </div>

              <div className="relative rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] text-emerald-400 leading-relaxed overflow-x-auto selection:bg-emerald-900 selection:text-white">
                <pre className="whitespace-pre-wrap">{explainData.cypher}</pre>
              </div>
              <p className="text-[10px] text-slate-500 leading-normal">
                Query executed on tenant graph to compute explainable shortestPath between root change and dependent entity.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-800 bg-slate-900/40 px-4 py-2 text-right">
        <button
          onClick={onClose}
          className="rounded border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
        >
          Close
        </button>
      </div>
    </div>
  );
}
