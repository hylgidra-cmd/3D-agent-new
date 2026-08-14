import { useEffect, useState } from "react";
import { Html } from "@react-three/drei";

export interface TaskTimerProps {
  /** Unix ms deadline — see officeStore's taskDeadline field. */
  deadline: number;
}

function formatCountdown(msRemaining: number): string {
  const overdue = msRemaining < 0;
  const totalSeconds = Math.floor(Math.abs(msRemaining) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${overdue ? "-" : ""}${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * A floating countdown above an agent's head, for tasks assigned with a time limit (see
 * TaskAssignmentPanel/ManagerPanel's optional deadline field). Ticks once a second via a plain
 * interval + local state — this is a DOM overlay (drei's <Html>, not a 3D mesh), so there's no
 * reason to hook it into the render loop at 60fps for a value that only needs 1Hz precision.
 * Once the deadline passes, keeps counting into negative and switches to a red "overdue" style.
 */
export default function TaskTimer({ deadline }: TaskTimerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const remaining = deadline - now;
  const overdue = remaining < 0;

  return (
    <Html position={[0, 3.05, 0]} center>
      <div
        className={`select-none whitespace-nowrap rounded-md border px-2 py-0.5 font-mono text-xs font-semibold shadow-lg backdrop-blur-sm ${
          overdue ? "border-red-400/70 bg-red-500/30 text-red-200" : "border-white/20 bg-black/50 text-white"
        }`}
      >
        {formatCountdown(remaining)}
      </div>
    </Html>
  );
}
