import { create } from "zustand";
import type { AgentId } from "../data/agents";

// Requested order: UI/UX -> Graphic -> 3D Model -> Frontend -> Backend -> Mobile.
export const TOUR_AGENT_ORDER: AgentId[] = ["UI_UX", "Graphic", "3D_Model", "Frontend", "Backend", "Android_iOS"];

interface TourState {
  active: boolean;
  /** -1 when not touring; otherwise an index into TOUR_AGENT_ORDER. */
  stepIndex: number;
  currentAgentId: AgentId | null;

  start: () => void;
  stop: () => void;
  /** Called by TourDriver's per-step timer — advances to the next agent, or ends the tour once
   * the roster is exhausted. */
  advance: () => void;
}

/**
 * Drives the "Start Tour" cinematic fly-through. Deliberately its own store (not reusing
 * officeStore's selectedAgentId) — a tour step and a manual click-to-select are different
 * things (the tour ignores/overrides the user's own selection, and AgentInfoPanel intentionally
 * stays hidden during a tour in favor of TourOverlay's pipeline-role copy), so keeping them
 * separate avoids the two ever fighting over the same field.
 */
export const useTourStore = create<TourState>((set, get) => ({
  active: false,
  stepIndex: -1,
  currentAgentId: null,

  start: () => set({ active: true, stepIndex: 0, currentAgentId: TOUR_AGENT_ORDER[0] }),

  stop: () => set({ active: false, stepIndex: -1, currentAgentId: null }),

  advance: () => {
    const { stepIndex, active } = get();
    if (!active) return; // stopped mid-flight — ignore a timer that fires after the fact
    const nextIndex = stepIndex + 1;
    if (nextIndex >= TOUR_AGENT_ORDER.length) {
      set({ active: false, stepIndex: -1, currentAgentId: null });
      return;
    }
    set({ stepIndex: nextIndex, currentAgentId: TOUR_AGENT_ORDER[nextIndex] });
  },
}));
