import { geistPixel } from "./pixel-font";

const CHECK = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="shrink-0 mt-[1px] text-[var(--color-green)]">
    <circle cx="7" cy="7" r="6.5" stroke="currentColor" strokeWidth="1.2" />
    <path d="M4 7l2 2 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PLANS = [
  {
    name: "Lifetime",
    price: "$999",
    period: "one-time",
    description: "Full platform, deployed to your infrastructure. Own it permanently.",
    features: [
      "Full Agent Hub platform",
      "Self-hosted on your system",
      "12 months of tech support included",
      "All future updates",
      "Your data, your servers",
    ],
    cta: "Get Lifetime Access",
    highlight: true,
    badge: "Best Value",
  },
  {
    name: "Monthly",
    price: "$399",
    period: "/month",
    description: "We host, maintain, and support everything for you — end to end.",
    features: [
      "Fully managed hosting",
      "Unlimited agents & workflows",
      "Priority support & SLA",
      "Custom integrations",
      "Dedicated onboarding",
    ],
    cta: "Get Started",
    highlight: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-20">
      <div className="max-w-[1120px] mx-auto px-8">
        <div className="text-center mb-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-tertiary)] mb-2.5">
            Pricing
          </p>
          <h2 className={`text-4xl font-bold text-[var(--color-ink)] tracking-tight mb-3 ${geistPixel.className}`}>
            Simple, transparent pricing
          </h2>
          <p className="text-[15px] text-[var(--color-text-secondary)] max-w-[440px] mx-auto">
            No per-seat fees, no hidden costs. Own it or subscribe — your call.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto items-start">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={[
                "relative rounded-[10px] border p-8 flex flex-col gap-6 bg-[var(--color-surface)] transition-shadow hover:shadow-md",
                plan.highlight
                  ? "border-[var(--color-primary)] shadow-[0_0_0_1px_var(--color-primary),0_8px_32px_color-mix(in_srgb,var(--color-primary)_12%,transparent)]"
                  : "border-[var(--color-border)]",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-[0.06em] bg-[var(--color-primary)] text-white whitespace-nowrap">
                  {plan.badge}
                </span>
              )}

              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">
                  {plan.name}
                </p>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-[44px] font-bold tracking-[-0.03em] text-[var(--color-ink)] leading-none tabular-nums">
                    {plan.price}
                  </span>
                  <span className="text-sm text-[var(--color-text-secondary)]">{plan.period}</span>
                </div>
                <p className="text-[13px] text-[var(--color-text-secondary)] leading-snug mt-1.5">
                  {plan.description}
                </p>
              </div>

              <ul className="flex flex-col gap-2.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[13px] text-[var(--color-text-primary)]">
                    {CHECK}
                    <span className={f === "12 months of tech support included" ? "font-semibold" : ""}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              <a
                href="https://cal.com/dsayandeep/demo-for-agent-hub"
                target="_blank"
                rel="noopener noreferrer"
                className={[
                  "flex items-center justify-center px-5 py-3 rounded-[var(--radius)] text-sm font-semibold transition-colors",
                  plan.highlight
                    ? "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]"
                    : "border border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] bg-[var(--color-surface-raised)]",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
