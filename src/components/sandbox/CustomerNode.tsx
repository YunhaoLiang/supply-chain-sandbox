"use client";

import { motion } from "framer-motion";

interface CustomerNodeProps {
  demand: number;
}

export default function CustomerNode({ demand }: CustomerNodeProps) {
  return (
    <g>
      {/* Card */}
      <rect
        x="-55" y="-46"
        width="110" height="108"
        rx="14"
        fill="#FFFDF7"
        stroke="#DDA0DD"
        strokeWidth="1"
        filter="url(#softShadow)"
      />
      <rect x="-55" y="-46" width="110" height="5" rx="2" fill="#DDA0DD" opacity={0.6} />

      {/* People icon */}
      <g transform="translate(0, -16)">
        <circle cx="-6" cy="-4" r="6" fill="#DDA0DD" opacity={0.35} />
        <ellipse cx="-6" cy="8" rx="9" ry="6" fill="#DDA0DD" opacity={0.25} />
        <circle cx="8" cy="-2" r="5" fill="#DDA0DD" opacity={0.25} />
        <ellipse cx="8" cy="9" rx="7" ry="5" fill="#DDA0DD" opacity={0.2} />
      </g>

      {/* Label */}
      <text y="17" textAnchor="middle" fontSize="10" fontWeight="700" fill="#2d3436">
        Customer
      </text>
      <text y="27" textAnchor="middle" fontSize="8" fill="#b2bec3">
        消费者
      </text>

      {/* Demand bubble */}
      <motion.g
        key={demand}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
      >
        <rect x="-35" y="36" width="70" height="17" rx="8.5" fill="#DDA0DD" opacity={0.2} />
        <text x="0" y="48" textAnchor="middle" fontSize="8" fontWeight="700" fill="#8e44ad">
          需求 {demand}
        </text>
      </motion.g>
    </g>
  );
}
