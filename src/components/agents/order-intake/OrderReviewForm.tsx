"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ExtractedField, ExtractedLineItem, Issue } from "@/lib/agents/contract";

interface OrderReviewFormProps {
  order: {
    id: string;
    status: string;
    customerId: string | null;
    customerName?: string;
  };
  agentSlug: string;
  extractedFields: Record<string, ExtractedField>;
  extractedLineItems: ExtractedLineItem[];
  validationIssues: Issue[];
}

interface EditableLineItem {
  productSku: string;
  productName: string;
  quantity: string;
  unitPrice: string;
  color: string;
  size: string;
  uom: string;
}

function fieldStr(f: ExtractedField | undefined): string {
  if (!f || f.value === null || f.value === undefined) return "";
  return String(f.value);
}

function initLineItems(extracted: ExtractedLineItem[]): EditableLineItem[] {
  return extracted.map((item) => ({
    productSku: fieldStr(item.product_sku),
    productName: fieldStr(item.product_name),
    quantity: fieldStr(item.quantity),
    unitPrice: fieldStr(item.unit_price),
    color: fieldStr(item.color),
    size: fieldStr(item.size),
    uom: fieldStr(item.uom),
  }));
}

export function OrderReviewForm({
  order,
  agentSlug: _agentSlug,
  extractedFields,
  extractedLineItems,
  validationIssues,
}: OrderReviewFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState(
    fieldStr(extractedFields["customer_name"]) || order.customerName || ""
  );
  const [poNumber, setPoNumber] = useState(fieldStr(extractedFields["po_number"]));
  const [shipDate, setShipDate] = useState(fieldStr(extractedFields["requested_ship_date"]));
  const [instructions, setInstructions] = useState(fieldStr(extractedFields["special_instructions"]));
  const [lineItems, setLineItems] = useState<EditableLineItem[]>(
    () => initLineItems(extractedLineItems)
  );

  const isPending = order.status === "REVIEW_NEEDED";
  const errors = validationIssues.filter((i) => i.severity === "error");
  const warnings = validationIssues.filter((i) => i.severity === "warning");

  function updateLineItem(idx: number, field: keyof EditableLineItem, value: string) {
    setLineItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  }

  function pickAlternative(
    itemIdx: number,
    field: keyof EditableLineItem,
    value: string
  ) {
    updateLineItem(itemIdx, field, value);
  }

  async function handleApprove() {
    setLoading("approve");
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName || undefined,
          requestedShipDate: shipDate || undefined,
          specialInstructions: instructions || undefined,
          lineItems: lineItems.map((item) => ({
            productSku: item.productSku || undefined,
            productName: item.productName || undefined,
            quantity: item.quantity ? Number(item.quantity) : undefined,
            unitPrice: item.unitPrice ? Number(item.unitPrice) : undefined,
            color: item.color || undefined,
            size: item.size || undefined,
            uom: item.uom || undefined,
          })),
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error((body as { error?: string }).error ?? "Approval failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      setError("Reason is required");
      return;
    }
    setLoading("reject");
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error((body as { error?: string }).error ?? "Rejection failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* ── Validation issues ─────────────────────────────────────────── */}
      {validationIssues.length > 0 && (
        <div>
          <h3 className="text-xs font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2">
            Validation Issues
          </h3>
          <div className="space-y-1.5">
            {errors.map((iss, i) => (
              <IssueRow key={i} issue={iss} />
            ))}
            {warnings.map((iss, i) => (
              <IssueRow key={i} issue={iss} />
            ))}
          </div>
        </div>
      )}

      {/* ── Order header fields ────────────────────────────────────────── */}
      <div>
        <h3 className="text-xs font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider mb-3">
          Order Details
        </h3>
        <div className="space-y-3">
          <FormField
            label="Customer"
            value={customerName}
            onChange={setCustomerName}
            disabled={!isPending}
            confidence={extractedFields["customer_name"]?.confidence}
          />
          <FormField
            label="PO Number"
            value={poNumber}
            onChange={setPoNumber}
            disabled={!isPending}
            confidence={extractedFields["po_number"]?.confidence}
          />
          <FormField
            label="Ship Date"
            value={shipDate}
            onChange={setShipDate}
            disabled={!isPending}
            confidence={extractedFields["requested_ship_date"]?.confidence}
          />
          <FormField
            label="Instructions"
            value={instructions}
            onChange={setInstructions}
            disabled={!isPending}
            confidence={extractedFields["special_instructions"]?.confidence}
          />
        </div>
      </div>

      {/* ── Line items ────────────────────────────────────────────────── */}
      {(lineItems.length > 0 || extractedLineItems.length > 0) && (
        <div>
          <h3 className="text-xs font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider mb-3">
            Line Items
          </h3>
          <div className="space-y-3">
            {lineItems.map((item, idx) => {
              const src = extractedLineItems[idx];
              return (
                <div
                  key={idx}
                  className="border border-[var(--color-border)] rounded p-3 space-y-2 bg-[var(--color-surface-raised)]"
                >
                  <p className="text-xs font-mono text-[var(--color-text-tertiary)]">
                    Item {idx + 1}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <LineItemField
                      label="SKU"
                      value={item.productSku}
                      onChange={(v) => updateLineItem(idx, "productSku", v)}
                      disabled={!isPending}
                      confidence={src?.product_sku?.confidence}
                      alternatives={src?.product_sku?.alternatives?.map((a) => String(a.value))}
                      onPickAlternative={(v) => pickAlternative(idx, "productSku", v)}
                    />
                    <LineItemField
                      label="Name"
                      value={item.productName}
                      onChange={(v) => updateLineItem(idx, "productName", v)}
                      disabled={!isPending}
                      confidence={src?.product_name?.confidence}
                    />
                    <LineItemField
                      label="Qty"
                      value={item.quantity}
                      onChange={(v) => updateLineItem(idx, "quantity", v)}
                      disabled={!isPending}
                      confidence={src?.quantity?.confidence}
                      type="number"
                    />
                    <LineItemField
                      label="Unit Price"
                      value={item.unitPrice}
                      onChange={(v) => updateLineItem(idx, "unitPrice", v)}
                      disabled={!isPending}
                      confidence={src?.unit_price?.confidence}
                      type="number"
                    />
                    <LineItemField
                      label="Color"
                      value={item.color}
                      onChange={(v) => updateLineItem(idx, "color", v)}
                      disabled={!isPending}
                      confidence={src?.color?.confidence}
                    />
                    <LineItemField
                      label="Size"
                      value={item.size}
                      onChange={(v) => updateLineItem(idx, "size", v)}
                      disabled={!isPending}
                      confidence={src?.size?.confidence}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Actions ───────────────────────────────────────────────────── */}
      {isPending && (
        <div className="space-y-3 pt-2 border-t border-[var(--color-border)]">
          {error && (
            <p className="text-xs font-mono text-[var(--color-rust)]">{error}</p>
          )}

          {showReject ? (
            <div className="space-y-2">
              <textarea
                className="w-full text-sm border border-[var(--color-border)] rounded p-2 font-mono resize-none bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                rows={3}
                placeholder="Reason for rejection…"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleReject}
                  disabled={loading !== null}
                  className="flex-1 py-1.5 text-sm font-medium rounded bg-[var(--color-rust)] text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
                >
                  {loading === "reject" ? "Rejecting…" : "Confirm Reject"}
                </button>
                <button
                  onClick={() => {
                    setShowReject(false);
                    setRejectReason("");
                    setError(null);
                  }}
                  className="px-4 py-1.5 text-sm rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleApprove}
                disabled={loading !== null}
                className="flex-1 py-2 text-sm font-medium rounded bg-[var(--color-primary)] text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {loading === "approve" ? "Approving…" : "Approve"}
              </button>
              <button
                onClick={() => setShowReject(true)}
                disabled={loading !== null}
                className="flex-1 py-2 text-sm font-medium rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)] disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      )}

      {!isPending && (
        <div className="pt-2 border-t border-[var(--color-border)]">
          <p className="text-xs font-mono text-[var(--color-text-tertiary)]">
            Status:{" "}
            <span className="text-[var(--color-text-secondary)]">{order.status}</span>
          </p>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function IssueRow({ issue }: { issue: Issue }) {
  const isError = issue.severity === "error";
  return (
    <div
      className={cn(
        "flex items-start gap-2 px-3 py-2 rounded text-xs font-mono",
        isError
          ? "bg-[var(--color-status-failed-bg)] text-[var(--color-rust)]"
          : "bg-[var(--color-status-pending-bg)] text-[var(--color-amber)]"
      )}
    >
      <span className="shrink-0 font-bold uppercase">{issue.severity}</span>
      <span className="text-[var(--color-text-secondary)]">{issue.message}</span>
    </div>
  );
}

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  confidence?: number;
  type?: "text" | "number";
}

function FormField({ label, value, onChange, disabled, confidence, type = "text" }: FormFieldProps) {
  const hasConf = confidence !== undefined;
  const confColor =
    hasConf && confidence >= 0.9 ? "var(--color-green)" : "var(--color-amber)";

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-mono text-[var(--color-text-tertiary)]">{label}</label>
        {hasConf && (
          <span className="text-xs font-mono" style={{ color: confColor }}>
            {(confidence * 100).toFixed(0)}%
          </span>
        )}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          "w-full text-sm px-3 py-1.5 rounded border bg-[var(--color-surface-raised)]",
          "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]",
          "focus:outline-none focus:border-[var(--color-primary)] transition-colors",
          disabled ? "opacity-60 cursor-default border-[var(--color-border)]" : "border-[var(--color-border)] cursor-text",
          hasConf && confidence < 0.9 && !disabled ? "border-l-2 border-l-[var(--color-amber)]" : ""
        )}
        placeholder={label}
      />
    </div>
  );
}

interface LineItemFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  confidence?: number;
  type?: "text" | "number";
  alternatives?: string[];
  onPickAlternative?: (v: string) => void;
}

function LineItemField({
  label,
  value,
  onChange,
  disabled,
  confidence,
  type = "text",
  alternatives,
  onPickAlternative,
}: LineItemFieldProps) {
  const hasConf = confidence !== undefined;
  const confColor = hasConf && confidence >= 0.9 ? "var(--color-green)" : "var(--color-amber)";

  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <label className="text-xs font-mono text-[var(--color-text-tertiary)]">{label}</label>
        {hasConf && (
          <span className="text-xs font-mono" style={{ color: confColor }}>
            {(confidence * 100).toFixed(0)}%
          </span>
        )}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          "w-full text-xs px-2 py-1 rounded border bg-[var(--color-surface)]",
          "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]",
          "focus:outline-none focus:border-[var(--color-primary)] transition-colors font-mono",
          disabled ? "opacity-60 cursor-default border-[var(--color-border)]" : "border-[var(--color-border)] cursor-text",
          hasConf && confidence < 0.9 && !disabled ? "border-l-2 border-l-[var(--color-amber)]" : ""
        )}
        placeholder={label}
      />
      {alternatives && alternatives.length > 0 && !disabled && (
        <div className="mt-1 flex flex-wrap gap-1">
          {alternatives.map((alt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onPickAlternative?.(alt)}
              className="text-xs px-1.5 py-0.5 font-mono rounded border border-[var(--color-border)] text-[var(--color-text-tertiary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
            >
              {alt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
