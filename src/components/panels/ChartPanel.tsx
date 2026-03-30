"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useGameStore } from "@/store/gameStore";
import { SUPPLY_CHAIN_ORDER } from "@/engine/types";

type ChartTab = "orders" | "inventory" | "cost";

const TAB_CONFIG: { key: ChartTab; label: string }[] = [
  { key: "orders", label: "订单量（牛鞭效应）" },
  { key: "inventory", label: "库存 / 欠单" },
  { key: "cost", label: "累计成本" },
];

// 与截图参考配色对齐
const CHART_COLORS: Record<string, string> = {
  demand:      "#4CAF50",   // 客户需求 — 绿
  retailer:    "#2196F3",   // 零售商 — 蓝
  wholesaler:  "#9C27B0",   // 批发商 — 紫
  distributor: "#FF9800",   // 分销商 — 橙
  factory:     "#E91E63",   // 工厂 — 粉红
};

const CHART_NAMES: Record<string, string> = {
  demand:      "Customer Demand",
  retailer:    "Retailer",
  wholesaler:  "Wholesaler",
  distributor: "Distributor",
  factory:     "Factory",
};

// 自定义 Legend 渲染，字号更大（与 recharts Legend Payload 类型兼容）
function renderLegend(props: { payload?: { color?: string; value?: string }[] }) {
  const { payload = [] } = props;
  return (
    <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 pt-1 pb-0.5">
      {payload.map((entry, idx) => {
        const c = entry.color ?? "#888";
        const v = entry.value ?? "";
        return (
          <div key={`${v}-${idx}`} className="flex items-center gap-1.5">
            <svg width="28" height="10">
              <line x1="0" y1="5" x2="20" y2="5" stroke={c} strokeWidth="2.5" />
              <circle cx="10" cy="5" r="3.5" fill={c} />
            </svg>
            <span className="text-[12px] font-semibold" style={{ color: "#374151" }}>
              {v}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function ChartPanel() {
  const [activeTab, setActiveTab] = useState<ChartTab>("orders");
  const orderHistory    = useGameStore((s) => s.orderHistory);
  const inventoryHistory = useGameStore((s) => s.inventoryHistory);
  const costHistory     = useGameStore((s) => s.costHistory);
  const demandHistory   = useGameStore((s) => s.demandHistory);

  const dataMap: Record<ChartTab, Record<string, number[]>> = {
    orders:    orderHistory,
    inventory: inventoryHistory,
    cost:      costHistory,
  };

  const currentData = dataMap[activeTab];
  const maxLen = Math.max(
    ...SUPPLY_CHAIN_ORDER.map((r) => currentData[r]?.length ?? 0),
    demandHistory.length
  );

  const chartData = Array.from({ length: maxLen }, (_, i) => {
    const point: Record<string, number> = { week: i + 1 };
    for (const role of SUPPLY_CHAIN_ORDER) {
      point[role] = currentData[role]?.[i] ?? 0;
    }
    if (activeTab === "orders") {
      point["demand"] = demandHistory[i] ?? 0;
    }
    return point;
  });

  return (
    <div className="h-full flex flex-col" style={{ background: "#FAF8F4" }}>
      {/* Tab bar */}
      <div className="flex border-b border-gray-200">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 py-2 text-xs font-semibold transition-colors whitespace-nowrap"
            style={{
              borderBottom: activeTab === tab.key ? "3px solid #2d3436" : "3px solid transparent",
              color: activeTab === tab.key ? "#2d3436" : "#636e72",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="flex-1 p-2 relative">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: -4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0ddd5" />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `W${v}`}
              label={{ value: "Week", position: "insideBottomRight", offset: -6, fontSize: 11 }}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              label={
                activeTab === "inventory"
                  ? { value: "库存(+) / 欠单(−)", angle: -90, position: "insideLeft", offset: 14, fontSize: 10 }
                  : undefined
              }
            />
            <Tooltip
              contentStyle={{
                background: "#FFFDF7",
                border: "1px solid #e0ddd5",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelFormatter={(v) => `Week ${v}`}
            />
            <Legend content={(props) => renderLegend(props)} />

            {/* 订单量视图：先画 Customer Demand（绿色实线在最前） */}
            {activeTab === "orders" && (
              <Line
                type="monotone"
                dataKey="demand"
                name={CHART_NAMES.demand}
                stroke={CHART_COLORS.demand}
                strokeWidth={2.5}
                dot={{ r: 3, fill: CHART_COLORS.demand }}
                activeDot={{ r: 5 }}
              />
            )}

            {SUPPLY_CHAIN_ORDER.map((role) => (
              <Line
                key={role}
                type="monotone"
                dataKey={role}
                name={CHART_NAMES[role]}
                stroke={CHART_COLORS[role]}
                strokeWidth={2.5}
                dot={{ r: 3, fill: CHART_COLORS[role] }}
                activeDot={{ r: 5 }}
              />
            ))}

            {activeTab === "inventory" && (
              <ReferenceLine y={0} stroke="#E17055" strokeWidth={1.5} strokeDasharray="4 3" />
            )}
          </LineChart>
        </ResponsiveContainer>

        {chartData.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-xs px-3 py-1.5 rounded-full border border-gray-200 bg-white/80 text-gray-500">
              点击开始后显示折线图
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
