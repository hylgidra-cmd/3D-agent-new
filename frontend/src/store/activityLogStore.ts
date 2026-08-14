import { create } from "zustand";

export interface LogLine {
  id: number;
  text: string;
  timestamp: number;
}

const MAX_LINES = 60;

interface ActivityLogState {
  /** Oldest first — ActivityFeed renders top-to-bottom and auto-scrolls to the end. */
  lines: LogLine[];
  log: (text: string) => void;
}

let nextId = 0;

/**
 * A simple capped rolling log — AgentSimulationDriver, TaskAssignmentPanel, and officeStore's
 * setOfficeMode all push lines here whenever something agent-visible happens, and
 * ActivityFeed just renders whatever's in `lines`. Kept as its own tiny store (not folded into
 * officeStore) since nothing about agent simulation logic needs to read it back — it's a
 * one-way sink for UI display only.
 */
export const useActivityLogStore = create<ActivityLogState>((set) => ({
  lines: [],

  log: (text) =>
    set((store) => ({
      lines: [...store.lines, { id: nextId++, text, timestamp: Date.now() }].slice(-MAX_LINES),
    })),
}));
