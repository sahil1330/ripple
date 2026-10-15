"use client";

import React, { useEffect, useState } from "react";
import { DemoStepResponse } from "@/lib/types";

interface DemoStepperProps {
  stepInfo: DemoStepResponse | null;
  onNext: () => void;
  onReset: () => void;
  onJumpStep?: (stepIndex: number) => void;
  className?: string;
}

const SCRIPT_PROMPTS: Record<number, string> = {
  1: "Baseline: Ripple remembers what it told you, and which version.",
  2: "Sentinel: Real policy change from GitLab public handbook (MR !20421).",
  3: "Tracer: Multi-hop impact in one FalkorDB traversal across FEEDS edges.",
  4: "HERO MOMENT: AP Approver tries to act on stale fact → Freshness Guard BLOCKS it via MCP.",
  5: "Concierge: Re-answers Priya with 'Earlier I told you $150/year; that changed on Jul 15'.",
  6: "Fixer: Refreshes agent memory cache to v2. Coordination via Task nodes in FalkorDB.",
  7: "Fixer: Drafts handbook markdown patches citing new FactVersion v2.",
  8: "Replan: Approval action safely replanned with NordLayer company VPN.",
  9: "100% Coverage Reached: Explainable graph trail preserved from root change to holders.",
};

export default function DemoStepper({
  stepInfo,
  onNext,
  onReset,
  onJumpStep,
  className = "",
}: DemoStepperProps) {
  const [autoPlay, setAutoPlay] = useState<boolean>(false);
  const currentStep = stepInfo?.step ?? 1;
  const totalSteps = stepInfo?.total_steps ?? 9;

  // Auto-play effect
  useEffect(() => {
    if (!autoPlay) return;
    if (currentStep >= totalSteps) {
      setAutoPlay(false);
      return;
    }

    const timer = setTimeout(() => {
      onNext();
    }, 3500);

    return () => clearTimeout(timer);
  }, [autoPlay, currentStep, totalSteps, onNext]);

  // Global hotkey: Space or ArrowRight to advance, 'R' to reset
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === " " || e.key === "ArrowRight") {
        e.preventDefault();
        onNext();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        onReset();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNext, onReset]);

  const progressPct = Math.round((currentStep / totalSteps) * 100);
  const scriptPrompt = SCRIPT_PROMPTS[currentStep] || "";

  return (
    <div
      className={`rounded-xl border border-indigo-500/40 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md ${className}`}
      role="region"
      aria-label="Demo mode interactive stepper"
    >
      {/* Top Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-xs font-bold text-white shadow-sm">
            ▶
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-slate-100">
                Demo Stepper: C1 Personal VPN Policy
              </h2>
              <span className="rounded bg-indigo-500/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-indigo-300">
                Step {currentStep} of {totalSteps} ({progressPct}%)
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Deterministic scenario walkthrough for live judging &amp; 1080p video recording
            </p>
          </div>
        </div>

        {/* Stepper Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoPlay(!autoPlay)}
            className={`rounded px-2.5 py-1 text-xs font-semibold transition ${
              autoPlay
                ? "bg-amber-600 text-white shadow-sm"
                : "border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
            title="Auto-advance through demo steps every 3.5s"
          >
            {autoPlay ? "⏸ Pause Auto" : "▶ Auto-Play"}
          </button>
          <button
            type="button"
            onClick={onReset}
            className="rounded border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white active:scale-95"
            title="Reset scenario to step 1 (Hotkey: R)"
          >
            Reset ↺
          </button>
          <button
            type="button"
            onClick={onNext}
            className="flex items-center gap-1.5 rounded bg-indigo-600 px-4 py-1 text-xs font-bold text-white shadow-md shadow-indigo-600/30 transition hover:bg-indigo-500 active:scale-95"
            title="Advance to next step (Hotkey: Space or →)"
          >
            <span>Next ▶</span>
            <kbd className="rounded bg-indigo-800/80 px-1 font-mono text-[9px] text-indigo-200">
              Space
            </kbd>
          </button>
        </div>
      </div>

      {/* Progress Bar & Step Dots */}
      <div className="mt-3 space-y-1.5">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex justify-between px-1">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((stepNum) => {
            const isCompleted = stepNum < currentStep;
            const isCurrent = stepNum === currentStep;
            return (
              <button
                key={stepNum}
                type="button"
                onClick={() => onJumpStep?.(stepNum)}
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold transition ${
                  isCurrent
                    ? "bg-indigo-500 text-white ring-2 ring-indigo-300 ring-offset-1 ring-offset-slate-900"
                    : isCompleted
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-300"
                }`}
                title={`Jump to Step ${stepNum}`}
              >
                {stepNum}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Description & Script Callout */}
      {stepInfo && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs">
          <div>
            <div className="font-semibold text-indigo-300">
              {stepInfo.name}
            </div>
            <p className="mt-1 text-slate-300 leading-relaxed">
              {stepInfo.description}
            </p>
          </div>
          <div className="rounded border border-indigo-950/70 bg-indigo-950/30 p-2 text-indigo-200">
            <span className="font-bold text-indigo-400">Presenter Script: </span>
            <span className="italic leading-relaxed">&ldquo;{scriptPrompt}&rdquo;</span>
          </div>
        </div>
      )}
    </div>
  );
}
