import { ScenarioType, ScenarioConfig } from "./types";

function baselineDemand(week: number): number {
  return week <= 4 ? 4 : 8;
}

function randomFluctuationDemand(week: number): number {
  const base = week <= 4 ? 4 : 8;
  const noise = Math.round((Math.random() - 0.5) * 4);
  return Math.max(0, base + noise);
}

const SCENARIOS: Record<ScenarioType, ScenarioConfig> = {
  baseline: {
    type: "baseline",
    label: "经典阶梯",
    getDemand: baselineDemand,
    leadTime: 2,
    initialInventory: 12,
    initialBacklog: 0,
    holdingCostPerUnit: 0.5,
    backorderCostPerUnit: 1.0,
  },
  random_fluctuation: {
    type: "random_fluctuation",
    label: "随机波动",
    getDemand: randomFluctuationDemand,
    leadTime: 2,
    initialInventory: 12,
    initialBacklog: 0,
    holdingCostPerUnit: 0.5,
    backorderCostPerUnit: 1.0,
  },
};

export function getScenarioConfig(type: ScenarioType): ScenarioConfig {
  return SCENARIOS[type];
}

export const SCENARIO_LABELS: Record<ScenarioType, string> = {
  baseline: SCENARIOS.baseline.label,
  random_fluctuation: SCENARIOS.random_fluctuation.label,
};
