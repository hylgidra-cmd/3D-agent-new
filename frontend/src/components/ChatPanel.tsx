import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { AGENTS_BY_ID } from "../data/agents";
import { useChatStore } from "../store/chatStore";
import { useTranslation } from "../i18n/useTranslation";
import AgentAvatar from "./AgentAvatar";

const NATALI = AGENTS_BY_ID.Natali;

/**
 * The Communication Hub — a right-docked messenger, replacing the old "Assign Task" floating
 * button/form (see TaskAssignmentPanel, now unused). Self-toggling, same pattern that button
 * used: collapsed to a small pill by default, expands into the full docked panel on click. The
 * user talks to exactly one agent here: Natali, the central Office Administrator. Every message
 * is parsed client-side by task/chatRouter.ts's handleChatMessage (via chatStore), which either
 * delegates a task to one of the 6 specialists (walks them to their desk, arms their timer,
 * starts the real/simulated work) or reads officeStore live for a status report — the same
 * bridge from plain text to the 3D scene that ManagerPanel's form pioneered, just through a chat
 * UI addressed to Natali by name instead of an anonymous "Manager".
 */
export default function ChatPanel() {
  const [open, setOpen] = useState(false);
  const messages = useChatStore((s) => s.messages);
  const thinking = useChatStore((s) => s.thinking);
  const sendUserMessage = useChatStore((s) => s.sendUserMessage);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking, open]);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!draft.trim()) return;
    sendUserMessage(draft);
    setDraft("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="glass-panel pointer-events-auto flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-medium text-white/85 shadow-2xl shadow-black/40 transition hover:bg-white/10"
      >
        <AgentAvatar color={NATALI.color} accentColor={NATALI.accentColor} hairColor={NATALI.hairColor} size={20} />
        {t("chat.openButton")}
      </button>
    );
  }

  return (
    <aside
      className="glass-panel pointer-events-auto fixed right-4 top-20 bottom-6 z-20 flex w-full max-w-md flex-col overflow-hidden rounded-2xl shadow-2xl shadow-black/40"
      style={{
        background: "linear-gradient(180deg, rgba(20,17,28,0.72) 0%, rgba(14,12,20,0.72) 100%)",
        backdropFilter: "blur(22px) saturate(150%)",
      }}
    >
      {/* Header — Natali's identity, echoing the 3D character's own palette */}
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <div className="relative shrink-0">
          <AgentAvatar color={NATALI.color} accentColor={NATALI.accentColor} hairColor={NATALI.hairColor} size={40} />
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-studio-900 bg-emerald-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-white">{t("chat.title")}</h2>
          <p className="truncate text-[11px] text-white/45">{t("chat.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={t("common.close")}
          className="shrink-0 rounded-md p-1 text-white/40 transition hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* Message thread */}
      <div ref={scrollRef} className="scrollbar-none flex-1 overflow-y-auto px-3.5 py-4">
        <div className="flex flex-col gap-2.5">
          {messages.map((message) => (
            <ChatBubble key={message.id} sender={message.sender} text={message.text} />
          ))}
          {thinking && <TypingBubble />}
        </div>
      </div>

      {/* Quick action + composer */}
      <form onSubmit={submit} className="flex flex-col gap-2 border-t border-white/10 p-3">
        <button
          type="button"
          onClick={() => sendUserMessage("Status report")}
          className="glass-chip self-start rounded-full px-3 py-1 text-[10.5px] font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          📋 {t("chat.statusQuickAction")}
        </button>
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("chat.placeholder")}
            rows={1}
            className="max-h-24 min-h-[38px] w-full flex-1 resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-white/25 focus:bg-white/[0.07]"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="flex h-[38px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-amber-300 to-violet-500 px-4 text-xs font-semibold text-white shadow-lg shadow-black/30 transition disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:brightness-110 enabled:active:scale-[0.97]"
          >
            {t("chat.send")}
          </button>
        </div>
      </form>
    </aside>
  );
}

function ChatBubble({ sender, text }: { sender: "user" | "natali"; text: string }) {
  const isUser = sender === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed shadow-md shadow-black/20 ${
          isUser
            ? "rounded-br-sm bg-gradient-to-br from-sky-400 to-violet-500 text-white"
            : "glass-chip rounded-bl-sm text-white/85"
        }`}
      >
        {text}
      </div>
    </div>
  );
}

/** A small three-dot "Natali is typing…" indicator shown for the brief beat before her reply
 * lands (see chatStore's `thinking` field). */
function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="glass-chip flex items-center gap-1 rounded-2xl rounded-bl-sm px-3.5 py-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-pulse-slow rounded-full bg-white/50"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
