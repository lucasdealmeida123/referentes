import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import { Modal } from "../components/Modal";
import { FilterPicker } from "../components/FilterPicker";
import type { Circuit, EventItem, Referent } from "../types";
import { EventFormFields } from "../components/EventFormFields";
import type { EventFormState } from "../components/EventFormFields";

interface Props { campaignId: string; }

type Tab = "events" | "referents";
type TipoEvento = "Barrial" | "Prensa" | "Operativo";

/* ─── helpers ─────────────────────────────────────────────────── */

function fmtDate(v: unknown) {
  if (!v) return "–";
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? "–" : d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function fmtTime(v: unknown) {
  if (!v) return "";
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? "" : d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function toDateTimeLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function parsePolygonCoordinates(raw?: string | null) {
  if (!raw) return [] as Array<[number, number]>;
  return raw.trim().split(/\s+/)
    .map((chunk) => chunk.split(","))
    .filter((p) => p.length >= 2)
    .map((p) => [Number(p[1]), Number(p[0])] as [number, number])
    .filter(([lat, lng]) => !Number.isNaN(lat) && !Number.isNaN(lng));
}

function pointInPolygon(point: [number, number], polygon: Array<[number, number]>) {
  const [y, x] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];
    const intersect = ((xi > x) !== (xj > x))
      && (y < ((yj - yi) * (x - xi)) / ((xj - xi) || 0.0000001) + yi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = (bLat - aLat) * Math.PI / 180;
  const dLng = (bLng - aLng) * Math.PI / 180;
  const aa = Math.sin(dLat / 2) ** 2
    + Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
}

function sameDay(aIso?: string | null, bLocal?: string | null) {
  if (!aIso || !bLocal) return false;
  const a = new Date(aIso);
  const b = new Date(bLocal);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false;
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function TypeBadge({ tipo }: { tipo: string }) {
  const lc = tipo.toLowerCase();
  const cls = lc === "prensa" ? "ops-badge--prensa" : lc === "operativo" ? "ops-badge--operativo" : "ops-badge--barrial";
  const label = lc === "prensa" ? "Prensa" : lc === "operativo" ? "Operativo" : "Barrial";
  return <span className={`ops-type-badge ${cls}`}>{label}</span>;
}

function eventMatchesSearch(e: EventItem, q: string) {
  if (!q) return true;
  const hay = [e.lugar, e.barrio, e.circuitoCodigo, e.referente, e.programa, e.contacto, e.anfitrion, e.tipo, e.direccion]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q.toLowerCase());
}

function refMatchesSearch(r: Referent, q: string) {
  if (!q) return true;
  const hay = [r.nombreApellido, r.barrio, r.circuitoCodigo, r.celular, r.direccion, r.referenteDe]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q.toLowerCase());
}

function formatAgendaDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (same(d, today)) return "Hoy";
  if (same(d, tomorrow)) return "Mañana";
  return d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
}

function EventCard({
  row,
  onEdit,
  onShare,
  onDelete,
  deleting,
}: {
  row: EventItem;
  onEdit: () => void;
  onShare: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const pending = String(row.estadoSolicitud ?? "pendiente").toLowerCase() !== "resuelto";
  const meta = [row.barrio, row.circuitoCodigo ? `Circ. ${row.circuitoCodigo}` : null, row.referente]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="ops-event-card">
      <div className="ops-event-card-main">
        <div className="ops-event-card-head">
          <TypeBadge tipo={String(row.tipo ?? "Barrial")} />
          <time className="ops-event-time">
            {fmtDate(row.fechaHora)}
            {fmtTime(row.fechaHora) ? ` · ${fmtTime(row.fechaHora)}` : ""}
          </time>
        </div>
        <h3 className="ops-event-title">{row.lugar || row.programa || "Sin lugar"}</h3>
        {meta && <p className="ops-event-meta">{meta}</p>}
        {pending && row.tipo?.toLowerCase() !== "prensa" && (
          <span className="ops-event-pill">Pedido pendiente</span>
        )}
      </div>
      <div className="ops-event-actions">
        <button type="button" className="ops-icon-btn" onClick={onShare} title="Compartir" aria-label="Compartir">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
        </button>
        <button type="button" className="ops-icon-btn" onClick={onEdit} title="Editar" aria-label="Editar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button
          type="button"
          className="ops-icon-btn ops-icon-btn--danger"
          onClick={onDelete}
          disabled={deleting}
          title="Eliminar"
          aria-label="Eliminar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    </article>
  );
}

function ReferentCard({
  row,
  onEdit,
  onDelete,
  deleting,
}: {
  row: Referent;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const initial = (row.nombreApellido?.trim()[0] ?? "?").toUpperCase();
  const meta = [row.barrio, row.circuitoCodigo ? `Circ. ${row.circuitoCodigo}` : null].filter(Boolean).join(" · ");

  return (
    <article className="ops-ref-card">
      <div className="ops-ref-avatar" aria-hidden>{initial}</div>
      <div className="ops-ref-body">
        <h3 className="ops-ref-name">{row.nombreApellido}</h3>
        {meta && <p className="ops-ref-meta">{meta}</p>}
        {row.celular && <p className="ops-ref-phone">{row.celular}</p>}
      </div>
      <div className="ops-event-actions">
        <button type="button" className="ops-icon-btn" onClick={onEdit} title="Editar" aria-label="Editar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button
          type="button"
          className="ops-icon-btn ops-icon-btn--danger"
          onClick={onDelete}
          disabled={deleting}
          title="Eliminar"
          aria-label="Eliminar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    </article>
  );
}

/* ─── form state type ──────────────────────────────────────────── */

/* ─── default form states ──────────────────────────────────────── */

const EMPTY_EVENT: EventFormState = {
  tipo: "Barrial",
  fechaHora: "",
  lugar: "",
  circuitoCodigo: "",
  barrio: "",
  referente: "",
  anfitrion: "",
  celular: "",
  direccion: "",
  ubicacionUrl: "",
  programa: "",
  contacto: "",
  observacion: "",
  lat: "",
  lng: "",
  estadoSolicitud: "pendiente",
  resolucionNota: "",
  referentIds: [],
  attendeeIds: [],
};

const EMPTY_REF = {
  nombreApellido: "",
  celular: "",
  barrio: "",
  circuitoCodigo: "",
  direccion: "",
  referenteDe: "",
  ubicacionUrl: "",
};

/* ─── field helper ─────────────────────────────────────────────── */

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}{required && <span style={{ color: "var(--status-critical)", marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

/* ─── referent multi-select ────────────────────────────────────── */

function ReferentMultiSelect({
  referents,
  selectedIds,
  onChange,
  onCreateNew,
}: {
  referents: Referent[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onCreateNew: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() =>
    referents
      .filter((r) => !selectedIds.includes(r.id))
      .filter((r) => !query.trim() || r.nombreApellido.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 10),
    [referents, selectedIds, query]
  );

  const selectedRefs = referents.filter((r) => selectedIds.includes(r.id));
  const exactMatch   = referents.some((r) => r.nombreApellido.toLowerCase() === query.toLowerCase());

  function select(id: string) {
    onChange([...selectedIds, id]);
    setQuery("");
    inputRef.current?.focus();
  }

  function remove(id: string) {
    onChange(selectedIds.filter((x) => x !== id));
  }

  return (
    <div style={{ position: "relative" }}>
      {/* Selected chips */}
      {selectedRefs.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
          {selectedRefs.map((r) => (
            <span key={r.id} style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "2px 8px 2px 10px",
              background: "rgba(59,130,246,0.1)",
              color: "#3b82f6",
              borderRadius: 100,
              fontSize: 12, fontWeight: 600,
              border: "1px solid rgba(59,130,246,0.2)",
            }}>
              {r.nombreApellido}
              <button
                type="button"
                onClick={() => remove(r.id)}
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 14, height: 14, borderRadius: "50%",
                  background: "rgba(59,130,246,0.2)",
                  border: "none", cursor: "pointer",
                  color: "#3b82f6", fontSize: 10, fontWeight: 700,
                  padding: 0, lineHeight: 1,
                }}
              >✕</button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <input
        ref={inputRef}
        className="search-input"
        value={query}
        placeholder={selectedRefs.length > 0 ? "Agregar otro referente..." : "Buscar referente por nombre..."}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
      />

      {/* Dropdown */}
      {open && (query.trim() || filtered.length > 0) && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0,
          background: "var(--bg-surface, #fff)",
          border: "1px solid var(--border, #e2e8f0)",
          borderRadius: 8,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          zIndex: 100,
          overflow: "hidden",
          marginTop: 4,
          maxHeight: 220,
          overflowY: "auto",
        }}>
          {filtered.map((r) => (
            <button
              key={r.id}
              type="button"
              onMouseDown={() => select(r.id)}
              style={{
                display: "flex", alignItems: "center",
                width: "100%", padding: "9px 14px",
                background: "transparent",
                border: "none", cursor: "pointer",
                textAlign: "left", gap: 8,
                fontSize: 13, color: "var(--text-primary)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover, #f8fafc)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{
                width: 26, height: 26, borderRadius: "50%",
                background: "rgba(59,130,246,0.1)",
                color: "#3b82f6", fontSize: 10, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                {r.nombreApellido.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
              </span>
              <div>
                <div style={{ fontWeight: 500 }}>{r.nombreApellido}</div>
                {r.barrio && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.barrio}{r.circuitoCodigo ? ` · Circ. ${r.circuitoCodigo}` : ""}</div>
                )}
              </div>
            </button>
          ))}

          {/* Create new option */}
          {query.trim() && !exactMatch && (
            <button
              type="button"
              onMouseDown={() => { onCreateNew(query.trim()); setQuery(""); setOpen(false); }}
              style={{
                display: "flex", alignItems: "center",
                width: "100%", padding: "9px 14px",
                background: "transparent",
                border: "none",
                borderTop: filtered.length > 0 ? "1px solid var(--border-light, #f1f5f9)" : "none",
                cursor: "pointer",
                textAlign: "left", gap: 8,
                fontSize: 13, color: "#10b981", fontWeight: 600,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(16,185,129,0.06)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{
                width: 26, height: 26, borderRadius: "50%",
                background: "rgba(16,185,129,0.12)",
                color: "#10b981", fontSize: 14, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>+</span>
              Crear "<strong>{query.trim()}</strong>"
            </button>
          )}

          {filtered.length === 0 && !query.trim() && (
            <div style={{ padding: "10px 14px", fontSize: 12.5, color: "var(--text-muted)" }}>
              Escribí un nombre para buscar...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── main page ────────────────────────────────────────────────── */

export function OperacionesPage({ campaignId }: Props) {
  const [tab, setTab]           = useState<Tab>("events");
  const [events, setEvents]     = useState<EventItem[]>([]);
  const [referents, setRef]     = useState<Referent[]>([]);
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [tipoFilter, setTipoFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [agendaDate, setAgendaDate] = useState(() => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  });
  const [agendaCircuit, setAgendaCircuit] = useState("");

  // event modal
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editEventId, setEditEventId]       = useState<string | null>(null);
  const [eventForm, setEventForm]           = useState<EventFormState>({ ...EMPTY_EVENT });
  const [eventAdvancedOpen, setEventAdvancedOpen] = useState(false);
  const [radiusCheckKm, setRadiusCheckKm]   = useState<5 | 10>(5);

  // referent modal
  const [refModalOpen, setRefModalOpen]   = useState(false);
  const [editRefId, setEditRefId]         = useState<string | null>(null);
  const [refForm, setRefForm]             = useState({ ...EMPTY_REF });
  const [addingRefToEvent, setAddingRefToEvent] = useState(false);

  /* load -------------------------------------------------------- */

  function reload() {
    if (!campaignId) return;
    setLoading(true);
    setError(null);
    Promise.allSettled([
      api.operations.events(campaignId),
      api.operations.referents(campaignId),
      api.territory.circuits(campaignId),
    ]).then(([evts, refs, circs]) => {
      if (evts.status === "fulfilled")  setEvents(evts.value);
      else setError("Eventos no disponibles");
      if (refs.status === "fulfilled")  setRef(refs.value);
      if (circs.status === "fulfilled") setCircuits(circs.value);
    }).finally(() => setLoading(false));
  }

  useEffect(() => { reload(); }, [campaignId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* derived ------------------------------------------------------ */

  const q              = searchQuery.trim();
  const filteredEvents = events
    .filter((e) => !tipoFilter || e.tipo.toLowerCase() === tipoFilter.toLowerCase())
    .filter((e) => eventMatchesSearch(e, q));
  const prensaEvents   = filteredEvents.filter((e) => e.tipo.toLowerCase() === "prensa");
  const barrialEvents  = filteredEvents.filter((e) => e.tipo.toLowerCase() === "barrial");
  const operativoEvents = filteredEvents.filter((e) => e.tipo.toLowerCase() === "operativo");
  const filteredReferents = referents.filter((r) => refMatchesSearch(r, q));

  const tipoCounts = useMemo(() => ({
    all: events.length,
    prensa: events.filter((e) => e.tipo.toLowerCase() === "prensa").length,
    barrial: events.filter((e) => e.tipo.toLowerCase() === "barrial").length,
    operativo: events.filter((e) => e.tipo.toLowerCase() === "operativo").length,
  }), [events]);

  const circuitFilterOptions = useMemo(
    () => circuits.map((c) => ({
      value: `${c.codigo} – ${c.nombre}`,
      count: events.filter((e) => e.circuitoCodigo === c.codigo).length,
    })),
    [circuits, events]
  );

  const recentPlaces = useMemo(
    () => [...new Set(events.map((e) => e.lugar).filter((v): v is string => Boolean(v && v.trim())))].slice(0, 12),
    [events]
  );

  const agendaEvents = useMemo(() => {
    const selected = new Date(`${agendaDate}T00:00:00`);
    return events
      .filter((e) => {
        if (!e.fechaHora) return false;
        const d = new Date(e.fechaHora);
        if (Number.isNaN(d.getTime())) return false;
        const same = d.getFullYear() === selected.getFullYear()
          && d.getMonth() === selected.getMonth()
          && d.getDate() === selected.getDate();
        if (!same) return false;
        if (agendaCircuit && e.circuitoCodigo !== agendaCircuit) return false;
        return true;
      })
      .sort((a, b) => {
        const ta = a.fechaHora ? new Date(a.fechaHora).getTime() : 0;
        const tb = b.fechaHora ? new Date(b.fechaHora).getTime() : 0;
        return ta - tb;
      });
  }, [events, agendaDate, agendaCircuit]);

  const routeSuggestion = useMemo(() => {
    const nodes = agendaEvents.filter((e) => e.lat != null && e.lng != null);
    if (nodes.length <= 1) return nodes;
    const unvisited = [...nodes];
    const route: EventItem[] = [unvisited.shift() as EventItem];
    while (unvisited.length) {
      const last = route[route.length - 1];
      const lastLat = Number(last.lat);
      const lastLng = Number(last.lng);
      let bestIdx = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      for (let i = 0; i < unvisited.length; i += 1) {
        const cand = unvisited[i];
        const dist = distanceKm(lastLat, lastLng, Number(cand.lat), Number(cand.lng));
        if (dist < bestDist) { bestDist = dist; bestIdx = i; }
      }
      route.push(unvisited.splice(bestIdx, 1)[0]);
    }
    return route;
  }, [agendaEvents]);

  const circuitPolygons = useMemo(
    () => circuits
      .map((c) => ({ code: c.codigo, polygon: parsePolygonCoordinates(c.polygonCoordinates) }))
      .filter((c) => c.polygon.length >= 3),
    [circuits]
  );

  const suggestedCircuitFromPoint = useMemo(() => {
    const lat = Number(eventForm.lat);
    const lng = Number(eventForm.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return "";
    const found = circuitPolygons.find((c) => pointInPolygon([lat, lng], c.polygon));
    return found?.code ?? "";
  }, [eventForm.lat, eventForm.lng, circuitPolygons]);

  const nearbySameDayEvents = useMemo(() => {
    const lat = Number(eventForm.lat);
    const lng = Number(eventForm.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng) || !eventForm.fechaHora) return [] as EventItem[];
    return events
      .filter((e) => e.id !== editEventId)
      .filter((e) => sameDay(e.fechaHora, eventForm.fechaHora))
      .filter((e) => e.lat != null && e.lng != null)
      .filter((e) => distanceKm(lat, lng, Number(e.lat), Number(e.lng)) <= radiusCheckKm)
      .sort((a, b) => {
        const da = a.fechaHora ? new Date(a.fechaHora).getTime() : 0;
        const db = b.fechaHora ? new Date(b.fechaHora).getTime() : 0;
        return da - db;
      });
  }, [eventForm.lat, eventForm.lng, eventForm.fechaHora, events, editEventId, radiusCheckKm]);

  useEffect(() => {
    if (!suggestedCircuitFromPoint) return;
    if (!eventForm.circuitoCodigo || eventForm.circuitoCodigo === "Sin circuito") {
      setEventForm((p) => ({ ...p, circuitoCodigo: suggestedCircuitFromPoint }));
    }
  }, [suggestedCircuitFromPoint, eventForm.circuitoCodigo]);

  /* event CRUD --------------------------------------------------- */

  function openNewEvent(tipo: TipoEvento) {
    setEditEventId(null);
    const d = new Date();
    d.setMinutes(d.getMinutes() + 30);
    setEventForm({ ...EMPTY_EVENT, tipo, fechaHora: toDateTimeLocalValue(d) });
    setEventAdvancedOpen(false);
    setEventModalOpen(true);
  }

  function openEditEvent(row: EventItem) {
    setEditEventId(row.id);
    setEventForm({
      tipo:            row.tipo ?? "Barrial",
      fechaHora:       row.fechaHora ? String(row.fechaHora).slice(0, 16) : "",
      lugar:           row.lugar ?? "",
      circuitoCodigo:  row.circuitoCodigo ?? "",
      barrio:          row.barrio ?? "",
      referente:       row.referente ?? "",
      anfitrion:       row.anfitrion ?? "",
      celular:         row.celular ?? "",
      direccion:       row.direccion ?? "",
      ubicacionUrl:    row.ubicacionUrl ?? "",
      programa:        row.programa ?? "",
      contacto:        row.contacto ?? "",
      observacion:     row.observacion ?? "",
      lat:             row.lat != null ? String(row.lat) : "",
      lng:             row.lng != null ? String(row.lng) : "",
      estadoSolicitud: row.estadoSolicitud ?? "pendiente",
      resolucionNota:  row.resolucionNota ?? "",
      referentIds:     row.referentIds ?? [],
      attendeeIds:     row.attendeeIds ?? [],
    });
    setEventAdvancedOpen(true);
    setEventModalOpen(true);
  }

  async function submitEvent(e: FormEvent) {
    e.preventDefault();
    if (!campaignId) return;
    setSaving(true);
    setError(null);
    try {
      const tipo: TipoEvento = (["Prensa", "Barrial", "Operativo"] as TipoEvento[])
        .find((t) => t.toLowerCase() === eventForm.tipo.toLowerCase()) ?? "Barrial";

      const isBarrialLike = tipo !== "Prensa";

      const payload = {
        campaignId,
        tipo,
        fechaHora:       eventForm.fechaHora ? new Date(eventForm.fechaHora).toISOString() : null,
        lugar:           eventForm.lugar || null,
        circuitoCodigo:  eventForm.circuitoCodigo || null,
        barrio:          eventForm.barrio || null,
        referente:       eventForm.referente || null,
        anfitrion:       isBarrialLike ? (eventForm.anfitrion || null) : null,
        celular:         isBarrialLike ? (eventForm.celular || null) : null,
        direccion:       eventForm.direccion || null,
        ubicacionUrl:    isBarrialLike ? (eventForm.ubicacionUrl || null) : null,
        programa:        !isBarrialLike ? (eventForm.programa || null) : null,
        contacto:        !isBarrialLike ? (eventForm.contacto || null) : null,
        observacion:     eventForm.observacion || null,
        lat:             eventForm.lat ? Number(eventForm.lat) : null,
        lng:             eventForm.lng ? Number(eventForm.lng) : null,
        estadoSolicitud: eventForm.estadoSolicitud || "pendiente",
        resolucionNota:  eventForm.resolucionNota || null,
        referentIds:     eventForm.referentIds.length > 0 ? eventForm.referentIds : null,
        attendeeIds:     eventForm.attendeeIds.length > 0 ? eventForm.attendeeIds : null,
      };

      if (editEventId) await api.operations.updateEvent(editEventId, payload);
      else             await api.operations.createEvent(payload);
      setEventModalOpen(false);
      reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el evento.");
    } finally {
      setSaving(false);
    }
  }

  function quickSetDateTime(mode: "now+30" | "today18" | "tomorrow10") {
    const d = new Date();
    if (mode === "now+30") d.setMinutes(d.getMinutes() + 30);
    if (mode === "today18") { d.setHours(18, 0, 0, 0); }
    if (mode === "tomorrow10") { d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); }
    setEventForm((p) => ({ ...p, fechaHora: toDateTimeLocalValue(d) }));
  }

  async function deleteEvent(id: string) {
    if (!confirm("¿Eliminar este evento de la agenda?")) return;
    setDeleting(id);
    try {
      await api.operations.deleteEvent(id);
      reload();
    } catch { setError("No se pudo eliminar el evento."); }
    finally   { setDeleting(null); }
  }

  function shareEvent(row: EventItem) {
    const lines = [
      `Agenda ${row.tipo ?? "Evento"}`,
      row.lugar ? `Lugar: ${row.lugar}` : null,
      row.fechaHora ? `Fecha: ${new Date(row.fechaHora).toLocaleString("es-AR")}` : null,
      row.circuitoCodigo ? `Circuito: ${row.circuitoCodigo}` : null,
      row.estadoSolicitud ? `Estado: ${row.estadoSolicitud}` : null,
      row.ubicacionUrl ? `Ubicación: ${row.ubicacionUrl}` : null,
    ].filter(Boolean).join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(lines)}`, "_blank", "noopener,noreferrer");
  }

  /* referent CRUD ----------------------------------------------- */

  function openNewRef(prefilledName?: string) {
    setEditRefId(null);
    setRefForm({ ...EMPTY_REF, nombreApellido: prefilledName ?? "" });
    setRefModalOpen(true);
  }

  function openEditRef(row: Referent) {
    setEditRefId(row.id);
    setRefForm({
      nombreApellido: row.nombreApellido ?? "",
      celular:        row.celular ?? "",
      barrio:         row.barrio ?? "",
      circuitoCodigo: row.circuitoCodigo ?? "",
      direccion:      row.direccion ?? "",
      referenteDe:    row.referenteDe ?? "",
      ubicacionUrl:   row.ubicacionUrl ?? "",
    });
    setRefModalOpen(true);
  }

  async function submitRef(e: FormEvent) {
    e.preventDefault();
    if (!campaignId) return;
    setSaving(true);
    setError(null);
    try {
      const payload = { campaignId, ...refForm };
      if (editRefId) {
        await api.operations.updateReferent(editRefId, payload);
        setRefModalOpen(false);
        reload();
      } else {
        const newRef = await api.operations.createReferent(payload);
        setRefModalOpen(false);
        // If opened from event form, auto-add to referentIds
        if (addingRefToEvent && newRef?.id) {
          setEventForm((p) => ({ ...p, referentIds: [...p.referentIds, newRef.id] }));
          setAddingRefToEvent(false);
          // Reload referents in background
          api.operations.referents(campaignId).then(setRef).catch(() => {});
        } else {
          reload();
        }
      }
    } catch { setError("No se pudo guardar el referente."); }
    finally  { setSaving(false); }
  }

  async function deleteRef(id: string) {
    if (!confirm("¿Eliminar este referente?")) return;
    setDeleting(id);
    try {
      await api.operations.deleteReferent(id);
      reload();
    } catch { setError("No se pudo eliminar el referente."); }
    finally   { setDeleting(null); }
  }

  /* columns ----------------------------------------------------- */

  const isBarrialLike = ["barrial", "operativo"].includes(eventForm.tipo.toLowerCase());
  const isPrensa      = eventForm.tipo.toLowerCase() === "prensa";

  function renderEventSection(title: string, items: EventItem[]) {
    if (items.length === 0) return null;
    return (
      <section className="ops-section">
        <h2 className="ops-section-title">{title}<span className="ops-section-count">{items.length}</span></h2>
        <div className="ops-card-list">
          {items.map((row) => (
            <EventCard
              key={row.id}
              row={row}
              onEdit={() => openEditEvent(row)}
              onShare={() => shareEvent(row)}
              onDelete={() => deleteEvent(row.id)}
              deleting={deleting === row.id}
            />
          ))}
        </div>
      </section>
    );
  }

  if (!campaignId) return <div className="loading-overlay">Seleccioná una campaña.</div>;

  /* render ------------------------------------------------------ */

  return (
    <div className="ops-page">

      <header className="ops-bar">
        <div className="ops-bar-top">
          <div>
            <h1 className="ops-title">Actividades</h1>
            <p className="ops-subtitle">
              {tab === "events"
                ? `${events.length} evento${events.length === 1 ? "" : "s"} cargado${events.length === 1 ? "" : "s"}`
                : `${referents.length} referente${referents.length === 1 ? "" : "s"}`}
            </p>
          </div>
          {loading && <div className="spinner" aria-label="Cargando" />}
        </div>

        <div className="ops-segments" role="tablist">
          {([["events", "Eventos", events.length], ["referents", "Referentes", referents.length]] as const).map(
            ([id, label, count]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={`ops-segment${tab === id ? " active" : ""}`}
                onClick={() => { setTab(id); setSearchQuery(""); }}
              >
                {label}
                <span className="ops-segment-count">{count}</span>
              </button>
            )
          )}
        </div>
      </header>

      <div className="ops-toolbar">
        <div className="ops-search-wrap">
          <svg className="ops-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="ops-search"
            type="search"
            placeholder={tab === "events" ? "Buscar lugar, barrio, circuito…" : "Buscar referente, barrio…"}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button type="button" className="ops-search-clear" onClick={() => setSearchQuery("")} aria-label="Limpiar búsqueda">×</button>
          )}
        </div>

        {tab === "events" && (
          <div className="ops-tipo-row">
            {([
              ["", "Todos", tipoCounts.all],
              ["prensa", "Prensa", tipoCounts.prensa],
              ["barrial", "Barrial", tipoCounts.barrial],
              ["operativo", "Operativo", tipoCounts.operativo],
            ] as const).map(([val, label, count]) => (
              <button
                key={val || "all"}
                type="button"
                className={`ops-tipo-chip${tipoFilter === val ? " active" : ""}`}
                onClick={() => setTipoFilter(val)}
              >
                {label}
                <span className="ops-tipo-chip-count">{count}</span>
              </button>
            ))}
          </div>
        )}

        <div className="ops-toolbar-actions">
          {tab === "events" ? (
            <button type="button" className="ops-add-btn" onClick={() => setCreateOpen(true)}>
              + Agregar
            </button>
          ) : (
            <button type="button" className="ops-add-btn" onClick={() => openNewRef()}>
              + Referente
            </button>
          )}
        </div>
      </div>

      <div className="ops-body">
        {error && <div className="error-banner ops-error">⚠ {error}</div>}

        {tab === "events" && (
          <>
            <section className={`ops-agenda${agendaOpen ? " open" : ""}`}>
              <button type="button" className="ops-agenda-toggle" onClick={() => setAgendaOpen((o) => !o)}>
                <span className="ops-agenda-toggle-label">
                  Agenda del día
                  <span className="ops-agenda-badge">{agendaEvents.length}</span>
                </span>
                <span className="ops-agenda-date-label">{formatAgendaDate(agendaDate)}</span>
                <span className="ops-agenda-chevron" aria-hidden>{agendaOpen ? "▾" : "▸"}</span>
              </button>

              {agendaOpen && (
                <div className="ops-agenda-panel">
                  <div className="ops-agenda-filters">
                    <label className="ops-date-field">
                      <span className="ops-date-field-label">Fecha</span>
                      <input type="date" value={agendaDate} onChange={(e) => setAgendaDate(e.target.value)} />
                    </label>
                    <FilterPicker
                      label="Circuito"
                      placeholder="Todos los circuitos"
                      value={agendaCircuit ? (circuitFilterOptions.find((o) => o.value.startsWith(`${agendaCircuit} –`))?.value ?? agendaCircuit) : ""}
                      options={circuitFilterOptions}
                      onChange={(v) => setAgendaCircuit(v ? v.split(" – ")[0] : "")}
                    />
                  </div>

                  {agendaEvents.length === 0 ? (
                    <p className="ops-empty-inline">Sin actividades para esta fecha y circuito.</p>
                  ) : (
                    <div className="ops-agenda-timeline">
                      {agendaEvents.map((ev) => (
                        <button
                          key={ev.id}
                          type="button"
                          className="ops-agenda-item"
                          onClick={() => openEditEvent(ev)}
                        >
                          <span className="ops-agenda-item-time">{fmtTime(ev.fechaHora) || "—"}</span>
                          <span className="ops-agenda-item-body">
                            <TypeBadge tipo={String(ev.tipo ?? "Barrial")} />
                            <span className="ops-agenda-item-place">{ev.lugar ?? ev.programa ?? "Sin lugar"}</span>
                            {ev.circuitoCodigo && <span className="ops-agenda-item-circ">Circ. {ev.circuitoCodigo}</span>}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {routeSuggestion.filter((e) => e.lat != null && e.lng != null).length > 1 && (
                    <div className="ops-route-block">
                      <p className="ops-route-title">Ruta sugerida por proximidad</p>
                      <ol className="ops-route-list">
                        {routeSuggestion.map((ev) => (
                          <li key={ev.id}>
                            {fmtTime(ev.fechaHora)} · {ev.lugar ?? "Sin lugar"}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </section>

            {filteredEvents.length === 0 ? (
              <div className="ops-empty">
                <p>{q || tipoFilter ? "No hay resultados con esos filtros." : "Todavía no hay actividades cargadas."}</p>
                {!q && !tipoFilter && (
                  <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
                    Agregar primera actividad
                  </button>
                )}
              </div>
            ) : (
              <>
                {(!tipoFilter || tipoFilter === "prensa") && renderEventSection("Prensa", prensaEvents)}
                {(!tipoFilter || tipoFilter === "barrial") && renderEventSection("Barriales", barrialEvents)}
                {(!tipoFilter || tipoFilter === "operativo") && renderEventSection("Operativos", operativoEvents)}
              </>
            )}
          </>
        )}

        {tab === "referents" && (
          filteredReferents.length === 0 ? (
            <div className="ops-empty">
              <p>{q ? "No hay referentes con esa búsqueda." : "Todavía no hay referentes cargados."}</p>
              {!q && (
                <button type="button" className="btn btn-primary" onClick={() => openNewRef()}>
                  Agregar referente
                </button>
              )}
            </div>
          ) : (
            <div className="ops-card-list">
              {filteredReferents.map((row) => (
                <ReferentCard
                  key={row.id}
                  row={row}
                  onEdit={() => openEditRef(row)}
                  onDelete={() => deleteRef(row.id)}
                  deleting={deleting === row.id}
                />
              ))}
            </div>
          )
        )}
      </div>

      {createOpen && (
        <div className="ops-sheet-backdrop" onClick={() => setCreateOpen(false)} role="presentation">
          <div className="ops-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Nueva actividad">
            <div className="ops-sheet-head">
              <h2>Nueva actividad</h2>
              <button type="button" className="ops-sheet-close" onClick={() => setCreateOpen(false)} aria-label="Cerrar">×</button>
            </div>
            <div className="ops-sheet-options">
              <button
                type="button"
                className="ops-sheet-option ops-sheet-option--prensa"
                onClick={() => { openNewEvent("Prensa"); setCreateOpen(false); }}
              >
                <span className="ops-sheet-option-icon">📻</span>
                <span>
                  <strong>Reunión de prensa</strong>
                  <small>Medio, horario y contacto</small>
                </span>
              </button>
              <button
                type="button"
                className="ops-sheet-option ops-sheet-option--barrial"
                onClick={() => { openNewEvent("Barrial"); setCreateOpen(false); }}
              >
                <span className="ops-sheet-option-icon">🏘</span>
                <span>
                  <strong>Reunión barrial</strong>
                  <small>Lugar, referente y circuito</small>
                </span>
              </button>
              <button
                type="button"
                className="ops-sheet-option ops-sheet-option--operativo"
                onClick={() => { openNewEvent("Operativo"); setCreateOpen(false); }}
              >
                <span className="ops-sheet-option-icon">🚩</span>
                <span>
                  <strong>Operativo</strong>
                  <small>Actividad de campo o movilización</small>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "events" && (
        <button type="button" className="ops-fab" onClick={() => setCreateOpen(true)} aria-label="Agregar actividad">
          +
        </button>
      )}

      {/* ─── Event Modal ─────────────────────────────────────────────── */}
      <Modal
        open={eventModalOpen}
        onClose={() => setEventModalOpen(false)}
        title={editEventId ? "Editar evento" : eventForm.tipo === "Prensa" ? "Nueva reunión de prensa" : eventForm.tipo === "Operativo" ? "Nuevo operativo" : "Nueva reunión barrial"}
        subtitle={editEventId ? undefined : isPrensa ? "Medio, horario y contacto" : "Lugar, referente y circuito"}
        width={480}
        footer={
          <>
            <button className="btn btn-secondary" type="button" onClick={() => setEventModalOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" form="event-form" type="submit" disabled={saving}>
              {saving ? "Guardando…" : editEventId ? "Guardar cambios" : isPrensa ? "Agendar prensa" : "Agendar reunión"}
            </button>
          </>
        }
      >
        <form id="event-form" onSubmit={submitEvent}>
          <EventFormFields
            form={eventForm}
            setForm={setEventForm}
            editId={editEventId}
            isPrensa={isPrensa}
            isBarrialLike={isBarrialLike}
            advancedOpen={eventAdvancedOpen}
            onToggleAdvanced={() => setEventAdvancedOpen((o) => !o)}
            circuits={circuits}
            referents={referents}
            recentPlaces={recentPlaces}
            suggestedCircuit={suggestedCircuitFromPoint}
            onQuickTime={quickSetDateTime}
            ReferentMultiSelect={ReferentMultiSelect}
            onCreateReferent={(name) => {
              setAddingRefToEvent(true);
              openNewRef(name);
            }}
            nearbyEvents={nearbySameDayEvents}
            radiusKm={radiusCheckKm}
            onRadiusChange={setRadiusCheckKm}
            fmtDate={fmtDate}
            fmtTime={fmtTime}
          />
        </form>
      </Modal>

      {/* ─── Referent Modal ──────────────────────────────────────────── */}
      <Modal
        open={refModalOpen}
        onClose={() => { setRefModalOpen(false); setAddingRefToEvent(false); }}
        title={editRefId ? "Editar referente" : addingRefToEvent ? "Crear referente e invitar" : "Nuevo referente territorial"}
        subtitle={addingRefToEvent ? "Se agregará automáticamente a la lista de invitados" : "Referente de base, militante o contacto territorial"}
        width={560}
        footer={
          <>
            <button className="btn btn-secondary" type="button" onClick={() => { setRefModalOpen(false); setAddingRefToEvent(false); }}>Cancelar</button>
            <button className="btn btn-primary" form="ref-form" type="submit" disabled={saving}>
              {saving ? "Guardando..." : editRefId ? "Actualizar referente" : addingRefToEvent ? "Crear e invitar" : "Crear referente"}
            </button>
          </>
        }
      >
        <form id="ref-form" onSubmit={submitRef}
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Nombre y apellido" required>
              <input className="search-input" placeholder="Ej: Juan Pérez"
                value={refForm.nombreApellido}
                onChange={(e) => setRefForm((p) => ({ ...p, nombreApellido: e.target.value }))} required />
            </Field>
          </div>

          <Field label="Celular">
            <input className="search-input" placeholder="3764000000"
              value={refForm.celular}
              onChange={(e) => setRefForm((p) => ({ ...p, celular: e.target.value }))} />
          </Field>

          <Field label="Circuito">
            <select className="filter-select" value={refForm.circuitoCodigo}
              onChange={(e) => setRefForm((p) => ({ ...p, circuitoCodigo: e.target.value }))}>
              <option value="">Sin circuito</option>
              {circuits.map((c) => (
                <option key={c.id} value={c.codigo}>{c.codigo} – {c.nombre}</option>
              ))}
            </select>
          </Field>

          <Field label="Barrio">
            <input className="search-input" placeholder="Nombre del barrio"
              value={refForm.barrio}
              onChange={(e) => setRefForm((p) => ({ ...p, barrio: e.target.value }))} />
          </Field>

          <Field label="Dirección">
            <input className="search-input" placeholder="Calle y número"
              value={refForm.direccion}
              onChange={(e) => setRefForm((p) => ({ ...p, direccion: e.target.value }))} />
          </Field>

          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Referente de (área / candidato)">
              <input className="search-input" placeholder="Ej: Candidato X, Área Y"
                value={refForm.referenteDe}
                onChange={(e) => setRefForm((p) => ({ ...p, referenteDe: e.target.value }))} />
            </Field>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Link ubicación (Google Maps)">
              <input className="search-input" placeholder="https://maps.app.goo.gl/..."
                value={refForm.ubicacionUrl}
                onChange={(e) => setRefForm((p) => ({ ...p, ubicacionUrl: e.target.value }))} />
            </Field>
          </div>
        </form>
      </Modal>

    </div>
  );
}
