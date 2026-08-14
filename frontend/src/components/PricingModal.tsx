import { createPortal } from "react-dom";
import { AGENTS_BY_ID, TEAM_AGENT_IDS, agentText } from "../data/agents";
import {
  AGENT_ADDON_MONTHLY_PRICE,
  PURCHASABLE_PLANS,
  useSubscriptionStore,
  yearlyPriceFor,
  type PlanId,
} from "../store/subscriptionStore";
import { useTranslation } from "../i18n/useTranslation";

export interface PricingModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * The pricing modal — 3 tiers (Plus/Pro/Ultra), a Monthly/Yearly toggle with the yearly price
 * computed live (20% off, struck-through full price shown alongside), and an à la carte section
 * to buy individual agents without a full tier. This is a genuinely honest local-state
 * simulation of a subscription flow (see subscriptionStore.ts's top comment) — no payment
 * processor is wired up, and the modal says so plainly rather than pretending to charge a card.
 *
 * Rendered via a portal straight onto document.body (not inline where PlanBadge/Header happen to
 * mount it). Header carries `.glass-panel`'s `backdrop-filter`, and per the CSS spec a
 * `backdrop-filter`/`filter`/`transform` on an ancestor creates a new containing block for any
 * `position: fixed` descendant — so without the portal, this modal's "fixed inset-0" was being
 * measured against Header's own small box instead of the viewport, which is exactly why it
 * rendered squashed near the top instead of centered on screen. The portal sidesteps that
 * entirely: document.body has no such ancestor, so `fixed` here always means "the viewport".
 */
export default function PricingModal({ open, onClose }: PricingModalProps) {
  const planId = useSubscriptionStore((s) => s.planId);
  const billingCycle = useSubscriptionStore((s) => s.billingCycle);
  const setPlan = useSubscriptionStore((s) => s.setPlan);
  const setBillingCycle = useSubscriptionStore((s) => s.setBillingCycle);
  const addOnAgentIds = useSubscriptionStore((s) => s.addOnAgentIds);
  const toggleAddOnAgent = useSubscriptionStore((s) => s.toggleAddOnAgent);
  const { t, locale } = useTranslation();

  if (!open) return null;

  const handleSelectPlan = (id: PlanId) => setPlan(planId === id ? "free" : id);

  return createPortal(
    <div
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      {/* Solid, fully opaque — no glassmorphism/backdrop-filter/alpha on this box, so nothing
          from the 3D scene behind it can ever bleed through. stopPropagation so a click inside
          the card doesn't fall through to the backdrop's onClose. */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 p-5 shadow-2xl shadow-black/50 sm:p-6"
        style={{ backgroundColor: "#0f172a" }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-base text-white/80 transition hover:bg-white/20 hover:text-white"
        >
          ✕
        </button>

        <div className="pr-10">
          <h2 className="text-lg font-semibold text-white">{t("pricing.title")}</h2>
          <p className="mt-0.5 text-xs text-white/50">{t("pricing.subtitle")}</p>
        </div>

        {/* Monthly / Yearly toggle */}
        <div className="mt-5 flex justify-center">
          <div className="flex items-center gap-1 rounded-xl bg-white/5 p-1">
            {(["monthly", "yearly"] as const).map((cycle) => (
              <button
                key={cycle}
                type="button"
                onClick={() => setBillingCycle(cycle)}
                className={`rounded-lg px-4 py-1.5 text-xs font-medium transition ${
                  billingCycle === cycle ? "bg-white/15 text-white" : "text-white/50 hover:text-white/80"
                }`}
              >
                {cycle === "monthly" ? t("pricing.monthly") : t("pricing.yearly")}
                {cycle === "yearly" && <span className="ml-1.5 text-emerald-300">-20%</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Tier cards */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {PURCHASABLE_PLANS.map((plan) => {
            const active = planId === plan.id;
            const { fullYearly, discountedYearly } = yearlyPriceFor(plan.monthlyPrice);
            const displayPrice = billingCycle === "yearly" ? discountedYearly / 12 : plan.monthlyPrice;
            const planName = t(plan.nameKey);

            return (
              <div
                key={plan.id}
                className={`flex flex-col gap-3 rounded-xl border p-4 transition ${
                  active ? "border-sky-400/60 bg-sky-400/[0.06]" : "border-white/10 bg-white/[0.02]"
                }`}
              >
                <div>
                  <h3 className="text-sm font-semibold text-white">{planName}</h3>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-white/35">
                    {t("pricing.tokensPerMonth", { count: plan.tokensPerMonth.toLocaleString() })}
                  </p>
                </div>

                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-white">${displayPrice.toFixed(0)}</span>
                    <span className="text-xs text-white/40">{t("pricing.perMonth")}</span>
                  </div>
                  {billingCycle === "yearly" && (
                    <p className="text-[10px] text-white/40">
                      <span className="line-through">${(fullYearly / 12).toFixed(0)}{t("pricing.perMonth")}</span>{" "}
                      <span className="text-emerald-300">
                        {t("pricing.billedYearly", { amount: discountedYearly.toFixed(0) })}
                      </span>
                    </p>
                  )}
                </div>

                <ul className="flex flex-1 flex-col gap-1.5 text-[11px] text-white/65">
                  {plan.featureKeys.map((featureKey) => (
                    <li key={featureKey} className="flex items-start gap-1.5">
                      <span className="mt-0.5 text-emerald-300">✓</span>
                      {t(featureKey)}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => handleSelectPlan(plan.id)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    active
                      ? "bg-white/10 text-white/70 hover:bg-white/15"
                      : "bg-gradient-to-br from-sky-400 to-violet-500 text-white hover:brightness-110"
                  }`}
                >
                  {active ? t("pricing.currentPlan") : t("pricing.choosePlan", { name: planName })}
                </button>
              </div>
            );
          })}
        </div>

        {/* À la carte agents */}
        <div className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-white/50">{t("pricing.alaCarteTitle")}</h3>
          <p className="mt-1 text-[11px] text-white/40">
            {t("pricing.alaCarteSubtitle", { price: AGENT_ADDON_MONTHLY_PRICE })}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {TEAM_AGENT_IDS.map((agentId) => {
              const agent = AGENTS_BY_ID[agentId];
              const owned = addOnAgentIds.includes(agent.id);
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => toggleAddOnAgent(agent.id)}
                  className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-[11px] transition ${
                    owned ? "border-emerald-400/50 bg-emerald-400/10" : "border-white/10 bg-white/[0.02] hover:bg-white/5"
                  }`}
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: agent.color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-white/85">{agentText(agent.id, locale).name}</span>
                    <span className="text-white/40">
                      {owned ? t("pricing.added") : t("pricing.addPerMonth", { price: AGENT_ADDON_MONTHLY_PRICE })}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
