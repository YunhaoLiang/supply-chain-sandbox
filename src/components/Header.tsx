"use client";

import { motion } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import { SUPPLY_CHAIN_ORDER, getTotalCost } from "@/engine/types";
import { POLICY_LABELS } from "@/engine/policies";
import { SCENARIO_LABELS } from "@/engine/scenarios";
import { formatCost } from "@/lib/utils";

export default function Header() {
  const week = useGameStore((s) => s.week);
  const policy = useGameStore((s) => s.config.policy);
  const scenario = useGameStore((s) => s.config.scenario);
  const nodes = useGameStore((s) => s.nodes);
  const totalWeeks = useGameStore((s) => s.config.totalWeeks);

  const totalCost = SUPPLY_CHAIN_ORDER.reduce(
    (sum, role) => sum + getTotalCost(nodes[role]),
    0
  );

  return (
    <header
      className="w-full px-6 py-2.5 flex items-center gap-5"
      style={{ background: "#FFFDF7", borderBottom: "2px solid #e0ddd5" }}
    >
      {/* Logo & title */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4ECDC4] to-[#45B7D1] flex items-center justify-center shadow-sm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M3 7l9-4 9 4-9 4-9-4z" fill="white" opacity={0.9} />
            <path d="M3 12l9 4 9-4" stroke="white" strokeWidth="2" fill="none" opacity={0.7} />
            <path d="M3 17l9 4 9-4" stroke="white" strokeWidth="2" fill="none" opacity={0.5} />
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-bold text-gray-800 leading-tight">
            Supply Chain Sandbox
          </h1>
          <p className="text-[9px] text-gray-400 tracking-wide">
            Beer Game / AI Decision Sandbox
          </p>
        </div>
      </div>

      <div className="w-px h-7 bg-gray-200" />

      {/* Info pills */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <InfoPill label="策略" value={POLICY_LABELS[policy]} color="#45B7D1" />
        <InfoPill label="场景" value={SCENARIO_LABELS[scenario]} color="#96CEB4" />
        <InfoPill label="Week" value={`${week} / ${totalWeeks}`} color="#636e72" />
        <InfoPill
          label="总成本"
          value={formatCost(totalCost)}
          color={totalCost > 500 ? "#D63031" : totalCost > 200 ? "#f39c12" : "#27ae60"}
        />
      </div>

      {/* Progress */}
      <div className="ml-auto flex items-center gap-2 min-w-[140px]">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            initial={false}
            animate={{ width: `${(week / totalWeeks) * 100}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{ background: "linear-gradient(90deg, #4ECDC4, #45B7D1)" }}
          />
        </div>
        <span className="text-[10px] text-gray-400 tabular-nums min-w-[28px] text-right">
          {Math.round((week / totalWeeks) * 100)}%
        </span>
      </div>
    </header>
  );
}

function InfoPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-gray-100 shadow-sm">
      <span className="text-[9px] text-gray-400">{label}</span>
      <span className="text-[11px] font-bold tabular-nums" style={{ color }}>
        {value}
      </span>
    </div>
  );
}
