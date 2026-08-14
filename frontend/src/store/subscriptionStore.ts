import { create } from "zustand";
import type { AgentId } from "../data/agents";
import type { TranslationKey } from "../i18n/translations";

export type PlanId = "free" | "plus" | "pro" | "ultra";
export type BillingCycle = "monthly" | "yearly";

export interface PlanDefinition {
  id: PlanId;
  /** Translation key for the plan's display name — see i18n/translations.ts's `plan.<id>.name`,
   * so PlanBadge/PricingModal re-render in the active locale instead of a fixed English name. */
  nameKey: TranslationKey;
  monthlyPrice: number;
  tokensPerMonth: number;
  /** Translation keys for each feature line — see `plan.<id>.feature.<n>`. */
  featureKeys: TranslationKey[];
}

// NOTE ON SCOPE: this is a local, honest UI simulation of a subscription flow — there is no
// payment processor, no backend billing, no user accounts wired up. Selecting a plan or an
// add-on agent below just updates local state instantly; PricingModal says exactly that. This
// exists to demo the intended SaaS UX, not to actually charge anyone.
export const PLANS: PlanDefinition[] = [
  {
    id: "free",
    nameKey: "plan.free.name",
    monthlyPrice: 0,
    tokensPerMonth: 50,
    featureKeys: ["plan.free.feature.0", "plan.free.feature.1", "plan.free.feature.2"],
  },
  {
    id: "plus",
    nameKey: "plan.plus.name",
    monthlyPrice: 19,
    tokensPerMonth: 500,
    featureKeys: ["plan.plus.feature.0", "plan.plus.feature.1", "plan.plus.feature.2", "plan.plus.feature.3"],
  },
  {
    id: "pro",
    nameKey: "plan.pro.name",
    monthlyPrice: 49,
    tokensPerMonth: 2000,
    featureKeys: ["plan.pro.feature.0", "plan.pro.feature.1", "plan.pro.feature.2", "plan.pro.feature.3"],
  },
  {
    id: "ultra",
    nameKey: "plan.ultra.name",
    monthlyPrice: 129,
    tokensPerMonth: 8000,
    featureKeys: ["plan.ultra.feature.0", "plan.ultra.feature.1", "plan.ultra.feature.2", "plan.ultra.feature.3"],
  },
];

/** The 3 purchasable tiers shown as cards in PricingModal — Free is the default/fallback state,
 * not something you "buy". */
export const PURCHASABLE_PLANS = PLANS.filter((plan) => plan.id !== "free");

export const YEARLY_DISCOUNT = 0.2;
export const AGENT_ADDON_MONTHLY_PRICE = 9;

export function yearlyPriceFor(monthlyPrice: number) {
  const fullYearly = monthlyPrice * 12;
  const discountedYearly = fullYearly * (1 - YEARLY_DISCOUNT);
  return { fullYearly, discountedYearly };
}

interface SubscriptionState {
  planId: PlanId;
  billingCycle: BillingCycle;
  /** À la carte agents purchased individually, independent of the main tier. */
  addOnAgentIds: AgentId[];

  setPlan: (planId: PlanId) => void;
  setBillingCycle: (cycle: BillingCycle) => void;
  toggleAddOnAgent: (agentId: AgentId) => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  planId: "free",
  billingCycle: "monthly",
  addOnAgentIds: [],

  setPlan: (planId) => set({ planId }),
  setBillingCycle: (billingCycle) => set({ billingCycle }),
  toggleAddOnAgent: (agentId) =>
    set((store) => ({
      addOnAgentIds: store.addOnAgentIds.includes(agentId)
        ? store.addOnAgentIds.filter((id) => id !== agentId)
        : [...store.addOnAgentIds, agentId],
    })),
}));

/** True once the user is on any paid tier — gates the premium audio library (see AudioPlayer). */
export function useIsPremium() {
  return useSubscriptionStore((s) => s.planId !== "free");
}
