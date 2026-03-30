"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useGameStore } from "@/store/gameStore";
import Header from "@/components/Header";
import SandboxView from "@/components/sandbox/SandboxView";
import AgentDetailPanel from "@/components/panels/AgentDetailPanel";
import InstructorConsole from "@/components/controls/InstructorConsole";

const ChartPanel = dynamic(() => import("@/components/panels/ChartPanel"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center text-xs text-gray-400" style={{ background: "#FAF8F4" }}>
      加载图表…
    </div>
  ),
});

export default function Home() {
  const init = useGameStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top header bar */}
      <Header />

      {/* Top: Sandbox flow diagram (compact, denser) */}
      <div className="shrink-0 px-3 pt-2 pb-1" style={{ height: "32%" }}>
        <SandboxView />
      </div>

      {/* Bottom: Charts (left, larger) + Agent detail (right) */}
      <div className="flex-1 flex min-h-0 border-t-2" style={{ borderColor: "#e0ddd5" }}>
        <div className="flex-[7] min-w-0 min-h-0 overflow-hidden">
          <ChartPanel />
        </div>
        <div className="flex-[3] min-w-[280px] max-w-[420px] min-h-0 overflow-hidden border-l-2" style={{ borderColor: "#e0ddd5" }}>
          <AgentDetailPanel />
        </div>
      </div>

      {/* Bottom: Instructor console */}
      <InstructorConsole />
    </div>
  );
}
