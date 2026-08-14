export type Locale = "en" | "uz";

export const LOCALES: Array<{ id: Locale; label: string }> = [
  { id: "en", label: "EN" },
  { id: "uz", label: "UZ" },
];

// ── i18n architecture note ─────────────────────────────────────────────────────────────────
// A flat key → string dictionary per locale, a tiny zustand store for the active locale
// (i18nStore.ts), and a useTranslation() hook (useTranslation.ts) that components call instead
// of hardcoding English text. Every component that renders user-facing copy is wired through
// this now — clicking EN/UZ in the header re-renders the whole app in that language, not just
// the header itself. `t()` supports simple `{param}` interpolation for strings that embed a
// dynamic value (a name, a count, a price) — see useTranslation.ts.
export type TranslationKey =
  | "common.close"
  | "header.tagline"
  | "header.tab.office"
  | "header.tab.manager"
  | "header.tab.directory"
  | "header.tab.history"
  | "header.startTour"
  | "header.stopTour"
  // Audio player
  | "audio.buttonDefault"
  | "audio.panelTitle"
  | "audio.mute"
  | "audio.unmute"
  | "audio.uploadOwnTrack"
  | "audio.premiumLibrary"
  | "audio.upgradeToUnlock"
  | "audio.stop"
  | "audio.pause"
  | "audio.resume"
  | "audio.next"
  | "audio.volume"
  | "audio.track.deepFocus"
  | "audio.track.lofiPulse"
  | "audio.track.rainyOffice"
  // Plans
  | "plan.free.name"
  | "plan.plus.name"
  | "plan.pro.name"
  | "plan.ultra.name"
  | "plan.badge"
  | "plan.free.feature.0"
  | "plan.free.feature.1"
  | "plan.free.feature.2"
  | "plan.plus.feature.0"
  | "plan.plus.feature.1"
  | "plan.plus.feature.2"
  | "plan.plus.feature.3"
  | "plan.pro.feature.0"
  | "plan.pro.feature.1"
  | "plan.pro.feature.2"
  | "plan.pro.feature.3"
  | "plan.ultra.feature.0"
  | "plan.ultra.feature.1"
  | "plan.ultra.feature.2"
  | "plan.ultra.feature.3"
  // Pricing modal
  | "pricing.title"
  | "pricing.subtitle"
  | "pricing.monthly"
  | "pricing.yearly"
  | "pricing.tokensPerMonth"
  | "pricing.perMonth"
  | "pricing.billedYearly"
  | "pricing.currentPlan"
  | "pricing.choosePlan"
  | "pricing.alaCarteTitle"
  | "pricing.alaCarteSubtitle"
  | "pricing.added"
  | "pricing.addPerMonth"
  // Agent info panel
  | "agentInfo.currentActivity"
  // Agents directory
  | "agentsDirectory.title"
  | "agentsDirectory.teamMembers"
  | "agentsDirectory.tasksDone"
  // Manager panel
  | "manager.title"
  | "manager.subtitle"
  | "manager.commandPlaceholder"
  | "manager.timeLimitPlaceholder"
  | "manager.send"
  | "manager.routedTo"
  | "manager.simulationOnly"
  | "manager.teamStatus"
  | "manager.activityLog"
  | "manager.noActivity"
  // Chat panel (Natali)
  | "chat.openButton"
  | "chat.title"
  | "chat.subtitle"
  | "chat.placeholder"
  | "chat.send"
  | "chat.statusQuickAction"
  | "chat.greeting"
  // Mode control
  | "mode.work"
  | "mode.meeting"
  | "mode.break"
  | "mode.free"
  // ROI widget
  | "roi.tooltip"
  | "roi.saved"
  // Task assignment
  | "taskAssignment.assignTask"
  | "taskAssignment.assignATask"
  | "taskAssignment.taskPlaceholder"
  | "taskAssignment.timeLimitOptional"
  | "taskAssignment.minutesPlaceholder"
  | "taskAssignment.countdownHint"
  | "taskAssignment.working"
  | "taskAssignment.submitTask"
  | "taskAssignment.genericError"
  | "taskAssignment.finished"
  // Task history
  | "taskHistory.title"
  | "taskHistory.completedThisSession"
  | "taskHistory.empty"
  // Tour
  | "tour.stepOf"
  // Activity feed
  | "activityFeed.title"
  | "activityFeed.waiting"
  // Agent state labels
  | "agentState.IDLE"
  | "agentState.WORKING"
  | "agentState.WALKING"
  | "agentState.MEETING"
  | "agentState.BREAK"
  | "agentState.SLEEP"
  | "agentState.MANAGING"
  // Location labels
  | "location.workstationSuffix"
  | "location.meetingRoom"
  | "location.lounge"
  | "location.restArea"
  | "location.reception"
  | "location.serverRoom"
  | "location.centralDesk"
  // Agent roster copy
  | "agent.Graphic.name"
  | "agent.Graphic.role"
  | "agent.Graphic.summary"
  | "agent.Graphic.pipelineRole"
  | "agent.UI_UX.name"
  | "agent.UI_UX.role"
  | "agent.UI_UX.summary"
  | "agent.UI_UX.pipelineRole"
  | "agent.3D_Model.name"
  | "agent.3D_Model.role"
  | "agent.3D_Model.summary"
  | "agent.3D_Model.pipelineRole"
  | "agent.Frontend.name"
  | "agent.Frontend.role"
  | "agent.Frontend.summary"
  | "agent.Frontend.pipelineRole"
  | "agent.Backend.name"
  | "agent.Backend.role"
  | "agent.Backend.summary"
  | "agent.Backend.pipelineRole"
  | "agent.Android_iOS.name"
  | "agent.Android_iOS.role"
  | "agent.Android_iOS.summary"
  | "agent.Android_iOS.pipelineRole"
  | "agent.Natali.name"
  | "agent.Natali.role"
  | "agent.Natali.summary"
  | "agent.Natali.pipelineRole";

export const TRANSLATIONS: Record<Locale, Record<TranslationKey, string>> = {
  en: {
    "common.close": "Close",
    "header.tagline": "agents online",
    "header.tab.office": "3D Office",
    "header.tab.manager": "Manager",
    "header.tab.directory": "Agents Directory",
    "header.tab.history": "Task History",
    "header.startTour": "Start Tour",
    "header.stopTour": "Stop Tour",

    "audio.buttonDefault": "Audio",
    "audio.panelTitle": "Office Audio",
    "audio.mute": "Mute",
    "audio.unmute": "Unmute",
    "audio.uploadOwnTrack": "Upload your own track(s)",
    "audio.premiumLibrary": "Premium Library",
    "audio.upgradeToUnlock": "Upgrade to unlock the premium library.",
    "audio.stop": "Stop ({label})",
    "audio.pause": "Pause",
    "audio.resume": "Resume",
    "audio.next": "Next",
    "audio.volume": "Volume",
    "audio.track.deepFocus": "Deep Focus",
    "audio.track.lofiPulse": "Lo-Fi Pulse",
    "audio.track.rainyOffice": "Rainy Office",

    "plan.free.name": "Free",
    "plan.plus.name": "Plus",
    "plan.pro.name": "Pro",
    "plan.ultra.name": "Ultra",
    "plan.badge": "{name} Plan",
    "plan.free.feature.0": "50 tokens / month",
    "plan.free.feature.1": "Manual task assignment",
    "plan.free.feature.2": "Room-tone audio",
    "plan.plus.feature.0": "500 tokens / month",
    "plan.plus.feature.1": "Project Manager routing",
    "plan.plus.feature.2": "Task History + downloads",
    "plan.plus.feature.3": "Upload your own audio",
    "plan.pro.feature.0": "2,000 tokens / month",
    "plan.pro.feature.1": "Timed tasks with deadlines",
    "plan.pro.feature.2": "Premium audio library",
    "plan.pro.feature.3": "Priority support",
    "plan.ultra.feature.0": "8,000 tokens / month",
    "plan.ultra.feature.1": "Cinematic tour branding",
    "plan.ultra.feature.2": "All premium audio tracks",
    "plan.ultra.feature.3": "Dedicated support",

    "pricing.title": "Upgrade your AI Office",
    "pricing.subtitle": "Demo mode — selecting a plan applies it locally. No payment is processed.",
    "pricing.monthly": "Monthly",
    "pricing.yearly": "Yearly",
    "pricing.tokensPerMonth": "{count} tokens/mo",
    "pricing.perMonth": "/mo",
    "pricing.billedYearly": "billed ${amount}/yr",
    "pricing.currentPlan": "Current Plan — Click to Cancel",
    "pricing.choosePlan": "Choose {name}",
    "pricing.alaCarteTitle": "À La Carte Agents",
    "pricing.alaCarteSubtitle": "Don't need a full tier? Add just the agents you want, ${price}/mo each.",
    "pricing.added": "Added",
    "pricing.addPerMonth": "+${price}/mo",

    "agentInfo.currentActivity": "Current activity",

    "agentsDirectory.title": "Agents Directory",
    "agentsDirectory.teamMembers": "{count} team members",
    "agentsDirectory.tasksDone": "Tasks Done",

    "manager.title": "Project Manager",
    "manager.subtitle": "Your single point of contact for the team",
    "manager.commandPlaceholder": 'e.g. "Design a new logo" or "Build the login API"…',
    "manager.timeLimitPlaceholder": "min limit",
    "manager.send": "Send to Manager",
    "manager.routedTo": 'Routed to {agent}{suffix}.',
    "manager.simulationOnly": " (visual simulation only — no live generator for this role yet)",
    "manager.teamStatus": "Team status",
    "manager.activityLog": "Activity log",
    "manager.noActivity": "No activity yet.",

    "chat.openButton": "Chat with Natali",
    "chat.title": "Natali",
    "chat.subtitle": "Office Administrator · Chief Project Manager",
    "chat.placeholder": 'e.g. "Tell the Frontend dev to build a login page in 10 minutes"…',
    "chat.send": "Send",
    "chat.statusQuickAction": "Status report",
    "chat.greeting":
      "Hi, I'm Natali — Chief Project Manager. Tell me what you need built and I'll delegate it, or ask for a \"status report\" any time.",

    "mode.work": "Work Time",
    "mode.meeting": "Meeting",
    "mode.break": "Break",
    "mode.free": "Free",

    "roi.tooltip": "Estimate: {hours}h and ${rate}/h per completed task",
    "roi.saved": "~{hours}h · ${money} saved",

    "taskAssignment.assignTask": "Assign Task",
    "taskAssignment.assignATask": "Assign a Task",
    "taskAssignment.taskPlaceholder": "Describe a task for the {agent}…",
    "taskAssignment.timeLimitOptional": "Time limit (optional)",
    "taskAssignment.minutesPlaceholder": "minutes",
    "taskAssignment.countdownHint": "→ a countdown floats above the agent's head",
    "taskAssignment.working": "Working…",
    "taskAssignment.submitTask": "Submit Task",
    "taskAssignment.genericError": "Something went wrong.",
    "taskAssignment.finished": "{agent} finished — result ZIP downloaded.",

    "taskHistory.title": "Task History",
    "taskHistory.completedThisSession": "{count} completed this session",
    "taskHistory.empty":
      "No completed tasks yet. Assign one from the Task panel — it'll show up here with a download link once it finishes.",

    "tour.stepOf": "Tour · Step {step} of {total}",

    "activityFeed.title": "Live Activity",
    "activityFeed.waiting": "Waiting for agent activity…",

    "agentState.IDLE": "Idle",
    "agentState.WORKING": "Working",
    "agentState.WALKING": "Walking",
    "agentState.MEETING": "In a meeting",
    "agentState.BREAK": "On break",
    "agentState.SLEEP": "Sleeping",
    "agentState.MANAGING": "Managing the office",

    "location.workstationSuffix": "{role} Workstation",
    "location.meetingRoom": "Meeting Room",
    "location.lounge": "Lounge",
    "location.restArea": "Rest Area",
    "location.reception": "Reception",
    "location.serverRoom": "Server Room",
    "location.centralDesk": "Central Command Desk",

    "agent.Graphic.name": "Graphic Designer",
    "agent.Graphic.role": "Branding & Illustration",
    "agent.Graphic.summary": "Creates visual concepts, illustrations, and brand identity assets.",
    "agent.Graphic.pipelineRole":
      "Builds the visual identity — logos, illustrations, brand colors — that Frontend brings to life in the real product.",
    "agent.UI_UX.name": "UI/UX Designer",
    "agent.UI_UX.role": "Interface & Flow Design",
    "agent.UI_UX.summary": "Designs interfaces, UX flows, and application layouts.",
    "agent.UI_UX.pipelineRole":
      "Defines user flows and wireframes first, then hands off design specs to Graphic and Frontend to build.",
    "agent.3D_Model.name": "3D Model Designer",
    "agent.3D_Model.role": "3D Assets & Environments",
    "agent.3D_Model.summary": "Creates 3D models, game assets, and environment pieces.",
    "agent.3D_Model.pipelineRole":
      "Builds the 3D assets and environments — like this very office — that power the platform's visualization layer.",
    "agent.Frontend.name": "Frontend Developer",
    "agent.Frontend.role": "React / Next.js",
    "agent.Frontend.summary": "Builds websites and frontend architecture in React/Next.js.",
    "agent.Frontend.pipelineRole":
      "Turns UI/UX and Graphic's designs into a real React interface, wired directly to Backend's live API.",
    "agent.Backend.name": "Backend Developer",
    "agent.Backend.role": "APIs & Infrastructure",
    "agent.Backend.summary": "Builds APIs, databases, authentication, and server architecture.",
    "agent.Backend.pipelineRole":
      "Powers the APIs, database, and auth every other agent's output ultimately runs on — the platform's foundation.",
    "agent.Android_iOS.name": "Mobile Developer",
    "agent.Android_iOS.role": "Android & iOS",
    "agent.Android_iOS.summary": "Builds mobile applications for Android and iOS.",
    "agent.Android_iOS.pipelineRole":
      "Adapts Frontend's components and Backend's API into a native experience for Android and iOS.",
    "agent.Natali.name": "Chief Project Manager",
    "agent.Natali.role": "Office Administrator",
    "agent.Natali.summary":
      "Runs the office day-to-day — delegates your requests to the right specialist and reports back on the whole team's progress.",
    "agent.Natali.pipelineRole":
      "Sits at the center of the pipeline — takes your request, routes it to the right specialist, and reports status back across the whole team.",
  },
  uz: {
    "common.close": "Yopish",
    "header.tagline": "agent onlayn",
    "header.tab.office": "3D Ofis",
    "header.tab.manager": "Menejer",
    "header.tab.directory": "Agentlar ro'yxati",
    "header.tab.history": "Vazifalar tarixi",
    "header.startTour": "Sayohatni boshlash",
    "header.stopTour": "Sayohatni to'xtatish",

    "audio.buttonDefault": "Audio",
    "audio.panelTitle": "Ofis Audiosi",
    "audio.mute": "Ovozsiz",
    "audio.unmute": "Ovozni yoqish",
    "audio.uploadOwnTrack": "O'z musiqalaringizni yuklang",
    "audio.premiumLibrary": "Premium Kutubxona",
    "audio.upgradeToUnlock": "Premium kutubxonani ochish uchun tarifni oshiring.",
    "audio.stop": "To'xtatish ({label})",
    "audio.pause": "To'xtatib turish",
    "audio.resume": "Davom ettirish",
    "audio.next": "Keyingisi",
    "audio.volume": "Ovoz balandligi",
    "audio.track.deepFocus": "Chuqur Diqqat",
    "audio.track.lofiPulse": "Lo-Fi Puls",
    "audio.track.rainyOffice": "Yomg'irli Ofis",

    "plan.free.name": "Bepul",
    "plan.plus.name": "Plus",
    "plan.pro.name": "Pro",
    "plan.ultra.name": "Ultra",
    "plan.badge": "{name} Tarif",
    "plan.free.feature.0": "50 token / oy",
    "plan.free.feature.1": "Vazifani qo'lda biriktirish",
    "plan.free.feature.2": "Xona fon ovozi",
    "plan.plus.feature.0": "500 token / oy",
    "plan.plus.feature.1": "Loyiha menejeri orqali yo'naltirish",
    "plan.plus.feature.2": "Vazifalar tarixi + yuklab olish",
    "plan.plus.feature.3": "O'z audioingizni yuklash",
    "plan.pro.feature.0": "2 000 token / oy",
    "plan.pro.feature.1": "Muddatli vazifalar",
    "plan.pro.feature.2": "Premium audio kutubxonasi",
    "plan.pro.feature.3": "Ustuvor qo'llab-quvvatlash",
    "plan.ultra.feature.0": "8 000 token / oy",
    "plan.ultra.feature.1": "Kinematik sayohat brendingi",
    "plan.ultra.feature.2": "Barcha premium audio treklar",
    "plan.ultra.feature.3": "Shaxsiy qo'llab-quvvatlash",

    "pricing.title": "AI Ofisingizni yangilang",
    "pricing.subtitle": "Demo rejim — tarif tanlash uni faqat lokal qo'llaydi. Hech qanday to'lov amalga oshirilmaydi.",
    "pricing.monthly": "Oylik",
    "pricing.yearly": "Yillik",
    "pricing.tokensPerMonth": "{count} token/oy",
    "pricing.perMonth": "/oy",
    "pricing.billedYearly": "${amount}/yil hisoblanadi",
    "pricing.currentPlan": "Joriy Tarif — Bekor qilish uchun bosing",
    "pricing.choosePlan": "{name} ni tanlash",
    "pricing.alaCarteTitle": "Alohida Agentlar",
    "pricing.alaCarteSubtitle": "To'liq tarif kerak emasmi? Faqat kerakli agentlarni qo'shing, har biri ${price}/oy.",
    "pricing.added": "Qo'shildi",
    "pricing.addPerMonth": "+${price}/oy",

    "agentInfo.currentActivity": "Joriy faoliyat",

    "agentsDirectory.title": "Agentlar ro'yxati",
    "agentsDirectory.teamMembers": "{count} jamoa a'zosi",
    "agentsDirectory.tasksDone": "Bajarilgan vazifalar",

    "manager.title": "Loyiha Menejeri",
    "manager.subtitle": "Jamoa bilan yagona aloqa nuqtangiz",
    "manager.commandPlaceholder": 'masalan, "Yangi logotip yarating" yoki "Login API sini yasang"…',
    "manager.timeLimitPlaceholder": "vaqt chegarasi",
    "manager.send": "Menejerga yuborish",
    "manager.routedTo": "{agent}ga yo'naltirildi{suffix}.",
    "manager.simulationOnly": " (faqat vizual simulyatsiya — bu rol uchun hali jonli generator yo'q)",
    "manager.teamStatus": "Jamoa holati",
    "manager.activityLog": "Faoliyat jurnali",
    "manager.noActivity": "Hali faoliyat yo'q.",

    "chat.openButton": "Natali bilan suhbat",
    "chat.title": "Natali",
    "chat.subtitle": "Ofis Administratori · Bosh Loyiha Menejeri",
    "chat.placeholder": 'masalan, "Frontend dasturchiga 10 daqiqada login sahifasini yasashni ayting"…',
    "chat.send": "Yuborish",
    "chat.statusQuickAction": "Hisobot",
    "chat.greeting":
      "Salom, men Natali — Bosh Loyiha Menejeri. Nima qurish kerakligini ayting, men uni topshiraman, yoki istalgan vaqtda \"hisobot\" so'rang.",

    "mode.work": "Ish vaqti",
    "mode.meeting": "Yig'ilish",
    "mode.break": "Dam olish",
    "mode.free": "Erkin holat",

    "roi.tooltip": "Taxmin: bajarilgan har bir vazifa uchun {hours} soat va soatiga ${rate}",
    "roi.saved": "~{hours} soat · ${money} tejaldi",

    "taskAssignment.assignTask": "Vazifa biriktirish",
    "taskAssignment.assignATask": "Vazifa biriktirish",
    "taskAssignment.taskPlaceholder": "{agent} uchun vazifani tavsiflang…",
    "taskAssignment.timeLimitOptional": "Vaqt chegarasi (ixtiyoriy)",
    "taskAssignment.minutesPlaceholder": "daqiqa",
    "taskAssignment.countdownHint": "→ agent boshi ustida sanoq ko'rinadi",
    "taskAssignment.working": "Bajarilmoqda…",
    "taskAssignment.submitTask": "Vazifani yuborish",
    "taskAssignment.genericError": "Nimadir xato ketdi.",
    "taskAssignment.finished": "{agent} yakunladi — natija ZIP fayli yuklab olindi.",

    "taskHistory.title": "Vazifalar tarixi",
    "taskHistory.completedThisSession": "Ushbu sessiyada {count} ta bajarildi",
    "taskHistory.empty":
      "Hali bajarilgan vazifalar yo'q. Vazifalar panelidan birini biriktiring — u tugagach, bu yerda yuklab olish havolasi bilan chiqadi.",

    "tour.stepOf": "Sayohat · {step}-qadam / {total}",

    "activityFeed.title": "Jonli Faoliyat",
    "activityFeed.waiting": "Agent faoliyati kutilmoqda…",

    "agentState.IDLE": "Bo'sh",
    "agentState.WORKING": "Ishlamoqda",
    "agentState.WALKING": "Yurmoqda",
    "agentState.MEETING": "Yig'ilishda",
    "agentState.BREAK": "Tanaffusda",
    "agentState.SLEEP": "Uxlamoqda",
    "agentState.MANAGING": "Ofisni boshqarmoqda",

    "location.workstationSuffix": "{role} Ish joyi",
    "location.meetingRoom": "Yig'ilishlar xonasi",
    "location.lounge": "Dam olish xonasi",
    "location.restArea": "Dam olish maydoni",
    "location.reception": "Qabulxona",
    "location.serverRoom": "Server xonasi",
    "location.centralDesk": "Markaziy boshqaruv stoli",

    "agent.Graphic.name": "Grafik Dizayner",
    "agent.Graphic.role": "Brending va Illyustratsiya",
    "agent.Graphic.summary": "Vizual konseptlar, illyustratsiyalar va brend identifikatsiyasi asetlarini yaratadi.",
    "agent.Graphic.pipelineRole":
      "Frontend haqiqiy mahsulotda jonlantiradigan vizual identifikatsiyani — logotiplar, illyustratsiyalar, brend ranglarini — yaratadi.",
    "agent.UI_UX.name": "UI/UX Dizayner",
    "agent.UI_UX.role": "Interfeys va Oqim Dizayni",
    "agent.UI_UX.summary": "Interfeyslar, UX oqimlari va ilova tuzilmalarini loyihalaydi.",
    "agent.UI_UX.pipelineRole":
      "Avval foydalanuvchi oqimlari va wireframe larni belgilaydi, so'ng dizayn spetsifikatsiyalarini Grafik va Frontend ga topshiradi.",
    "agent.3D_Model.name": "3D Model Dizayner",
    "agent.3D_Model.role": "3D Asetlar va Muhitlar",
    "agent.3D_Model.summary": "3D modellar, o'yin asetlari va muhit qismlarini yaratadi.",
    "agent.3D_Model.pipelineRole":
      "Platformaning vizualizatsiya qatlamini ta'minlaydigan 3D asetlar va muhitlarni — xuddi shu ofis kabi — yaratadi.",
    "agent.Frontend.name": "Frontend Dasturchi",
    "agent.Frontend.role": "React / Next.js",
    "agent.Frontend.summary": "React/Next.js da veb-saytlar va frontend arxitekturasini quradi.",
    "agent.Frontend.pipelineRole":
      "UI/UX va Grafik dizaynlarini Backend ning jonli API siga bevosita ulangan haqiqiy React interfeysiga aylantiradi.",
    "agent.Backend.name": "Backend Dasturchi",
    "agent.Backend.role": "API lar va Infratuzilma",
    "agent.Backend.summary": "API lar, ma'lumotlar bazalari, autentifikatsiya va server arxitekturasini quradi.",
    "agent.Backend.pipelineRole":
      "Boshqa har bir agent natijasi oxir-oqibat ishlaydigan API, ma'lumotlar bazasi va autentifikatsiyani — platforma poydevorini — ta'minlaydi.",
    "agent.Android_iOS.name": "Mobil Dasturchi",
    "agent.Android_iOS.role": "Android va iOS",
    "agent.Android_iOS.summary": "Android va iOS uchun mobil ilovalarni quradi.",
    "agent.Android_iOS.pipelineRole":
      "Frontend komponentlari va Backend API sini Android hamda iOS uchun mahalliy tajribaga moslashtiradi.",
    "agent.Natali.name": "Bosh Loyiha Menejeri",
    "agent.Natali.role": "Ofis Administratori",
    "agent.Natali.summary":
      "Ofisni kundalik boshqaradi — so'rovlaringizni to'g'ri mutaxassisga topshiradi va butun jamoaning holati haqida hisobot beradi.",
    "agent.Natali.pipelineRole":
      "Pipeline markazida turadi — so'rovingizni qabul qiladi, uni to'g'ri mutaxassisga yo'naltiradi va butun jamoa bo'ylab holatni sizga qaytaradi.",
  },
};
