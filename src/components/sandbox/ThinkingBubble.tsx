"use client";

import { motion, AnimatePresence } from "framer-motion";

interface ThinkingBubbleProps {
  phase: "idle" | "thinking" | "decided";
  text: string;
  reasoning: string;
  x: number;
  y: number;
  color: string;
}

function ThinkingDots() {
  return (
    <g>
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          cx={-8 + i * 8}
          cy={0}
          r={2.5}
          fill="#636e72"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </g>
  );
}

export default function ThinkingBubble({
  phase,
  text,
  reasoning,
  x,
  y,
  color,
}: ThinkingBubbleProps) {
  if (phase === "idle") return null;

  const bubbleWidth = phase === "thinking" ? 120 : 200;
  const bubbleHeight = phase === "thinking" ? 40 : 80;
  const bubbleX = x - bubbleWidth / 2;
  const bubbleY = y - 95 - bubbleHeight;

  return (
    <AnimatePresence>
      <motion.g
        key={`bubble-${phase}`}
        initial={{ opacity: 0, y: 10, scale: 0.7 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.8 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {/* Connecting circles (thought bubble tail) */}
        <motion.circle
          cx={x}
          cy={y - 60}
          r={4}
          fill="white"
          stroke="#e0ddd5"
          strokeWidth={1}
          animate={{ scale: [0.8, 1, 0.8] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <motion.circle
          cx={x - 5}
          cy={y - 72}
          r={6}
          fill="white"
          stroke="#e0ddd5"
          strokeWidth={1}
          animate={{ scale: [0.9, 1.1, 0.9] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
        />

        {/* Main bubble */}
        <rect
          x={bubbleX}
          y={bubbleY}
          width={bubbleWidth}
          height={bubbleHeight}
          rx={16}
          fill="white"
          stroke={color}
          strokeWidth={1.5}
          filter="url(#softShadow)"
        />

        {/* Colored top accent */}
        <rect
          x={bubbleX}
          y={bubbleY}
          width={bubbleWidth}
          height={4}
          rx={2}
          fill={color}
          opacity={0.6}
        />

        {phase === "thinking" ? (
          /* dots(-8~8=16px) + gap(5px) + text(~70px) ≈ 91px, 偏移 -45 使整体居中 */
          <g transform={`translate(${x - 45}, ${bubbleY + bubbleHeight / 2})`}>
            <ThinkingDots />
            <text
              x={26}
              y={4}
              fontSize="9"
              fill="#636e72"
              fontWeight="500"
            >
              {text}
            </text>
          </g>
        ) : (
          <g>
            {/* Reasoning text */}
            <foreignObject
              x={bubbleX + 8}
              y={bubbleY + 8}
              width={bubbleWidth - 16}
              height={bubbleHeight - 30}
            >
              <div
                style={{
                  fontSize: "8.5px",
                  lineHeight: "1.35",
                  color: "#636e72",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {reasoning}
              </div>
            </foreignObject>

            {/* Decision result */}
            <rect
              x={bubbleX + 8}
              y={bubbleY + bubbleHeight - 24}
              width={bubbleWidth - 16}
              height={18}
              rx={9}
              fill={color}
              opacity={0.15}
            />
            <text
              x={x}
              y={bubbleY + bubbleHeight - 11}
              textAnchor="middle"
              fontSize="10"
              fontWeight="700"
              fill={color}
            >
              {text}
            </text>
          </g>
        )}

        {/* Pulsing glow ring when thinking */}
        {phase === "thinking" && (
          <motion.rect
            x={bubbleX - 3}
            y={bubbleY - 3}
            width={bubbleWidth + 6}
            height={bubbleHeight + 6}
            rx={18}
            fill="none"
            stroke={color}
            strokeWidth={1}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        )}
      </motion.g>
    </AnimatePresence>
  );
}
