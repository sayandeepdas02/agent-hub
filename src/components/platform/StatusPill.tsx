"use client";

import { cn } from "@/lib/utils";

type Status = "PENDING" | "REVIEW_NEEDED" | "COMPLETED" | "FAILED";

const config: Record<Status, { label: string; className: string }> = {
  PENDING: {
    label: "Pending",
    className: "bg-[var(--color-status-pending-bg)] text-[var(--color-status-pending-text)]",
  },
  REVIEW_NEEDED: {
    label: "Review needed",
    className: "bg-[var(--color-status-review-bg)] text-[var(--color-status-review-text)]",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-[var(--color-status-completed-bg)] text-[var(--color-status-completed-text)]",
  },
  FAILED: {
    label: "Failed",
    className: "bg-[var(--color-status-failed-bg)] text-[var(--color-status-failed-text)]",
  },
};

export function StatusPill({ status }: { status: Status }) {
  const { label, className } = config[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium font-mono",
        className
      )}
    >
      {label}
    </span>
  );
}
