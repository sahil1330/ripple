"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { GraphNode, NodeKind } from "@/lib/types";

// Dynamic import with SSR disabled for Next.js App Router
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-xs text-slate-500 font-mono">
      <span className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
        Initializing FalkorDB neural canvas...
      </span>
    </div>
  ),
});

export const KIND_COLORS: Record<NodeKind, string> = {
  Fact: "#3b82f6",
  FactVersion: "#8b5cf6",
  Change: "#f59e0b",
  Doc: "#10b981",
  DerivedFact: "#06b6d4",
  Plan: "#6366f1",
  Action: "#ef4444",
  Person: "#ec4899",
  Team: "#14b8a6",
  Agent: "#f97316",
  Task: "#eab308",
  Answer: "#a855f7",
};

export interface CanvasGraphData {
  nodes: (GraphNode & { x?: number; y?: number })[];
  links: { source: string | GraphNode; target: string | GraphNode; type: string }[];
}

export interface CanvasNodeObject extends GraphNode {
  x?: number;
  y?: number;
}

interface GraphCanvasProps {
  nodes: GraphNode[];
  links: { source: string; target: string; type: string }[];
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string | null) => void;
}

export default function GraphCanvas({
  nodes,
  links,
  selectedNodeId,
  onSelectNode,
}: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedKindFilter, setSelectedKindFilter] = useState<string | null>(null);
  const [isLegendExpanded, setIsLegendExpanded] = useState<boolean>(
    () => typeof window === "undefined" || window.innerWidth >= 768
  );
  const fitted = useRef(false);

  useEffect(() => {
    function updateDimensions() {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth || 600,
          height: containerRef.current.clientHeight || 400,
        });
      }
    }
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Compute node count per kind for the legend
  const kindCounts = useMemo(() => {
    const counts: Partial<Record<NodeKind, number>> = {};
    nodes.forEach((n) => {
      counts[n.kind] = (counts[n.kind] || 0) + 1;
    });
    return counts;
  }, [nodes]);

  // Filter or highlight nodes
  const filteredNodes = useMemo(() => {
    if (!selectedKindFilter && !searchQuery.trim()) {
      return nodes;
    }
    const q = searchQuery.toLowerCase().trim();
    return nodes.filter((n) => {
      const matchKind = selectedKindFilter ? n.kind === selectedKindFilter : true;
      const matchQuery = q ? n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q) : true;
      return matchKind && matchQuery;
    });
  }, [nodes, selectedKindFilter, searchQuery]);

  const graphData: CanvasGraphData = useMemo(() => {
    return {
      nodes: filteredNodes.map((n) => ({ ...n })),
      links: links.map((l) => ({ ...l })),
    };
  }, [filteredNodes, links]);

  const handleZoomIn = () => {
    if (fgRef.current) {
      fgRef.current.zoom(fgRef.current.zoom() * 1.35, 300);
    }
  };

  const handleZoomOut = () => {
    if (fgRef.current) {
      fgRef.current.zoom(fgRef.current.zoom() / 1.35, 300);
    }
  };

  const handleZoomReset = () => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(400, 30);
    }
  };

  return (
    <div ref={containerRef} className="relative h-full w-full touch-none overflow-hidden bg-slate-950">
      {/* Top Floating Toolbar (Search & Filters) */}
      <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2">
        {/* Search Input */}
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-1 backdrop-blur shadow-md text-xs">
          <span className="text-slate-400">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search nodes by label or ID..."
            className="min-h-11 w-40 bg-transparent text-[16px] text-slate-100 sm:w-48 xl:min-h-0 xl:text-xs placeholder-slate-500 outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-slate-500 hover:text-slate-300"
            >
              ✕
            </button>
          )}
        </div>

        {/* Legend Toggle Button */}
        <button
          onClick={() => setIsLegendExpanded(!isLegendExpanded)}
          className={`min-h-11 rounded-lg border px-2.5 py-1 text-xs font-medium xl:min-h-0 transition backdrop-blur shadow-md ${
            isLegendExpanded
              ? "border-indigo-500/40 bg-indigo-950/60 text-indigo-300"
              : "border-slate-800 bg-slate-900/90 text-slate-400 hover:text-slate-200"
          }`}
        >
          {isLegendExpanded ? "▾ Hide Legend" : "▸ Show Legend"}
        </button>

        {selectedKindFilter && (
          <button
            onClick={() => setSelectedKindFilter(null)}
            className="min-h-11 rounded-lg border border-rose-800/60 xl:min-h-0 bg-rose-950/50 px-2 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-900/70 transition"
          >
            Clear Filter: {selectedKindFilter} ✕
          </button>
        )}
      </div>

      {/* Floating Canvas Zoom Controls */}
      <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-20 flex flex-col gap-1.5 rounded-lg border border-slate-800 bg-slate-900/90 p-1 backdrop-blur shadow-xl">
        <button
          onClick={handleZoomIn}
          className="flex h-11 w-11 xl:h-8 xl:w-8 items-center justify-center rounded-md text-slate-300 hover:bg-slate-800 hover:text-white transition font-bold"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          className="flex h-11 w-11 xl:h-8 xl:w-8 items-center justify-center rounded-md text-slate-300 hover:bg-slate-800 hover:text-white transition font-bold"
          title="Zoom Out"
        >
          −
        </button>
        <div className="h-px w-full bg-slate-800" />
        <button
          onClick={handleZoomReset}
          className="flex h-11 w-11 xl:h-8 xl:w-8 items-center justify-center rounded-md text-[11px] font-mono text-slate-300 hover:bg-slate-800 hover:text-white transition"
          title="Recenter / Fit All"
        >
          ⛶
        </button>
      </div>

      {/* Interactive Collapsible Legend */}
      {isLegendExpanded && (
        <div className="absolute top-12 left-3 z-10 max-w-xl flex flex-wrap gap-1.5 rounded-xl border border-slate-800/80 bg-slate-900/90 p-2.5 backdrop-blur shadow-xl animate-in fade-in">
          {(Object.keys(KIND_COLORS) as NodeKind[]).map((kind) => {
            const count = kindCounts[kind] || 0;
            if (count === 0) return null;
            const isFilterActive = selectedKindFilter === kind;

            return (
              <button
                key={kind}
                onClick={() => setSelectedKindFilter(isFilterActive ? null : kind)}
                className={`flex min-h-11 items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-mono xl:min-h-0 transition ${
                  isFilterActive
                    ? "bg-indigo-600 text-white shadow-md ring-1 ring-white/20"
                    : "border border-slate-800/80 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-800/80"
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: KIND_COLORS[kind] }}
                />
                <span className="font-semibold">{kind}</span>
                <span className="text-[10px] text-slate-400">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        cooldownTicks={150}
        onEngineStop={() => {
          if (!fitted.current && fgRef.current) {
            fitted.current = true;
            fgRef.current.zoomToFit(400, 24);
          }
        }}
        backgroundColor="#060911"
        nodeId="id"
        linkSource="source"
        linkTarget="target"
        linkColor={() => "rgba(71, 85, 105, 0.45)"}
        linkWidth={1.5}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={1.5}
        linkDirectionalParticleSpeed={0.004}
        linkDirectionalParticleColor={() => "rgba(129, 140, 248, 0.8)"}
        nodeCanvasObject={(node, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const item = node as CanvasNodeObject;
          const x = item.x ?? 0;
          const y = item.y ?? 0;
          const isSelected = selectedNodeId === item.id;
          const label = item.label || item.id;
          const fontSize = Math.max(10 / globalScale, 3);
          const radius = isSelected ? 8.5 : 6.5;
          const isImpacted = item.status === "impacted" || item.status === "blocked";
          const isResolved = item.status === "resolved";
          const color = KIND_COLORS[item.kind] || "#94a3b8";

          // Pulsing Red Halo for Impacted / Blocked Nodes (scaled by risk)
          if (isImpacted) {
            const riskScale = item.risk ? Math.min(item.risk / 5, 4) : 1.5;
            const pulse = (Math.sin(Date.now() / 250) + 1) / 2; // 0..1 smooth wave
            const pulseRadius = radius + 3 + riskScale * 2 + pulse * 4;

            ctx.beginPath();
            ctx.arc(x, y, pulseRadius, 0, 2 * Math.PI, false);
            ctx.fillStyle = `rgba(239, 68, 68, ${0.15 + pulse * 0.18})`;
            ctx.fill();
            ctx.lineWidth = 1.2 / globalScale;
            ctx.strokeStyle = `rgba(239, 68, 68, ${0.5 + pulse * 0.45})`;
            ctx.stroke();
          }

          // Glowing Green Aura for Resolved Nodes
          if (isResolved) {
            ctx.beginPath();
            ctx.arc(x, y, radius + 4.5, 0, 2 * Math.PI, false);
            ctx.fillStyle = "rgba(16, 185, 129, 0.28)";
            ctx.fill();
            ctx.lineWidth = 1.5 / globalScale;
            ctx.strokeStyle = "#10b981";
            ctx.stroke();
          }

          // Selection highlight ring
          if (isSelected) {
            ctx.beginPath();
            ctx.arc(x, y, radius + 5.5, 0, 2 * Math.PI, false);
            ctx.fillStyle = "rgba(99, 102, 241, 0.35)";
            ctx.fill();
            ctx.lineWidth = 2 / globalScale;
            ctx.strokeStyle = "#818cf8";
            ctx.stroke();
          }

          // Main Node Circle
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
          ctx.fillStyle = isResolved ? "#10b981" : isImpacted ? "#ef4444" : color;
          ctx.fill();
          ctx.lineWidth = 1.2 / globalScale;
          ctx.strokeStyle = isResolved ? "#a7f3d0" : isImpacted ? "#fecaca" : "#ffffff";
          ctx.stroke();

          // Synthetic Badge indicator [S]
          if (item.synthetic) {
            ctx.font = `bold ${Math.max(6.5 / globalScale, 2.5)}px monospace`;
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("S", x, y);
          }

          // Node Label
          ctx.font = `${fontSize}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillStyle = isSelected ? "#ffffff" : isImpacted ? "#fca5a5" : "#94a3b8";
          ctx.fillText(label, x, y + radius + 2.5);
        }}
        nodePointerAreaPaint={(node, color: string, ctx: CanvasRenderingContext2D) => {
          const item = node as CanvasNodeObject;
          const x = item.x ?? 0;
          const y = item.y ?? 0;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, 12, 0, 2 * Math.PI, false);
          ctx.fill();
        }}
        onNodeClick={(node) => {
          const item = node as CanvasNodeObject;
          if (onSelectNode) {
            onSelectNode(item.id === selectedNodeId ? null : item.id);
          }
        }}
        onBackgroundClick={() => {
          if (onSelectNode) {
            onSelectNode(null);
          }
        }}
      />
    </div>
  );
}
