import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import { CircuitPolygonsMap } from "../components/CircuitPolygonsMap";
import { AgendaMeetingsMap } from "../components/AgendaMeetingsMap";
import { FilterPicker } from "../components/FilterPicker";
import { ReferentFicha } from "../components/ReferentFicha";
import type { Circuit, EventItem, MapDataset, Referent } from "../types";
import {
  filterReferents,
  formatPhone,
  matchBarrioFromQuery,
  nearestCircuitFromPoint,
  referentCaracteristica,
  topCaracteristicas,
  topValues,
} from "../utils/referentesLookup";

interface Props {
  campaignId: string;
}

/** Sección principal — controlada desde el menú hamburguesa */
type MainSection = "zonas" | "mapa" | "agenda";

/** Sub-vista de la sección Zonas (original Lista/Mapa/Detalle) */
type MobileView = "lista" | "mapa" | "ficha";

const MOBILE_TABS: { id: MobileView; label: string }[] = [
  { id: "lista", label: "Lista" },
  { id: "mapa",  label: "Mapa" },
  { id: "ficha", label: "Detalle" },
];

/* ─── Helpers ────────────────────────────────────────────────────── */

function hasSparseData(r: Referent) {
  return !r.celular?.trim() && !r.direccion?.trim() && !r.referenteDe?.trim();
}

/* ─── List item ──────────────────────────────────────────────────── */

function ReferentListItem({
  r, selected, onSelect, meetingCount = 0,
}: { r: Referent; selected: boolean; onSelect: () => void; meetingCount?: number }) {
  const trait = referentCaracteristica(r);
  const phone = formatPhone(r.celular);
  const ubicacion = [
    r.barrio,
    r.circuitoCodigo ? `Circ. ${r.circuitoCodigo}` : null,
    r.chacra ? `CH ${r.chacra}` : null,
  ].filter(Boolean).join(" · ");

  return (
    <button
      type="button"
      className={`ref-list-item${selected ? " selected" : ""}`}
      onClick={onSelect}
    >
      <div className="ref-list-item-top">
        <span className="ref-list-item-name">{r.nombreApellido}</span>
        <div className="ref-list-item-top-right">
          {meetingCount > 0 && (
            <span className="ref-list-item-meetings" title={`${meetingCount} reunión${meetingCount !== 1 ? "es" : ""}`}>
              📅 {meetingCount}
            </span>
          )}
          {r.circuitoCodigo && (
            <span className="ref-list-item-circuit">{r.circuitoCodigo}</span>
          )}
        </div>
      </div>
      {ubicacion && <p className="ref-list-item-ubic">{ubicacion}</p>}
      {(r.referenteDe?.trim() || trait) && (
        <p className="ref-list-item-dep">{r.referenteDe?.trim() || trait}</p>
      )}
      <div className="ref-list-item-foot">
        {phone
          ? <span className="ref-list-item-phone">{phone}</span>
          : <span className="ref-list-item-missing">Sin teléfono</span>}
        {hasSparseData(r) && <span className="ref-list-item-tag">Datos incompletos</span>}
      </div>
    </button>
  );
}

/* ─── Hamburger drawer ───────────────────────────────────────────── */

function HamburgerDrawer({
  mainSection, onSelect, onClose, eventsCount,
}: {
  mainSection: MainSection;
  onSelect: (s: MainSection) => void;
  onClose: () => void;
  eventsCount: number;
}) {
  return (
    <>
      <div className="ref-drawer-backdrop" onClick={onClose} aria-hidden />
      <div className="ref-drawer" role="dialog" aria-label="Menú de navegación">
        <div className="ref-drawer-head">
          <span className="ref-drawer-title">Menú</span>
          <button type="button" className="ref-drawer-close" onClick={onClose} aria-label="Cerrar menú">
            ×
          </button>
        </div>
        <nav className="ref-drawer-nav">

          {/* Referentes por zonas */}
          <button
            type="button"
            className={`ref-drawer-item${mainSection === "zonas" ? " active" : ""}`}
            onClick={() => { onSelect("zonas"); onClose(); }}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20" aria-hidden>
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            <span className="ref-drawer-item-text">
              <strong>Referentes por zonas</strong>
              <span className="ref-drawer-item-sub">Buscar, filtrar y ver en mapa</span>
            </span>
          </button>

          {/* Mapa de circuitos */}
          <button
            type="button"
            className={`ref-drawer-item${mainSection === "mapa" ? " active" : ""}`}
            onClick={() => { onSelect("mapa"); onClose(); }}
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" width="20" height="20" aria-hidden>
              <polygon points="1,5 7,2 13,5 19,2 19,18 13,15 7,18 1,15" />
              <line x1="7" y1="2" x2="7" y2="18" />
              <line x1="13" y1="5" x2="13" y2="15" />
            </svg>
            <span className="ref-drawer-item-text">
              <strong>Mapa de circuitos</strong>
              <span className="ref-drawer-item-sub">Densidad de referentes por circuito</span>
            </span>
          </button>

          {/* Agenda / Reuniones */}
          <button
            type="button"
            className={`ref-drawer-item${mainSection === "agenda" ? " active" : ""}`}
            onClick={() => { onSelect("agenda"); onClose(); }}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20" aria-hidden>
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
            <span className="ref-drawer-item-text">
              <strong>Reuniones y circuitos</strong>
              <span className="ref-drawer-item-sub">Agenda operativa</span>
            </span>
            {eventsCount > 0 && (
              <span className="ref-drawer-badge">{eventsCount}</span>
            )}
          </button>

        </nav>
      </div>
    </>
  );
}

/* ─── Agenda section ─────────────────────────────────────────────── */

const TIPO_CFG: Record<string, { label: string; mod: string; color: string }> = {
  Barrial:  { label: "B", mod: "--barrial",  color: "#3b82f6" },
  Prensa:   { label: "P", mod: "--prensa",   color: "#a855f7" },
  Operativo:{ label: "O", mod: "--operativo",color: "#10b981" },
};
function tipoMod(tipo: string) {
  return TIPO_CFG[tipo] ?? TIPO_CFG.Barrial;
}

/* ─── Mini Leaflet map ──────────────────────────────────────────── */

function EventMiniMap({ lat, lng }: { lat: number; lng: number }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    if (instanceRef.current) {
      instanceRef.current.setView([lat, lng], 15);
      return;
    }
    const map = L.map(mapRef.current, {
      center: [lat, lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);
    const icon = L.divIcon({
      html: `<div style="
        width:20px;height:20px;border-radius:50%;
        background:#ef4444;border:3px solid #fff;
        box-shadow:0 2px 8px rgba(0,0,0,.4)">
      </div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      className: "",
    });
    L.marker([lat, lng], { icon }).addTo(map);
    instanceRef.current = map;
    return () => {
      map.remove();
      instanceRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (instanceRef.current) instanceRef.current.setView([lat, lng], 15);
  }, [lat, lng]);

  return (
    <div
      ref={mapRef}
      style={{ width: "100%", height: 200, borderRadius: 12, overflow: "hidden" }}
    />
  );
}

/* ─── Event detail sheet ────────────────────────────────────────── */

function EventDetailSheet({
  event,
  referents,
  onClose,
}: {
  event: EventItem;
  referents: Referent[];
  onClose: () => void;
}) {
  const d = event.fechaHora ? new Date(event.fechaHora) : null;
  const cfg = tipoMod(event.tipo);

  const invitados = useMemo(() => {
    if (!event.referentIds?.length) return [] as Referent[];
    return event.referentIds
      .map((id) => referents.find((r) => r.id === id))
      .filter((r): r is Referent => Boolean(r));
  }, [event.referentIds, referents]);

  const asistentes = useMemo(() => {
    if (!event.attendeeIds?.length) return [] as Referent[];
    return event.attendeeIds
      .map((id) => referents.find((r) => r.id === id))
      .filter((r): r is Referent => Boolean(r));
  }, [event.attendeeIds, referents]);

  const mapsUrl = event.ubicacionUrl
    ?? (event.lat && event.lng
      ? `https://www.openstreetmap.org/?mlat=${event.lat}&mlon=${event.lng}#map=16/${event.lat}/${event.lng}`
      : null);

  const gmapsUrl = event.lat && event.lng
    ? `https://maps.google.com/?q=${event.lat},${event.lng}`
    : null;

  function Row({ label, value }: { label: string; value?: string | null }) {
    if (!value?.trim()) return null;
    return (
      <div style={{ display: "flex", gap: 8, fontSize: 13, lineHeight: 1.5 }}>
        <span style={{ color: "var(--text-secondary)", minWidth: 80, flexShrink: 0 }}>{label}</span>
        <span style={{ color: "var(--text-primary)", wordBreak: "break-word" }}>{value}</span>
      </div>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 3000,
          background: "rgba(15,23,42,0.55)",
          backdropFilter: "blur(2px)",
        }}
        aria-hidden
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal
        aria-label={`Detalle: ${event.lugar ?? "evento"}`}
        style={{
          position: "fixed",
          bottom: 0, left: 0, right: 0,
          zIndex: 3001,
          background: "var(--bg-surface, #fff)",
          borderRadius: "20px 20px 0 0",
          padding: "0 0 env(safe-area-inset-bottom)",
          maxHeight: "88vh",
          overflowY: "auto",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.22)",
        }}
      >
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border, #e2e8f0)" }} />
        </div>

        <div style={{ padding: "0 20px 32px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
            <div style={{
              flexShrink: 0,
              width: 40, height: 40,
              borderRadius: 10,
              background: cfg.color,
              color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 16,
            }}>
              {cfg.label}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)", lineHeight: 1.3 }}>
                {event.lugar || "Sin lugar"}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                {event.tipo}
                {d && (
                  <>
                    {" · "}
                    {d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
                    {" · "}
                    {d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                  </>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              style={{
                flexShrink: 0,
                width: 32, height: 32,
                border: "none",
                borderRadius: 8,
                background: "var(--bg-muted, #f1f5f9)",
                color: "var(--text-secondary)",
                fontSize: 18, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          {/* Details */}
          <div style={{
            background: "var(--bg-muted, #f8fafc)",
            borderRadius: 12,
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 16,
          }}>
            <Row label="Dirección" value={event.direccion} />
            <Row label="Barrio"    value={event.barrio} />
            <Row label="Circuito"  value={event.circuitoCodigo ? `Circuito ${event.circuitoCodigo}` : null} />
            <Row label="Anfitrión" value={event.anfitrion} />
            <Row label="Celular"   value={event.celular} />
            <Row label="Referente" value={event.referente} />
            <Row label="Programa"  value={event.programa} />
            <Row label="Contacto"  value={event.contacto} />
            {event.observacion?.trim() && (
              <div style={{ display: "flex", gap: 8, fontSize: 13, lineHeight: 1.5 }}>
                <span style={{ color: "var(--text-secondary)", minWidth: 80, flexShrink: 0 }}>Obs.</span>
                <span style={{ color: "var(--text-primary)", fontStyle: "italic" }}>{event.observacion}</span>
              </div>
            )}
          </div>

          {/* Referentes invitados */}
          {invitados.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-secondary)", marginBottom: 8 }}>
                Referentes convocados ({invitados.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {invitados.map((r) => (
                  <div key={r.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 12px", borderRadius: 8,
                    background: "var(--bg-muted, #f8fafc)",
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: "#3b82f6",
                      color: "#fff", fontWeight: 700, fontSize: 12,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      {r.nombreApellido.slice(0, 1).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                        {r.nombreApellido}
                        {asistentes.some((a) => a.id === r.id) && (
                          <span style={{ marginLeft: 6, fontSize: 11, color: "#10b981", fontWeight: 700 }}>✓ asistió</span>
                        )}
                      </div>
                      {(r.barrio || r.circuitoCodigo) && (
                        <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                          {[r.barrio, r.circuitoCodigo ? `Circ. ${r.circuitoCodigo}` : null].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mini map */}
          {event.lat && event.lng && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-secondary)", marginBottom: 8 }}>
                Ubicación
              </div>
              <EventMiniMap lat={event.lat} lng={event.lng} />
            </div>
          )}

          {/* Map links */}
          {(mapsUrl || gmapsUrl) && (
            <div style={{ display: "flex", gap: 8 }}>
              {gmapsUrl && (
                <a
                  href={gmapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    padding: "10px 16px",
                    borderRadius: 10,
                    background: "#4285f4",
                    color: "#fff",
                    fontWeight: 600, fontSize: 13,
                    textDecoration: "none",
                  }}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  Google Maps
                </a>
              )}
              {mapsUrl && mapsUrl !== gmapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    padding: "10px 16px",
                    borderRadius: 10,
                    background: "var(--bg-muted, #f1f5f9)",
                    color: "var(--text-primary)",
                    fontWeight: 600, fontSize: 13,
                    textDecoration: "none",
                    border: "1.5px solid var(--border, #e2e8f0)",
                  }}
                >
                  Ver en mapa
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function AgendaEventRow({ event, onClick }: { event: EventItem; onClick: () => void }) {
  const d = event.fechaHora ? new Date(event.fechaHora) : null;
  const cfg = tipoMod(event.tipo);
  const hasRefs = (event.referentIds?.length ?? 0) > 0;
  return (
    <button
      type="button"
      className={`ref-agenda-event ref-agenda-event${cfg.mod}`}
      onClick={onClick}
      style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
    >
      <div className="ref-agenda-event-type" style={{ background: cfg.color }}>{cfg.label}</div>
      <div className="ref-agenda-event-info">
        <div className="ref-agenda-event-lugar">{event.lugar || "Sin lugar"}</div>
        {event.barrio && <div className="ref-agenda-event-barrio">{event.barrio}</div>}
        {d && (
          <div className="ref-agenda-event-fecha">
            {d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}
            {" · "}
            {d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
        {hasRefs && (
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
            👥 {event.referentIds!.length} referente{event.referentIds!.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0, color: "var(--text-secondary)", fontSize: 16, paddingLeft: 4, alignSelf: "center" }}>›</div>
    </button>
  );
}

function AgendaSection({
  events, referents,
}: {
  events: EventItem[];
  referents: Referent[];
}) {
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  const now = new Date();
  const upcoming = useMemo(
    () => events
      .filter((e) => e.fechaHora && new Date(e.fechaHora) >= now)
      .sort((a, b) => new Date(a.fechaHora!).getTime() - new Date(b.fechaHora!).getTime()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events],
  );

  const geolocatedCount = useMemo(
    () => upcoming.filter((e) => e.lat != null && e.lng != null).length,
    [upcoming],
  );

  return (
    <div className="ref-agenda">
      {selectedEvent && (
        <EventDetailSheet
          event={selectedEvent}
          referents={referents}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      <div className="ref-agenda-stats">
        <div className="ref-agenda-stat">
          <span className="ref-agenda-stat-n">{upcoming.length}</span>
          <span className="ref-agenda-stat-lbl">Próximas reuniones</span>
        </div>
        <div className="ref-agenda-stat">
          <span className="ref-agenda-stat-n">{geolocatedCount}</span>
          <span className="ref-agenda-stat-lbl">En el mapa</span>
        </div>
        <div className="ref-agenda-stat">
          <span className="ref-agenda-stat-n">{referents.length}</span>
          <span className="ref-agenda-stat-lbl">Referentes</span>
        </div>
      </div>

      <section className="ref-agenda-section">
        <h3 className="ref-agenda-section-title">
          Próximas reuniones
          {upcoming.length > 0 && <span className="ref-agenda-badge">{upcoming.length}</span>}
        </h3>
        {upcoming.length === 0 ? (
          <div className="ref-agenda-no-events">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <p>Sin reuniones programadas</p>
            <span>Las reuniones cargadas aparecerán aquí</span>
          </div>
        ) : (
          <div className="ref-agenda-event-list">
            {upcoming.map((e) => (
              <AgendaEventRow key={e.id} event={e} onClick={() => setSelectedEvent(e)} />
            ))}
          </div>
        )}
      </section>

      <section className="ref-agenda-section">
        <h3 className="ref-agenda-section-title">Mapa de reuniones</h3>
        <AgendaMeetingsMap
          events={events}
          active
          onSelectEvent={setSelectedEvent}
        />
      </section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════ */

export function DashboardHomePage({ campaignId }: Props) {
  /* ── Data ── */
  const [referents, setReferents]   = useState<Referent[]>([]);
  const [circuits,  setCircuits]    = useState<Circuit[]>([]);
  const [mapData,   setMapData]     = useState<MapDataset | null>(null);
  const [events,    setEvents]      = useState<EventItem[]>([]);
  const [loading,   setLoading]     = useState(false);
  const [error,     setError]       = useState<string | null>(null);

  /* ── Navigation ── */
  const [mainSection,  setMainSection]  = useState<MainSection>("zonas");
  const [mobileView,   setMobileView]   = useState<MobileView>("lista");
  const [drawerOpen,   setDrawerOpen]   = useState(false);

  /* ── Density map selected circuit ── */
  const [mapPinned, setMapPinned] = useState<string | null>(null);

  /* ── Desktop ── */
  const [mapCollapsed, setMapCollapsed] = useState(false);
  const [filtersOpen,  setFiltersOpen]  = useState(false);

  /* ── Search & filters ── */
  const [query,                setQuery]                = useState("");
  const [barrioFilter,         setBarrioFilter]         = useState("");
  const [circuitoFilter,       setCircuitoFilter]       = useState("");
  const [caracteristicaFilter, setCaracteristicaFilter] = useState("");
  const [selectedId,           setSelectedId]           = useState<string | null>(null);
  const [nearbyLabel,          setNearbyLabel]          = useState<string | null>(null);
  const [nearbyError,          setNearbyError]          = useState<string | null>(null);
  const [geoLoading,           setGeoLoading]           = useState(false);
  const [mapNotice,            setMapNotice]            = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isWide, setIsWide] = useState(
    () => typeof window !== "undefined" ? window.matchMedia("(min-width: 901px)").matches : true,
  );

  /* ── Responsive ── */
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 901px)");
    const onChange = () => setIsWide(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  /* ── Data loading ── */
  useEffect(() => {
    if (!campaignId) return;
    setLoading(true);
    setError(null);
    Promise.allSettled([
      api.operations.referents(campaignId),
      api.territory.circuits(campaignId),
      api.map.dataset({ campaignId }),
      api.operations.events(campaignId),
    ]).then(([ref, circ, map, evts]) => {
      if (ref.status  === "fulfilled") setReferents(ref.value);
      if (circ.status === "fulfilled") setCircuits(circ.value);
      if (map.status  === "fulfilled") setMapData(map.value);
      if (evts.status === "fulfilled") setEvents(evts.value);
      if (ref.status  === "rejected")  setError("No se pudieron cargar los referentes.");
    }).finally(() => setLoading(false));
  }, [campaignId]);

  /* ── Events ↔ referents mapping ── */
  const eventsByReferentId = useMemo(() => {
    const m: Record<string, EventItem[]> = {};
    for (const e of events) {
      const ids = [...(e.referentIds ?? []), ...(e.attendeeIds ?? [])];
      for (const id of ids) {
        if (!m[id]) m[id] = [];
        if (!m[id].some((ex) => ex.id === e.id)) m[id].push(e);
      }
    }
    return m;
  }, [events]);

  /* ── Filter options ── */
  const barrioOptions       = useMemo(() => topValues(referents, (r) => r.barrio,          200), [referents]);
  const circuitoOptions     = useMemo(() => topValues(referents, (r) => r.circuitoCodigo,  50),  [referents]);
  const caracteristicaOptions = useMemo(() => topCaracteristicas(referents, 50),                 [referents]);

  const hasZoneFilter = Boolean(barrioFilter || circuitoFilter);
  const hasSearch     = query.trim().length >= 2;
  const searchingAll  = hasSearch;

  const suggestedBarrio = useMemo(
    () => hasSearch && !barrioFilter ? matchBarrioFromQuery(query, barrioOptions) : null,
    [query, barrioOptions, hasSearch, barrioFilter],
  );

  const zoneFiltered = useMemo(
    () => filterReferents(referents, "", { barrio: barrioFilter || undefined, circuito: circuitoFilter || undefined }),
    [referents, barrioFilter, circuitoFilter],
  );

  const displayList = useMemo(() => {
    if (searchingAll) return filterReferents(referents, query, { caracteristica: caracteristicaFilter || undefined });
    return filterReferents(referents, "", {
      barrio: barrioFilter || undefined,
      circuito: circuitoFilter || undefined,
      caracteristica: caracteristicaFilter || undefined,
    });
  }, [referents, query, barrioFilter, circuitoFilter, caracteristicaFilter, searchingAll]);

  const browsingZone     = hasZoneFilter && !searchingAll;
  const hasActiveFilters = Boolean(query.trim() || barrioFilter || circuitoFilter || caracteristicaFilter || nearbyLabel);
  const selected         = displayList.find((r) => r.id === selectedId) ?? null;

  const zoneLabel = circuitoFilter ? `Circuito ${circuitoFilter}`
                  : barrioFilter   ? barrioFilter
                  : nearbyLabel    ?? null;

  const dependenciaInZone     = useMemo(() => topCaracteristicas(zoneFiltered, 14),          [zoneFiltered]);
  const selectedCircuitMeta   = useMemo(
    () => circuitoFilter ? circuits.find((c) => c.codigo === circuitoFilter) ?? null : null,
    [circuits, circuitoFilter],
  );

  /* ── Auto-select on desktop ── */
  useEffect(() => {
    if (!isWide) return;
    if (!selectedId && displayList[0]) setSelectedId(displayList[0].id);
    if (selectedId && !displayList.some((r) => r.id === selectedId)) setSelectedId(displayList[0]?.id ?? null);
  }, [displayList, selectedId, isWide]);

  /* ── When search is typed on mobile, jump to lista ── */
  useEffect(() => {
    if (!isWide && hasSearch) setMobileView("lista");
  }, [hasSearch, isWide]);

  /* ── Actions ── */
  function clearZone() {
    setBarrioFilter(""); setCircuitoFilter(""); setCaracteristicaFilter("");
    setNearbyLabel(null); setNearbyError(null);
  }
  function clearAll()      { setQuery(""); clearZone(); }
  function nuevaBusqueda() { clearAll(); searchInputRef.current?.focus(); }
  function volverAZona()   { setQuery(""); searchInputRef.current?.blur(); }

  function selectBarrio(barrio: string) {
    setBarrioFilter(barrio); setCircuitoFilter(""); setCaracteristicaFilter(""); setNearbyLabel(null);
    if (!isWide) setMobileView("lista");
  }

  function countInCircuit(codigo: string) {
    const key = codigo.trim().toUpperCase();
    return referents.filter((r) => r.circuitoCodigo?.trim().toUpperCase() === key).length;
  }

  function applyCircuitFilter(code: string): boolean {
    const n = countInCircuit(code);
    if (n === 0) { setMapNotice(`Circuito ${code}: sin referentes.`); return false; }
    setMapNotice(null);
    setCircuitoFilter(code); setBarrioFilter(""); setCaracteristicaFilter(""); setNearbyLabel(null); setQuery("");
    if (!isWide) setMobileView("lista");
    return true;
  }

  function onMapCircuit(code: string | null) {
    if (!code) { setCircuitoFilter(""); setMapNotice(null); return; }
    applyCircuitFilter(code);
  }

  /** Navegar a zonas con filtro de circuito (desde mapa densidad o agenda) */
  function goToCircuito(code: string) {
    if (!applyCircuitFilter(code)) return;
    setMainSection("zonas");
    setMobileView("lista");
  }

  function pickReferent(id: string) {
    setSelectedId(id);
    if (!isWide) setMobileView("ficha");
  }

  function activateNearby() {
    if (!navigator.geolocation) { setNearbyError("Tu navegador no soporta ubicación."); return; }
    setGeoLoading(true); setNearbyError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const nearest = nearestCircuitFromPoint(point, mapData?.circuits ?? circuits);
        setGeoLoading(false);
        if (!nearest) { setNearbyError("No hay circuitos con mapa para ubicarte."); return; }
        const n = referents.filter(
          (r) => r.circuitoCodigo?.trim().toUpperCase() === nearest.codigo.trim().toUpperCase(),
        ).length;
        if (n === 0) { setNearbyError(`Circuito más cercano (${nearest.codigo}) sin referentes.`); return; }
        setCircuitoFilter(nearest.codigo); setBarrioFilter(""); setCaracteristicaFilter(""); setQuery("");
        setNearbyLabel(`Cerca tuyo · circ. ${nearest.codigo} (~${nearest.km.toFixed(1)} km)`);
        if (!isWide) setMobileView("lista");
      },
      () => { setGeoLoading(false); setNearbyError("No se pudo obtener tu ubicación."); },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }

  /* ── Shared filter pickers ── */
  const filterPickers = (
    <>
      <FilterPicker label="Barrio"      placeholder="Todos"  value={barrioFilter}         options={barrioOptions}         onChange={(v) => v ? selectBarrio(v) : setBarrioFilter("")} />
      <FilterPicker label="Circuito"    placeholder="Todos"  value={circuitoFilter}       options={circuitoOptions}       onChange={(v) => v ? applyCircuitFilter(v) : setCircuitoFilter("")} />
      <FilterPicker label="Dependencia" placeholder="Todas"  value={caracteristicaFilter} options={caracteristicaOptions} onChange={setCaracteristicaFilter} />
    </>
  );

  /* ── Zone header ── */
  const listZoneHeader = (
    <div className="ref-list-zone">
      {browsingZone || searchingAll || nearbyLabel ? (
        <>
          <div className="ref-list-zone-head">
            <div>
              <h2 className="ref-list-zone-title">
                {searchingAll ? `«${query.trim()}»` : zoneLabel}
              </h2>
              <p className="ref-list-zone-count">
                {displayList.length} persona{displayList.length !== 1 ? "s" : ""}
                {searchingAll ? " · en toda la base" : ""}
              </p>
            </div>
            {browsingZone && (
              <button type="button" className="ref-list-zone-change" onClick={nuevaBusqueda}>Otra búsqueda</button>
            )}
          </div>
          {searchingAll && hasZoneFilter && zoneLabel && (
            <button type="button" className="ref-list-zone-back" onClick={volverAZona}>
              ← Volver a {zoneLabel} ({zoneFiltered.length})
            </button>
          )}
          {browsingZone && dependenciaInZone.length > 0 && (
            <div className="ref-list-dep-filter">
              <span className="ref-list-dep-label">Refinar por dependencia</span>
              <div className="ref-list-dep-chips">
                <button type="button" className={`ref-list-dep-chip${!caracteristicaFilter ? " active" : ""}`} onClick={() => setCaracteristicaFilter("")}>
                  Todas ({zoneFiltered.length})
                </button>
                {dependenciaInZone.map(({ value, count }) => (
                  <button key={value} type="button"
                    className={`ref-list-dep-chip${caracteristicaFilter === value ? " active" : ""}`}
                    onClick={() => setCaracteristicaFilter(caracteristicaFilter === value ? "" : value)}
                  >
                    {value.length > 22 ? `${value.slice(0, 20)}…` : value} ({count})
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="ref-list-zone-empty">
          <p>Buscá por <strong>nombre o barrio</strong>, usá <strong>ver por zona</strong> o <strong>cerca tuyo</strong>.</p>
          <div className="ref-list-zone-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setFiltersOpen(true)}>Ver por zona</button>
            <button type="button" className="btn btn-secondary" onClick={activateNearby} disabled={geoLoading}>
              {geoLoading ? "Ubicando…" : "Cerca tuyo"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setMobileView("mapa")}>Mapa</button>
          </div>
          {nearbyError && <p className="ref-list-zone-error">{nearbyError}</p>}
        </div>
      )}
    </div>
  );

  /* ── List content ── */
  const listContent = (
    <>
      {!isWide && listZoneHeader}
      <div className="ref-home-list">
        {!hasZoneFilter && !hasSearch && !nearbyLabel ? null : displayList.length === 0 ? (
          <p className="ref-home-empty">
            {hasSearch ? "Sin coincidencias. Probá otro nombre." : "Nadie coincide con estos filtros."}
          </p>
        ) : (
          displayList.map((r) => (
            <ReferentListItem
              key={r.id}
              r={r}
              selected={selected?.id === r.id}
              onSelect={() => pickReferent(r.id)}
              meetingCount={eventsByReferentId[r.id]?.length ?? 0}
            />
          ))
        )}
      </div>
    </>
  );

  /* ── Map content (zonas section — original circuit colors) ── */
  const mapContent = (
    <div className="ref-home-map-inner">
      <CircuitPolygonsMap
        referents={referents}
        mapData={mapData}
        selectedCircuit={circuitoFilter || null}
        onCircuitSelect={onMapCircuit}
        visible={isWide || mobileView === "mapa"}
      />
      {!isWide && (
        <div className={`ref-map-mobile-bar${mapNotice ? " ref-map-mobile-bar--warn" : ""}`}>
          {mapNotice ? (
            <p className="ref-map-mobile-notice">{mapNotice}</p>
          ) : hasZoneFilter && zoneFiltered.length > 0 ? (
            <>
              <div className="ref-map-mobile-bar-text">
                <strong>{zoneLabel}</strong>
                <span>{zoneFiltered.length} referente{zoneFiltered.length !== 1 ? "s" : ""}</span>
              </div>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setMobileView("lista")}>
                Ver lista
              </button>
            </>
          ) : (
            <p className="ref-map-mobile-hint">Tocá un circuito con referentes</p>
          )}
        </div>
      )}
      {isWide && selectedCircuitMeta && (
        <div className="ref-home-circuit-meta">
          <strong>{selectedCircuitMeta.codigo}</strong>
          {selectedCircuitMeta.nombre && ` · ${selectedCircuitMeta.nombre}`}
          <span className="ref-home-circuit-meta-count">{zoneFiltered.length} ref.</span>
        </div>
      )}
    </div>
  );

  /* ── Density map section ── */
  const mapPinnedCircuit = mapPinned
    ? circuits.find((c) => c.codigo.toUpperCase() === mapPinned.toUpperCase())
    : null;
  const mapPinnedCount = mapPinned
    ? referents.filter((r) => r.circuitoCodigo?.trim().toUpperCase() === mapPinned.toUpperCase()).length
    : 0;

  const densityMapSection = (
    <div className="ref-section-mapa">
      <CircuitPolygonsMap
        colorMode="density"
        showLegend
        referents={referents}
        mapData={mapData}
        selectedCircuit={mapPinned}
        onCircuitSelect={setMapPinned}
        visible={mainSection === "mapa"}
      />
      {mapPinned && (
        <div className="ref-map-circuit-sheet">
          <div className="ref-map-circuit-sheet-body">
            <div className="ref-map-circuit-sheet-code">Circuito {mapPinned}</div>
            {mapPinnedCircuit && (
              <div className="ref-map-circuit-sheet-name">
                {mapPinnedCircuit.nombre || mapPinnedCircuit.zona || ""}
              </div>
            )}
            <div className="ref-map-circuit-sheet-count">
              {mapPinnedCount} referente{mapPinnedCount !== 1 ? "s" : ""}
            </div>
          </div>
          <div className="ref-map-circuit-sheet-actions">
            {mapPinnedCount > 0 && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => goToCircuito(mapPinned)}>
                Ver referentes →
              </button>
            )}
            <button type="button" className="ref-map-circuit-sheet-close" onClick={() => setMapPinned(null)} aria-label="Cerrar">×</button>
          </div>
        </div>
      )}
    </div>
  );

  /* ── Guards ── */
  if (!campaignId) return <div className="loading-overlay">Seleccioná una campaña.</div>;
  if (loading) return <div className="loading-overlay"><div className="spinner" />Cargando referentes…</div>;

  /* ══════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════ */
  return (
    <div className="ref-home">

      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="ref-home-bar">
        {error && <div className="error-banner ref-home-banner">{error}</div>}

        <div className="ref-home-bar-top">
          {/* Hamburger button (mobile only) */}
          {!isWide && (
            <button
              type="button"
              className={`ref-hamburger-btn${mainSection !== "zonas" ? " has-section" : ""}`}
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menú"
            >
              <span /><span /><span />
              {mainSection !== "zonas" && (
                <span className="ref-hamburger-section-label">
                  {mainSection === "mapa" ? "Mapa" : "Agenda"}
                </span>
              )}
            </button>
          )}

          <div className="ref-home-stats">
            <span className="ref-home-stats-main">{displayList.length}</span>
            <span className="ref-home-stats-label">
              {hasZoneFilter || hasSearch || nearbyLabel
                ? "mostrados"
                : `${referents.length} referentes`}
            </span>
          </div>

          {isWide && (
            <div className="ref-home-bar-desktop">
              <button type="button" className="ref-home-text-btn" onClick={() => setMapCollapsed((c) => !c)}>
                {mapCollapsed ? "Mostrar mapa" : "Ocultar mapa"}
              </button>
            </div>
          )}
        </div>

        {/* Search row — only in zonas section (mobile) or always on desktop */}
        {(isWide || mainSection === "zonas") && (
          <>
            <div className="ref-home-search-row">
              <div className="ref-home-search-wrap">
                <input
                  ref={searchInputRef}
                  className="ref-home-search"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); if (e.target.value.trim()) setNearbyLabel(null); }}
                  placeholder={browsingZone ? `Buscar en ${zoneLabel ?? "esta zona"}…` : "Nombre, barrio, circuito…"}
                  aria-label="Buscar referentes"
                />
                {hasActiveFilters && (
                  <button type="button" className="ref-home-search-clear" onClick={nuevaBusqueda} aria-label="Borrar filtros" title="Nueva búsqueda">×</button>
                )}
              </div>
              <button
                type="button"
                className={`ref-home-filters-btn${hasZoneFilter || nearbyLabel ? " has-filters" : ""}`}
                onClick={() => setFiltersOpen(true)}
                aria-label="Ver por zona"
              >
                Zona
              </button>
            </div>

            {suggestedBarrio && (
              <button type="button" className="ref-search-suggest"
                onClick={() => { selectBarrio(suggestedBarrio.value); setQuery(""); }}
              >
                Ver zona <strong>{suggestedBarrio.value}</strong> ({suggestedBarrio.count} referentes)
              </button>
            )}

            {isWide && <div className="ref-home-toolbar-desktop">{filterPickers}</div>}
          </>
        )}

        {/* Compact header for non-zonas sections on mobile */}
        {!isWide && mainSection === "mapa" && (
          <div className="ref-section-header-compact">
            Densidad de referentes · toca un circuito
          </div>
        )}
        {!isWide && mainSection === "agenda" && (
          <div className="ref-section-header-compact">
            {events.length > 0
              ? `${events.length} reunión${events.length !== 1 ? "es" : ""} · ${circuits.length} circuitos`
              : `${circuits.length} circuitos · sin reuniones cargadas`}
          </div>
        )}
      </header>

      {/* ── Hamburger drawer ──────────────────────────────────────── */}
      {drawerOpen && (
        <HamburgerDrawer
          mainSection={mainSection}
          onSelect={(s) => {
            setMainSection(s);
            if (s === "zonas") setMobileView("lista");
          }}
          onClose={() => setDrawerOpen(false)}
          eventsCount={events.length}
        />
      )}

      {/* ── Zone filters drawer (mobile) ──────────────────────────── */}
      {filtersOpen && !isWide && (
        <div className="ref-filters-drawer" role="presentation" onClick={() => setFiltersOpen(false)}>
          <div className="ref-filters-drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="ref-filters-drawer-head">
              <span>Ver por zona</span>
              <button type="button" onClick={() => setFiltersOpen(false)}>Listo</button>
            </div>
            <p className="ref-filters-drawer-hint">Barrio o circuito. En la lista podés refinar por dependencia.</p>
            <div className="ref-filters-drawer-body">{filterPickers}</div>
          </div>
        </div>
      )}

      {/* ── Desktop body ──────────────────────────────────────────── */}
      {isWide && (
        <div className={`ref-home-body ${mapCollapsed ? "map-collapsed" : ""}`}>
          <div className="ref-home-col ref-home-col-list">
            {listZoneHeader}
            {listContent}
          </div>
          <div className="ref-home-col ref-home-col-ficha">
            <div className="ref-home-detail-scroll">
              {selected
                ? <ReferentFicha r={selected} events={eventsByReferentId[selected.id] ?? []} />
                : <p className="ref-home-empty">Seleccioná un referente de la lista.</p>}
            </div>
          </div>
          {!mapCollapsed && (
            <div className="ref-home-col ref-home-col-map">{mapContent}</div>
          )}
        </div>
      )}

      {/* ── Mobile body ───────────────────────────────────────────── */}
      {!isWide && (
        <div className="ref-home-mobile">
          <div className="ref-home-mobile-pane">

            {/* ── Sección Zonas (original Lista / Mapa / Detalle) ── */}
            {mainSection === "zonas" && (
              <>
                {mobileView === "lista" && listContent}
                {mobileView === "mapa"  && mapContent}
                {mobileView === "ficha" && (
                  <div className="ref-home-detail-scroll ref-home-detail-scroll--ficha">
                    {selected
                      ? <ReferentFicha r={selected} onBack={() => setMobileView("lista")} events={eventsByReferentId[selected.id] ?? []} />
                      : <p className="ref-home-empty">Elegí alguien de la lista.</p>}
                  </div>
                )}
              </>
            )}

            {/* ── Sección Mapa de densidad ── */}
            {mainSection === "mapa" && densityMapSection}

            {/* ── Sección Agenda / Reuniones ── */}
            {mainSection === "agenda" && (
              <div className="ref-agenda-scroll">
                <AgendaSection
                  events={events}
                  referents={referents}
                />
              </div>
            )}
          </div>

          {/* ── Lista / Mapa / Detalle (solo en sección Zonas) ── */}
          {mainSection === "zonas" && (
            <nav className="ref-home-mobile-nav" aria-label="Vista principal">
              {MOBILE_TABS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  className={mobileView === id ? "active" : ""}
                  onClick={() => setMobileView(id)}
                  disabled={id === "ficha" && !selected}
                >
                  <span className="ref-mobile-nav-label">
                    {label}
                    {id === "lista" && displayList.length > 0 && (hasZoneFilter || hasSearch || nearbyLabel) && (
                      <span className="ref-mobile-nav-badge">{displayList.length}</span>
                    )}
                  </span>
                </button>
              ))}
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
