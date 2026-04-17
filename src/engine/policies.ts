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
 * (s, S) Policy
 *
 *   s = reorder point  (库存水位跌破 s 才下单)
 *   S = order-up-to    (下单时一次补到 S)
 *
 * 这里选 s=16、S=24：2周前置期 × 8单/周 = 16（刚好覆盖在途），
 * 额外 8 单作为安全库存缓冲。
 */
function ssPolicy(state: NodeState, ctx: GameContext): PolicyDecision {
  void ctx;
  const { onHand, backlog } = state;
  const pipelineInv = getPipelineInventory(state);
  const s = 16;
  const S = 24;

  const inventoryPosition = onHand - backlog + pipelineInv;

  if (inventoryPosition >= s) {
    return {
      orderQty: 0,
      explanation:
        `库存水位 = ${onHand}(在手) - ${backlog}(欠单) + ${pipelineInv}(在途) = ${inventoryPosition}，` +
        `未跌破再订货点 s=${s}，不下单`,
    };
  }

  const order = Math.max(0, Math.round(S - inventoryPosition));
  return {
    orderQty: order,
    explanation:
      `库存水位 = ${onHand}(在手) - ${backlog}(欠单) + ${pipelineInv}(在途) = ${inventoryPosition}，` +
      `跌破 s=${s}，补到 S=${S}，下单 ${order}`,
  };
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
    const fallback = ssPolicy(state, ctx);
    return {
      thinking: "API 调用失败，回退到 (s,S) 策略",
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
      return ssPolicy;
    case "llm":
      return ssPolicy;
    default:
      return ssPolicy;
  }
}

export const POLICY_LABELS: Record<PolicyType, string> = {
  base_stock: "(s,S) 策略",
  llm: "AI决策",
};
