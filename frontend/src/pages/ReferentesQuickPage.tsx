import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import type { Circuit, EventItem, Referent } from "../types";
import {
  filterReferents,
  formatPhone,
  groupByBarrio,
  topValues,
  whatsappUrl,
} from "../utils/referentesLookup";

interface Props {
  campaignId: string;
}

type ViewMode = "lista" | "barrio";

// ── Circuit detail panel ─────────────────────────────────────────────────────
function CircuitPanel({
  circuit,
  referents,
  events,
  onSelectReferent,
}: {
  circuit: Circuit;
  referents: Referent[];
  events: EventItem[];
  onSelectReferent: (id: string) => void;
}) {
  const now = new Date();
  const upcoming = events
    .filter(
      (e) =>
        e.circuitoCodigo === circuit.codigo &&
        e.fechaHora &&
        new Date(e.fechaHora) >= now
    )
    .sort((a, b) => new Date(a.fechaHora!).getTime() - new Date(b.fechaHora!).getTime())
    .slice(0, 3);

  const circReferents = referents
    .filter((r) => r.circuitoCodigo === circuit.codigo)
    .sort((a, b) => a.nombreApellido.localeCompare(b.nombreApellido, "es"));

  return (
    <div className="circuit-panel">
      {/* Header */}
      <div className="circuit-panel-header">
        <div className="circuit-panel-badge">Circuito {circuit.codigo}</div>
        <div className="circuit-panel-nombre">{circuit.nombre || `Circuito ${circuit.codigo}`}</div>
        {circuit.zona && <div className="circuit-panel-zona">{circuit.zona}</div>}
      </div>

      {/* Stats row */}
      <div className="circuit-panel-stats">
        {circuit.electoresNacionales != null && (
          <div className="circuit-stat">
            <div className="circuit-stat-value">
              {circuit.electoresNacionales.toLocaleString("es-AR")}
            </div>
            <div className="circuit-stat-label">Electores</div>
          </div>
        )}
        {circuit.cantidadEscuelas != null && (
          <div className="circuit-stat">
            <div className="circuit-stat-value">{circuit.cantidadEscuelas}</div>
            <div className="circuit-stat-label">Escuelas</div>
          </div>
        )}
        {circuit.cantidadMesas != null && (
          <div className="circuit-stat">
            <div className="circuit-stat-value">{circuit.cantidadMesas}</div>
            <div className="circuit-stat-label">Mesas</div>
          </div>
        )}
        <div className="circuit-stat">
          <div className="circuit-stat-value">{circReferents.length}</div>
          <div className="circuit-stat-label">Referentes</div>
        </div>
      </div>

      {/* Upcoming events */}
      {upcoming.length > 0 && (
        <div className="circuit-panel-section">
          <div className="circuit-panel-section-title">
            <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="2" width="12" height="12" rx="2" />
              <line x1="5" y1="1" x2="5" y2="4" />
              <line x1="11" y1="1" x2="11" y2="4" />
              <line x1="2" y1="6" x2="14" y2="6" />
            </svg>
            Próximas reuniones
          </div>
          {upcoming.map((e) => {
            const d = new Date(e.fechaHora!);
            return (
              <div key={e.id} className="circuit-event-item">
                <div
                  className="circuit-event-badge"
                  style={{ background: e.tipo === "Barrial" ? "#FEF3C7" : "#EFF6FF",
                           color: e.tipo === "Barrial" ? "#92400E" : "#1E40AF" }}
                >
                  {e.tipo === "Barrial" ? "B" : "P"}
                </div>
                <div className="circuit-event-info">
                  <div className="circuit-event-lugar">{e.lugar}</div>
                  <div className="circuit-event-fecha">
                    {d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                    {" · "}
                    {d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Referents in this circuit */}
      <div className="circuit-panel-section">
        <div className="circuit-panel-section-title">
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="6" cy="5" r="2.5" />
            <path d="M1 14c0-2.8 2.2-5 5-5s5 2.2 5 5" />
            <circle cx="12" cy="6" r="2" />
            <path d="M11 14c.5-1.8 1.5-3 3-3" strokeLinecap="round" />
          </svg>
          Referentes ({circReferents.length})
        </div>
        <div className="circuit-ref-list">
          {circReferents.slice(0, 10).map((r) => (
            <button
              key={r.id}
              type="button"
              className="circuit-ref-chip"
              onClick={() => onSelectReferent(r.id)}
            >
              <span className="circuit-ref-chip-name">{r.nombreApellido}</span>
              {r.barrio && (
                <span className="circuit-ref-chip-barrio">{r.barrio}</span>
              )}
            </button>
          ))}
          {circReferents.length > 10 && (
            <span className="circuit-ref-more">+{circReferents.length - 10} más</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export function ReferentesQuickPage({ campaignId }: Props) {
  const [referents, setReferents] = useState<Referent[]>([]);
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [barrioFilter, setBarrioFilter] = useState("");
  const [circuitoFilter, setCircuitoFilter] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("lista");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCircuitPanel, setShowCircuitPanel] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function reload() {
    if (!campaignId) return;
    setLoading(true);
    setError(null);
    try {
      const [rows, circs, evts] = await Promise.allSettled([
        api.operations.referents(campaignId),
        api.territory.circuits(campaignId),
        api.operations.events(campaignId),
      ]);
      if (rows.status === "fulfilled") setReferents(rows.value);
      if (circs.status === "fulfilled") setCircuits(circs.value);
      if (evts.status === "fulfilled") setEvents(evts.value);
    } catch {
      setError("No se pudieron cargar los datos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, [campaignId]);

  const filtered = useMemo(
    () => filterReferents(referents, query, {
      barrio: barrioFilter || undefined,
      circuito: circuitoFilter || undefined,
    }),
    [referents, query, barrioFilter, circuitoFilter]
  );

  const barrioChips = useMemo(
    () => topValues(referents, (r) => r.barrio, 20),
    [referents]
  );
  const circuitoChips = useMemo(
    () => topValues(referents, (r) => r.circuitoCodigo, 15),
    [referents]
  );
  const grouped = useMemo(() => groupByBarrio(filtered), [filtered]);

  const selected = filtered.find((r) => r.id === selectedId) ?? filtered[0] ?? null;

  useEffect(() => {
    if (!selectedId && filtered[0]) setSelectedId(filtered[0].id);
    if (selectedId && !filtered.some((r) => r.id === selectedId) && filtered[0]) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const sameBarrio = useMemo(() => {
    if (!selected?.barrio) return [];
    const b = selected.barrio.trim().toLowerCase();
    return referents.filter(
      (r) => (r.barrio ?? "").trim().toLowerCase() === b && r.id !== selected.id
    );
  }, [referents, selected]);

  const selectedCircuit = useMemo(() => {
    if (!selected?.circuitoCodigo) return null;
    return circuits.find((c) => c.codigo === selected.circuitoCodigo) ?? null;
  }, [selected, circuits]);

  const activeCircuit = useMemo(() => {
    if (circuitoFilter) return circuits.find((c) => c.codigo === circuitoFilter) ?? null;
    return null;
  }, [circuitoFilter, circuits]);

  function clearFilters() {
    setQuery("");
    setBarrioFilter("");
    setCircuitoFilter("");
    setShowCircuitPanel(false);
  }

  async function onImport(file: File) {
    if (!campaignId) return;
    setImporting(true);
    setImportMsg(null);
    setError(null);
    try {
      const preview = await api.operations.previewReferentes(file);
      const count = preview.referentes?.cantidad ?? 0;
      if (count === 0) { setError("No se detectaron filas en la planilla."); return; }
      const result = await api.operations.commitReferentes(campaignId, file);
      setImportMsg(
        `Importados ${result.referentesCreados} referentes` +
        (result.omitidos ? ` · omitidos ${result.omitidos}` : "")
      );
      await reload();
    } catch {
      setError("No se pudo importar la planilla.");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (!campaignId) return <div className="loading-overlay">Seleccioná una campaña.</div>;
  if (loading) return (
    <div className="loading-overlay">
      <div className="spinner" />
      Cargando referentes...
    </div>
  );

  return (
    <div className="page-body referentes-quick">
      {error && <div className="error-banner">{error}</div>}
      {importMsg && <div className="success-banner">{importMsg}</div>}

      {/* ── Toolbar ── */}
      <div className="referentes-quick-toolbar section-card">
        <div className="referentes-quick-toolbar-top">
          <div>
            <div className="section-card-title">Consulta por barrio y circuito</div>
            <div className="text-sm text-muted">
              Escribí un barrio (ej. <strong>Villa Cabello</strong>) o seleccioná un circuito para ver referentes y reuniones.
            </div>
          </div>
          <div className="referentes-quick-actions">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); }}
            />
            <button
              type="button"
              className="btn btn-secondary"
              disabled={importing}
              onClick={() => fileRef.current?.click()}
            >
              {importing ? "Importando..." : "Importar planilla"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={clearFilters}>
              Limpiar filtros
            </button>
          </div>
        </div>

        <input
          className="input referentes-quick-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ej: Villa Cabello, 3A, merendero, Delgado…"
          autoFocus
        />

        {/* Barrio chips */}
        <div className="referentes-quick-chips">
          <span className="referentes-quick-chips-label">Barrios</span>
          {barrioChips.map(({ value, count }) => (
            <button
              key={value}
              type="button"
              className={`chip ${barrioFilter === value ? "active" : ""}`}
              onClick={() => {
                setBarrioFilter((p) => (p === value ? "" : value));
                setCircuitoFilter("");
                setShowCircuitPanel(false);
                setQuery("");
              }}
            >
              {value} <span className="chip-count">{count}</span>
            </button>
          ))}
        </div>

        {/* Circuit chips */}
        <div className="referentes-quick-chips">
          <span className="referentes-quick-chips-label">Circuitos</span>
          {circuitoChips.map(({ value, count }) => (
            <button
              key={value}
              type="button"
              className={`chip ${circuitoFilter === value ? "active" : ""}`}
              onClick={() => {
                const next = circuitoFilter === value ? "" : value;
                setCircuitoFilter(next);
                setBarrioFilter("");
                setShowCircuitPanel(next !== "");
                setQuery("");
              }}
            >
              Circ. {value} <span className="chip-count">{count}</span>
            </button>
          ))}
        </div>

        <div className="referentes-quick-meta">
          <span>
            Mostrando <strong>{filtered.length}</strong> de {referents.length} referentes
          </span>
          <div className="referentes-quick-view-toggle">
            <button type="button" className={viewMode === "lista" ? "active" : ""} onClick={() => setViewMode("lista")}>Lista</button>
            <button type="button" className={viewMode === "barrio" ? "active" : ""} onClick={() => setViewMode("barrio")}>Por barrio</button>
          </div>
        </div>
      </div>

      {/* ── Circuit overview panel (when circuit chip selected) ── */}
      {showCircuitPanel && activeCircuit && (
        <CircuitPanel
          circuit={activeCircuit}
          referents={referents}
          events={events}
          onSelectReferent={(id) => {
            setSelectedId(id);
            setShowCircuitPanel(false);
          }}
        />
      )}

      {/* ── Main grid ── */}
      <div className="referentes-quick-grid">
        {/* Left: list */}
        <div className="section-card referentes-quick-list">
          <div className="section-card-header">
            <span className="section-card-title">
              {barrioFilter
                ? `${barrioFilter}`
                : circuitoFilter
                ? `Circuito ${circuitoFilter}`
                : "Resultados"}
            </span>
            <span className="section-card-count">{filtered.length}</span>
          </div>
          <div className="section-card-body referentes-quick-list-body">
            {filtered.length === 0 && (
              <div className="text-sm text-muted" style={{ padding: "12px 0" }}>
                Sin resultados para esta búsqueda.
              </div>
            )}

            {viewMode === "lista" && filtered.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`referente-row ${selected?.id === r.id ? "selected" : ""}`}
                onClick={() => setSelectedId(r.id)}
              >
                <div className="referente-row-name">{r.nombreApellido}</div>
                <div className="referente-row-meta">
                  {r.barrio ?? "Sin barrio"}
                  {r.circuitoCodigo ? ` · Circ. ${r.circuitoCodigo}` : ""}
                </div>
                <div className="referente-row-dep">
                  {r.referenteDe?.trim() ? r.referenteDe : "Sin dependencia"}
                </div>
              </button>
            ))}

            {viewMode === "barrio" && grouped.map((g) => (
              <div key={g.key} className="referente-group">
                <div className="referente-group-title">
                  {g.label} <span>({g.referents.length})</span>
                </div>
                {g.referents.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`referente-row compact ${selected?.id === r.id ? "selected" : ""}`}
                    onClick={() => setSelectedId(r.id)}
                  >
                    <div className="referente-row-name">{r.nombreApellido}</div>
                    <div className="referente-row-dep">
                      {r.referenteDe?.trim() ? r.referenteDe : "Sin dependencia"}
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Right: detail + circuit info */}
        <div className="section-card referentes-quick-detail">
          {!selected ? (
            <div className="section-card-body text-sm text-muted">
              Seleccioná un referente para ver la ficha.
            </div>
          ) : (
            <>
              <div className="section-card-header">
                <span className="section-card-title">{selected.nombreApellido}</span>
                {selected.circuitoCodigo && (
                  <span className="referente-circuit-tag">Circ. {selected.circuitoCodigo}</span>
                )}
              </div>
              <div className="section-card-body referente-ficha">

                {/* Contact actions — top */}
                <div className="referente-ficha-actions-top">
                  {whatsappUrl(selected.celular) ? (
                    <a
                      className="btn btn-wa"
                      href={whatsappUrl(selected.celular)!}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                        <path d="M10 1.5A8.5 8.5 0 0 0 2.18 14.1L1.5 18.5l4.5-.67A8.5 8.5 0 1 0 10 1.5Zm0 15.5a7 7 0 0 1-3.56-.97l-.26-.15-2.67.4.4-2.61-.17-.27A7 7 0 1 1 10 17Zm3.84-5.24c-.21-.1-1.23-.6-1.42-.67-.19-.07-.33-.1-.47.1-.14.21-.53.67-.65.81-.12.14-.23.16-.44.05a5.62 5.62 0 0 1-2.8-2.44c-.21-.36.21-.34.6-1.12.07-.14.03-.26-.02-.36-.05-.1-.47-1.13-.64-1.55-.17-.41-.34-.35-.47-.36h-.4c-.14 0-.37.05-.56.26-.19.21-.74.73-.74 1.77s.76 2.05.86 2.19c.1.14 1.48 2.26 3.59 3.17a12.08 12.08 0 0 0 1.2.44 2.88 2.88 0 0 0 1.33.08c.4-.06 1.23-.5 1.4-.99.17-.48.17-.9.12-.98-.05-.1-.19-.14-.4-.24Z"/>
                      </svg>
                      WhatsApp
                    </a>
                  ) : (
                    <span className="btn btn-disabled">Sin teléfono</span>
                  )}
                  {selected.ubicacionUrl && (
                    <a
                      className="btn btn-secondary"
                      href={selected.ubicacionUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="8" cy="6" r="2.5" />
                        <path d="M8 1C5.24 1 3 3.24 3 6c0 3.5 5 9 5 9s5-5.5 5-9c0-2.76-2.24-5-5-5Z" />
                      </svg>
                      Ubicación
                    </a>
                  )}
                </div>

                {/* Data grid */}
                <div className="referente-ficha-grid">
                  <div>
                    <div className="referente-ficha-label">Teléfono</div>
                    <div className="referente-ficha-value">
                      {formatPhone(selected.celular) ?? <span className="text-muted">Sin teléfono</span>}
                    </div>
                  </div>
                  <div>
                    <div className="referente-ficha-label">Barrio / Chacra</div>
                    <div className="referente-ficha-value">
                      {selected.barrio ?? <span className="text-muted">Sin barrio</span>}
                      {selected.chacra ? ` · CH ${selected.chacra}` : ""}
                    </div>
                  </div>
                  <div>
                    <div className="referente-ficha-label">Dependencia</div>
                    <div className="referente-ficha-value">
                      {selected.referenteDe?.trim() ? selected.referenteDe : <span className="text-muted">Sin definir</span>}
                    </div>
                  </div>
                  <div>
                    <div className="referente-ficha-label">Circuito</div>
                    <div className="referente-ficha-value">
                      {selected.circuitoCodigo ? (
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span className="referente-circuit-tag">Circ. {selected.circuitoCodigo}</span>
                          {selectedCircuit?.nombre && (
                            <span className="text-muted" style={{ fontSize: 11 }}>
                              {selectedCircuit.nombre}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted">Sin circuito</span>
                      )}
                    </div>
                  </div>
                  {selected.direccion && (
                    <div className="referente-ficha-wide">
                      <div className="referente-ficha-label">Dirección</div>
                      <div className="referente-ficha-value">{selected.direccion}</div>
                    </div>
                  )}
                  {selected.observacion && (
                    <div className="referente-ficha-wide">
                      <div className="referente-ficha-label">Observación</div>
                      <div className="referente-ficha-value">{selected.observacion}</div>
                    </div>
                  )}
                </div>

                {/* Circuit context block */}
                {selectedCircuit && (
                  <div className="referente-circuit-block">
                    <div className="referente-circuit-block-title">
                      <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M8 1 L14 4 L14 12 L8 15 L2 12 L2 4 Z" />
                        <circle cx="8" cy="8" r="2" />
                      </svg>
                      Datos del Circuito {selectedCircuit.codigo}
                    </div>
                    <div className="referente-circuit-stats">
                      {selectedCircuit.electoresNacionales != null && (
                        <div className="referente-circuit-stat">
                          <span className="referente-circuit-stat-n">
                            {selectedCircuit.electoresNacionales.toLocaleString("es-AR")}
                          </span>
                          <span>electores</span>
                        </div>
                      )}
                      {selectedCircuit.cantidadEscuelas != null && (
                        <div className="referente-circuit-stat">
                          <span className="referente-circuit-stat-n">{selectedCircuit.cantidadEscuelas}</span>
                          <span>escuelas</span>
                        </div>
                      )}
                      {selectedCircuit.cantidadMesas != null && (
                        <div className="referente-circuit-stat">
                          <span className="referente-circuit-stat-n">{selectedCircuit.cantidadMesas}</span>
                          <span>mesas</span>
                        </div>
                      )}
                      <div className="referente-circuit-stat">
                        <span className="referente-circuit-stat-n">
                          {referents.filter((r) => r.circuitoCodigo === selectedCircuit.codigo).length}
                        </span>
                        <span>referentes</span>
                      </div>
                    </div>
                    {/* Upcoming events for this circuit */}
                    {(() => {
                      const now = new Date();
                      const circEvents = events
                        .filter((e) => e.circuitoCodigo === selectedCircuit.codigo && e.fechaHora && new Date(e.fechaHora) >= now)
                        .sort((a, b) => new Date(a.fechaHora!).getTime() - new Date(b.fechaHora!).getTime())
                        .slice(0, 2);
                      if (!circEvents.length) return null;
                      return (
                        <div className="referente-circuit-events">
                          <div className="referente-circuit-events-title">Próximas reuniones</div>
                          {circEvents.map((e) => {
                            const d = new Date(e.fechaHora!);
                            return (
                              <div key={e.id} className="referente-circuit-event-row">
                                <span className="referente-circuit-event-tipo"
                                  style={{ background: e.tipo === "Barrial" ? "#FEF3C7" : "#EFF6FF",
                                           color: e.tipo === "Barrial" ? "#92400E" : "#1E40AF" }}>
                                  {e.tipo}
                                </span>
                                <span>{e.lugar}</span>
                                <span className="text-muted">
                                  {d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Others in same barrio */}
                {sameBarrio.length > 0 && (
                  <div className="referente-same-barrio">
                    <div className="referente-ficha-label">
                      Otros en {selected.barrio} ({sameBarrio.length})
                    </div>
                    <div className="referente-same-barrio-list">
                      {sameBarrio.slice(0, 8).map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          className="chip"
                          onClick={() => setSelectedId(r.id)}
                        >
                          {r.nombreApellido}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
