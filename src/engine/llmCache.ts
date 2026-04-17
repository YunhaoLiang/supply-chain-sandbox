import { NodeRole, ScenarioType, SUPPLY_CHAIN_ORDER } from "./types";
import { LLM_CACHE_DATA } from "./llmCacheData";

/**
 * Per-week AI run record, indexed by `week - 1` within a scenario's array.
 * Caching both `customerDemand` and each role's LLM decision makes replay
 * fully deterministic (matters for random_fluctuation).
 *
 * Lookup order at runtime:
 *   1. Bundled static data (src/engine/llmCacheData.ts) -- committed to repo.
 *   2. Browser localStorage (dev/fallback).
 *
 * End-users hit (1) and never call the Together API.
 */
export interface LLMWeekRecord {
  week: number;
  customerDemand: number;
  decisions: Record<NodeRole, LLMDecisionRecord>;
}

export interface LLMDecisionRecord {
  orderQty: number;
  thinking: string;
  explanation: string;
}

type CacheShape = Partial<Record<ScenarioType, LLMWeekRecord[]>>;

const STORAGE_KEY = "scsb:llm-cache:v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function loadAll(): CacheShape {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CacheShape;
    return parsed ?? {};
  } catch {
    return {};
  }
}

function saveAll(cache: CacheShape) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // ignore quota / serialization errors
  }
}

function isValidRecord(rec: LLMWeekRecord | undefined | null): rec is LLMWeekRecord {
  if (!rec || !rec.decisions) return false;
  for (const role of SUPPLY_CHAIN_ORDER) {
    if (!rec.decisions[role]) return false;
  }
  return true;
}

export function getWeekRecord(
  scenario: ScenarioType,
  week: number
): LLMWeekRecord | null {
  const idx = week - 1;

  // 1. Bundled static data (generated offline, committed to repo)
  const bundled = LLM_CACHE_DATA[scenario];
  if (bundled) {
    const rec = bundled[idx];
    if (isValidRecord(rec)) return rec;
  }

  // 2. Browser localStorage fallback (dev / not-yet-generated scenarios)
  const all = loadAll();
  const arr = all[scenario];
  if (arr) {
    const rec = arr[idx];
    if (isValidRecord(rec)) return rec;
  }

  return null;
}

export function hasBundledData(scenario: ScenarioType): boolean {
  const bundled = LLM_CACHE_DATA[scenario];
  return !!bundled && bundled.length > 0;
}

export function saveWeekRecord(
  scenario: ScenarioType,
  record: LLMWeekRecord
) {
  const all = loadAll();
  const arr = [...(all[scenario] ?? [])];
  const idx = record.week - 1;
  arr[idx] = record;
  all[scenario] = arr;
  saveAll(all);
}

export function clearScenarioCache(scenario: ScenarioType) {
  const all = loadAll();
  delete all[scenario];
  saveAll(all);
}

export function clearAllCache() {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function hasAnyCache(scenario: ScenarioType): boolean {
  const all = loadAll();
  const arr = all[scenario];
  return !!arr && arr.length > 0;
}
