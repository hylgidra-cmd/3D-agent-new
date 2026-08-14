import { useEffect } from "react";
import { useTourStore } from "../store/tourStore";

// How long the camera lingers on each agent before moving to the next — long enough to read
// TourOverlay's pipeline-role copy, short enough that a 6-stop tour stays well under a minute.
const STEP_DURATION_MS = 4500;

/**
 * No visual output — just the tour's stopwatch. Whenever the tour is active, schedules the next
 * `advance()` call STEP_DURATION_MS after every step change; stopping the tour (early cancel or
 * natural completion) clears any pending timer via the effect cleanup, so nothing fires late.
 * Plain React, not R3F — this only touches zustand state, no Three.js objects — so it's mounted
 * once in App.tsx rather than inside <Canvas>.
 */
export default function TourDriver() {
  const active = useTourStore((s) => s.active);
  const stepIndex = useTourStore((s) => s.stepIndex);
  const advance = useTourStore((s) => s.advance);

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => advance(), STEP_DURATION_MS);
    return () => clearTimeout(timer);
  }, [active, stepIndex, advance]);

  return null;
}
