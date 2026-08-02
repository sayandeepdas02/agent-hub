export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)] py-10 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <a href="/" className="text-[var(--color-primary)] font-bold text-lg font-[var(--font-fraunces)]">
          Agent Hub
        </a>

        <div className="flex items-center gap-6 text-sm text-[var(--color-text-secondary)]">
          <a href="#use-cases" className="hover:text-[var(--color-text-primary)] transition-colors">
            Use Cases
          </a>
          <a href="#pricing" className="hover:text-[var(--color-text-primary)] transition-colors">
            Pricing
          </a>
          <a
            href="https://cal.com/dsayandeep/demo-for-agent-hub"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--color-text-primary)] transition-colors"
          >
            Book a Demo
          </a>
        </div>

        <p className="text-xs text-[var(--color-text-tertiary)]">
          © {new Date().getFullYear()} Agent Hub. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
