import { useState, useMemo } from "react";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
  width?: string;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  searchable?: boolean;
  searchKeys?: (keyof T)[];
  maxRows?: number;
  emptyLabel?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  rowKey,
  searchable = false,
  searchKeys,
  maxRows,
  emptyLabel = "Sin resultados",
}: Props<T>) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: string; asc: boolean } | null>(null);

  const filtered = useMemo(() => {
    let rows = [...data];

    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((row) => {
        const keys = searchKeys ?? (Object.keys(row) as (keyof T)[]);
        return keys.some((k) => String(row[k] ?? "").toLowerCase().includes(q));
      });
    }

    if (sort) {
      rows.sort((a, b) => {
        const av = a[sort.key] ?? "";
        const bv = b[sort.key] ?? "";
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
        return sort.asc ? cmp : -cmp;
      });
    }

    return maxRows ? rows.slice(0, maxRows) : rows;
  }, [data, query, sort, searchKeys, maxRows]);

  function toggleSort(key: string) {
    setSort((prev) =>
      prev?.key === key ? { key, asc: !prev.asc } : { key, asc: true }
    );
  }

  return (
    <div className="section-card">
      {searchable && (
        <div className="table-toolbar">
          <div className="search-input-wrap">
            <span className="search-input-icon">⌕</span>
            <input
              className="search-input"
              type="text"
              placeholder="Buscar…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <span className="text-muted text-sm">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      )}
      <div className="table-overflow">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={col.sortable ? "sortable" : ""}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                >
                  {col.label}
                  {col.sortable && sort?.key === col.key && (
                    <span style={{ marginLeft: 4 }}>{sort.asc ? "↑" : "↓"}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="table-empty">
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={rowKey(row)}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render
                        ? col.render(row[col.key], row)
                        : String(row[col.key] ?? "–")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
