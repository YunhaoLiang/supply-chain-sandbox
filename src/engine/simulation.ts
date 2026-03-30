import {
  NodeState,
  NodeRole,
  NodeStepSnapshot,
  SUPPLY_CHAIN_ORDER,
  ScenarioConfig,
  PolicyDecision,
  PolicyFn,
  GameContext,
  GameConfig,
} from "./types";

// ── Initialization ─────────────────────────────────────────────────

export function createInitialNodeState(
  role: NodeRole,
  sc: ScenarioConfig
): NodeState {
  const steadyFlow = 4;
  return {
    role,
    onHand: sc.initialInventory,
    backlog: sc.initialBacklog,
    lastOrderPlaced: steadyFlow,
    lastIncomingOrder: steadyFlow,
    holdingCostAccum: 0,
    backorderCostAccum: 0,
    shipmentPipeline: Array(sc.leadTime).fill(steadyFlow),
  };
}

export function createInitialNodes(
  sc: ScenarioConfig
): Record<NodeRole, NodeState> {
  const nodes = {} as Record<NodeRole, NodeState>;
  for (const role of SUPPLY_CHAIN_ORDER) {
    nodes[role] = createInitialNodeState(role, sc);
  }
  return nodes;
}

// ── Per-node intermediate result used between Pass 1 and Pass 2 ────

interface IntermediateResult {
  arriving: number;
  onHand: number;
  backlog: number;
  incomingOrder: number;
  shipped: number;
  decision: PolicyDecision;
  holdingCost: number;
  backorderCost: number;
  pipelineAfterArrival: number[];
}

// ── Main step function ─────────────────────────────────────────────

/**
 * Advance the Beer Game simulation by one week.
 *
 * Update protocol (Phase 1 -- synchronous, same-turn ordering):
 *
 *   PASS 1  (downstream -> upstream, i.e. retailer first):
 *     For each node:
 *       1. RECEIVE SHIPMENT: shift the front of shipmentPipeline.
 *          onHand += arriving.
 *       2. OBSERVE ORDER: retailer sees customerDemand;
 *          other nodes see the downstream node's orderQty from THIS turn
 *          (same-turn visibility, no information delay).
 *       3. FULFILL: ship = min(onHand, backlog + incomingOrder).
 *          onHand -= shipped; backlog = demand - shipped.
 *       4. DECIDE: policy chooses orderQty based on POST-fulfillment state.
 *       5. COSTS: holding = onHand * h; backorder = backlog * b.
 *
 *   PASS 2  (build new NodeState objects):
 *     For each node:
 *       - Pipeline tail update:
 *           factory: push its own orderQty (unlimited production)
 *           others:  push how much the upstream node shipped in Pass 1
 *       - Pipeline length stays at leadTime after shift + push.
 *
 * This means: an order placed this week enters the upstream's awareness
 * immediately, and the resulting shipment enters this node's pipeline
 * tail, arriving leadTime weeks later.
 */
export function simulateStep(
  prevNodes: Record<NodeRole, NodeState>,
  week: number,
  sc: ScenarioConfig,
  policyFn: PolicyFn,
  config: GameConfig,
  demandHistory: number[]
): {
  nodes: Record<NodeRole, NodeState>;
  snapshots: Record<NodeRole, NodeStepSnapshot>;
  customerDemand: number;
} {
  const customerDemand = sc.getDemand(week);
  const chain = SUPPLY_CHAIN_ORDER;
  const mid: Partial<Record<NodeRole, IntermediateResult>> = {};

  // ── Pass 1 ───────────────────────────────────────────────────────

  for (let i = 0; i < chain.length; i++) {
    const role = chain[i];
    const prev = prevNodes[role];

    // 1. Receive shipment
    const pipeline = [...prev.shipmentPipeline];
    const arriving = pipeline.shift() ?? 0;
    let onHand = prev.onHand + arriving;

    // 2. Observe incoming order
    const incomingOrder =
      i === 0
        ? customerDemand
        : mid[chain[i - 1]]!.decision.orderQty;

    // 3. Fulfill
    const totalDemand = prev.backlog + incomingOrder;
    const shipped = Math.min(onHand, totalDemand);
    onHand -= shipped;
    const backlog = totalDemand - shipped;

    // 4. Decide (policy sees post-fulfillment state)
    const stateForPolicy: NodeState = {
      role,
      onHand,
      backlog,
      lastOrderPlaced: prev.lastOrderPlaced,
      lastIncomingOrder: prev.lastIncomingOrder,
      holdingCostAccum: prev.holdingCostAccum,
      backorderCostAccum: prev.backorderCostAccum,
      shipmentPipeline: pipeline,
    };

    const context: GameContext = {
      week,
      customerDemand,
      incomingOrder,
      demandHistory,
      sharedDemand: config.sharedDemand,
      sharedInventory: config.sharedInventory,
      downstreamInventory:
        i > 0 ? mid[chain[i - 1]]!.onHand : undefined,
    };

    const decision = policyFn(stateForPolicy, context);

    // 5. Costs
    const holdingCost = onHand * sc.holdingCostPerUnit;
    const backorderCost = backlog * sc.backorderCostPerUnit;

    mid[role] = {
      arriving,
      onHand,
      backlog,
      incomingOrder,
      shipped,
      decision,
      holdingCost,
      backorderCost,
      pipelineAfterArrival: pipeline,
    };
  }

  // ── Pass 2: build new states with pipeline tail updates ──────────

  const newNodes = {} as Record<NodeRole, NodeState>;
  const snapshots = {} as Record<NodeRole, NodeStepSnapshot>;

  for (let i = 0; i < chain.length; i++) {
    const role = chain[i];
    const prev = prevNodes[role];
    const r = mid[role]!;

    const newPipeline = [...r.pipelineAfterArrival];

    if (i === chain.length - 1) {
      // Factory: production enters its own pipeline
      newPipeline.push(r.decision.orderQty);
    } else {
      // Other nodes: upstream shipped amount enters pipeline tail
      const upstreamShipped = mid[chain[i + 1]]!.shipped;
      newPipeline.push(upstreamShipped);
    }

    newNodes[role] = {
      role,
      onHand: r.onHand,
      backlog: r.backlog,
      lastOrderPlaced: r.decision.orderQty,
      lastIncomingOrder: r.incomingOrder,
      holdingCostAccum: prev.holdingCostAccum + r.holdingCost,
      backorderCostAccum: prev.backorderCostAccum + r.backorderCost,
      shipmentPipeline: newPipeline,
    };

    snapshots[role] = {
      arriving: r.arriving,
      incomingOrder: r.incomingOrder,
      shipped: r.shipped,
      orderQty: r.decision.orderQty,
      explanation: r.decision.explanation,
    };
  }

  return { nodes: newNodes, snapshots, customerDemand };
}
