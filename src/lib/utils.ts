import { NodeRole } from "@/engine/types";

export const NODE_COLORS: Record<NodeRole | "customer", string> = {
  customer: "#DDA0DD",
  retailer: "#4ECDC4",
  wholesaler: "#45B7D1",
  distributor: "#96CEB4",
  factory: "#FFEAA7",
};

export function getMoodFace(onHand: number, backlog: number): string {
  if (backlog > 10) return "panic";
  if (backlog > 3) return "stressed";
  if (onHand > 30) return "overstocked";
  if (onHand < 2 && backlog > 0) return "stockout";
  return "normal";
}

export type MoodType = "normal" | "stressed" | "panic" | "stockout" | "overstocked";

export const MOOD_CONFIG: Record<MoodType, { label: string; color: string; emoji: string }> = {
  normal: { label: "正常", color: "#27ae60", emoji: "(-v-)" },
  stressed: { label: "紧张", color: "#f39c12", emoji: "(-_-;)" },
  panic: { label: "恐慌", color: "#e74c3c", emoji: "(>_<)" },
  stockout: { label: "缺货", color: "#c0392b", emoji: "(T_T)" },
  overstocked: { label: "爆仓", color: "#8e44ad", emoji: "(o_O)" },
};

export function formatCost(cost: number): string {
  return `$${cost.toFixed(0)}`;
}
