import { create } from "zustand";
import { handleChatMessage } from "../task/chatRouter";
import { TRANSLATIONS } from "../i18n/translations";
import { useI18nStore } from "./i18nStore";

export interface ChatMessage {
  id: number;
  sender: "user" | "natali";
  text: string;
  timestamp: number;
}

let nextId = 0;

interface ChatState {
  messages: ChatMessage[];
  thinking: boolean;
  sendUserMessage: (text: string) => void;
  addNataliMessage: (text: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [
    { id: nextId++, sender: "natali", text: TRANSLATIONS[useI18nStore.getState().locale]["chat.greeting"], timestamp: Date.now() },
  ],
  thinking: false,

  addNataliMessage: (text: string) => {
    set((store) => ({
      messages: [...store.messages, { id: nextId++, sender: "natali", text, timestamp: Date.now() }],
    }));
  },

  sendUserMessage: (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    set((store) => ({
      messages: [...store.messages, { id: nextId++, sender: "user", text: trimmed, timestamp: Date.now() }],
      thinking: true,
    }));

    window.setTimeout(() => {
      const { reply } = handleChatMessage(trimmed);
      set((store) => ({
        messages: [...store.messages, { id: nextId++, sender: "natali", text: reply, timestamp: Date.now() }],
        thinking: false,
      }));
    }, 420);
  },
}));
