"use client";

import { motion } from "framer-motion";
import { NodeRole, NodeState, NODE_LABELS, NODE_LABELS_CN, getPipelineInventory } from "@/engine/types";
import { NODE_COLORS } from "@/lib/utils";

interface NodeCardProps {
  role: NodeRole;
  state: NodeState;
  isSelected: boolean;
  onClick: () => void;
  orderQty: number;
  isThinking?: boolean;
}

function BuildingIcon({ role, color }: { role: NodeRole; color: string }) {
  const lightColor = color + "66";
  const medColor = color + "99";

  switch (role) {
    case "retailer":
      return (
        <g transform="translate(-18, -22)">
          {/* Store building */}
          <rect x="4" y="10" width="28" height="22" rx="2" fill={lightColor} />
          <rect x="4" y="6" width="28" height="6" rx="2" fill={medColor} />
          {/* Awning */}
          <path d="M2,12 Q10,6 18,12 Q26,6 34,12" fill="none" stroke={color} strokeWidth="1.5" />
          {/* Door */}
          <rect x="13" y="20" width="10" height="12" rx="1.5" fill={color} opacity={0.5} />
          {/* Window */}
          <rect x="6" y="14" width="6" height="5" rx="1" fill="white" opacity={0.6} />
          <rect x="24" y="14" width="6" height="5" rx="1" fill="white" opacity={0.6} />
        </g>
      );
    case "wholesaler":
      return (
        <g transform="translate(-20, -22)">
          {/* Warehouse */}
          <rect x="2" y="12" width="36" height="20" rx="2" fill={lightColor} />
          {/* Roof */}
          <polygon points="20,2 0,12 40,12" fill={medColor} />
          {/* Loading bay */}
          <rect x="6" y="18" width="12" height="14" rx="1" fill={color} opacity={0.4} />
          <rect x="22" y="18" width="12" height="14" rx="1" fill={color} opacity={0.4} />
          {/* Bay lines */}
          <line x1="12" y1="18" x2="12" y2="32" stroke="white" strokeWidth="0.5" opacity={0.4} />
          <line x1="28" y1="18" x2="28" y2="32" stroke="white" strokeWidth="0.5" opacity={0.4} />
        </g>
      );
    case "distributor":
      return (
        <g transform="translate(-20, -20)">
          {/* Building */}
          <rect x="2" y="8" width="36" height="24" rx="2" fill={lightColor} />
          {/* Flat roof */}
          <rect x="0" y="6" width="40" height="4" rx="2" fill={medColor} />
          {/* Loading dock */}
          <rect x="4" y="24" width="14" height="8" rx="1" fill={color} opacity={0.5} />
          <rect x="22" y="24" width="14" height="8" rx="1" fill={color} opacity={0.5} />
          {/* Small truck symbol */}
          <rect x="26" y="12" width="8" height="5" rx="1" fill="white" opacity={0.5} />
          <circle cx="28" cy="18" r="1.5" fill={color} opacity={0.5} />
          <circle cx="32" cy="18" r="1.5" fill={color} opacity={0.5} />
        </g>
      );
    case "factory":
      return (
        <g transform="translate(-20, -24)">
          {/* Main building */}
          <rect x="2" y="16" width="36" height="18" rx="2" fill={lightColor} />
          {/* Chimney 1 */}
          <rect x="6" y="2" width="6" height="14" rx="1" fill={medColor} />
          {/* Chimney 2 */}
          <rect x="28" y="6" width="6" height="10" rx="1" fill={medColor} />
          {/* Smoke puffs */}
          <circle cx="9" cy="2" r="3" fill={color} opacity={0.15} />
          <circle cx="12" cy="-1" r="2" fill={color} opacity={0.1} />
          {/* Windows */}
          <rect x="6" y="20" width="5" height="4" rx="1" fill="white" opacity={0.5} />
          <rect x="14" y="20" width="5" height="4" rx="1" fill="white" opacity={0.5} />
          {/* Big door */}
          <rect x="22" y="22" width="12" height="12" rx="1" fill={color} opacity={0.4} />
        </g>
      );
  }
}

function BarIndicator({
  value,
  max,
  color,
  label,
}: {
  value: number;
  max: number;
  color: string;
  label: string;
}) {
  const barHeight = 28;
  const fillH = Math.min((value / max) * barHeight, barHeight);

  return (
    <g>
      <rect x="0" y="0" width="12" height={barHeight} rx="3" fill="#f0ede6" />
      <motion.rect
        x="1"
        width="10"
        rx="2.5"
        fill={color}
        initial={false}
        animate={{ y: barHeight - fillH, height: fillH }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
      <text x="6" y={barHeight + 11} textAnchor="middle" fontSize="8" fontWeight="700" fill="#2d3436">
        {value}
      </text>
      <text x="6" y={barHeight + 20} textAnchor="middle" fontSize="6.5" fill="#636e72">
        {label}
      </text>
    </g>
  );
}

export default function NodeCard({
  role,
  state,
  isSelected,
  onClick,
  orderQty,
  isThinking,
}: NodeCardProps) {
  const color = NODE_COLORS[role];

  return (
    <motion.g
      onClick={onClick}
      style={{ cursor: "pointer" }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
    >
      {/* Pulsing glow when AI is thinking about this node */}
      {isThinking && (
        <motion.rect
          x="-78"
          y="-60"
          width="156"
          height="152"
          rx="18"
          fill="none"
          stroke={color}
          strokeWidth={2}
          animate={{ opacity: [0.2, 0.8, 0.2], scale: [1, 1.02, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}

      {/* Card shadow & background — 加宽留白，英文标题不易顶边 */}
      <motion.rect
        x="-72"
        y="-54"
        width="144"
        height="148"
        rx="14"
        fill={isThinking ? `${color}08` : "#FFFDF7"}
        stroke={isThinking ? color : isSelected ? color : "#e0ddd5"}
        strokeWidth={isThinking ? 2.5 : isSelected ? 2.5 : 1}
        filter="url(#softShadow)"
        initial={false}
        animate={{
          stroke: isThinking ? color : isSelected ? color : "#e0ddd5",
          strokeWidth: isThinking ? 2.5 : isSelected ? 2.5 : 1,
        }}
        transition={{ duration: 0.25 }}
      />

      {/* Colored accent bar at top */}
      <rect x="-72" y="-54" width="144" height="5" rx="2" fill={color} opacity={0.6} />

      {/* Building icon */}
      <g transform="translate(0, -8)">
        <BuildingIcon role={role} color={color} />
      </g>

      {/* Name labels — 略缩小字号，避免 Wholesaler/Distributor 等长词贴边 */}
      <text y="17" textAnchor="middle" fontSize="10" fontWeight="700" fill="#2d3436">
        {NODE_LABELS[role]}
      </text>
      <text y="27" textAnchor="middle" fontSize="8" fill="#b2bec3">
        {NODE_LABELS_CN[role]}
      </text>

      {/* Inventory and Backlog bars */}
      <g transform="translate(-62, 36)">
        <BarIndicator value={state.onHand} max={40} color="#27ae60" label="库存" />
      </g>
      <g transform="translate(-44, 36)">
        <BarIndicator value={state.backlog} max={30} color="#E17055" label="欠单" />
      </g>

      {/* In-transit pill */}
      <g transform="translate(-35, 40)">
        <rect x="0" y="0" width="70" height="17" rx="8.5" fill={color} opacity={0.15} />
        <text x="35" y="12" textAnchor="middle" fontSize="8" fill="#2d3436" fontWeight="600">
          在途 {getPipelineInventory(state)}
        </text>
      </g>

      {/* Order pill */}
      <g transform="translate(-35, 60)">
        <rect x="0" y="0" width="70" height="17" rx="8.5" fill="#74B9FF" opacity={0.15} />
        <text x="35" y="12" textAnchor="middle" fontSize="8" fill="#2d3436" fontWeight="600">
          下单 {orderQty}
        </text>
      </g>

    </motion.g>
  );
}
