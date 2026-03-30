"use client";

import { useGameStore } from "@/store/gameStore";
import { SUPPLY_CHAIN_ORDER, NodeRole } from "@/engine/types";
import { NODE_COLORS } from "@/lib/utils";
import NodeCard from "./NodeCard";
import CustomerNode from "./CustomerNode";
import FlowArrow, { FlowDefs } from "./FlowArrow";
import ThinkingBubble from "./ThinkingBubble";

const VIEW_W = 2000;
const VIEW_H = 360;
const NODE_POSITIONS: Record<NodeRole | "customer", { x: number; y: number }> = {
  customer: { x: 170, y: 180 },
  retailer: { x: 600, y: 180 },
  wholesaler: { x: 1030, y: 180 },
  distributor: { x: 1460, y: 180 },
  factory: { x: 1890, y: 180 },
};

/** 本地坐标系下半宽（与 NodeCard / CustomerNode 的 rect 宽度一致） */
function stationHalfWidthLocal(role: NodeRole | "customer"): number {
  return role === "customer" ? 55 : 72;
}

const CARD_SCALE = 1.38;

function SandboxBackground() {
  return (
    <g>
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e0ddd5" strokeWidth="0.4" />
        </pattern>
        <linearGradient id="roadGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d5cfc4" />
          <stop offset="50%" stopColor="#ccc5b8" />
          <stop offset="100%" stopColor="#d5cfc4" />
        </linearGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.08" />
        </filter>
      </defs>

      <rect width={VIEW_W} height={VIEW_H} fill="#F5F0E8" />
      <rect width={VIEW_W} height={VIEW_H} fill="url(#grid)" opacity={0.35} />
      <rect x="60" y="172" width="1880" height="16" rx="8" fill="url(#roadGrad)" opacity={0.6} />
      <line
        x1="80" y1="180" x2="1920" y2="180"
        stroke="#b5ae9e" strokeWidth="1" strokeDasharray="12 8" opacity={0.5}
      />
      {[200, 420, 700, 920, 1200, 1420, 1700, 1880].map((x, i) => (
        <g key={i} transform={`translate(${x}, ${206 + (i % 3) * 4})`} opacity={0.25}>
          <ellipse cx="0" cy="0" rx={8 + (i % 2) * 4} ry={3} fill="#96CEB4" />
        </g>
      ))}
    </g>
  );
}

export default function SandboxView() {
  const nodes = useGameStore((s) => s.nodes);
  const snapshots = useGameStore((s) => s.snapshots);
  const customerDemand = useGameStore((s) => s.customerDemand);
  const selectedNode = useGameStore((s) => s.selectedNode);
  const setSelectedNode = useGameStore((s) => s.setSelectedNode);
  const week = useGameStore((s) => s.week);
  const thinking = useGameStore((s) => s.thinking);

  const chain: (NodeRole | "customer")[] = ["customer", ...SUPPLY_CHAIN_ORDER];

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden shadow-lg" style={{ background: "#F5F0E8" }}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full h-full"
        style={{ minHeight: 230 }}
        preserveAspectRatio="xMidYMid meet"
      >
        <FlowDefs />
        <SandboxBackground />

        <g opacity={0.95}>
          <rect x="620" y="4" width="760" height="34" rx="17" fill="#74B9FF" opacity={0.18} />
          <text
            x="1000"
            y="27"
            textAnchor="middle"
            fontSize="15"
            fill="#1e6bb8"
            fontWeight="800"
            style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
          >
            Order Flow (downstream to upstream) --&gt;
          </text>
          <rect x="620" y="322" width="760" height="34" rx="17" fill="#00B894" opacity={0.18} />
          <text
            x="1000"
            y="345"
            textAnchor="middle"
            fontSize="15"
            fill="#0d6b52"
            fontWeight="800"
            style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
          >
            &lt;-- Goods Flow (upstream to downstream)
          </text>
        </g>

        {chain.map((role, i) => {
          if (i === chain.length - 1) return null;
          const from = NODE_POSITIONS[role];
          const to = NODE_POSITIONS[chain[i + 1]];
          const fromRole = role;

          const orderVal =
            fromRole === "customer"
              ? customerDemand
              : snapshots[fromRole as NodeRole]?.orderQty ?? 0;

          const goodsVal =
            fromRole === "customer"
              ? 0
              : snapshots[fromRole as NodeRole]?.arriving ?? 0;

          const hwFrom = stationHalfWidthLocal(fromRole) * CARD_SCALE;
          const toRole = chain[i + 1];
          const hwTo = stationHalfWidthLocal(toRole) * CARD_SCALE;
          return (
            <g key={`flow-${role}`}>
              <FlowArrow
                x1={from.x + hwFrom} y1={from.y}
                x2={to.x - hwTo} y2={to.y}
                type="order" value={orderVal} week={week}
              />
              {goodsVal > 0 && (
                <FlowArrow
                  x1={to.x - hwTo} y1={to.y}
                  x2={from.x + hwFrom} y2={from.y}
                  type="goods" value={goodsVal} week={week}
                />
              )}
            </g>
          );
        })}

        <g transform={`translate(${NODE_POSITIONS.customer.x}, ${NODE_POSITIONS.customer.y}) scale(${CARD_SCALE})`}>
          <CustomerNode demand={customerDemand} />
        </g>

        {SUPPLY_CHAIN_ORDER.map((role) => {
          const pos = NODE_POSITIONS[role];
          const isThinking = thinking.activeNode === role;
          return (
            <g key={role} transform={`translate(${pos.x}, ${pos.y}) scale(${CARD_SCALE})`}>
              <NodeCard
                role={role}
                state={nodes[role]}
                isSelected={selectedNode === role}
                onClick={() => setSelectedNode(role)}
                orderQty={snapshots[role]?.orderQty ?? 0}
                isThinking={isThinking}
              />
            </g>
          );
        })}

        {/* Thinking bubbles layer (on top of everything) */}
        {thinking.activeNode && (
          <ThinkingBubble
            phase={thinking.phase}
            text={thinking.text}
            reasoning={thinking.reasoning}
            x={NODE_POSITIONS[thinking.activeNode].x}
            y={NODE_POSITIONS[thinking.activeNode].y}
            color={NODE_COLORS[thinking.activeNode]}
          />
        )}
      </svg>
    </div>
  );
}
