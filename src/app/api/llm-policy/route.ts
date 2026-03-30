import { NextRequest, NextResponse } from "next/server";

const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
const TOGETHER_BASE_URL = process.env.TOGETHER_BASE_URL ?? "https://api.together.xyz/v1";
const MODEL = "meta-llama/Llama-3.3-70B-Instruct-Turbo";

interface LLMPolicyRequest {
  role: string;
  roleCN: string;
  onHand: number;
  backlog: number;
  pipelineInventory: number;
  shipmentPipeline: number[];
  lastOrderPlaced: number;
  incomingOrder: number;
  week: number;
  customerDemand: number;
  holdingCostAccum: number;
  backorderCostAccum: number;
}

function buildPrompt(req: LLMPolicyRequest): string {
  return `You are an AI supply chain manager playing the Beer Game.
You are the ${req.role} (${req.roleCN}) in a 4-tier supply chain:
  Customer → Retailer → Wholesaler → Distributor → Factory

Current situation (Week ${req.week}):
- On-hand inventory: ${req.onHand} units
- Backlog (unfilled orders): ${req.backlog} units
- Incoming order from downstream this week: ${req.incomingOrder} units
- Customer demand this week: ${req.customerDemand} units
- Pipeline inventory (goods in transit to you): ${req.pipelineInventory} units
- Shipment pipeline detail: [${req.shipmentPipeline.join(", ")}] (index 0 arrives next week)
- Last order you placed: ${req.lastOrderPlaced} units
- Accumulated holding cost: $${req.holdingCostAccum.toFixed(1)}
- Accumulated backorder cost: $${req.backorderCostAccum.toFixed(1)}

Cost structure:
- Holding cost: $0.50 per unit per week
- Backorder cost: $1.00 per unit per week
- Lead time: ${req.shipmentPipeline.length} weeks

Your goal: minimize total cost (holding + backorder) while meeting demand.

Think step by step in Chinese:
1. 分析当前库存状况
2. 考虑在途库存和预期到货
3. 评估需求趋势
4. 权衡持有成本与缺货成本
5. 做出订货决策

You MUST respond in this EXACT JSON format (no other text):
{
  "thinking": "你的思考过程（用中文，2-3句话）",
  "orderQty": <number>,
  "explanation": "一句话总结决策理由（中文）"
}`;
}

export async function POST(request: NextRequest) {
  if (!TOGETHER_API_KEY) {
    return NextResponse.json(
      { error: "TOGETHER_API_KEY not configured" },
      { status: 503 }
    );
  }

  try {
    const body: LLMPolicyRequest = await request.json();

    const prompt = buildPrompt(body);

    const response = await fetch(`${TOGETHER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOGETHER_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are an expert supply chain AI assistant. Always respond with valid JSON only. Think in Chinese.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 512,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Together API error:", response.status, errText);
      return NextResponse.json(
        { error: `Together API returned ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    let parsed: { thinking?: string; orderQty?: number; explanation?: string };
    try {
      parsed = JSON.parse(content);
    } catch {
      const qtyMatch = content.match(/"orderQty"\s*:\s*(\d+)/);
      parsed = {
        thinking: "AI 返回格式异常，使用默认解析",
        orderQty: qtyMatch ? parseInt(qtyMatch[1]) : 8,
        explanation: content.slice(0, 100),
      };
    }

    const orderQty = Math.max(0, Math.round(parsed.orderQty ?? 8));

    return NextResponse.json({
      thinking: parsed.thinking ?? "思考中...",
      orderQty,
      explanation: parsed.explanation ?? `AI 决定下单 ${orderQty}`,
    });
  } catch (err) {
    console.error("LLM policy route error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
