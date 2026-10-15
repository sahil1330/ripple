"use client";

import React, { useEffect, useState } from "react";
import { DemoStepResponse } from "@/lib/types";
import {
  IconPlay,
  IconRotateCcw,
  IconShieldAlert,
  IconCheck,
  IconChevronRight,
  IconSparkles,
} from "@/components/ui/icons";

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

const STEP_TITLES: Record<number, string> = {
  1: "Baseline Graph",
  2: "Sentinel Detection",
  3: "Tracer Impact Walk",
  4: "Freshness Guard Block",
  5: "Concierge Re-Answer",
  6: "Agent Cache Refresh",
  7: "Handbook Doc Patch",
  8: "Action Replan",
  9: "100% Coverage",
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
    }, 3800);

    return () => clearTimeout(timer);
  }, [autoPlay, currentStep, totalSteps, onNext]);

  // Global hotkeys: Space or ArrowRight to advance, 'R' to reset
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
  const isHeroStep = currentStep === 4;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border transition-all duration-300 p-4 shadow-2xl backdrop-blur-xl ${
        isHeroStep
          ? "border-rose-500/60 bg-gradient-to-r from-slate-950 via-rose-950/20 to-slate-950 shadow-rose-950/40"
          : "border-indigo-500/30 bg-slate-950/90 shadow-indigo-950/30"
      } ${className}`}
      role="region"
      aria-label="Demo mode interactive stepper"
    >
      {/* Top Header & Interactive Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-xl font-bold shadow-md ${
              isHeroStep
                ? "bg-rose-600 text-white shadow-rose-600/40 animate-pulse"
                : "bg-indigo-600 text-white shadow-indigo-600/30"
            }`}
          >
            {isHeroStep ? <IconShieldAlert className="w-4 h-4" /> : <IconPlay className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                Demo Walkthrough: C1 Personal VPN Policy
              </h2>
              <span
                className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold border ${
                  isHeroStep
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                    : "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                }`}
              >
                Step {currentStep} of {totalSteps} ({progressPct}%)
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Deterministic scenario walkthrough for live judging &amp; 1080p video demo
            </p>
          </div>
        </div>

        {/* Stepper Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoPlay(!autoPlay)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              autoPlay
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/40 animate-pulse"
                : "border border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
            title="Auto-advance through demo steps every 3.8s"
          >
            <span>{autoPlay ? "⏸ Pause Auto" : "▶ Auto-Play"}</span>
          </button>

          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white active:scale-95"
            title="Reset scenario to step 1 (Hotkey: R)"
          >
            <IconRotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
            <kbd className="rounded bg-slate-750 px-1 font-mono text-[9px] text-slate-400">
              R
            </kbd>
          </button>

          <button
            type="button"
            onClick={onNext}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold text-white shadow-lg transition active:scale-95 ${
              isHeroStep
                ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/40"
                : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30"
            }`}
            title="Advance to next step (Hotkey: Space or →)"
          >
            <span>Next Step</span>
            <IconChevronRight className="w-3.5 h-3.5" />
            <kbd className="rounded bg-white/20 px-1 font-mono text-[9px] text-white">
              Space
            </kbd>
          </button>
        </div>
      </div>

      {/* Progress Bar & Interactive Step Nodes */}
      <div className="mt-3.5 space-y-2">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-900 p-0.5 ring-1 ring-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isHeroStep
                ? "bg-gradient-to-r from-indigo-500 via-rose-500 to-amber-400"
                : "bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400"
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Step Nodes Row */}
        <div className="flex justify-between items-center px-1">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((stepNum) => {
            const isCompleted = stepNum < currentStep;
            const isCurrent = stepNum === currentStep;
            const isStepHero = stepNum === 4;
            return (
              <button
                key={stepNum}
                type="button"
                onClick={() => onJumpStep?.(stepNum)}
                className={`group relative flex flex-col items-center focus:outline-none`}
                title={`Jump to Step ${stepNum}: ${STEP_TITLES[stepNum]}`}
              >
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-200 ${
                    isCurrent
                      ? isStepHero
                        ? "bg-rose-500 text-white ring-4 ring-rose-500/30 scale-125 shadow-lg shadow-rose-500/50"
                        : "bg-indigo-500 text-white ring-4 ring-indigo-500/30 scale-125 shadow-lg shadow-indigo-500/50"
                      : isCompleted
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-300"
                  }`}
                >
                  {isCompleted ? <IconCheck className="w-3 h-3" /> : stepNum}
                </div>
                <span className="hidden md:block mt-1 text-[9px] font-medium text-slate-400 group-hover:text-slate-200 truncate max-w-[70px]">
                  {STEP_TITLES[stepNum]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Description & Presenter Script Callout */}
      {stepInfo && (
        <div className="mt-3.5 grid grid-cols-1 md:grid-cols-2 gap-3 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3.5 text-xs">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-indigo-300">
              <IconSparkles className="w-3.5 h-3.5" />
              <span>{stepInfo.name}</span>
            </div>
            <p className="mt-1 text-slate-300 leading-relaxed text-[11px]">
              {stepInfo.description}
            </p>
          </div>

          <div
            className={`rounded-lg border p-3 ${
              isHeroStep
                ? "border-rose-500/40 bg-rose-950/30 text-rose-200"
                : "border-indigo-950/80 bg-indigo-950/40 text-indigo-200"
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold mb-1">
              <span className="text-[10px] uppercase tracking-wider text-indigo-400">
                Presenter Script Callout:
              </span>
            </div>
            <p className="italic leading-relaxed text-[11px] text-slate-200">
              &ldquo;{scriptPrompt}&rdquo;
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
