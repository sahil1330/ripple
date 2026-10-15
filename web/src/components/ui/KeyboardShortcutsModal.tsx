"use client";

import React, { useEffect } from "react";
import { IconX } from "./icons";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const SHORTCUTS = [
    { key: "Space / →", desc: "Advance to the next demo step" },
    { key: "R", desc: "Reset demo scenario to baseline (pre-change)" },
    { key: "?", desc: "Toggle this keyboard shortcuts dialog" },
    { key: "Esc", desc: "Close Why Drawer or dialog overlays" },
    { key: "Click Node", desc: "Select node in canvas & open explainability drawer" },
    { key: "Drag Node", desc: "Reposition graph nodes dynamically in force layout" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/30 text-indigo-400 border border-indigo-500/30">
              ⌨️
            </span>
            <h3 className="text-sm font-bold text-white">Keyboard Shortcuts &amp; Controls</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 divide-y divide-slate-800/60">
          {SHORTCUTS.map((s, idx) => (
            <div key={idx} className="flex items-center justify-between py-2.5 text-xs">
              <span className="text-slate-300 font-medium">{s.desc}</span>
              <kbd className="rounded-md border border-slate-700 bg-slate-800/80 px-2 py-1 font-mono text-[11px] font-semibold text-indigo-300 shadow-inner">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-indigo-900/40 bg-indigo-950/20 p-3 text-[11px] text-slate-400">
          <span className="font-semibold text-indigo-300">💡 Pro Tip for Demo:</span> Pressing{" "}
          <kbd className="rounded bg-slate-800 px-1 py-0.5 font-mono text-[10px] text-white">Space</kbd> walks
          through the complete 6-stage policy change replay with pulsing impact halos and freshness blocks.
        </div>
      </div>
    </div>
  );
}

export default KeyboardShortcutsModal;

