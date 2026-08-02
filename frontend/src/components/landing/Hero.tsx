import { geistPixel } from "./pixel-font";

export function Hero() {
  return (
    <section className="pt-[100px] pb-20 grid md:grid-cols-2 gap-16 items-center max-w-[1120px] mx-auto px-8">
      {/* Left: copy */}
      <div>
        <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)] mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-green)] inline-block" />
          Self-hosted · Your infrastructure
        </div>

        <h1 className={`text-5xl font-bold text-[var(--color-ink)] leading-tight tracking-tight mb-5 ${geistPixel.className}`}>
          Automate your back office.{" "}
          <span className="text-[var(--color-primary)]">Own the infrastructure.</span>
        </h1>

        <p className="text-base text-[var(--color-text-secondary)] leading-relaxed max-w-[460px] mb-8">
          Agent Hub runs on your system — parsing emails, extracting orders, managing
          your catalog, and connecting your tools. No per-seat fees. No cloud lock-in.
          Yours, forever.
        </p>

        <div className="flex flex-wrap gap-3">
          <a
            href="https://cal.com/dsayandeep/demo-for-agent-hub"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-[var(--radius)] bg-[var(--color-primary)] text-white text-sm font-semibold hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            Book a demo
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <path d="M2 6.5h9M8 3.5l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
          <a
            href="#pricing"
            className="inline-flex items-center px-5 py-3 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] text-sm font-semibold hover:border-[var(--color-border-strong)] transition-colors"
          >
            See pricing
          </a>
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-5 text-xs text-[var(--color-text-tertiary)]">
          {["No credit card required", "Your data stays with you", "30-min setup"].map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="text-[var(--color-green)]">
                <circle cx="7" cy="7" r="6.5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M4.5 7l1.8 1.8 3.2-3.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Right: workflow panel */}
      <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-sm">
        {/* Panel titlebar */}
        <div className="px-[18px] py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface-raised)] flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff6058]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffc130]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
          </div>
          <span className="ml-1 text-xs font-medium text-[var(--color-text-secondary)]">Agent Hub — Live Run</span>
        </div>

        <div className="p-5 flex flex-col gap-3">
          {/* Step 1 */}
          <div className="flex gap-3.5 items-start">
            <div className="w-[34px] h-[34px] rounded-lg border border-[var(--color-border)] bg-[var(--color-status-pending-bg)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="1.5" y="3" width="13" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M1.5 6.5h13" stroke="currentColor" strokeWidth="1.2" />
                <path d="M4 9h4M4 11h2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-semibold text-[var(--color-text-primary)]">
                Email received{" "}
                <span className="ml-2 inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--color-status-completed-bg)] text-[var(--color-status-completed-text)]">
                  Done
                </span>
              </div>
              <div className="text-[11px] text-[var(--color-text-tertiary)] leading-snug mt-0.5">
                RE: PO #4821 — Acme Supply Co · 3 attachments
              </div>
            </div>
          </div>
          <div className="w-px h-3.5 bg-[var(--color-border)] ml-[17px]" />

          {/* Step 2 */}
          <div className="flex gap-3.5 items-start">
            <div className="w-[34px] h-[34px] rounded-lg border border-[color-mix(in_srgb,var(--color-primary)_30%,transparent)] bg-[var(--color-status-pending-bg)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 2v4M8 10v4M2 8h4M10 8h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-semibold text-[var(--color-text-primary)]">
                AI extraction{" "}
                <span className="ml-2 inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--color-status-pending-bg)] text-[var(--color-primary)] animate-pulse">
                  Running
                </span>
              </div>
              <div className="text-[11px] text-[var(--color-text-tertiary)] leading-snug mt-0.5">
                Parsing PDF · 14 line items identified
              </div>
            </div>
          </div>
          <div className="w-px h-3.5 bg-[var(--color-border)] ml-[17px]" />

          {/* Step 3 */}
          <div className="flex gap-3.5 items-start opacity-60">
            <div className="w-[34px] h-[34px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-tertiary)] flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="2" y="2" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                <rect x="8.5" y="2" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                <rect x="2" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-semibold text-[var(--color-text-primary)]">
                Catalog match{" "}
                <span className="ml-2 inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border border-[var(--color-border)] text-[var(--color-text-tertiary)] bg-[var(--color-surface-raised)]">
                  Queued
                </span>
              </div>
              <div className="text-[11px] text-[var(--color-text-tertiary)] leading-snug mt-0.5">
                Matching SKUs against product catalog
              </div>
            </div>
          </div>
          <div className="w-px h-3.5 bg-[var(--color-border)] ml-[17px]" />

          {/* Step 4 */}
          <div className="flex gap-3.5 items-start opacity-60">
            <div className="w-[34px] h-[34px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-tertiary)] flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 5h8M4 8h5.5M4 11h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <rect x="1.5" y="1.5" width="13" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-semibold text-[var(--color-text-primary)]">
                Order created{" "}
                <span className="ml-2 inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border border-[var(--color-border)] text-[var(--color-text-tertiary)] bg-[var(--color-surface-raised)]">
                  Queued
                </span>
              </div>
              <div className="text-[11px] text-[var(--color-text-tertiary)] leading-snug mt-0.5">
                Structured order + confirmation email
              </div>
            </div>
          </div>

          {/* Summary bar */}
          <div className="mt-2 px-3.5 py-3 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] flex justify-between items-center">
            <span className="text-xs text-[var(--color-text-secondary)]">Last run · just now</span>
            <span className="text-xs font-semibold text-[var(--color-green)]">↑ 14 items queued</span>
          </div>
        </div>
      </div>
    </section>
  );
}
