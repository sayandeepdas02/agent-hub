"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, XCircle } from "lucide-react";

export interface TimelineStage {
  id: string;
  label: string;
  status: "done" | "active" | "pending" | "failed";
  timestamp?: string;
  note?: string;
}

interface AgentRunTimelineProps {
  stages: TimelineStage[];
  className?: string;
}

const stageConfig = {
  done: { icon: CheckCircle2, color: "text-[var(--color-green)]" },
  active: { icon: Circle, color: "text-[var(--color-primary)]" },
  pending: { icon: Circle, color: "text-[var(--color-text-tertiary)]" },
  failed: { icon: XCircle, color: "text-[var(--color-rust)]" },
};

export function AgentRunTimeline({ stages, className }: AgentRunTimelineProps) {
  return (
    <div className={cn("relative pl-6", className)}>
      {/* perforated edge strip */}
      <div className="absolute left-0 top-0 bottom-0 w-px border-l-2 border-dashed border-[var(--color-border-strong)]" />

      <div className="space-y-4">
        {stages.map((stage) => {
          const { icon: Icon, color } = stageConfig[stage.status];
          return (
            <div key={stage.id} className="relative">
              {/* stamp dot on the perforation */}
              <div className="absolute -left-[25px] top-0.5">
                <Icon size={14} className={color} />
              </div>

              <div className="flex items-baseline justify-between gap-4">
                <span
                  className={cn(
                    "text-sm font-mono",
                    stage.status === "pending"
                      ? "text-[var(--color-text-tertiary)]"
                      : "text-[var(--color-text-primary)]"
                  )}
                >
                  {stage.label}
                </span>
                {stage.timestamp && (
                  <span className="text-xs font-mono text-[var(--color-text-tertiary)] shrink-0">
                    {stage.timestamp}
                  </span>
                )}
              </div>

              {stage.note && (
                <p className="mt-0.5 text-xs text-[var(--color-text-secondary)] font-mono">
                  {stage.note}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
