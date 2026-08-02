"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { CatalogPicker, type PickerItem } from "@/components/platform/CatalogPicker";
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

  // catalog-add state: tracks which NOT_FOUND issues are being added
  const [addingIssue, setAddingIssue] = useState<string | null>(null); // issue field key
  const [addSku, setAddSku] = useState("");
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addingCatalog, setAddingCatalog] = useState(false);
  const [addedFields, setAddedFields] = useState<Set<string>>(new Set());

  const isPending = order.status === "REVIEW_NEEDED";
  const errors = validationIssues.filter((i) => i.severity === "error");
  const warnings = validationIssues.filter((i) => i.severity === "warning");
  const notFoundIssues = validationIssues.filter(
    (i) => i.code === "NOT_FOUND" && !addedFields.has(i.field)
  );

  function updateLineItem(idx: number, field: keyof EditableLineItem, value: string) {
    setLineItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  }

  // Combobox fetch functions
  const fetchCustomers = useCallback(async (q: string): Promise<PickerItem[]> => {
    const res = await fetch(`/api/catalog/customers?q=${encodeURIComponent(q)}&limit=6`);
    if (!res.ok) return [];
    const data = await res.json() as Array<{ id: string; name: string; email: string | null }>;
    return data.map((c) => ({ id: c.id, primary: c.name, secondary: c.email ?? undefined }));
  }, []);

  const fetchProducts = useCallback(async (q: string): Promise<PickerItem[]> => {
    const res = await fetch(`/api/catalog/products?q=${encodeURIComponent(q)}&limit=6`);
    if (!res.ok) return [];
    const data = await res.json() as Array<{ id: string; sku: string; name: string }>;
    return data.map((p) => ({ id: p.id, primary: p.sku, secondary: p.name }));
  }, []);

  function onProductSelect(idx: number, item: PickerItem) {
    setLineItems((prev) =>
      prev.map((li, i) =>
        i === idx
          ? { ...li, productSku: item.primary, productName: item.secondary ?? li.productName }
          : li
      )
    );
  }

  // "Add to catalog" handlers
  function openAddIssue(issue: Issue) {
    setAddingIssue(issue.field);
    const val = issue.extractedValue ?? "";
    if (issue.field === "customer_name") {
      setAddName(val);
      setAddEmail("");
    } else {
      // product — if val looks like a SKU (short, uppercase, dashes) pre-fill SKU else name
      const looksLikeSku = /^[A-Z0-9\-_]+$/.test(val) && val.length < 20;
      setAddSku(looksLikeSku ? val : "");
      setAddName(looksLikeSku ? "" : val);
    }
  }

  async function commitAddCustomer() {
    if (!addName.trim()) return;
    setAddingCatalog(true);
    try {
      const res = await fetch("/api/catalog/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addName.trim(), email: addEmail.trim() || undefined }),
      });
      if (res.ok) {
        setAddedFields((prev) => new Set([...prev, addingIssue!]));
        setCustomerName(addName.trim());
        setAddingIssue(null);
      }
    } finally {
      setAddingCatalog(false);
    }
  }

  async function commitAddProduct(issueField: string) {
    if (!addSku.trim() || !addName.trim()) return;
    setAddingCatalog(true);
    try {
      const res = await fetch("/api/catalog/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku: addSku.trim(), name: addName.trim() }),
      });
      if (res.ok) {
        setAddedFields((prev) => new Set([...prev, issueField]));
        // fill the matching line item
        const match = issueField.match(/line_items\[(\d+)\]/);
        if (match) {
          const idx = Number(match[1]);
          updateLineItem(idx, "productSku", addSku.trim().toUpperCase());
          updateLineItem(idx, "productName", addName.trim());
        }
        setAddingIssue(null);
      }
    } finally {
      setAddingCatalog(false);
    }
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
    if (!rejectReason.trim()) { setError("Reason is required"); return; }
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
      {/* ── Validation issues ──────────────────────────────────────────── */}
      {(errors.length > 0 || warnings.length > 0) && (
        <div>
          <h3 className="text-xs font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2">
            Validation Issues
          </h3>
          <div className="space-y-1.5">
            {[...errors, ...warnings].map((iss, i) => (
              <div key={i}>
                <IssueRow
                  issue={iss}
                  added={addedFields.has(iss.field)}
                  onAddToCatalog={
                    iss.code === "NOT_FOUND" && isPending && !addedFields.has(iss.field)
                      ? () => openAddIssue(iss)
                      : undefined
                  }
                />
                {/* Inline add-to-catalog form */}
                {addingIssue === iss.field && (
                  <div className="mt-1 ml-4 p-3 bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded space-y-2">
                    {iss.field === "customer_name" ? (
                      <>
                        <p className="text-xs font-mono text-[var(--color-text-tertiary)]">
                          Add customer to catalog
                        </p>
                        <input
                          value={addName}
                          onChange={(e) => setAddName(e.target.value)}
                          placeholder="Customer name *"
                          className="w-full text-xs px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] font-mono"
                        />
                        <input
                          value={addEmail}
                          onChange={(e) => setAddEmail(e.target.value)}
                          placeholder="Email (optional)"
                          type="email"
                          className="w-full text-xs px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] font-mono"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={commitAddCustomer}
                            disabled={addingCatalog || !addName.trim()}
                            className="px-3 py-1 text-xs font-medium rounded bg-[var(--color-primary)] text-white disabled:opacity-50"
                          >
                            {addingCatalog ? "Adding…" : "Add to Catalog"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setAddingIssue(null)}
                            className="px-3 py-1 text-xs rounded border border-[var(--color-border)] text-[var(--color-text-secondary)]"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-mono text-[var(--color-text-tertiary)]">
                          Add product to catalog
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            value={addSku}
                            onChange={(e) => setAddSku(e.target.value)}
                            placeholder="SKU *"
                            className="text-xs px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] font-mono uppercase"
                          />
                          <input
                            value={addName}
                            onChange={(e) => setAddName(e.target.value)}
                            placeholder="Product name *"
                            className="text-xs px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => commitAddProduct(iss.field)}
                            disabled={addingCatalog || !addSku.trim() || !addName.trim()}
                            className="px-3 py-1 text-xs font-medium rounded bg-[var(--color-primary)] text-white disabled:opacity-50"
                          >
                            {addingCatalog ? "Adding…" : "Add to Catalog"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setAddingIssue(null)}
                            className="px-3 py-1 text-xs rounded border border-[var(--color-border)] text-[var(--color-text-secondary)]"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Order header ───────────────────────────────────────────────── */}
      <div>
        <h3 className="text-xs font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider mb-3">
          Order Details
        </h3>
        <div className="space-y-3">
          <CatalogPicker
            label="Customer"
            value={customerName}
            onChange={setCustomerName}
            fetchItems={fetchCustomers}
            disabled={!isPending}
            confidence={extractedFields["customer_name"]?.confidence}
            lowConfidence={
              (extractedFields["customer_name"]?.confidence ?? 1) < 0.9
            }
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

      {/* ── Line items ─────────────────────────────────────────────────── */}
      {lineItems.length > 0 && (
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
                    {/* SKU — combobox */}
                    <CatalogPicker
                      label="SKU"
                      value={item.productSku}
                      onChange={(v) => updateLineItem(idx, "productSku", v)}
                      onSelect={(i) => onProductSelect(idx, i)}
                      fetchItems={fetchProducts}
                      disabled={!isPending}
                      confidence={src?.product_sku?.confidence}
                      lowConfidence={(src?.product_sku?.confidence ?? 1) < 0.9}
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
                  {/* Alternatives for SKU */}
                  {src?.product_sku?.alternatives &&
                    src.product_sku.alternatives.length > 0 &&
                    isPending && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-mono text-[var(--color-text-tertiary)]">
                          Alternatives:
                        </span>
                        {src.product_sku.alternatives.map((alt, ai) => (
                          <button
                            key={ai}
                            type="button"
                            onClick={() => updateLineItem(idx, "productSku", String(alt.value))}
                            className="text-xs px-1.5 py-0.5 font-mono rounded border border-[var(--color-border)] text-[var(--color-text-tertiary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
                          >
                            {String(alt.value)}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Actions ────────────────────────────────────────────────────── */}
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
                  onClick={() => { setShowReject(false); setRejectReason(""); setError(null); }}
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

function IssueRow({
  issue,
  added,
  onAddToCatalog,
}: {
  issue: Issue;
  added: boolean;
  onAddToCatalog?: () => void;
}) {
  const isError = issue.severity === "error";
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 px-3 py-2 rounded text-xs font-mono",
        added
          ? "bg-[var(--color-status-pending-bg)] text-[var(--color-green)] line-through"
          : isError
          ? "bg-[var(--color-status-failed-bg)] text-[var(--color-rust)]"
          : "bg-[var(--color-status-pending-bg)] text-[var(--color-amber)]"
      )}
    >
      <span className="flex items-start gap-2 flex-1 min-w-0">
        <span className="shrink-0 font-bold uppercase">{issue.severity}</span>
        <span className="text-[var(--color-text-secondary)]">{issue.message}</span>
      </span>
      {onAddToCatalog && (
        <button
          type="button"
          onClick={onAddToCatalog}
          className="shrink-0 px-2 py-0.5 rounded border border-current opacity-70 hover:opacity-100 transition-opacity"
        >
          Add to catalog
        </button>
      )}
      {added && <span className="shrink-0 text-[var(--color-green)]">Added</span>}
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
  const confColor = hasConf && confidence >= 0.9 ? "var(--color-green)" : "var(--color-amber)";

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
}

function LineItemField({ label, value, onChange, disabled, confidence, type = "text" }: LineItemFieldProps) {
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
    </div>
  );
}
