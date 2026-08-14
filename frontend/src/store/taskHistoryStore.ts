import { create } from "zustand";
import type { AgentId } from "../data/agents";

export interface CompletedTask {
  id: string;
  agentId: AgentId;
  task: string;
  completedAt: number;
  filename: string;
  /** Kept in memory for the session so Task History can re-trigger the download later without
   * re-calling the backend — a fresh object URL is created on demand each time (see
   * TaskHistoryPanel) rather than keeping one alive indefinitely. */
  blob: Blob;
}

interface TaskHistoryState {
  /** Newest first. */
  completedTasks: CompletedTask[];
  addCompletedTask: (task: Omit<CompletedTask, "id">) => void;
}

export const useTaskHistoryStore = create<TaskHistoryState>((set) => ({
  completedTasks: [],

  addCompletedTask: (task) =>
    set((store) => ({
      completedTasks: [
        { ...task, id: `${task.agentId}-${task.completedAt}-${Math.random().toString(36).slice(2, 8)}` },
        ...store.completedTasks,
      ],
    })),
}));
