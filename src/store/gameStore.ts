import { create } from "zustand";
import {
  NodeRole,
  NodeState,
  NodeStepSnapshot,
  PolicyType,
  ScenarioType,
  GameConfig,
  GameHistoryEntry,
  ThinkingState,
  SUPPLY_CHAIN_ORDER,
  DEFAULT_CONFIG,
  getTotalCost,
  GameContext,
  PolicyDecision,
} from "@/engine/types";
import { createInitialNodes, simulateStep } from "@/engine/simulation";
import { getPolicy, llmPolicy } from "@/engine/policies";
import { getScenarioConfig } from "@/engine/scenarios";

export type SpeedMultiplier = 0.5 | 1 | 2 | 4;

interface GameStore {
  config: GameConfig;
  week: number;
  nodes: Record<NodeRole, NodeState>;
  snapshots: Record<NodeRole, NodeStepSnapshot>;
  customerDemand: number;
  demandHistory: number[];
  orderHistory: Record<NodeRole, number[]>;
  inventoryHistory: Record<NodeRole, number[]>;
  costHistory: Record<NodeRole, number[]>;
  history: GameHistoryEntry[];

  isPlaying: boolean;
  speed: SpeedMultiplier;
  selectedNode: NodeRole;
  isFinished: boolean;

  thinking: ThinkingState;

  init: () => void;
  step: () => void;
  llmStep: () => Promise<void>;
  reset: () => void;
  setPolicy: (policy: PolicyType) => void;
  setScenario: (scenario: ScenarioType) => void;
  setSpeed: (speed: SpeedMultiplier) => void;
  togglePlay: () => void;
  setSelectedNode: (role: NodeRole) => void;
  setSharedDemand: (v: boolean) => void;
  setSharedInventory: (v: boolean) => void;
}

function emptyHistoryArrays(): Record<NodeRole, number[]> {
  const result = {} as Record<NodeRole, number[]>;
  for (const role of SUPPLY_CHAIN_ORDER) {
    result[role] = [];
  }
  return result;
}

function emptySnapshots(): Record<NodeRole, NodeStepSnapshot> {
  const result = {} as Record<NodeRole, NodeStepSnapshot>;
  for (const role of SUPPLY_CHAIN_ORDER) {
    result[role] = {
      arriving: 4,
      incomingOrder: 4,
      shipped: 4,
      orderQty: 4,
      explanation: "初始状态",
    };
  }
  return result;
}

const IDLE_THINKING: ThinkingState = {
  activeNode: null,
  phase: "idle",
  text: "",
  reasoning: "",
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const useGameStore = create<GameStore>((set, get) => ({
  config: { ...DEFAULT_CONFIG },
  week: 0,
  nodes: createInitialNodes(getScenarioConfig(DEFAULT_CONFIG.scenario)),
  snapshots: emptySnapshots(),
  customerDemand: 4,
  demandHistory: [],
  orderHistory: emptyHistoryArrays(),
  inventoryHistory: emptyHistoryArrays(),
  costHistory: emptyHistoryArrays(),
  history: [],

  isPlaying: false,
  speed: 1,
  selectedNode: "retailer",
  isFinished: false,
  thinking: { ...IDLE_THINKING },

  init: () => {
    const config = get().config;
    const sc = getScenarioConfig(config.scenario);
    set({
      week: 0,
      nodes: createInitialNodes(sc),
      snapshots: emptySnapshots(),
      customerDemand: 4,
      demandHistory: [],
      orderHistory: emptyHistoryArrays(),
      inventoryHistory: emptyHistoryArrays(),
      costHistory: emptyHistoryArrays(),
      history: [],
      isPlaying: false,
      isFinished: false,
      thinking: { ...IDLE_THINKING },
    });
  },

  step: () => {
    const state = get();
    if (state.isFinished || state.thinking.phase !== "idle") return;

    if (state.config.policy === "llm") {
      get().llmStep();
      return;
    }

    const nextWeek = state.week + 1;
    if (nextWeek > state.config.totalWeeks) {
      set({ isPlaying: false, isFinished: true });
      return;
    }

    const sc = getScenarioConfig(state.config.scenario);
    const policyFn = getPolicy(state.config.policy);

    const result = simulateStep(
      state.nodes,
      nextWeek,
      sc,
      policyFn,
      state.config,
      state.demandHistory
    );

    applyStepResult(set, get, nextWeek, result);
  },

  llmStep: async () => {
    const state = get();
    if (state.isFinished || state.thinking.phase !== "idle") return;

    const nextWeek = state.week + 1;
    if (nextWeek > state.config.totalWeeks) {
      set({ isPlaying: false, isFinished: true });
      return;
    }

    const sc = getScenarioConfig(state.config.scenario);
    const customerDemand = sc.getDemand(nextWeek);
    const chain = SUPPLY_CHAIN_ORDER;
    const currentNodes = { ...state.nodes };

    interface MidResult {
      arriving: number;
      onHand: number;
      backlog: number;
      incomingOrder: number;
      shipped: number;
      decision: PolicyDecision;
      thinking: string;
      pipelineAfterArrival: number[];
    }
    const mid: Partial<Record<NodeRole, MidResult>> = {};

    for (let i = 0; i < chain.length; i++) {
      const role = chain[i];
      const prev = currentNodes[role];

      // 1. Receive shipment
      const pipeline = [...prev.shipmentPipeline];
      const arriving = pipeline.shift() ?? 0;
      let onHand = prev.onHand + arriving;

      // 2. Observe order
      const incomingOrder =
        i === 0
          ? customerDemand
          : mid[chain[i - 1]]!.decision.orderQty;

      // 3. Fulfill
      const totalDemand = prev.backlog + incomingOrder;
      const shipped = Math.min(onHand, totalDemand);
      onHand -= shipped;
      const backlog = totalDemand - shipped;

      // Show "thinking" bubble
      set({
        thinking: {
          activeNode: role,
          phase: "thinking",
          text: "AI 正在分析...",
          reasoning: "",
        },
        selectedNode: role,
      });

      await sleep(300);

      // 4. Call LLM
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

      const ctx: GameContext = {
        week: nextWeek,
        customerDemand,
        incomingOrder,
        demandHistory: state.demandHistory,
        sharedDemand: state.config.sharedDemand,
        sharedInventory: state.config.sharedInventory,
        downstreamInventory:
          i > 0 ? mid[chain[i - 1]]!.onHand : undefined,
      };

      const llmResult = await llmPolicy(stateForPolicy, ctx);

      // Show "decided" bubble with thinking + decision
      set({
        thinking: {
          activeNode: role,
          phase: "decided",
          text: `下单 ${llmResult.orderQty}`,
          reasoning: llmResult.thinking,
        },
      });

      await sleep(800);

      mid[role] = {
        arriving,
        onHand,
        backlog,
        incomingOrder,
        shipped,
        decision: { orderQty: llmResult.orderQty, explanation: llmResult.explanation },
        thinking: llmResult.thinking,
        pipelineAfterArrival: pipeline,
      };
    }

    // Pass 2: build new states
    const newNodes = {} as Record<NodeRole, NodeState>;
    const snapshots = {} as Record<NodeRole, NodeStepSnapshot>;

    for (let i = 0; i < chain.length; i++) {
      const role = chain[i];
      const prev = currentNodes[role];
      const r = mid[role]!;

      const newPipeline = [...r.pipelineAfterArrival];
      if (i === chain.length - 1) {
        newPipeline.push(r.decision.orderQty);
      } else {
        const upstreamShipped = mid[chain[i + 1]]!.shipped;
        newPipeline.push(upstreamShipped);
      }

      newNodes[role] = {
        role,
        onHand: r.onHand,
        backlog: r.backlog,
        lastOrderPlaced: r.decision.orderQty,
        lastIncomingOrder: r.incomingOrder,
        holdingCostAccum:
          prev.holdingCostAccum + r.onHand * sc.holdingCostPerUnit,
        backorderCostAccum:
          prev.backorderCostAccum + r.backlog * sc.backorderCostPerUnit,
        shipmentPipeline: newPipeline,
      };

      snapshots[role] = {
        arriving: r.arriving,
        incomingOrder: r.incomingOrder,
        shipped: r.shipped,
        orderQty: r.decision.orderQty,
        explanation: `[AI 思考] ${r.thinking}\n[决策] ${r.decision.explanation}`,
      };
    }

    // Clear thinking and apply results
    set({ thinking: { ...IDLE_THINKING } });

    applyStepResult(set, get, nextWeek, {
      nodes: newNodes,
      snapshots,
      customerDemand,
    });

    // Auto-continue if still playing
    if (get().isPlaying && !get().isFinished) {
      get().llmStep();
    }
  },

  reset: () => {
    get().init();
  },

  setPolicy: (policy: PolicyType) => {
    set((s) => ({ config: { ...s.config, policy } }));
    get().init();
  },

  setScenario: (scenario: ScenarioType) => {
    set((s) => ({ config: { ...s.config, scenario } }));
    get().init();
  },

  setSpeed: (speed: SpeedMultiplier) => set({ speed }),

  togglePlay: () => {
    const state = get();
    if (state.isFinished) return;
    const nowPlaying = !state.isPlaying;
    set({ isPlaying: nowPlaying });
    // For LLM mode, kick off the first step when starting
    if (nowPlaying && state.config.policy === "llm" && state.thinking.phase === "idle") {
      get().llmStep();
    }
  },

  setSelectedNode: (role: NodeRole) => set({ selectedNode: role }),

  setSharedDemand: (v: boolean) => {
    set((s) => ({ config: { ...s.config, sharedDemand: v } }));
  },

  setSharedInventory: (v: boolean) => {
    set((s) => ({ config: { ...s.config, sharedInventory: v } }));
  },
}));

/* eslint-disable @typescript-eslint/no-explicit-any */
function applyStepResult(
  set: any,
  get: any,
  nextWeek: number,
  result: {
    nodes: Record<NodeRole, NodeState>;
    snapshots: Record<NodeRole, NodeStepSnapshot>;
    customerDemand: number;
  }
) {
  const state = get();
  const newOrderHistory = { ...state.orderHistory };
  const newInventoryHistory = { ...state.inventoryHistory };
  const newCostHistory = { ...state.costHistory };

  for (const role of SUPPLY_CHAIN_ORDER) {
    const node = result.nodes[role];
    newOrderHistory[role] = [
      ...state.orderHistory[role],
      result.snapshots[role].orderQty,
    ];
    newInventoryHistory[role] = [
      ...state.inventoryHistory[role],
      node.onHand - node.backlog,
    ];
    newCostHistory[role] = [
      ...state.costHistory[role],
      getTotalCost(node),
    ];
  }

  const historyEntry: GameHistoryEntry = {
    week: nextWeek,
    customerDemand: result.customerDemand,
    nodes: result.nodes,
    snapshots: result.snapshots,
  };

  set({
    week: nextWeek,
    nodes: result.nodes,
    snapshots: result.snapshots,
    customerDemand: result.customerDemand,
    demandHistory: [...state.demandHistory, result.customerDemand],
    orderHistory: newOrderHistory,
    inventoryHistory: newInventoryHistory,
    costHistory: newCostHistory,
    history: [...state.history, historyEntry],
  });

  if (nextWeek >= state.config.totalWeeks) {
    set({ isPlaying: false, isFinished: true });
  }
}

