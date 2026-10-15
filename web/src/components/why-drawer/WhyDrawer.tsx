"use client";

import React, { useEffect, useState } from "react";
import { ExplainResponse, GraphNode } from "@/lib/types";
import { explainPath } from "@/lib/api";
import {
  IconBrain,
  IconCopy,
  IconCheck,
  IconX,
  IconTerminal,
  IconLayers,
  IconZap,
  IconUser,
  IconBot,
  IconFileText,
} from "@/components/ui/icons";

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
        return "bg-rose-500/20 text-rose-300 border-rose-500/40";
      case "factversion":
      case "fv":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      case "person":
        return "bg-sky-500/20 text-sky-300 border-sky-500/40";
      case "agent":
        return "bg-purple-500/20 text-purple-300 border-purple-500/40";
      case "doc":
        return "bg-blue-500/20 text-blue-300 border-blue-500/40";
      case "plan":
      case "action":
        return "bg-teal-500/20 text-teal-300 border-teal-500/40";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  const getNodeKindIcon = (id: string, defaultKind?: string) => {
    const kind = defaultKind || (id.includes(":") ? id.split(":")[0] : "");
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
        return <IconBrain className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  return (
    <div
      className="absolute inset-y-0 right-0 z-40 flex w-96 max-w-full flex-col border-l border-slate-800/90 bg-slate-950/95 shadow-2xl backdrop-blur-xl animate-in slide-in-from-right duration-250"
      role="dialog"
      aria-modal="true"
      aria-label="Why is this impacted explanation drawer"
    >
      {/* Drawer Header */}
      <div className="flex items-center justify-between border-b border-slate-800/90 bg-slate-900/60 px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 font-bold">
            ?
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-100">
              Why is this impacted?
            </h2>
            <p className="text-[10px] text-slate-400">
              Explainable FalkorDB dependency trail
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          title="Close drawer"
        >
          <IconX className="w-4 h-4" />
        </button>
      </div>

      {/* Target Entity Overview Card */}
      <div className="border-b border-slate-800/80 bg-slate-900/40 px-4 py-3">
        <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
          Target Entity
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="font-mono text-xs font-bold text-indigo-300 break-all">
            {selectedNodeId}
          </span>
          {selectedNode && (
            <span
              className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${getNodeKindColor(
                selectedNode.id,
                selectedNode.kind
              )}`}
            >
              {selectedNode.kind}
            </span>
          )}
        </div>
        {selectedNode?.label && selectedNode.label !== selectedNode.id && (
          <div className="mt-1 text-xs text-slate-300 font-medium">
            {selectedNode.label}
          </div>
        )}
      </div>

      {/* Drawer Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent mb-3" />
            <span className="text-xs font-mono">Running shortestPath query in FalkorDB...</span>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-800/50 bg-rose-950/40 p-3.5 text-xs text-rose-300">
            {error}
          </div>
        )}

        {!loading && explainData && (
          <>
            {/* Dependency Trail Timeline */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Dependency Path ({explainData.hops.length} Hops)
                </span>
                <span className="text-[10px] font-mono text-indigo-400 font-semibold">
                  {explainData.hops[0]} → {explainData.hops[explainData.hops.length - 1]}
                </span>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3.5 space-y-2.5">
                {explainData.hops.map((hop, idx) => {
                  const viaRel = explainData.via[idx];
                  return (
                    <div key={`hop-${hop}-${idx}`} className="flex flex-col">
                      {/* Hop Card */}
                      <div className="flex items-center justify-between rounded-lg bg-slate-950/80 border border-slate-800/80 px-3 py-2 text-xs transition hover:border-slate-700">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-800 font-mono text-[10px] font-bold text-slate-300">
                            #{idx + 1}
                          </span>
                          <div className="flex items-center gap-1.5 truncate">
                            {getNodeKindIcon(hop)}
                            <span className="font-mono text-slate-200 truncate font-semibold">
                              {hop}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide border shrink-0 ${getNodeKindColor(
                            hop
                          )}`}
                        >
                          {hop.split(":")[0] || "Entity"}
                        </span>
                      </div>

                      {/* Relationship Connector */}
                      {viaRel && (
                        <div className="my-1.5 flex items-center justify-center gap-2 text-slate-500">
                          <div className="h-3 w-px bg-indigo-500/50" />
                          <span className="rounded-full bg-indigo-950/90 border border-indigo-600/50 px-2.5 py-0.5 font-mono text-[9px] font-bold text-indigo-300 tracking-wider shadow-sm">
                            :{viaRel}
                          </span>
                          <div className="h-3 w-px bg-indigo-500/50" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Narrative Explanation */}
            <div className="rounded-xl border border-indigo-950/70 bg-gradient-to-b from-indigo-950/30 to-slate-950/50 p-3.5 text-xs text-indigo-200/90 leading-relaxed shadow-sm">
              <span className="font-bold text-indigo-300">Explainable Impact: </span>
              Root change <code className="text-rose-300 font-mono font-bold">{explainData.hops[0]}</code> introduced
              a new fact version that superseded stale state. Target entity{" "}
              <code className="text-amber-300 font-mono font-bold">
                {explainData.hops[explainData.hops.length - 1]}
              </code>{" "}
              was reached across {explainData.hops.length - 1} relationship hops via{" "}
              <span className="font-mono text-indigo-300 font-semibold">{explainData.via.join(" → ")}</span>.
            </div>

            {/* Cypher Query Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <IconTerminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>FalkorDB Cypher</span>
                </div>
                <button
                  onClick={handleCopyCypher}
                  className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800/80 px-2 py-1 text-[10px] font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
                >
                  {copied ? (
                    <>
                      <IconCheck className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <IconCopy className="w-3 h-3 text-slate-400" />
                      <span>Copy Cypher</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-3.5 font-mono text-[11px] text-emerald-400 leading-relaxed overflow-x-auto shadow-inner">
                <pre className="whitespace-pre-wrap">{explainData.cypher}</pre>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">
                Direct shortestPath graph traversal query executed in FalkorDB. Ripple preserves an explainable provenance trail for every remediation step.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Drawer Footer */}
      <div className="border-t border-slate-800/80 bg-slate-900/50 px-4 py-2.5 text-right">
        <button
          onClick={onClose}
          className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
        >
          Close Drawer
        </button>
      </div>
    </div>
  );
}
