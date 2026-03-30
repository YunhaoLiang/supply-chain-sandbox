import {
  NodeState,
  GameContext,
  PolicyDecision,
  PolicyType,
  PolicyFn,
  getPipelineInventory,
  NODE_LABELS,
  NODE_LABELS_CN,
} from "./types";

/**
 * Base-Stock (Order-Up-To) Policy
 */
function baseStockPolicy(state: NodeState, ctx: GameContext): PolicyDecision {
  void ctx;
  const { onHand, backlog } = state;
  const pipelineInv = getPipelineInventory(state);
  const targetLevel = 24;

  const inventoryPosition = onHand - backlog + pipelineInv;
  const order = Math.max(0, Math.round(targetLevel - inventoryPosition));

  const explanation =
    `库存水位 = ${onHand}(在手) - ${backlog}(欠单) + ${pipelineInv}(在途) = ${inventoryPosition}，` +
    `目标水位 ${targetLevel}，下单 ${order}`;

  return { orderQty: order, explanation };
}

/**
 * LLM Policy -- calls the /api/llm-policy endpoint.
 * Returns { thinking, orderQty, explanation }.
 */
export async function llmPolicy(
  state: NodeState,
  ctx: GameContext
): Promise<{ thinking: string; orderQty: number; explanation: string }> {
  const pipelineInv = getPipelineInventory(state);

  const body = {
    role: NODE_LABELS[state.role],
    roleCN: NODE_LABELS_CN[state.role],
    onHand: state.onHand,
    backlog: state.backlog,
    pipelineInventory: pipelineInv,
    shipmentPipeline: state.shipmentPipeline,
    lastOrderPlaced: state.lastOrderPlaced,
    incomingOrder: ctx.incomingOrder,
    week: ctx.week,
    customerDemand: ctx.customerDemand,
    holdingCostAccum: state.holdingCostAccum,
    backorderCostAccum: state.backorderCostAccum,
  };

  const resp = await fetch("/api/llm-policy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const fallback = baseStockPolicy(state, ctx);
    return {
      thinking: "API 调用失败，回退到基准库存策略",
      orderQty: fallback.orderQty,
      explanation: `[回退] ${fallback.explanation}`,
    };
  }

  const data = await resp.json();
  return {
    thinking: data.thinking ?? "思考中...",
    orderQty: Math.max(0, Math.round(data.orderQty ?? 8)),
    explanation: data.explanation ?? `AI 下单 ${data.orderQty}`,
  };
}

export function getPolicy(type: PolicyType): PolicyFn {
  switch (type) {
    case "base_stock":
      return baseStockPolicy;
    case "llm":
      return baseStockPolicy;
    default:
      return baseStockPolicy;
  }
}

export const POLICY_LABELS: Record<PolicyType, string> = {
  base_stock: "基准库存策略",
  llm: "AI决策",
};
