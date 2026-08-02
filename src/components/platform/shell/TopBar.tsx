"use client";

interface TopBarProps {
  agentName?: string;
  section?: string;
}

export function TopBar({ agentName, section }: TopBarProps) {
  return (
    <header className="h-12 shrink-0 flex items-center justify-between px-6 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
        {agentName && (
          <>
            <span className="font-medium text-[var(--color-text-primary)]">
              {agentName}
            </span>
            {section && (
              <>
                <span className="text-[var(--color-border-strong)]">/</span>
                <span>{section}</span>
              </>
            )}
          </>
        )}
      </div>
    </header>
  );
}
