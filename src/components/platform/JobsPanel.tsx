"use client";

import { useState, useTransition } from "react";
import type { Job } from "@prisma/client";
import { cn } from "@/lib/utils";

interface QueueStat {
  name: string;
  counts: { waiting: number; active: number; completed: number; failed: number; delayed: number };
}

interface Props {
  jobs: Job[];
  queueStats: QueueStat[];
}

const statusColor: Record<string, string> = {
  PENDING: "text-[var(--color-status-pending)] bg-[var(--color-status-pending-bg)]",
  RUNNING: "text-blue-600 bg-blue-50",
  COMPLETED: "text-[var(--color-status-completed)] bg-[var(--color-status-completed-bg)]",
  FAILED: "text-[var(--color-status-failed)] bg-[var(--color-status-failed-bg)]",
};

export function JobsPanel({ jobs, queueStats }: Props) {
  const [filter, setFilter] = useState<"ALL" | "FAILED" | "RUNNING" | "PENDING">("ALL");
  const [isPending, startTransition] = useTransition();
  const [retrying, setRetrying] = useState<string | null>(null);

  const filtered = filter === "ALL" ? jobs : jobs.filter((j) => j.status === filter);

  async function retry(jobId: string) {
    setRetrying(jobId);
    await fetch("/api/jobs/retry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    });
    startTransition(() => {
      window.location.reload();
    });
    setRetrying(null);
  }

  const totalFailed = jobs.filter((j) => j.status === "FAILED").length;
  const totalRunning = jobs.filter((j) => j.status === "RUNNING").length;
  const totalPending = jobs.filter((j) => j.status === "PENDING").length;

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Job Queue</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          BullMQ queue status and workspace job history
        </p>
      </div>

      {/* Queue stats */}
      <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-3 lg:grid-cols-5">
        {queueStats.map((q) => (
          <div key={q.name} className="card p-3">
            <p className="text-xs font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2 truncate">
              {q.name}
            </p>
            <div className="space-y-1">
              {q.counts.active > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-blue-500">active</span>
                  <span className="font-mono font-semibold">{q.counts.active}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-[var(--color-text-tertiary)]">waiting</span>
                <span className="font-mono">{q.counts.waiting}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--color-text-tertiary)]">completed</span>
                <span className="font-mono">{q.counts.completed}</span>
              </div>
              {q.counts.failed > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--color-status-failed)]">failed</span>
                  <span className="font-mono font-semibold text-[var(--color-status-failed)]">
                    {q.counts.failed}
                  </span>
                </div>
              )}
              {q.counts.delayed > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--color-text-tertiary)]">delayed</span>
                  <span className="font-mono">{q.counts.delayed}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 mb-4">
        {(["ALL", "RUNNING", "PENDING", "FAILED"] as const).map((s) => {
          const count =
            s === "ALL" ? jobs.length : s === "FAILED" ? totalFailed : s === "RUNNING" ? totalRunning : totalPending;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                filter === s
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              )}
            >
              {s} {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Jobs table */}
      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-sm text-[var(--color-text-tertiary)]">
          No jobs yet
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                {["Queue", "Type", "Status", "Attempts", "Updated", ""].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-xs font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filtered.map((job) => (
                <tr
                  key={job.id}
                  className="hover:bg-[var(--color-surface-raised)] transition-colors"
                >
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-text-secondary)]">
                    {job.queueName}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[var(--color-text-primary)]">
                    {job.type}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                        statusColor[job.status] ?? "text-[var(--color-text-secondary)]"
                      )}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-text-secondary)]">
                    {job.attempts}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[var(--color-text-tertiary)]">
                    {new Date(job.updatedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {job.status === "FAILED" && (
                      <button
                        onClick={() => retry(job.id)}
                        disabled={retrying === job.id || isPending}
                        className="text-xs text-[var(--color-primary)] hover:underline disabled:opacity-50"
                      >
                        {retrying === job.id ? "Retrying…" : "Retry"}
                      </button>
                    )}
                    {job.error && (
                      <span
                        className="ml-3 text-xs text-[var(--color-text-tertiary)] truncate max-w-xs inline-block align-bottom"
                        title={job.error}
                      >
                        {job.error.slice(0, 60)}
                        {job.error.length > 60 ? "…" : ""}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
