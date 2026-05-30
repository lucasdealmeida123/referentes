import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { EventItem } from "../types";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const TIPO_COLORS: Record<string, string> = {
  prensa: "#a855f7",
  barrial: "#f97316",
  operativo: "#10b981",
};

type TipoFilter = "all" | "prensa" | "barrial" | "operativo";

interface Props {
  events: EventItem[];
  active?: boolean;
  onSelectEvent: (event: EventItem) => void;
}

function fmtShort(v: unknown): string {
  if (!v) return "";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return "";
  return `${d.toLocaleDateString("es-AR", { day: "numeric", month: "short" })} · ${d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`;
}

function tipoIcon(tipo: string) {
  const color = TIPO_COLORS[tipo.toLowerCase()] ?? TIPO_COLORS.barrial;
  return L.divIcon({
    className: "ref-agenda-map-pin",
    html: `<span style="background:${color}"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export function AgendaMeetingsMap({ events, active = true, onSelectEvent }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onSelectRef = useRef(onSelectEvent);
  onSelectRef.current = onSelectEvent;
  const [filter, setFilter] = useState<TipoFilter>("all");

  const now = Date.now();
  const visibleEvents = useMemo(
    () => events.filter((e) => {
      const tipo = e.tipo?.toLowerCase() ?? "barrial";
      if (filter !== "all" && tipo !== filter) return false;
      if (!e.fechaHora) return true;
      return new Date(e.fechaHora).getTime() >= now - 1000 * 60 * 60 * 6;
    }),
    [events, filter, now],
  );

  const pinnedEvents = useMemo(
    () => visibleEvents.filter((e) => e.lat != null && e.lng != null && !Number.isNaN(Number(e.lat)) && !Number.isNaN(Number(e.lng))),
    [visibleEvents],
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: false }).setView([-27.37, -55.9], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !layerRef.current) return;
    const layer = layerRef.current;
    layer.clearLayers();
    const bounds: [number, number][] = [];

    for (const ev of pinnedEvents) {
      const lat = Number(ev.lat);
      const lng = Number(ev.lng);
      bounds.push([lat, lng]);
      const tipo = ev.tipo?.toLowerCase() ?? "barrial";
      const marker = L.marker([lat, lng], { icon: tipoIcon(tipo) });
      marker.bindPopup(`
        <div class="ref-agenda-map-popup">
          <strong>${ev.lugar ?? ev.programa ?? "Reunión"}</strong>
          <span>${fmtShort(ev.fechaHora)}</span>
          ${ev.circuitoCodigo ? `<span>Circ. ${ev.circuitoCodigo}</span>` : ""}
        </div>
      `, { maxWidth: 220 });
      marker.on("click", () => onSelectRef.current(ev));
      marker.addTo(layer);
    }

    const map = mapRef.current;
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: pinnedEvents.length === 1 ? 15 : 14 });
    } else {
      map.setView([-27.37, -55.9], 12);
    }
    map.invalidateSize();
  }, [pinnedEvents]);

  useEffect(() => {
    if (!active || !mapRef.current || !containerRef.current) return;
    const map = mapRef.current;
    const t1 = setTimeout(() => map.invalidateSize(), 80);
    const t2 = setTimeout(() => map.invalidateSize(), 350);
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(containerRef.current);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      ro.disconnect();
    };
  }, [active]);

  const counts = useMemo(() => ({
    all: events.filter((e) => !e.fechaHora || new Date(e.fechaHora).getTime() >= now - 1000 * 60 * 60 * 6).length,
    prensa: events.filter((e) => e.tipo?.toLowerCase() === "prensa").length,
    barrial: events.filter((e) => e.tipo?.toLowerCase() === "barrial").length,
    operativo: events.filter((e) => e.tipo?.toLowerCase() === "operativo").length,
  }), [events, now]);

  return (
    <div className="ref-agenda-map-wrap">
      <div className="ref-agenda-map-filters">
        {([
          ["all", "Todos", counts.all],
          ["prensa", "Prensa", counts.prensa],
          ["barrial", "Barrial", counts.barrial],
          ["operativo", "Operativo", counts.operativo],
        ] as const).map(([id, label, n]) => (
          <button
            key={id}
            type="button"
            className={`ref-agenda-map-chip${filter === id ? " active" : ""}${id !== "all" ? ` ref-agenda-map-chip--${id}` : ""}`}
            onClick={() => setFilter(id)}
          >
            {label}
            <span>{n}</span>
          </button>
        ))}
      </div>

      <div className="ref-agenda-map-canvas-wrap">
        <div ref={containerRef} className="ref-agenda-map-canvas" />
        {pinnedEvents.length === 0 && (
          <div className="ref-agenda-map-empty">
            <p>Sin reuniones con ubicación en el mapa</p>
            <span>Agregá dirección o ubicación al cargar reuniones</span>
          </div>
        )}
      </div>

      <p className="ref-agenda-map-hint">
        {pinnedEvents.length > 0
          ? `${pinnedEvents.length} reunión${pinnedEvents.length !== 1 ? "es" : ""} geolocalizada${pinnedEvents.length !== 1 ? "s" : ""} · tocá un pin para ver detalle`
          : "Agregá dirección o pin al cargar reuniones para verlas en el mapa"}
      </p>
    </div>
  );
}
