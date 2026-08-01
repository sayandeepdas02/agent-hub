"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Search } from "lucide-react";

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
      {/* Tabs */}
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

function CustomersSection({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
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
      if (!res.ok) {
        const b = await res.json() as { error?: string };
        throw new Error(b.error ?? "Failed");
      }
      setName(""); setEmail(""); setPhone("");
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    await fetch(`/api/catalog/customers/${id}`, { method: "DELETE" });
    setDeleting(null);
    router.refresh();
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
          onClick={() => setShowForm((o) => !o)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity"
        >
          <Plus size={12} /> Add
        </button>
      </div>

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
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id} className={i < filtered.length - 1 ? "border-b border-[var(--color-border)]" : ""}>
                  <td className="px-4 py-2.5 text-[var(--color-text-primary)] font-medium">{c.name}</td>
                  <td className="px-4 py-2.5 text-[var(--color-text-secondary)] font-mono text-xs">{c.email ?? "—"}</td>
                  <td className="px-4 py-2.5 text-[var(--color-text-secondary)] font-mono text-xs">{c.phone ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-rust)] transition-colors disabled:opacity-30">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ProductsSection({ products }: { products: Product[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
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
      if (!res.ok) {
        const b = await res.json() as { error?: string };
        throw new Error(b.error ?? "Failed");
      }
      setSku(""); setName("");
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    await fetch(`/api/catalog/products/${id}`, { method: "DELETE" });
    setDeleting(null);
    router.refresh();
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
          onClick={() => setShowForm((o) => !o)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity"
        >
          <Plus size={12} /> Add
        </button>
      </div>

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
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id} className={i < filtered.length - 1 ? "border-b border-[var(--color-border)]" : ""}>
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-text-secondary)]">{p.sku}</td>
                  <td className="px-4 py-2.5 text-[var(--color-text-primary)]">{p.name}</td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-rust)] transition-colors disabled:opacity-30">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
