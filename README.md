# Supply Chain Sandbox

Beer Game 供应链可视化沙盘演示器，支持多种决策策略模式切换，用于教学演示。

## 快速启动

```bash
npm install
npm run dev
```

打开 http://localhost:3000 查看。

## 功能

- 经典 Beer Game 四层供应链模拟（零售商 / 批发商 / 分销商 / 工厂）
- 两种决策策略：人类反应式 / 基准库存策略
- 两种需求场景：经典阶梯 / 随机波动
- 可点击的 Agent 详情面板，显示每个节点的状态和决策理由
- 订单量 / 库存 / 成本 实时折线图
- 教师控制台：Start / Pause / Step / Reset / 速度切换
- 卡通沙盘风格 SVG 可视化

## 技术栈

- Next.js 15 + React 19 + TypeScript
- Tailwind CSS v4
- Zustand（状态管理）
- Recharts（图表）
- Framer Motion（动画）

## 项目结构

```
src/
  engine/         # 模拟引擎核心
    types.ts      # 类型定义
    simulation.ts # 状态转移逻辑
    policies.ts   # 决策策略
    scenarios.ts  # 需求场景
  store/
    gameStore.ts  # Zustand 全局状态
  components/
    Header.tsx
    sandbox/      # SVG 沙盘组件
    panels/       # 右侧面板
    controls/     # 教师控制台
```
