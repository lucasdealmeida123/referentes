import { useEffect, useMemo, useRef, useState } from "react";

export interface FilterOption {
  value: string;
  count: number;
}

interface Props {
  label: string;
  placeholder?: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

export function FilterPicker({ label, placeholder, value, options, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return options;
    return options.filter((o) => o.value.toLowerCase().includes(term));
  }, [options, q]);

  useEffect(() => {
    if (!open) return;
    setQ("");
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(v: string) {
    onChange(v);
    setOpen(false);
  }

  const triggerLabel = selected
    ? `${selected.value.length > 22 ? `${selected.value.slice(0, 20)}…` : selected.value}`
    : placeholder ?? label;

  return (
    <>
      <button
        type="button"
        className={`ref-filter-trigger${value ? " active" : ""}`}
        onClick={() => setOpen(true)}
        aria-expanded={open}
      >
        <span className="ref-filter-trigger-label">{label}</span>
        <span className="ref-filter-trigger-value">{triggerLabel}</span>
        {selected ? (
          <span className="ref-filter-trigger-count">{selected.count}</span>
        ) : (
          <span className="ref-filter-trigger-chevron" aria-hidden>›</span>
        )}
      </button>

      {open && (
        <div className="ref-filter-backdrop" onClick={() => setOpen(false)} role="presentation">
          <div
            className="ref-filter-sheet"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={`Filtrar por ${label}`}
          >
            <div className="ref-filter-sheet-head">
              <h3>{label}</h3>
              <button type="button" className="ref-filter-sheet-close" onClick={() => setOpen(false)} aria-label="Cerrar">
                ×
              </button>
            </div>
            <div className="ref-filter-sheet-search-wrap">
              <input
                ref={inputRef}
                className="ref-filter-sheet-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`Buscar ${label.toLowerCase()}…`}
              />
            </div>
            <ul className="ref-filter-sheet-list">
              <li>
                <button
                  type="button"
                  className={`ref-filter-option${!value ? " selected" : ""}`}
                  onClick={() => pick("")}
                >
                  <span>Todos</span>
                  <span className="ref-filter-option-count">{options.reduce((s, o) => s + o.count, 0)}</span>
                </button>
              </li>
              {filtered.length === 0 ? (
                <li className="ref-filter-empty">Sin coincidencias</li>
              ) : (
                filtered.map((o) => (
                  <li key={o.value}>
                    <button
                      type="button"
                      className={`ref-filter-option${value === o.value ? " selected" : ""}`}
                      onClick={() => pick(o.value)}
                    >
                      <span>{o.value}</span>
                      <span className="ref-filter-option-count">{o.count}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
