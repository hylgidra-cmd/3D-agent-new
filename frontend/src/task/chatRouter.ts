import { AGENTS_BY_ID, TEAM_AGENT_IDS, agentStateLabel, type AgentId } from "../data/agents";
import type { Locale } from "../i18n/translations";
import { useI18nStore } from "../store/i18nStore";
import { useOfficeStore } from "../store/officeStore";
import { dispatchTaskViaChat, matchAgentByKeywords } from "./taskAssignment";

/**
 * Natali's chat brain — a real, honest client-side parser (regex + bilingual EN/UZ keyword
 * matching against each role's actual specialty/name), NOT a claim of LLM-based understanding.
 * Given one line of chat text it either:
 *   1. Recognizes a status/report request ("status", "report", "hisobot", "holat"…) and reads
 *      officeStore directly for a live team report,
 *   2. Recognizes who the task is for (by role or by first name, in either language) and an
 *      optional time limit, then dispatches the rest of the text as the task itself via
 *      taskAssignment.ts's dispatchTaskViaChat (walks the agent to their desk, arms the timer,
 *      starts the task), or
 *   3. Falls back to a small, honest conversational reply (greeting/thanks/"I'm not sure who
 *      that's for") when nothing above matched — it never silently dispatches a task to a
 *      guessed agent just because SOME text was typed.
 * Every reply is generated in whichever language the message itself was written in (detected via
 * detectLocale below), falling back to the app's current EN/UZ header toggle, then English —
 * never hardcoded to English regardless of what the user typed.
 */

// Who the task is FOR — checked against the raw message so "tell the Frontend dev…", "ask Leo
// to…", and "Frontend dasturchiga ayting…" all resolve to the same agent. Distinct from
// taskAssignment.ts's ROUTING_RULES (which infers a role from what KIND of task it is, not who
// was named) — this list is checked first since naming someone directly is a stronger signal
// than guessing from task keywords. Keywords are deliberately bilingual (EN + UZ) in one list —
// matching is just a substring check, so there's no need to know which language the user typed.
const AGENT_MENTION_KEYWORDS: Array<{ agentId: AgentId; keywords: string[] }> = [
  { agentId: "Frontend", keywords: ["frontend", "front-end", "front end", "leo"] },
  { agentId: "Backend", keywords: ["backend", "back-end", "back end", "zara"] },
  { agentId: "UI_UX", keywords: ["ui/ux", "ui-ux", "uiux", "ux designer", "ui designer", "interfeys", "ethan"] },
  { agentId: "Graphic", keywords: ["graphic", "grafik", "illustrator", "nora"] },
  { agentId: "3D_Model", keywords: ["3d model", "3d designer", "3d artist", "3d dev", "3d dizayner", "3d", "maya"] },
  { agentId: "Android_iOS", keywords: ["android", "ios", "mobile", "mobil", "kai"] },
];

function findMentionedAgent(lower: string): AgentId | null {
  for (const rule of AGENT_MENTION_KEYWORDS) {
    if (rule.keywords.some((keyword) => lower.includes(keyword))) return rule.agentId;
  }
  return null;
}

// Minutes/hours mentioned anywhere in the message, in either language — "in 10 minutes", "10m",
// "10 daqiqada", "2 soat". Hours checked first so "2 hours"/"2 soat" isn't also partially matched
// by a looser minutes pattern.
const TIME_PATTERNS: Array<{ re: RegExp; toMinutes: (n: number) => number }> = [
  { re: /(\d+)\s*(?:hours?|hrs?|h|soat\w*)\b/i, toMinutes: (n) => n * 60 },
  { re: /(\d+)\s*(?:minutes?|mins?|m|daqiqa\w*|min\w*)\b/i, toMinutes: (n) => n },
];

/** Pulls a time limit out of the raw text and returns the text with that fragment (and a leading
 * "in"/"within", if present) stripped back out, so it doesn't pollute the extracted task text. */
function extractTimeLimit(text: string): { minutes: number | undefined; cleaned: string } {
  for (const { re, toMinutes } of TIME_PATTERNS) {
    const match = text.match(re);
    if (!match) continue;
    const minutes = toMinutes(Number(match[1]));
    const withLeadIn = new RegExp(`\\b(in|within)\\s+${match[0]}`, "i");
    const cleaned = text.replace(withLeadIn, "").replace(match[0], "").replace(/\s{2,}/g, " ").trim();
    return { minutes, cleaned };
  }
  return { minutes: undefined, cleaned: text };
}

/** Strips the "tell the X dev to…" instruction scaffolding and the role/name mention itself,
 * leaving just the task ("build a login page"). Deliberately conservative — falls back to the
 * cleaned-but-unstripped text rather than ever returning an empty string. Uzbek's word order is
 * subject-object-verb rather than English's "tell X to Y", so the Uzbek cleanup only strips the
 * role-name mention and a couple of common wrapper words (ayting/iltimos) rather than trying to
 * fully reconstruct the sentence — an honest best-effort, not a claim of real NLP. */
function extractTaskText(cleaned: string, agentId: AgentId): string {
  const agent = AGENTS_BY_ID[agentId];
  const mentionRule = AGENT_MENTION_KEYWORDS.find((rule) => rule.agentId === agentId);
  const namesToStrip = [agent.personName, agent.name, ...(mentionRule?.keywords ?? [])];

  let t = cleaned;
  for (const name of namesToStrip) {
    t = t.replace(new RegExp(name.replace(/[/\\^$*+?.()|[\]{}]/g, "\\$&"), "ig"), " ");
  }
  // Uzbek role-noun stems (e.g. "dasturchiga", "dizayneriga") restate the role already captured
  // above via the routing keyword — strip the whole inflected word, not just an exact match.
  t = t.replace(/\bdasturchi\w*\b/gi, " ").replace(/\bdizayner\w*\b/gi, " ");

  t = t.replace(/^\s*(please\s+)?(tell|ask|have|get|instruct)\s+(the\s+)?/i, "");
  t = t.replace(/^\s*(dev|developer|designer|team|guy|person)?\s*(to)\s+/i, "");
  t = t.replace(/^\s*(the|to)\s+/i, "");
  t = t.replace(/\b(in|within)\s*$/i, "");
  // Common Uzbek instruction wrappers — "iltimos" (please) and "ayting" (tell) — wherever they
  // fall in the sentence, since Uzbek doesn't front-load them the way English does.
  t = t.replace(/\biltimos\b/gi, " ").replace(/\bayting\b/gi, " ");
  t = t.replace(/\s{2,}/g, " ").trim();
  t = t.replace(/^[,.\s]+|[,.\s]+$/g, "");

  return t || cleaned.trim();
}

const REPORT_KEYWORDS = ["status", "report", "atshot", "hisobot", "holat", "vaziyat"];

// Message-initial greeting/thanks — checked with startsWith rather than includes, since a naive
// substring check on short words like "hi" false-positives inside unrelated words (e.g. "this").
const GREETING_WORDS = ["salom", "assalomu", "hello", "hi ", "hi,", "hey", "hola"];
const THANKS_WORDS = ["rahmat", "tashakkur", "thank you", "thanks", "thx"];

/** Detects Uzbek from characteristics of the message ITSELF — the Latin-Uzbek apostrophe letters
 * (o‘/g‘, however the user's keyboard renders the modifier) plus a set of common Uzbek function
 * words — so Natali replies in whichever language the user actually typed. Falls back to the
 * app's current EN/UZ header toggle when the message is too short/ambiguous to tell (e.g. just a
 * name or a number), and finally to English. This is what makes "match the user's language" work
 * even when the global language switcher is still set to EN. */
const UZ_HINT_RE =
  /[ʻʼ''´`]|(\b(va|uchun|bilan|kerak|iltimos|hozir|daqiqa\w*|soat\w*|holat|hisobot|vaziyat|ayting|dasturchi\w*|dizayner\w*|vazifa\w*|yarating|boshla\w*|qiling|salom|rahmat|kimga|nima|qanday|band|bo['ʻʼ]?sh|hammaning)\b)/i;

function detectLocale(text: string): Locale {
  if (UZ_HINT_RE.test(text)) return "uz";
  return useI18nStore.getState().locale;
}

/** Small, honest reply templates in both languages — plain data + tiny formatting functions, not
 * a claim of generative text. Mirrors i18n/translations.ts's EN/UZ pairing so Natali's chat
 * copy stays just as deliberately bilingual as the rest of the app. */
const CHAT_STRINGS: Record<
  Locale,
  {
    noInput: string;
    unclear: string;
    greetingReply: string;
    thanksReply: string;
    understood: (agent: string, task: string) => string;
    timerNote: (minutes: number) => string;
    reportHeader: string;
    reportLineBusy: (role: string, person: string, task: string) => string;
    reportLineIdle: (role: string, person: string, stateLabel: string) => string;
    allBusy: string;
    someIdle: (count: number, total: number) => string;
  }
> = {
  en: {
    noInput: "I didn't catch that — try telling me what to build, or ask for a status report.",
    unclear:
      'I\'m not sure who that\'s for — try naming a role (Frontend, Backend, UI/UX, Graphic, 3D Model, Android/iOS) or a person, or ask me for a "status report".',
    greetingReply: "Hey! I'm Natali. Tell me what you'd like built and who it's for, or ask for a status report.",
    thanksReply: "Anytime — let me know if you need anything else from the team.",
    understood: (agent, task) => `Understood. ${agent} is now working on: ${task}.`,
    timerNote: (minutes) => ` I've started a ${minutes}-minute timer.`,
    reportHeader: "Here's where the team stands right now:",
    reportLineBusy: (role, person, task) => `• ${role} (${person}): working on "${task}"`,
    reportLineIdle: (role, person, stateLabel) => `• ${role} (${person}): ${stateLabel}`,
    allBusy: "Everyone is heads-down — nobody idle.",
    someIdle: (count, total) => `${count} of ${total} ${count === 1 ? "is" : "are"} currently idle.`,
  },
  uz: {
    noInput: 'Tushunmadim — menga nima qurish kerakligini ayting, yoki "hisobot" deb so\'rang.',
    unclear:
      'Buni kimga berishni aniqlay olmadim — rolni ayting (Frontend, Backend, UI/UX, Grafik, 3D Model, Android/iOS) yoki shaxsni nomlang, yoki "hisobot" deb so\'rang.',
    greetingReply: "Salom! Men Natali. Nima qurish kerakligini va buni kimga berishni ayting, yoki hisobot so'rang.",
    thanksReply: "Doim xizmatingizdaman — jamoadan yana biror narsa kerak bo'lsa, ayting.",
    understood: (agent, task) => `Tushunarli. ${agent} hozir quyidagi ish ustida ishlamoqda: ${task}.`,
    timerNote: (minutes) => ` ${minutes} daqiqalik taymer ishga tushirildi.`,
    reportHeader: "Jamoaning hozirgi holati:",
    reportLineBusy: (role, person, task) => `• ${role} (${person}): "${task}" ustida ishlamoqda`,
    reportLineIdle: (role, person, stateLabel) => `• ${role} (${person}): ${stateLabel}`,
    allBusy: "Hammaning qo'li band — hech kim bo'sh emas.",
    someIdle: (count, total) => `${total} kishidan ${count} tasi hozir bo'sh turibdi.`,
  },
};

/** Live per-agent status list for the 6 team members Natali manages — "Status", "Report", or
 * "Hisobot"/"Holat" trigger this instead of a task delegation. Reads officeStore directly rather
 * than through a React selector since this runs outside a component. */
function buildStatusReport(locale: Locale): string {
  const strings = CHAT_STRINGS[locale];
  const runtimeById = useOfficeStore.getState().agents;
  let idleCount = 0;

  const lines = TEAM_AGENT_IDS.map((id) => {
    const agent = AGENTS_BY_ID[id];
    const runtime = runtimeById[id];
    const isBusy = runtime.state === "WORKING" && !!runtime.task;
    if (!isBusy) idleCount += 1;
    return isBusy
      ? strings.reportLineBusy(agent.name, agent.personName, runtime.task!)
      : strings.reportLineIdle(agent.name, agent.personName, agentStateLabel(runtime.state, locale).toLowerCase());
  });

  return [
    strings.reportHeader,
    ...lines,
    "",
    idleCount === 0 ? strings.allBusy : strings.someIdle(idleCount, TEAM_AGENT_IDS.length),
  ].join("\n");
}

export interface ChatOutcome {
  reply: string;
}

/** Entry point ChatPanel/chatStore calls for every message the user sends to Natali. */
export function handleChatMessage(raw: string): ChatOutcome {
  const text = raw.trim();
  const locale = detectLocale(text);
  const strings = CHAT_STRINGS[locale];

  if (!text) return { reply: strings.noInput };
  const lower = text.toLowerCase();

  if (REPORT_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return { reply: buildStatusReport(locale) };
  }

  const mentionedAgentId = findMentionedAgent(lower);
  if (!mentionedAgentId) {
    // No role/person named — before assuming this is a mis-typed task, check whether the task
    // CONTENT itself implies a specialty (taskAssignment.ts's ROUTING_RULES). Only dispatch when
    // one of those two signals actually fired; otherwise this is small talk or genuinely
    // ambiguous, and forcing it onto Frontend every time is exactly the "keeps repeating the same
    // static message" bug this replaces.
    const impliedAgentId = matchAgentByKeywords(lower);
    if (!impliedAgentId) {
      if (GREETING_WORDS.some((word) => lower.startsWith(word))) return { reply: strings.greetingReply };
      if (THANKS_WORDS.some((word) => lower.startsWith(word))) return { reply: strings.thanksReply };
      return { reply: strings.unclear };
    }
    return dispatch(impliedAgentId, text, strings);
  }

  return dispatch(mentionedAgentId, text, strings);
}

function dispatch(agentId: AgentId, text: string, strings: (typeof CHAT_STRINGS)[Locale]): ChatOutcome {
  const { minutes, cleaned } = extractTimeLimit(text);
  const task = extractTaskText(cleaned, agentId);

  dispatchTaskViaChat(agentId, task, minutes);

  const agentName = AGENTS_BY_ID[agentId].name;
  const timerNote = minutes ? strings.timerNote(minutes) : "";
  return { reply: `${strings.understood(agentName, task)}${timerNote}` };
}
