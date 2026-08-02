import { geistPixel } from "./pixel-font";

const CASES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
        <path d="M2 8h16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M5.5 12h4M5.5 14.5h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
    title: "Email-to-Order Automation",
    description:
      "Automatically parse purchase orders from customers or suppliers and convert them into structured records — no manual entry, no missed line items.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 2v5M10 13v5M2 10h5M13 10h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    ),
    title: "AI Data Extraction",
    description:
      "Extract product names, quantities, prices, and specs from PDFs, spreadsheets, and unstructured attachments using multi-modal AI — with source locations tracked.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <rect x="11" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <rect x="11" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    ),
    title: "Multi-channel Integrations",
    description:
      "Connect Gmail, Outlook, webhooks, and your existing tools. Agent Hub is the intelligent glue layer between all your systems, with an event log for every action.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M3 5.5h14M3 10h9M3 14.5h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="15.5" cy="13.5" r="3" stroke="currentColor" strokeWidth="1.4" />
        <path d="M14 13.5l1 1 2-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Catalog Intelligence",
    description:
      "Keep your product catalog accurate and current. Agents match, enrich, and flag discrepancies across incoming data — inline editing, bulk import, and search included.",
  },
];

export function UseCases() {
  return (
    <section
      id="use-cases"
      className="py-20 border-t border-b border-[var(--color-border)] bg-[var(--color-surface)]"
    >
      <div className="max-w-[1120px] mx-auto px-8">
        <div className="mb-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-tertiary)] mb-3">
            Use Cases
          </p>
          <h2 className={`text-4xl font-bold text-[var(--color-ink)] tracking-tight mb-3 ${geistPixel.className}`}>
            Built for the work you actually do
          </h2>
          <p className="text-[15px] text-[var(--color-text-secondary)] max-w-[520px] leading-relaxed">
            Agent Hub handles the repetitive, high-stakes back-office work so your team
            can focus on what moves the business.
          </p>
        </div>

        <div className="grid md:grid-cols-2 border border-[var(--color-border)] rounded-[var(--radius)] overflow-hidden">
          {CASES.map((c, i) => (
            <div
              key={c.title}
              className={[
                "p-8 bg-[var(--color-paper)] hover:bg-[var(--color-surface)] transition-colors",
                i % 2 === 0 ? "border-r border-[var(--color-border)]" : "",
                i < 2 ? "border-b border-[var(--color-border)]" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="w-10 h-10 rounded-[var(--radius)] bg-[var(--color-status-pending-bg)] text-[var(--color-primary)] flex items-center justify-center mb-4">
                {c.icon}
              </div>
              <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)] mb-2">
                {c.title}
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                {c.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
