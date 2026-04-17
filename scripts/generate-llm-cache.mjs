/**
 * Pre-generate AI decisions for all scenarios and write them into
 * src/engine/llmCacheData.ts as a static TypeScript module.
 *
 * Run locally ONCE (uses your TOGETHER_API_KEY):
 *   npm run gen-llm-cache
 *
 * Then commit the generated file. The deployed website imports this file
 * directly and replays the decisions -- no API calls from end-users.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

// ── Load .env.local ────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(projectRoot, ".env.local");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(m[1] in process.env)) process.env[m[1]] = value;
  }
}
loadEnv();

const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
const TOGETHER_BASE_URL =
  process.env.TOGETHER_BASE_URL || "https://api.together.xyz/v1";
const MODEL = "meta-llama/Llama-3.3-70B-Instruct-Turbo";

if (!TOGETHER_API_KEY) {
  console.error("ERROR: TOGETHER_API_KEY not found in .env.local");
  process.exit(1);
}

// ── Simulation constants (mirror src/engine) ───────────────────────
const TOTAL_WEEKS = 20;
const LEAD_TIME = 2;
const INITIAL_INVENTORY = 12;
const STEADY_FLOW = 4;
const HOLDING = 0.5;
const BACKORDER = 1.0;

const CHAIN = ["retailer", "wholesaler", "distributor", "factory"];
const LABEL_EN = {
  retailer: "Retailer",
  wholesaler: "Wholesaler",
  distributor: "Distributor",
  factory: "Factory",
};
const LABEL_CN = {
  retailer: "零售商",
  wholesaler: "批发商",
  distributor: "分销商",
  factory: "工厂",
};

// ── Scenario demand generators ─────────────────────────────────────
const SCENARIO_DEMAND = {
  baseline: (week) => (week <= 4 ? 4 : 8),
  random_fluctuation: (week) => {
    const base = week <= 4 ? 4 : 8;
    const noise = Math.round((Math.random() - 0.5) * 4);
    return Math.max(0, base + noise);
  },
};

// ── Prompt (mirrors src/app/api/llm-policy/route.ts) ───────────────
function buildPrompt(req) {
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

async function callTogether(req) {
  const prompt = buildPrompt(req);
  const resp = await fetch(`${TOGETHER_BASE_URL}/chat/completions`, {
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
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Together API ${resp.status}: ${text}`);
  }
  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    const qtyMatch = content.match(/"orderQty"\s*:\s*(\d+)/);
    parsed = {
      thinking: "AI 返回格式异常，使用默认解析",
      orderQty: qtyMatch ? parseInt(qtyMatch[1], 10) : 8,
      explanation: content.slice(0, 100),
    };
  }
  const orderQty = Math.max(0, Math.round(parsed.orderQty ?? 8));
  return {
    thinking: parsed.thinking ?? "思考中...",
    orderQty,
    explanation: parsed.explanation ?? `AI 决定下单 ${orderQty}`,
  };
}

// ── Per-node initial state ─────────────────────────────────────────
function initialNode(role) {
  return {
    role,
    onHand: INITIAL_INVENTORY,
    backlog: 0,
    lastOrderPlaced: STEADY_FLOW,
    lastIncomingOrder: STEADY_FLOW,
    holdingCostAccum: 0,
    backorderCostAccum: 0,
    shipmentPipeline: Array(LEAD_TIME).fill(STEADY_FLOW),
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Run one full scenario, return array of week records ────────────
async function runScenario(scenarioType, demandFn) {
  const nodes = {};
  for (const r of CHAIN) nodes[r] = initialNode(r);
  const records = [];

  for (let week = 1; week <= TOTAL_WEEKS; week++) {
    const customerDemand = demandFn(week);
    const mid = {};
    const decisions = {};

    for (let i = 0; i < CHAIN.length; i++) {
      const role = CHAIN[i];
      const prev = nodes[role];

      const pipeline = [...prev.shipmentPipeline];
      const arriving = pipeline.shift() ?? 0;
      let onHand = prev.onHand + arriving;

      const incomingOrder =
        i === 0 ? customerDemand : mid[CHAIN[i - 1]].decision.orderQty;
      const totalDemand = prev.backlog + incomingOrder;
      const shipped = Math.min(onHand, totalDemand);
      onHand -= shipped;
      const backlog = totalDemand - shipped;

      const pipelineInventory = pipeline.reduce((a, b) => a + b, 0);

      process.stdout.write(
        `  W${String(week).padStart(2, "0")} ${role.padEnd(11)} ` +
          `onHand=${onHand} backlog=${backlog} incoming=${incomingOrder} ...`
      );

      let llm;
      let attempt = 0;
      while (true) {
        try {
          llm = await callTogether({
            role: LABEL_EN[role],
            roleCN: LABEL_CN[role],
            onHand,
            backlog,
            pipelineInventory,
            shipmentPipeline: pipeline,
            lastOrderPlaced: prev.lastOrderPlaced,
            incomingOrder,
            week,
            customerDemand,
            holdingCostAccum: prev.holdingCostAccum,
            backorderCostAccum: prev.backorderCostAccum,
          });
          break;
        } catch (e) {
          attempt++;
          if (attempt >= 3) {
            console.log(` FAILED`);
            throw e;
          }
          process.stdout.write(` retry${attempt}...`);
          await sleep(1500 * attempt);
        }
      }

      console.log(` order=${llm.orderQty}`);

      decisions[role] = {
        orderQty: llm.orderQty,
        thinking: llm.thinking,
        explanation: llm.explanation,
      };

      mid[role] = {
        arriving,
        onHand,
        backlog,
        incomingOrder,
        shipped,
        decision: { orderQty: llm.orderQty, explanation: llm.explanation },
        pipelineAfterArrival: pipeline,
      };

      // gentle rate limiting
      await sleep(200);
    }

    // Pass 2: pipeline tail updates
    const newNodes = {};
    for (let i = 0; i < CHAIN.length; i++) {
      const role = CHAIN[i];
      const prev = nodes[role];
      const r = mid[role];
      const newPipeline = [...r.pipelineAfterArrival];
      if (i === CHAIN.length - 1) {
        newPipeline.push(r.decision.orderQty);
      } else {
        const upstreamShipped = mid[CHAIN[i + 1]].shipped;
        newPipeline.push(upstreamShipped);
      }
      newNodes[role] = {
        role,
        onHand: r.onHand,
        backlog: r.backlog,
        lastOrderPlaced: r.decision.orderQty,
        lastIncomingOrder: r.incomingOrder,
        holdingCostAccum: prev.holdingCostAccum + r.onHand * HOLDING,
        backorderCostAccum: prev.backorderCostAccum + r.backlog * BACKORDER,
        shipmentPipeline: newPipeline,
      };
    }
    for (const r of CHAIN) nodes[r] = newNodes[r];

    records.push({ week, customerDemand, decisions });
  }

  return records;
}

// ── Main ───────────────────────────────────────────────────────────
async function main() {
  const output = {};
  for (const scenario of Object.keys(SCENARIO_DEMAND)) {
    console.log(`\n=== Scenario: ${scenario} ===`);
    output[scenario] = await runScenario(scenario, SCENARIO_DEMAND[scenario]);
  }

  const outPath = path.join(projectRoot, "src", "engine", "llmCacheData.ts");
  const header =
    `// AUTO-GENERATED by scripts/generate-llm-cache.mjs -- DO NOT EDIT BY HAND\n` +
    `// Regenerate with: npm run gen-llm-cache\n` +
    `// Generated at: ${new Date().toISOString()}\n\n`;
  const body =
    `import { ScenarioType } from "./types";\n` +
    `import { LLMWeekRecord } from "./llmCache";\n\n` +
    `export const LLM_CACHE_DATA: Partial<Record<ScenarioType, LLMWeekRecord[]>> = ${JSON.stringify(
      output,
      null,
      2
    )};\n`;
  fs.writeFileSync(outPath, header + body, "utf8");
  console.log(`\nWrote ${outPath}`);
  console.log(
    `Total weeks per scenario: ${TOTAL_WEEKS}, scenarios: ${Object.keys(output).length}`
  );
}

main().catch((e) => {
  console.error("\nGeneration failed:", e);
  process.exit(1);
});
