"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import {
  NODE_LABELS,
  NODE_LABELS_CN,
  SUPPLY_CHAIN_ORDER,
  getPipelineInventory,
  getTotalCost,
} from "@/engine/types";
import { NODE_COLORS, getMoodFace, MOOD_CONFIG, MoodType } from "@/lib/utils";

function StatRow({
  label,
  value,
  color,
  highlight,
}: {
  label: string;
  value: string | number;
  color?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="flex justify-between items-center py-2 px-2 rounded-lg transition-colors"
      style={{ background: highlight ? `${color}08` : "transparent" }}
    >
      <span className="text-xs text-gray-500">{label}</span>
      <motion.span
        key={String(value)}
        initial={{ scale: 1.2, opacity: 0.5 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-sm font-bold tabular-nums"
        style={{ color: color || "#2d3436" }}
      >
        {value}
      </motion.span>
    </div>
  );
}

export default function AgentDetailPanel() {
  const selectedNode = useGameStore((s) => s.selectedNode);
  const setSelectedNode = useGameStore((s) => s.setSelectedNode);
  const nodes = useGameStore((s) => s.nodes);
  const snapshots = useGameStore((s) => s.snapshots);
  const week = useGameStore((s) => s.week);

  const node = nodes[selectedNode];
  const snap = snapshots[selectedNode];
  const color = NODE_COLORS[selectedNode];
  const mood = getMoodFace(node.onHand, node.backlog) as MoodType;
  const moodCfg = MOOD_CONFIG[mood];

  const pipelineInv = getPipelineInventory(node);
  const totalCost = getTotalCost(node);

  return (
    <div className="h-full flex flex-col" style={{ background: "#FAF8F4" }}>
      {/* Node selector tabs */}
      <div className="flex">
        {SUPPLY_CHAIN_ORDER.map((role) => (
          <button
            key={role}
            onClick={() => setSelectedNode(role)}
            className="flex-1 py-2.5 text-xs font-semibold transition-all relative"
            style={{
              color: selectedNode === role ? NODE_COLORS[role] : "#b2bec3",
              background: selectedNode === role ? `${NODE_COLORS[role]}08` : "transparent",
            }}
          >
            {NODE_LABELS_CN[role]}
            {selectedNode === role && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-1 right-1 h-[3px] rounded-full"
                style={{ background: NODE_COLORS[role] }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Detail content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedNode}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
              style={{ background: color }}
            >
              {NODE_LABELS[selectedNode][0]}
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm leading-tight">{NODE_LABELS[selectedNode]}</div>
              <div className="text-[10px] text-gray-400">{NODE_LABELS_CN[selectedNode]} -- Week {week}</div>
            </div>
            <span
              className="text-[10px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: `${moodCfg.color}15`, color: moodCfg.color }}
            >
              {moodCfg.label}
            </span>
          </div>

          {/* Stats card */}
          <div className="rounded-xl overflow-hidden border border-gray-100" style={{ background: "#fff" }}>
            <div className="px-3 py-2 border-b border-gray-50" style={{ background: `${color}08` }}>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Agent State
              </span>
            </div>
            <div className="px-1 py-1 space-y-0.5">
              <StatRow
                label="在手库存 (On-hand)"
                value={node.onHand}
                color="#27ae60"
                highlight={node.onHand > 20}
              />
              <StatRow
                label="欠单 (Backlog)"
                value={node.backlog}
                color={node.backlog > 0 ? "#E17055" : "#27ae60"}
                highlight={node.backlog > 0}
              />
              <StatRow label="本轮到货 (Arriving)" value={snap.arriving} />
              <StatRow label="下游订单 (Demand in)" value={snap.incomingOrder} />
              <StatRow label="在途库存 (Pipeline)" value={pipelineInv} color="#45B7D1" />
              <StatRow
                label="累计成本 (Total cost)"
                value={`$${totalCost.toFixed(1)}`}
                color="#D63031"
                highlight={totalCost > 100}
              />
            </div>
          </div>

          {/* Pipeline detail */}
          <div className="rounded-xl overflow-hidden border border-gray-100" style={{ background: "#fff" }}>
            <div className="px-3 py-2 border-b border-gray-50" style={{ background: `${color}08` }}>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Shipment Pipeline
              </span>
            </div>
            <div className="px-3 py-2 flex gap-2">
              {node.shipmentPipeline.map((qty: number, idx: number) => (
                <div
                  key={idx}
                  className="flex-1 text-center py-1.5 rounded-lg text-xs font-bold"
                  style={{
                    background: qty > 0 ? `${color}15` : "#f5f5f5",
                    color: qty > 0 ? color : "#b2bec3",
                  }}
                >
                  <div className="text-[9px] text-gray-400 mb-0.5">+{idx + 1}w</div>
                  {qty}
                </div>
              ))}
            </div>
          </div>

          {/* Decision card */}
          <div className="rounded-xl overflow-hidden border border-gray-100" style={{ background: "#fff" }}>
            <div className="px-3 py-2 border-b border-gray-50" style={{ background: `${color}08` }}>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Decision
              </span>
            </div>
            <div className="p-3">
              <div className="flex items-baseline gap-2 mb-3">
                <motion.span
                  key={snap.orderQty}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  className="text-3xl font-black tabular-nums"
                  style={{ color }}
                >
                  {snap.orderQty}
                </motion.span>
                <span className="text-xs text-gray-400">units ordered</span>
              </div>

              <div
                className="text-xs leading-relaxed p-3 rounded-lg"
                style={{
                  background: `${color}06`,
                  borderLeft: `3px solid ${color}`,
                }}
              >
                {snap.explanation}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
