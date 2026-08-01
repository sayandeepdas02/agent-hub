"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Settings,
  ScrollText,
  LayoutDashboard,
  List,
  ClipboardList,
  ChevronDown,
  Zap,
  Database,
  Key,
} from "lucide-react";
import { useState } from "react";

interface AgentNav {
  id: string;
  name: string;
  slug: string;
}

interface SidebarProps {
  agents: AgentNav[];
  workspaceName: string;
}

export function Sidebar({ agents, workspaceName }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 flex flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] h-full">
      {/* Workspace header */}
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <p className="text-xs font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider">
          Workspace
        </p>
        <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate mt-0.5">
          {workspaceName}
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {/* Agents section */}
        <div className="px-3 mb-1">
          <p className="px-2 text-xs font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1">
            Agents
          </p>
          {agents.map((agent) => (
            <AgentNavSection key={agent.id} agent={agent} pathname={pathname} />
          ))}
        </div>

        {/* Platform section */}
        <div className="px-3 mt-4">
          <p className="px-2 text-xs font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1">
            Platform
          </p>
          <NavItem href="/audit-log" icon={ScrollText} label="Audit Log" />
          <NavItem href="/settings/catalog" icon={Database} label="Catalog" />
          <NavItem href="/settings/integrations" icon={Settings} label="Integrations" />
          <NavItem href="/settings/automation" icon={Zap} label="Automation" />
          <NavItem href="/settings/api-keys" icon={Key} label="API Keys" />
        </div>
      </nav>
    </aside>
  );
}

function AgentNavSection({
  agent,
  pathname,
}: {
  agent: AgentNav;
  pathname: string;
}) {
  const base = `/agents/${agent.slug}`;
  const isAgentActive = pathname.startsWith(base);
  const [open, setOpen] = useState(isAgentActive);

  const subLinks = [
    { href: `${base}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
    { href: `${base}/orders`, label: "Orders", icon: List },
    { href: `${base}/queue`, label: "Review Queue", icon: ClipboardList },
  ];

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm transition-colors text-left",
          isAgentActive
            ? "text-[var(--color-primary)] font-medium"
            : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)]"
        )}
      >
        <span className="flex-1 truncate">{agent.name}</span>
        <ChevronDown
          size={12}
          className={cn(
            "shrink-0 transition-transform text-[var(--color-text-tertiary)]",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="ml-2 mt-0.5 mb-1 border-l border-[var(--color-border)] pl-3 space-y-0.5">
          {subLinks.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors",
                  isActive
                    ? "bg-[var(--color-status-pending-bg)] text-[var(--color-primary)] font-medium"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)]"
                )}
              >
                <Icon size={12} />
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
}) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors",
        isActive
          ? "bg-[var(--color-status-pending-bg)] text-[var(--color-primary)] font-medium"
          : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)]"
      )}
    >
      <Icon size={14} />
      {label}
    </Link>
  );
}
