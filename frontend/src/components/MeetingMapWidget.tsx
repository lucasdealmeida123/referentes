/**
 * MeetingMapWidget — dashboard-embedded map showing meetings per circuit.
 * Left panel: Leaflet map with circuit polygons colored by meeting density.
 * Right panel: upcoming meetings list filtered by type.
 */
import { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { EventItem, MapDataset } from "../types";

interface Props {
  events: EventItem[];
  mapData: MapDataset | null;
  compact?: boolean;
}

/* ─── color palette ──────────────────────────────────────────── */

const PRENSA_COLOR  = "#a855f7";   // purple
const BARRIAL_COLOR = "#f97316";   // orange

// meeting-count gradient for circuit polygons
function countColor(count: number, max: number): string {
  if (count === 0) return "#e2e8f0";
  const intensity = max > 0 ? count / max : 0;
  if (intensity < 0.25) return "#bfdbfe";  // light blue
  if (intensity < 0.5)  return "#60a5fa";  // mid blue
  if (intensity < 0.75) return "#3b82f6";  // blue
  return "#1d4ed8";                         // deep blue
}

function fmtDateTime(v: unknown): { date: string; time: string } {
  if (!v) return { date: "–", time: "" };
  const d = new Date(String(v));
  if (isNaN(d.getTime())) return { date: "–", time: "" };
  return {
    date: d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" }),
    time: d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
  };
}

function isUpcoming(v: unknown): boolean {
  if (!v) return false;
  return new Date(String(v)).getTime() > Date.now() - 1000 * 60 * 60 * 6; // include events in last 6h
}

/* ─── component ─────────────────────────────────────────────── */

export function MeetingMapWidget({ events, mapData, compact = false }: Props) {
  const mapRef       = useRef<L.Map | null>(null);
  const layerRef     = useRef<L.LayerGroup | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [filter, setFilter] = useState<"all" | "prensa" | "barrial">("all");
  const [selectedCircuit, setSelectedCircuit] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState<"all" | "5" | "10">("all");
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);

  // Sort events by date
  const sortedEvents = useMemo(() =>
    [...events]
      .filter((e) => filter === "all" || e.tipo?.toLowerCase() === filter)
      .sort((a, b) => {
        if (!a.fechaHora) return 1;
        if (!b.fechaHora) return -1;
        return new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime();
      }),
    [events, filter]
  );

  const upcomingEvents = useMemo(
    () => sortedEvents.filter((e) => isUpcoming(e.fechaHora)).slice(0, 12),
    [sortedEvents]
  );

  const pastEvents = useMemo(
    () => sortedEvents.filter((e) => !isUpcoming(e.fechaHora)).slice(0, 4),
    [sortedEvents]
  );

  // Count meetings per circuit code
  const countByCircuit = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of events) {
      const k = e.circuitoCodigo ?? "__none__";
      map[k] = (map[k] ?? 0) + 1;
    }
    return map;
  }, [events]);

  const maxCount = useMemo(
    () => Math.max(1, ...Object.values(countByCircuit)),
    [countByCircuit]
  );

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: false }).setView([-27.37, -55.9], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      opacity: 0.6,
    }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    map.on("click", (e: L.LeafletMouseEvent) => {
      setCenter({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Redraw layers when data changes
  useEffect(() => {
    if (!mapRef.current || !layerRef.current || !mapData) return;
    const layer = layerRef.current;
    layer.clearLayers();
    const allBounds: [number, number][] = [];

    // Draw circuit polygons
    for (const circuit of mapData.circuits) {
      if (!circuit.polygon?.coordinates) continue;
      const coords = circuit.polygon.coordinates[0].map(
        ([lng, lat]) => [lat, lng] as [number, number]
      );
      if (coords.length === 0) continue;
      allBounds.push(...coords);

      const count   = countByCircuit[circuit.codigo] ?? 0;
      const color   = countColor(count, maxCount);
      const isSelected = selectedCircuit === circuit.codigo;

      const poly = L.polygon(coords as L.LatLngTuple[], {
        color:       isSelected ? "#1e3a8a" : "#334155",
        weight:      isSelected ? 3.8 : 2.2,
        fillColor:   color,
        fillOpacity: count > 0 ? 0.86 : 0.3,
      });

      // Popup with circuit meeting info
      const circuitEvents = events.filter(
        (e) => e.circuitoCodigo === circuit.codigo &&
               (filter === "all" || e.tipo?.toLowerCase() === filter)
      );
      const popupRows = circuitEvents.slice(0, 5).map((ev) => {
        const { date, time } = fmtDateTime(ev.fechaHora);
        const color = ev.tipo?.toLowerCase() === "prensa" ? PRENSA_COLOR : BARRIAL_COLOR;
        return `<div style="padding:4px 0;border-bottom:1px solid #f1f5f9;font-size:12px">
          <span style="color:${color};font-weight:600">${ev.tipo}</span>
          <span style="color:#475569;margin-left:6px">${date} ${time}</span><br/>
          <span style="color:#0f172a">${ev.lugar ?? "Sin lugar"}</span>
        </div>`;
      }).join("");

      poly.bindPopup(`
        <div style="min-width:200px;padding:4px">
          <strong style="font-size:13px;color:#0f172a">Circuito ${circuit.codigo}</strong>
          <div style="color:#64748b;font-size:12px;margin-bottom:6px">${circuit.nombre}</div>
          <div style="font-size:12px;color:#2563eb;font-weight:600;margin-bottom:6px">${count} reunión${count !== 1 ? "es" : ""}</div>
          ${popupRows}
          ${circuitEvents.length > 5 ? `<div style="font-size:11px;color:#94a3b8;margin-top:4px">+${circuitEvents.length - 5} más</div>` : ""}
        </div>
      `, { maxWidth: 260 });

      poly.on("click", () => setSelectedCircuit(
        (prev) => prev === circuit.codigo ? null : circuit.codigo
      ));
      poly.addTo(layer);
    }

    // Draw school dots (small, subtle)
    for (const school of mapData.schools) {
      if (school.lat == null || school.lng == null) continue;
      L.circleMarker([school.lat, school.lng], {
        radius: 3, color: "#94a3b8", fillColor: "#94a3b8", fillOpacity: 0.6, weight: 0,
      }).addTo(layer);
    }

    // Fit bounds to circuits
    if (allBounds.length > 0) {
      mapRef.current.fitBounds(allBounds as L.LatLngBoundsLiteral, { padding: [16, 16] });
    }
    if (center && radiusKm !== "all") {
      L.circle([center.lat, center.lng], {
        radius: Number(radiusKm) * 1000,
        color: "#0ea5e9",
        weight: 2,
        fillOpacity: 0.08
      }).addTo(layer);
      L.circleMarker([center.lat, center.lng], { radius: 5, color: "#0ea5e9", fillColor: "#0ea5e9", fillOpacity: 0.9 }).addTo(layer);
    }
    mapRef.current.invalidateSize();
  }, [mapData, countByCircuit, maxCount, selectedCircuit, events, filter, center, radiusKm]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => mapRef.current?.invalidateSize());
    observer.observe(containerRef.current);
    const t = setTimeout(() => mapRef.current?.invalidateSize(), 60);
    return () => {
      observer.disconnect();
      clearTimeout(t);
    };
  }, []);

  function distKm(aLat: number, aLng: number, bLat: number, bLng: number) {
    const R = 6371;
    const dLat = (bLat - aLat) * Math.PI / 180;
    const dLng = (bLng - aLng) * Math.PI / 180;
    const aa = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  }

  // Filter event display to selected circuit
  const displayEvents = upcomingEvents.filter((e) => {
    if (selectedCircuit && e.circuitoCodigo !== selectedCircuit) return false;
    if (radiusKm !== "all" && center && e.lat != null && e.lng != null) {
      return distKm(center.lat, center.lng, e.lat, e.lng) <= Number(radiusKm);
    }
    if (radiusKm !== "all" && center) return false;
    return true;
  });

  return (
    <div className={`meeting-map-widget${compact ? " compact" : ""}`}>

      {/* ─── Map ──────────────────────────────────────────────────── */}
      <div className="meeting-map-main">

        {/* Filter chips overlay */}
        <div style={{
          position: "absolute", top: 12, left: 12, zIndex: 1000,
          display: "flex", gap: 6,
        }}>
          {(["all", "prensa", "barrial"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "5px 12px", borderRadius: 100, fontSize: 12, fontWeight: 600,
                border: "1px solid",
                cursor: "pointer",
                backdropFilter: "blur(8px)",
                transition: "all 0.15s",
                borderColor: filter === f
                  ? (f === "prensa" ? PRENSA_COLOR : f === "barrial" ? BARRIAL_COLOR : "#2563eb")
                  : "rgba(100,116,139,0.3)",
                background: filter === f
                  ? (f === "prensa" ? "rgba(168,85,247,0.15)" : f === "barrial" ? "rgba(249,115,22,0.15)" : "rgba(37,99,235,0.15)")
                  : "rgba(255,255,255,0.85)",
                color: filter === f
                  ? (f === "prensa" ? PRENSA_COLOR : f === "barrial" ? BARRIAL_COLOR : "#2563eb")
                  : "#475569",
              }}
            >
              {f === "all" ? "Todos" : f === "prensa" ? "Prensa" : "Barriales"}
              <span style={{ marginLeft: 5, opacity: 0.8 }}>
                {f === "all" ? events.length :
                 f === "prensa" ? events.filter((e) => e.tipo?.toLowerCase() === "prensa").length :
                 events.filter((e) => e.tipo?.toLowerCase() === "barrial").length}
              </span>
            </button>
          ))}
          <select
            value={radiusKm}
            onChange={(e) => setRadiusKm(e.target.value as "all" | "5" | "10")}
            style={{ padding: "5px 8px", borderRadius: 100, border: "1px solid rgba(100,116,139,0.3)", fontSize: 12, background: "rgba(255,255,255,0.9)" }}
          >
            <option value="all">Sin radio</option>
            <option value="5">5 km</option>
            <option value="10">10 km</option>
          </select>
          {selectedCircuit && (
            <button
              onClick={() => setSelectedCircuit(null)}
              style={{
                padding: "5px 12px", borderRadius: 100, fontSize: 12, fontWeight: 600,
                border: "1px solid #94a3b8", cursor: "pointer",
                background: "rgba(255,255,255,0.85)", color: "#475569",
                backdropFilter: "blur(8px)",
              }}
            >
              Circ. {selectedCircuit} ✕
            </button>
          )}
          {center && (
            <button
              onClick={() => setCenter(null)}
              style={{
                padding: "5px 10px", borderRadius: 100, fontSize: 12, fontWeight: 600,
                border: "1px solid #94a3b8", cursor: "pointer",
                background: "rgba(255,255,255,0.85)", color: "#475569"
              }}
            >
              Quitar centro
            </button>
          )}
        </div>

        {/* Legend overlay */}
        <div style={{
          position: "absolute", bottom: 12, left: 12, zIndex: 1000,
          background: "rgba(255,255,255,0.92)", backdropFilter: "blur(6px)",
          borderRadius: 10, padding: "10px 14px",
          border: "1px solid rgba(100,116,139,0.15)",
          fontSize: 11.5,
        }}>
          <div style={{ fontWeight: 600, color: "#475569", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Reuniones / circuito
          </div>
          {[["Sin reuniones","#e2e8f0"],["1–2","#bfdbfe"],["3–4","#60a5fa"],["5–6","#3b82f6"],["7+","#1d4ed8"]].map(([label, color]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: color, display: "inline-block", flexShrink: 0 }} />
              <span style={{ color: "#64748b" }}>{label}</span>
            </div>
          ))}
        </div>

        <div ref={containerRef} className="meeting-map-canvas" />
      </div>

      {/* ─── Meetings panel ───────────────────────────────────────── */}
      {!compact && (
      <div className="meeting-map-side">
        <div style={{
          padding: "16px 18px 12px",
          borderBottom: "1px solid var(--border-light)",
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)" }}>
            {selectedCircuit ? `Circuito ${selectedCircuit}` : "Próximas reuniones"}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
            {selectedCircuit
              ? `${displayEvents.length} evento${displayEvents.length !== 1 ? "s" : ""} en este circuito`
              : `${upcomingEvents.length} eventos próximos`}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {displayEvents.length === 0 && pastEvents.length === 0 ? (
            <div style={{ padding: "24px 18px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              Sin reuniones en agenda
            </div>
          ) : (
            <>
              {displayEvents.map((ev) => {
                const { date, time } = fmtDateTime(ev.fechaHora);
                const isPresna = ev.tipo?.toLowerCase() === "prensa";
                const upcoming = isUpcoming(ev.fechaHora);
                return (
                  <div
                    key={ev.id}
                    style={{
                      padding: "11px 18px",
                      borderBottom: "1px solid var(--border-light)",
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      opacity: upcoming ? 1 : 0.55,
                    }}
                  >
                    {/* Date column */}
                    <div style={{
                      flexShrink: 0,
                      width: 44,
                      textAlign: "center",
                      background: upcoming
                        ? (isPresna ? "rgba(168,85,247,0.08)" : "rgba(249,115,22,0.08)")
                        : "var(--bg-base)",
                      borderRadius: 8,
                      padding: "4px 0",
                      border: `1px solid ${isPresna ? "rgba(168,85,247,0.2)" : "rgba(249,115,22,0.2)"}`,
                    }}>
                      <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1, color: isPresna ? PRENSA_COLOR : BARRIAL_COLOR }}>
                        {date.split(" ")[0]}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2, textTransform: "uppercase" }}>
                        {date.split(" ")[1] ?? ""}
                      </div>
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{
                          fontSize: 10.5, fontWeight: 700, padding: "1px 7px", borderRadius: 100,
                          background: isPresna ? "rgba(168,85,247,0.12)" : "rgba(249,115,22,0.12)",
                          color: isPresna ? PRENSA_COLOR : BARRIAL_COLOR,
                        }}>
                          {isPresna ? "PRENSA" : "BARRIAL"}
                        </span>
                        {time && (
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{time}h</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ev.lugar ?? "Sin lugar"}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 1 }}>
                        {[
                          ev.circuitoCodigo ? `Circ. ${ev.circuitoCodigo}` : null,
                          ev.barrio ?? null,
                          ev.referente ?? null,
                        ].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                  </div>
                );
              })}

              {!selectedCircuit && pastEvents.length > 0 && (
                <>
                  <div style={{ padding: "8px 18px", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", background: "var(--bg-base)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Realizados
                  </div>
                  {pastEvents.map((ev) => {
                    const { date, time } = fmtDateTime(ev.fechaHora);
                    const isPresna = ev.tipo?.toLowerCase() === "prensa";
                    return (
                      <div key={ev.id} style={{ padding: "9px 18px", borderBottom: "1px solid var(--border-light)", display: "flex", gap: 8, alignItems: "center", opacity: 0.5 }}>
                        <span style={{ fontSize: 11.5, color: "var(--text-muted)", flexShrink: 0, width: 64 }}>{date} {time}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: isPresna ? PRENSA_COLOR : BARRIAL_COLOR, flexShrink: 0 }}>
                          {isPresna ? "P" : "B"}
                        </span>
                        <span style={{ fontSize: 12, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {ev.lugar ?? "–"}
                        </span>
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
