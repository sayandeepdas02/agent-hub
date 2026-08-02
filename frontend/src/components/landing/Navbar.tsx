export function Navbar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-[var(--color-paper)]/90 backdrop-blur-sm border-b border-[var(--color-border)]">
      <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <span className="text-[var(--color-primary)] font-bold text-xl font-[var(--font-fraunces)]">
            Agent Hub
          </span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          <a
            href="#use-cases"
            className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            Use Cases
          </a>
          <a
            href="#pricing"
            className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            Pricing
          </a>
        </div>

        <a
          href="https://cal.com/dsayandeep/demo-for-agent-hub"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius)] bg-[var(--color-primary)] text-white text-sm font-semibold hover:bg-[var(--color-primary-hover)] transition-colors"
        >
          Get Started
        </a>
      </nav>
    </header>
  );
}
