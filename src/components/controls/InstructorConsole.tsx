"use client";

import { useEffect, useRef } from "react";
import { useGameStore, SpeedMultiplier } from "@/store/gameStore";
import { PolicyType, ScenarioType } from "@/engine/types";
import { POLICY_LABELS } from "@/engine/policies";
import { SCENARIO_LABELS } from "@/engine/scenarios";

function ControlButton({
  children,
  onClick,
  active,
  disabled,
  variant = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  variant?: "default" | "primary" | "danger" | "ai";
}) {
  const baseClasses =
    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap";
  const variants = {
    default: active
      ? "bg-gray-700 text-white"
      : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200",
    primary: "bg-blue-500 text-white hover:bg-blue-600",
    danger: "bg-red-500 text-white hover:bg-red-600",
    ai: "bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );
}

function SegmentGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  labels,
}: {
  label: string;
  options: T[];
  value: T;
  onChange: (v: T) => void;
  labels: Record<T, string>;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 font-medium">{label}</span>
      <div className="flex bg-white rounded-lg border border-gray-200 overflow-hidden">
        {options.map((opt) => {
          const isAI = opt === "llm";
          return (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                value === opt
                  ? isAI
                    ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white"
                    : "bg-gray-700 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {labels[opt]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function InstructorConsole() {
  const isPlaying = useGameStore((s) => s.isPlaying);
  const isFinished = useGameStore((s) => s.isFinished);
  const speed = useGameStore((s) => s.speed);
  const policy = useGameStore((s) => s.config.policy);
  const scenario = useGameStore((s) => s.config.scenario);
  const week = useGameStore((s) => s.week);
  const thinkingPhase = useGameStore((s) => s.thinking.phase);

  const step = useGameStore((s) => s.step);
  const reset = useGameStore((s) => s.reset);
  const togglePlay = useGameStore((s) => s.togglePlay);
  const setSpeed = useGameStore((s) => s.setSpeed);
  const setPolicy = useGameStore((s) => s.setPolicy);
  const setScenario = useGameStore((s) => s.setScenario);

  const isLLM = policy === "llm";
  const isBusy = thinkingPhase !== "idle";

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPlaying && !isFinished && !isLLM) {
      const ms = 1200 / speed;
      intervalRef.current = setInterval(() => {
        step();
      }, ms);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, isFinished, speed, step, isLLM]);

  const speedLabels: Record<string, string> = {
    "0.5": "x0.5",
    "1": "x1",
    "2": "x2",
    "4": "x4",
  };

  return (
    <div
      className="w-full px-6 py-3 flex flex-wrap items-center gap-4 border-t-2"
      style={{ background: "#FFFDF7", borderColor: "#e0ddd5" }}
    >
      {/* Playback controls */}
      <div className="flex items-center gap-2">
        <ControlButton
          onClick={togglePlay}
          variant={isLLM ? "ai" : "primary"}
          disabled={isFinished || isBusy}
        >
          {isBusy ? "AI 运行中..." : isPlaying ? "暂停" : isLLM ? "AI 开始" : "开始"}
        </ControlButton>
        {!isLLM && (
          <ControlButton onClick={step} disabled={isPlaying || isFinished}>
            单步
          </ControlButton>
        )}
        <ControlButton onClick={reset} variant="danger" disabled={isBusy}>
          重置
        </ControlButton>
      </div>

      <div className="w-px h-6 bg-gray-200" />

      {/* Speed (only for non-LLM) */}
      {!isLLM && (
        <>
          <SegmentGroup
            label="速度"
            options={["0.5", "1", "2", "4"]}
            value={String(speed)}
            onChange={(v) => setSpeed(Number(v) as SpeedMultiplier)}
            labels={speedLabels}
          />
          <div className="w-px h-6 bg-gray-200" />
        </>
      )}

      {/* Policy */}
      <SegmentGroup
        label="策略"
        options={["base_stock", "llm"] as PolicyType[]}
        value={policy}
        onChange={(v) => setPolicy(v)}
        labels={POLICY_LABELS}
      />

      <div className="w-px h-6 bg-gray-200" />

      {/* Scenario */}
      <SegmentGroup
        label="场景"
        options={["baseline", "random_fluctuation"] as ScenarioType[]}
        value={scenario}
        onChange={(v) => setScenario(v)}
        labels={SCENARIO_LABELS}
      />

      {/* Status */}
      <div className="ml-auto text-xs text-gray-400">
        {isBusy
          ? "AI 正在决策中..."
          : isFinished
            ? "模拟结束"
            : isPlaying
              ? "运行中..."
              : week === 0
                ? "就绪"
                : "已暂停"}
      </div>
    </div>
  );
}
