"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Settings,
  ScrollText,
  LayoutDashboard,
  List,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Zap,
  Database,
  Key,
  Users,
  LogOut,
  User,
  Check,
  Building2,
  PlusCircle,
  ListTodo,
  Webhook,
  HardDrive,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import type { MemberRole } from "@prisma/client";

interface AgentNav {
  id: string;
  name: string;
  slug: string;
}

interface WorkspaceItem {
  id: string;
  name: string;
  role: MemberRole;
}

interface SidebarProps {
  agents: AgentNav[];
  workspaceName: string;
  workspaceId: string;
  workspaces: WorkspaceItem[];
  userName: string | null;
  userEmail: string;
  userImage: string | null;
  userRole: MemberRole;
}

export function Sidebar({
  agents,
  workspaceName,
  workspaceId,
  workspaces,
  userName,
  userEmail,
  userImage,
  userRole,
}: SidebarProps) {
  const pathname = usePathname();
  const [wsOpen, setWsOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const wsRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { update } = useSession();

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wsRef.current && !wsRef.current.contains(e.target as Node))
        setWsOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node))
        setUserOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function switchWorkspace(ws: WorkspaceItem) {
    setWsOpen(false);
    const res = await fetch("/api/workspace/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: ws.id }),
    });
    if (res.ok) {
      const data = await res.json();
      await update({ workspaceId: data.workspaceId, workspaceName: data.workspaceName, role: data.role });
      router.refresh();
    }
  }

  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : userEmail[0].toUpperCase();

  return (
    <aside className="w-56 shrink-0 flex flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] h-full">
      {/* Workspace header with switcher */}
      <div className="relative" ref={wsRef}>
        <button
          onClick={() => setWsOpen((o) => !o)}
          className="w-full px-4 py-3 border-b border-[var(--color-border)] text-left hover:bg-[var(--color-surface-raised)] transition-colors flex items-center gap-2"
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider">
              Workspace
            </p>
            <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate mt-0.5">
              {workspaceName}
            </p>
          </div>
          <ChevronDown
            size={12}
            className={cn(
              "shrink-0 text-[var(--color-text-tertiary)] transition-transform",
              wsOpen && "rotate-180"
            )}
          />
        </button>

        {wsOpen && (
          <div
            className="absolute top-full left-0 right-0 z-50 border border-[var(--color-border)] rounded-b shadow-md"
            style={{ background: "var(--color-surface)" }}
          >
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => switchWorkspace(ws)}
                className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-[var(--color-surface-raised)] transition-colors"
              >
                <Building2 size={12} className="text-[var(--color-text-tertiary)] shrink-0" />
                <span className="flex-1 truncate">{ws.name}</span>
                {ws.id === workspaceId && (
                  <Check size={12} style={{ color: "var(--color-primary)" }} />
                )}
              </button>
            ))}
            <div className="border-t border-[var(--color-border)]">
              <Link
                href="/onboarding"
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)] transition-colors"
                onClick={() => setWsOpen(false)}
              >
                <PlusCircle size={12} />
                New workspace
              </Link>
            </div>
          </div>
        )}
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
          <NavItem href="/settings/webhooks" icon={Webhook} label="Webhooks" />
          <NavItem href="/settings/jobs" icon={ListTodo} label="Jobs" />
          <NavItem href="/settings/files" icon={HardDrive} label="Files" />
          {(userRole === "ADMIN" || userRole === "MANAGER") && (
            <NavItem href="/settings/members" icon={Users} label="Members" />
          )}
        </div>
      </nav>

      {/* User menu */}
      <div
        className="relative border-t border-[var(--color-border)]"
        ref={userRef}
      >
        <button
          onClick={() => setUserOpen((o) => !o)}
          className="w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-[var(--color-surface-raised)] transition-colors"
        >
          {userImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={userImage} alt="" className="w-7 h-7 rounded-full shrink-0" />
          ) : (
            <div
              className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold"
              style={{ background: "var(--color-primary)", color: "#fff" }}
            >
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0 text-left">
            {userName && (
              <p className="text-xs font-medium truncate">{userName}</p>
            )}
            <p className="text-xs truncate" style={{ color: "var(--color-text-tertiary)" }}>
              {userEmail}
            </p>
          </div>
          <ChevronUp
            size={12}
            className={cn(
              "shrink-0 text-[var(--color-text-tertiary)] transition-transform",
              !userOpen && "rotate-180"
            )}
          />
        </button>

        {userOpen && (
          <div
            className="absolute bottom-full left-0 right-0 z-50 border border-[var(--color-border)] rounded-t shadow-md"
            style={{ background: "var(--color-surface)" }}
          >
            <Link
              href="/settings/profile"
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)] transition-colors"
              onClick={() => setUserOpen(false)}
            >
              <User size={13} />
              Profile
            </Link>
            <div className="border-t border-[var(--color-border)]">
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)] transition-colors"
              >
                <LogOut size={13} />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
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
