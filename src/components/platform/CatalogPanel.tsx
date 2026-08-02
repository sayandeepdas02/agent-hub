"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Search, Pencil, Check, X, Upload } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface Product {
  id: string;
  sku: string;
  name: string;
}

interface CatalogPanelProps {
  customers: Customer[];
  products: Product[];
}

export function CatalogPanel({ customers, products }: CatalogPanelProps) {
  const [tab, setTab] = useState<"customers" | "products">("customers");

  return (
    <div>
      <div className="flex gap-0 border-b border-[var(--color-border)] mb-6">
        {(["customers", "products"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "px-4 py-2 text-sm capitalize transition-colors border-b-2 -mb-px " +
              (tab === t
                ? "border-[var(--color-primary)] text-[var(--color-primary)] font-medium"
                : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]")
            }
          >
            {t} ({t === "customers" ? customers.length : products.length})
          </button>
        ))}
      </div>

      {tab === "customers" ? (
        <CustomersSection customers={customers} />
      ) : (
        <ProductsSection products={products} />
      )}
    </div>
  );
}

// ─── Customers ────────────────────────────────────────────────────────────────

function CustomersSection({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      customers.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.email?.toLowerCase().includes(query.toLowerCase())
      ),
    [customers, query]
  );

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/catalog/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email: email || undefined, phone: phone || undefined }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Failed");
      setName(""); setEmail(""); setPhone("");
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(c: Customer) {
    setEditing(c.id);
    setEditName(c.name);
    setEditEmail(c.email ?? "");
    setEditPhone(c.phone ?? "");
  }

  async function saveEdit(id: string) {
    setEditSaving(true);
    try {
      await fetch(`/api/catalog/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, email: editEmail || null, phone: editPhone || null }),
      });
      setEditing(null);
      router.refresh();
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    await fetch(`/api/catalog/customers/${id}`, { method: "DELETE" });
    setDeleting(null);
    router.refresh();
  }

  async function handleImport() {
    setImporting(true);
    setImportResult(null);
    try {
      // Parse CSV: name,email,phone (header optional)
      const lines = csvText.trim().split("\n").map((l) => l.trim()).filter(Boolean);
      const items = lines
        .filter((l) => !l.toLowerCase().startsWith("name"))
        .map((l) => {
          const [n, e, p] = l.split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
          return { name: n, email: e || undefined, phone: p || undefined };
        })
        .filter((r) => r.name);

      const res = await fetch("/api/catalog/customers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const result = await res.json() as { created: number; skipped: number };
      setImportResult(result);
      setCsvText("");
      router.refresh();
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <input
            type="text"
            placeholder="Search customers…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-primary)]"
          />
        </div>
        <button
          onClick={() => { setShowImport((o) => !o); setShowForm(false); setImportResult(null); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)] transition-colors"
        >
          <Upload size={12} /> Import
        </button>
        <button
          onClick={() => { setShowForm((o) => !o); setShowImport(false); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity"
        >
          <Plus size={12} /> Add
        </button>
      </div>

      {showImport && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4 space-y-3">
          <p className="text-xs font-mono text-[var(--color-text-tertiary)]">
            Paste CSV — one row per line, columns: <code>name, email, phone</code> (header optional)
          </p>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={6}
            placeholder={"Acme Corp,orders@acme.com,+1 555 000 0000\nBeta Inc,,"}
            className="w-full text-xs font-mono px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-primary)] resize-none"
          />
          {importResult && (
            <p className="text-xs font-mono text-[var(--color-green)]">
              Imported: {importResult.created} created, {importResult.skipped} skipped
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleImport}
              disabled={importing || !csvText.trim()}
              className="px-4 py-1.5 text-xs font-medium rounded bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-50"
            >
              {importing ? "Importing…" : "Import"}
            </button>
            <button
              onClick={() => { setShowImport(false); setCsvText(""); setImportResult(null); }}
              className="px-4 py-1.5 text-xs font-medium rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)]"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="bg-[var(--color-surface)] border border-[var(--color-primary)] rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3">
              <label className="block text-xs font-mono text-[var(--color-text-tertiary)] mb-1">Name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corp" className="w-full text-sm px-3 py-1.5 rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-primary)]" />
            </div>
            <div>
              <label className="block text-xs font-mono text-[var(--color-text-tertiary)] mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="orders@acme.com" className="w-full text-sm px-3 py-1.5 rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-primary)]" />
            </div>
            <div>
              <label className="block text-xs font-mono text-[var(--color-text-tertiary)] mb-1">Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 000 0000" className="w-full text-sm px-3 py-1.5 rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-primary)]" />
            </div>
          </div>
          {error && <p className="text-xs font-mono text-[var(--color-rust)]">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-1.5 text-xs font-medium rounded bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-50">
              {saving ? "Adding…" : "Add Customer"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-1.5 text-xs font-medium rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)]">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--color-text-tertiary)]">
            {query ? "No matches." : "No customers yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]">
                <th className="text-left px-4 py-2 text-xs font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-2 text-xs font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-2 text-xs font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider">Phone</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id} className={i < filtered.length - 1 ? "border-b border-[var(--color-border)]" : ""}>
                  {editing === c.id ? (
                    <>
                      <td className="px-3 py-1.5">
                        <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full text-sm px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] focus:outline-none focus:border-[var(--color-primary)]" />
                      </td>
                      <td className="px-3 py-1.5">
                        <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full text-sm px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] focus:outline-none focus:border-[var(--color-primary)] font-mono" />
                      </td>
                      <td className="px-3 py-1.5">
                        <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full text-sm px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] focus:outline-none focus:border-[var(--color-primary)] font-mono" />
                      </td>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => saveEdit(c.id)} disabled={editSaving} className="p-1 text-[var(--color-green)] hover:opacity-70 disabled:opacity-30">
                            <Check size={13} />
                          </button>
                          <button onClick={() => setEditing(null)} className="p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-rust)]">
                            <X size={13} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2.5 text-[var(--color-text-primary)] font-medium">{c.name}</td>
                      <td className="px-4 py-2.5 text-[var(--color-text-secondary)] font-mono text-xs">{c.email ?? "—"}</td>
                      <td className="px-4 py-2.5 text-[var(--color-text-secondary)] font-mono text-xs">{c.phone ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <button onClick={() => startEdit(c)} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)] transition-colors">
                            <Pencil size={12} />
                          </button>
                          <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-rust)] transition-colors disabled:opacity-30">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Products ─────────────────────────────────────────────────────────────────

function ProductsSection({ products }: { products: Product[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editSku, setEditSku] = useState("");
  const [editName, setEditName] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          p.sku.toLowerCase().includes(query.toLowerCase()) ||
          p.name.toLowerCase().includes(query.toLowerCase())
      ),
    [products, query]
  );

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/catalog/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku, name }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Failed");
      setSku(""); setName("");
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(p: Product) {
    setEditing(p.id);
    setEditSku(p.sku);
    setEditName(p.name);
  }

  async function saveEdit(id: string) {
    setEditSaving(true);
    try {
      await fetch(`/api/catalog/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku: editSku, name: editName }),
      });
      setEditing(null);
      router.refresh();
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    await fetch(`/api/catalog/products/${id}`, { method: "DELETE" });
    setDeleting(null);
    router.refresh();
  }

  async function handleImport() {
    setImporting(true);
    setImportResult(null);
    try {
      const lines = csvText.trim().split("\n").map((l) => l.trim()).filter(Boolean);
      const items = lines
        .filter((l) => !l.toLowerCase().startsWith("sku"))
        .map((l) => {
          const [s, n] = l.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
          return { sku: s, name: n };
        })
        .filter((r) => r.sku && r.name);

      const res = await fetch("/api/catalog/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const result = await res.json() as { created: number; skipped: number };
      setImportResult(result);
      setCsvText("");
      router.refresh();
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <input
            type="text"
            placeholder="Search by SKU or name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-primary)]"
          />
        </div>
        <button
          onClick={() => { setShowImport((o) => !o); setShowForm(false); setImportResult(null); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)] transition-colors"
        >
          <Upload size={12} /> Import
        </button>
        <button
          onClick={() => { setShowForm((o) => !o); setShowImport(false); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity"
        >
          <Plus size={12} /> Add
        </button>
      </div>

      {showImport && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4 space-y-3">
          <p className="text-xs font-mono text-[var(--color-text-tertiary)]">
            Paste CSV — columns: <code>sku, name</code> (header optional, SKUs auto-uppercased)
          </p>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={6}
            placeholder={"TSHIRT-BLK-L,Black T-Shirt Large\nHOODIE-GRY-M,Grey Hoodie Medium"}
            className="w-full text-xs font-mono px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-primary)] resize-none"
          />
          {importResult && (
            <p className="text-xs font-mono text-[var(--color-green)]">
              Imported: {importResult.created} created, {importResult.skipped} skipped
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleImport}
              disabled={importing || !csvText.trim()}
              className="px-4 py-1.5 text-xs font-medium rounded bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-50"
            >
              {importing ? "Importing…" : "Import"}
            </button>
            <button
              onClick={() => { setShowImport(false); setCsvText(""); setImportResult(null); }}
              className="px-4 py-1.5 text-xs font-medium rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)]"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="bg-[var(--color-surface)] border border-[var(--color-primary)] rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-[var(--color-text-tertiary)] mb-1">SKU *</label>
              <input required value={sku} onChange={(e) => setSku(e.target.value)} placeholder="TSHIRT-LG" className="w-full text-sm px-3 py-1.5 rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-primary)] font-mono" />
            </div>
            <div>
              <label className="block text-xs font-mono text-[var(--color-text-tertiary)] mb-1">Name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="T-Shirt Large" className="w-full text-sm px-3 py-1.5 rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-primary)]" />
            </div>
          </div>
          {error && <p className="text-xs font-mono text-[var(--color-rust)]">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-1.5 text-xs font-medium rounded bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-50">
              {saving ? "Adding…" : "Add Product"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-1.5 text-xs font-medium rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)]">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--color-text-tertiary)]">
            {query ? "No matches." : "No products yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]">
                <th className="text-left px-4 py-2 text-xs font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider">SKU</th>
                <th className="text-left px-4 py-2 text-xs font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider">Name</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id} className={i < filtered.length - 1 ? "border-b border-[var(--color-border)]" : ""}>
                  {editing === p.id ? (
                    <>
                      <td className="px-3 py-1.5">
                        <input value={editSku} onChange={(e) => setEditSku(e.target.value)} className="w-full text-sm px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] focus:outline-none focus:border-[var(--color-primary)] font-mono uppercase" />
                      </td>
                      <td className="px-3 py-1.5">
                        <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full text-sm px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] focus:outline-none focus:border-[var(--color-primary)]" />
                      </td>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => saveEdit(p.id)} disabled={editSaving} className="p-1 text-[var(--color-green)] hover:opacity-70 disabled:opacity-30">
                            <Check size={13} />
                          </button>
                          <button onClick={() => setEditing(null)} className="p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-rust)]">
                            <X size={13} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-text-secondary)]">{p.sku}</td>
                      <td className="px-4 py-2.5 text-[var(--color-text-primary)]">{p.name}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <button onClick={() => startEdit(p)} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)] transition-colors">
                            <Pencil size={12} />
                          </button>
                          <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-rust)] transition-colors disabled:opacity-30">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
