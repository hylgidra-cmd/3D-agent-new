import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import OfficeScene from "./three/OfficeScene";
import OfficeCamera from "./three/camera/OfficeCamera";
import Header, { type HeaderTab } from "./components/Header";
import AgentsDirectory from "./components/AgentsDirectory";
import TaskHistoryPanel from "./components/TaskHistoryPanel";
import ManagerPanel from "./components/ManagerPanel";
import AgentInfoPanel from "./components/AgentInfoPanel";
import ModeControlPanel from "./components/ModeControlPanel";
import ChatPanel from "./components/ChatPanel";
import ActivityFeed from "./components/ActivityFeed";
import TourDriver from "./components/TourDriver";
import TourOverlay from "./components/TourOverlay";
import { useOfficeStore } from "./store/officeStore";
import { useTourStore } from "./store/tourStore";
import { officeAudio } from "./audio/officeAudioEngine";

export default function App() {
  const selectAgent = useOfficeStore((s) => s.selectAgent);
  const [activeTab, setActiveTab] = useState<HeaderTab>("office");

  // Browsers block audio until a user gesture — this is the passive fallback so sound "just
  // works" the moment someone clicks/taps anywhere, without requiring an explicit AudioPlayer
  // click first. officeAudio.start() is idempotent, so this and AudioPlayer's own call never
  // conflict, whichever fires first.
  useEffect(() => {
    const unlock = () => officeAudio.start();
    document.addEventListener("pointerdown", unlock, { once: true });
    return () => document.removeEventListener("pointerdown", unlock);
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-studio-950">
      {/* 3D Office — the product itself, not a background behind a dashboard. Stays mounted
          and interactive underneath every tab, including Agents Directory / Task History —
          those are non-blocking slide-overs, never a full-screen takeover. */}
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true }}
        onPointerMissed={() => {
          // A stray click during a cinematic tour shouldn't deselect anything — there's
          // nothing selected to deselect (manual selection is disabled during a tour), so
          // this would be a no-op anyway; skipping it just avoids the pointless store write.
          if (useTourStore.getState().active) return;
          selectAgent(null);
        }}
      >
        <OfficeCamera />
        <OfficeScene />
      </Canvas>

      {/* Timing-only — schedules TourDriver's tour steps; no visual output of its own. */}
      <TourDriver />

      <Header activeTab={activeTab} onSelectTab={setActiveTab} />

      <AgentsDirectory open={activeTab === "directory"} onClose={() => setActiveTab("office")} />
      <TaskHistoryPanel open={activeTab === "history"} onClose={() => setActiveTab("office")} />
      <ManagerPanel open={activeTab === "manager"} onClose={() => setActiveTab("office")} />

      <TourOverlay />

      {/* Persistent overlay chrome — wrapper stays click-through so drag/scroll always reach
          OrbitControls; only individual panels opt back in via pointer-events-auto. Padded
          below the fixed header so nothing sits underneath it. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between gap-4 p-4 pt-32 sm:p-6 sm:pt-24">
        {/* Agent selection panel only makes sense over the bare 3D view — Agents Directory
            already shows every agent's status in list form, so this stays out of its way. */}
        <div className="flex justify-end">{activeTab === "office" && <AgentInfoPanel />}</div>

        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-3">
          <div className="justify-self-start">
            <ActivityFeed />
          </div>
          <div className="justify-self-center">
            <ModeControlPanel />
          </div>
          <div className="justify-self-end">
            <ChatPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
