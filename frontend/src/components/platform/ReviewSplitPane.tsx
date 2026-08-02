"use client";

import { cn } from "@/lib/utils";

interface ReviewSplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
  className?: string;
}

export function ReviewSplitPane({ left, right, className }: ReviewSplitPaneProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 divide-x divide-[var(--color-border)]",
        className
      )}
    >
      <div className="flex-1 min-w-0 overflow-y-auto p-6">{left}</div>
      <div className="w-[40%] min-w-[280px] max-w-[480px] shrink-0 overflow-y-auto p-6">{right}</div>
    </div>
  );
}
