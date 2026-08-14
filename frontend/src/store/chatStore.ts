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
  /** True for the brief moment between the user's message landing and Natali's reply — the
   * parsing/dispatch is synchronous today, but this keeps the UI honest if that ever changes
   * (e.g. once a real LLM or backend call sits behind it) and gives the message list a small,
   * deliberate "she's reading this" beat instead of the reply appearing instantly. */
  thinking: boolean;
  sendUserMessage: (text: string) => void;
}

/**
 * Chat history with Natali — ChatPanel's only data dependency. Deliberately its own store (not
 * folded into officeStore) since nothing about agent simulation needs to read chat messages back;
 * the coupling runs the other way, through task/chatRouter.ts's handleChatMessage, which reads
 * and writes officeStore on Natali's behalf.
 */
export const useChatStore = create<ChatState>((set) => ({
  // Greeting follows whichever language the header's EN/UZ toggle is set to at the moment the
  // app loads (see i18n/translations.ts's "chat.greeting" key) — same bilingual pairing every
  // other piece of chrome in the app uses, rather than a hardcoded English opener.
  messages: [
    { id: nextId++, sender: "natali", text: TRANSLATIONS[useI18nStore.getState().locale]["chat.greeting"], timestamp: Date.now() },
  ],
  thinking: false,

  sendUserMessage: (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    set((store) => ({
      messages: [...store.messages, { id: nextId++, sender: "user", text: trimmed, timestamp: Date.now() }],
      thinking: true,
    }));

    // A short, deliberate beat before Natali "replies" — purely cosmetic (the parsing itself is
    // synchronous), so the chat doesn't feel like a form submit.
    window.setTimeout(() => {
      const { reply } = handleChatMessage(trimmed);
      set((store) => ({
        messages: [...store.messages, { id: nextId++, sender: "natali", text: reply, timestamp: Date.now() }],
        thinking: false,
      }));
    }, 420);
  },
}));
