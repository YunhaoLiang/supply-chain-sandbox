"use client";

import { motion } from "framer-motion";

interface FlowArrowProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type: "order" | "goods";
  value: number;
  week: number;
}

function TruckIcon({ color }: { color: string }) {
  return (
    <g>
      <rect x="-8" y="-5" width="12" height="8" rx="1.5" fill={color} opacity={0.8} />
      <rect x="4" y="-3" width="5" height="6" rx="1" fill={color} opacity={0.6} />
      <circle cx="-4" cy="4" r="2" fill="#636e72" />
      <circle cx="6" cy="4" r="2" fill="#636e72" />
    </g>
  );
}

function OrderPaper({ color }: { color: string }) {
  return (
    <g>
      <rect x="-5" y="-6" width="10" height="12" rx="1.5" fill="white" stroke={color} strokeWidth="1" />
      <line x1="-3" y1="-3" x2="3" y2="-3" stroke={color} strokeWidth="0.8" opacity={0.5} />
      <line x1="-3" y1="0" x2="3" y2="0" stroke={color} strokeWidth="0.8" opacity={0.5} />
      <line x1="-3" y1="3" x2="1" y2="3" stroke={color} strokeWidth="0.8" opacity={0.5} />
    </g>
  );
}

export default function FlowArrow({ x1, y1, x2, y2, type, value, week }: FlowArrowProps) {
  const isOrder = type === "order";
  const color = isOrder ? "#74B9FF" : "#00B894";
  const yOffset = isOrder ? -18 : 18;

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2 + yOffset;

  const sx = isOrder ? x1 : x2;
  const sy = y1 + yOffset;
  const ex = isOrder ? x2 : x1;
  const ey = y2 + yOffset;

  return (
    <g>
      {/* Path line */}
      <line
        x1={sx} y1={sy} x2={ex} y2={ey}
        stroke={color}
        strokeWidth={1.5}
        strokeDasharray={isOrder ? "6 4" : "none"}
        opacity={0.35}
      />

      {/* Animated icon moving along path */}
      <motion.g
        key={`${type}-${week}-${x1}-${value}`}
        initial={{ x: sx, y: sy, opacity: 0.9, scale: 0.6 }}
        animate={{ x: ex, y: ey, opacity: 0.1, scale: 1 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      >
        {isOrder ? <OrderPaper color={color} /> : <TruckIcon color={color} />}
      </motion.g>

      {/* Value pill at midpoint */}
      {value > 0 && (
        <motion.g
          key={`label-${type}-${week}-${x1}-${value}`}
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, delay: 0.05 }}
        >
          <rect
            x={midX - 16}
            y={midY - 9}
            width="32"
            height="18"
            rx="9"
            fill="white"
            stroke={color}
            strokeWidth="1"
            opacity={0.9}
          />
          <text
            x={midX}
            y={midY + 4}
            textAnchor="middle"
            fontSize="10"
            fontWeight="700"
            fill={color}
          >
            {value}
          </text>
        </motion.g>
      )}
    </g>
  );
}

export function FlowDefs() {
  return (
    <defs>
      <marker
        id="arrow-order"
        viewBox="0 0 10 10"
        refX="8" refY="5"
        markerWidth="5" markerHeight="5"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#74B9FF" opacity={0.5} />
      </marker>
      <marker
        id="arrow-goods"
        viewBox="0 0 10 10"
        refX="8" refY="5"
        markerWidth="5" markerHeight="5"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#00B894" opacity={0.5} />
      </marker>
    </defs>
  );
}
