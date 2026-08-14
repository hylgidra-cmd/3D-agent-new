import { useState } from "react";
import { PLANS, useSubscriptionStore } from "../store/subscriptionStore";
import { useTranslation } from "../i18n/useTranslation";
import PricingModal from "./PricingModal";

/** Compact header entry point into the pricing flow — current plan name, opens PricingModal. */
export default function PlanBadge() {
  const [open, setOpen] = useState(false);
  const planId = useSubscriptionStore((s) => s.planId);
  const plan = PLANS.find((p) => p.id === planId) ?? PLANS[0];
  const { t } = useTranslation();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-amber-300" fill="currentColor">
          <path d="M5 16 3 6l5.5 4L12 4l3.5 6L21 6l-2 10H5Zm0 2h14v2H5v-2Z" />
        </svg>
        {t("plan.badge", { name: t(plan.nameKey) })}
      </button>
      <PricingModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
