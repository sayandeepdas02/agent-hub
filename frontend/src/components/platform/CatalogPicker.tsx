"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface PickerItem {
  id: string;
  primary: string;
  secondary?: string;
}

interface CatalogPickerProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (item: PickerItem) => void;
  fetchItems: (q: string) => Promise<PickerItem[]>;
  label: string;
  placeholder?: string;
  disabled?: boolean;
  confidence?: number;
  lowConfidence?: boolean;
}

export function CatalogPicker({
  value,
  onChange,
  onSelect,
  fetchItems,
  label,
  placeholder,
  disabled,
  confidence,
  lowConfidence,
}: CatalogPickerProps) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<PickerItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasConf = confidence !== undefined;
  const confColor = hasConf && confidence >= 0.9 ? "var(--color-green)" : "var(--color-amber)";

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  function scheduleSearch(q: string) {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!q.trim()) { setSuggestions([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      const items = await fetchItems(q).catch(() => []);
      setSuggestions(items);
      setOpen(items.length > 0);
    }, 200);
  }

  function handleInput(v: string) {
    onChange(v);
    scheduleSearch(v);
  }

  function handleFocus() {
    if (value.trim()) scheduleSearch(value);
  }

  function handleSelect(item: PickerItem) {
    onChange(item.primary);
    onSelect?.(item);
    setOpen(false);
    setSuggestions([]);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-mono text-[var(--color-text-tertiary)]">{label}</label>
        {hasConf && (
          <span className="text-xs font-mono" style={{ color: confColor }}>
            {(confidence * 100).toFixed(0)}%
          </span>
        )}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={handleFocus}
        disabled={disabled}
        placeholder={placeholder ?? label}
        autoComplete="off"
        className={cn(
          "w-full text-sm px-3 py-1.5 rounded border bg-[var(--color-surface-raised)]",
          "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]",
          "focus:outline-none focus:border-[var(--color-primary)] transition-colors",
          disabled
            ? "opacity-60 cursor-default border-[var(--color-border)]"
            : "border-[var(--color-border)] cursor-text",
          lowConfidence && !disabled ? "border-l-2 border-l-[var(--color-amber)]" : ""
        )}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-30 top-full left-0 right-0 mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[var(--color-surface-raised)] transition-colors"
              >
                <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                  {item.primary}
                </span>
                {item.secondary && (
                  <span className="text-xs font-mono text-[var(--color-text-tertiary)] truncate ml-auto shrink-0">
                    {item.secondary}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
