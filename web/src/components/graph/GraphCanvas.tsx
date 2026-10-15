"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { GraphNode, NodeKind } from "@/lib/types";

// Dynamic import with SSR disabled for Next.js App Router
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-xs text-slate-500 font-mono">
      Loading graph canvas...
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
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });

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

  const graphData: CanvasGraphData = {
    nodes: nodes.map((n) => ({ ...n })),
    links: links.map((l) => ({ ...l })),
  };

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-slate-950">
      {/* Legend & Controls */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5 rounded-lg border border-slate-800/80 bg-slate-900/90 p-2 backdrop-blur">
        {(Object.keys(KIND_COLORS) as NodeKind[]).map((kind) => (
          <span
            key={kind}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-300"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: KIND_COLORS[kind] }}
            />
            {kind}
          </span>
        ))}
      </div>

      <ForceGraph2D
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        backgroundColor="#020617"
        nodeId="id"
        linkSource="source"
        linkTarget="target"
        linkColor={() => "#334155"}
        linkWidth={1.5}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        nodeCanvasObject={(node, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const item = node as CanvasNodeObject;
          const x = item.x ?? 0;
          const y = item.y ?? 0;
          const isSelected = selectedNodeId === item.id;
          const label = item.label || item.id;
          const fontSize = Math.max(10 / globalScale, 3);
          const radius = isSelected ? 8 : 6;
          const color = KIND_COLORS[item.kind] || "#94a3b8";

          // Selection highlight ring
          if (isSelected) {
            ctx.beginPath();
            ctx.arc(x, y, radius + 4, 0, 2 * Math.PI, false);
            ctx.fillStyle = "rgba(99, 102, 241, 0.3)";
            ctx.fill();
            ctx.lineWidth = 1.5 / globalScale;
            ctx.strokeStyle = "#818cf8";
            ctx.stroke();
          }

          // Main Node Circle
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.lineWidth = 1 / globalScale;
          ctx.strokeStyle = "#ffffff";
          ctx.stroke();

          // Synthetic Badge indicator [S]
          if (item.synthetic) {
            ctx.font = `bold ${Math.max(6 / globalScale, 2)}px monospace`;
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("S", x, y);
          }

          // Node Label
          ctx.font = `${fontSize}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillStyle = isSelected ? "#ffffff" : "#94a3b8";
          ctx.fillText(label, x, y + radius + 2);
        }}
        nodePointerAreaPaint={(node, color: string, ctx: CanvasRenderingContext2D) => {
          const item = node as CanvasNodeObject;
          const x = item.x ?? 0;
          const y = item.y ?? 0;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, 10, 0, 2 * Math.PI, false);
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
