export type NodeRole = "retailer" | "wholesaler" | "distributor" | "factory";

export const SUPPLY_CHAIN_ORDER: NodeRole[] = [
  "retailer",
  "wholesaler",
  "distributor",
  "factory",
];

export const NODE_LABELS: Record<NodeRole, string> = {
  retailer: "Retailer",
  wholesaler: "Wholesaler",
  distributor: "Distributor",
  factory: "Factory",
};

export const NODE_LABELS_CN: Record<NodeRole, string> = {
  retailer: "零售商",
  wholesaler: "批发商",
  distributor: "分销商",
  factory: "工厂",
};

/**
 * Core state for a single supply-chain node.
 *
 * shipmentPipeline is the single source of truth for in-transit goods.
 * It is a FIFO queue of length >= leadTime:
 *   - index 0 = arrives next week
 *   - index 1 = arrives in 2 weeks
 *   - etc.
 *
 * Derived quantities (computed, never stored independently):
 *   incomingShipment = what arrived THIS week (shifted off the front)
 *   pipelineInventory = sum(shipmentPipeline)
 *   inventoryPosition = onHand - backlog + pipelineInventory
 */
export interface NodeState {
  role: NodeRole;
  onHand: number;
  backlog: number;
  lastOrderPlaced: number;
  lastIncomingOrder: number;
  holdingCostAccum: number;
  backorderCostAccum: number;

  /**
   * FIFO queue: goods in transit TO this node.
   * Front = soonest arrival. Length = leadTime after each step.
   * Factory pushes its own production into its pipeline.
   */
  shipmentPipeline: number[];
}

// ── Derived helpers (pure functions, no stored state) ──────────────

export function getPipelineInventory(node: NodeState): number {
  return node.shipmentPipeline.reduce((a, b) => a + b, 0);
}

export function getTotalCost(node: NodeState): number {
  return node.holdingCostAccum + node.backorderCostAccum;
}

export function getInventoryPosition(node: NodeState): number {
  return node.onHand - node.backlog + getPipelineInventory(node);
}

// ── Per-step snapshot (what the UI and history store) ──────────────

export interface NodeStepSnapshot {
  arriving: number;
  incomingOrder: number;
  shipped: number;
  orderQty: number;
  explanation: string;
}

// ── Policy ─────────────────────────────────────────────────────────

export interface PolicyDecision {
  orderQty: number;
  explanation: string;
}

export interface GameContext {
  week: number;
  customerDemand: number;
  /** The order this node received THIS step from its downstream neighbor (or customer). */
  incomingOrder: number;
  demandHistory: number[];
  sharedDemand: boolean;
  sharedInventory: boolean;
  downstreamInventory?: number;
}

export type PolicyType = "base_stock" | "llm";

export type PolicyFn = (state: NodeState, context: GameContext) => PolicyDecision;

export type AsyncPolicyFn = (
  state: NodeState,
  context: GameContext
) => Promise<PolicyDecision>;

// ── Thinking animation state ──────────────────────────────────────

export interface ThinkingState {
  /** Which node is currently thinking (null = none) */
  activeNode: NodeRole | null;
  /** Current phase: "thinking" shows dots, "decided" shows result */
  phase: "idle" | "thinking" | "decided";
  /** The text to display in the thought bubble */
  text: string;
  /** The chain of thought from the LLM (streamed in) */
  reasoning: string;
}

// ── Scenario ───────────────────────────────────────────────────────

export type ScenarioType = "baseline" | "random_fluctuation";

export interface ScenarioConfig {
  type: ScenarioType;
  label: string;
  getDemand: (week: number) => number;
  leadTime: number;
  initialInventory: number;
  initialBacklog: number;
  holdingCostPerUnit: number;
  backorderCostPerUnit: number;
}

// ── Game-level config ──────────────────────────────────────────────

export interface GameConfig {
  totalWeeks: number;
  policy: PolicyType;
  scenario: ScenarioType;
  sharedDemand: boolean;
  sharedInventory: boolean;
}

export const DEFAULT_CONFIG: GameConfig = {
  totalWeeks: 20,
  policy: "base_stock",
  scenario: "baseline",
  sharedDemand: false,
  sharedInventory: false,
};

// ── History ────────────────────────────────────────────────────────

export interface GameHistoryEntry {
  week: number;
  customerDemand: number;
  nodes: Record<NodeRole, NodeState>;
  snapshots: Record<NodeRole, NodeStepSnapshot>;
}
