import { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapDataset } from "../types";

const COVERAGE_COLOR = {
  critico: "#ef4444",
  parcial: "#f59e0b",
  optimo:  "#22c55e",
} as const;

const CIRCUIT_COLORS = [
  "#60a5fa", "#a78bfa", "#34d399", "#fb923c",
  "#f472b6", "#38bdf8", "#facc15", "#4ade80",
  "#c084fc", "#f97316",
];

interface Props {
  data: MapDataset | null;
  height?: string;
  showPanel?: boolean;
}

function buildSchoolPopup(school: MapDataset["schools"][number]): string {
  const { nombre, circuitoCodigo, coverage } = school;
  const total = coverage.criticas + coverage.parciales + coverage.optimas;
  const colorMap = { critico: "#ef4444", parcial: "#f59e0b", optimo: "#22c55e" };
  const statusColor = colorMap[coverage.estado as keyof typeof colorMap] ?? "#94a3b8";
  const statusLabel = { critico: "Crítico", parcial: "Parcial", optimo: "Óptimo" }[coverage.estado as keyof typeof colorMap] ?? coverage.estado;

  return `
    <div class="popup-card">
      <div class="popup-card-title">${nombre}</div>
      <div class="popup-card-row">
        <span>Circuito</span>
        <span class="popup-card-val">${circuitoCodigo ?? "s/d"}</span>
      </div>
      <div class="popup-card-row">
        <span>Estado</span>
        <span class="popup-card-val" style="color:${statusColor}">${statusLabel}</span>
      </div>
      <div class="popup-card-row">
        <span>Mesas totales</span>
        <span class="popup-card-val">${total}</span>
      </div>
      <div class="popup-card-row">
        <span>Crít / Parc / Ópt</span>
        <span class="popup-card-val">${coverage.criticas} / ${coverage.parciales} / ${coverage.optimas}</span>
      </div>
    </div>`;
}

function buildCircuitPopup(c: MapDataset["circuits"][number], color: string): string {
  return `
    <div class="popup-card">
      <div class="popup-card-title" style="color:${color}">${c.codigo} – ${c.nombre}</div>
      ${c.zona ? `<div class="popup-card-row"><span>Zona</span><span class="popup-card-val">${c.zona}</span></div>` : ""}
      ${c.electoresNacionales != null ? `<div class="popup-card-row"><span>Electores nac.</span><span class="popup-card-val">${c.electoresNacionales.toLocaleString("es-AR")}</span></div>` : ""}
      ${c.cantidadMesas != null ? `<div class="popup-card-row"><span>Mesas</span><span class="popup-card-val">${c.cantidadMesas}</span></div>` : ""}
    </div>`;
}

export function MapView({ data, height = "100%", showPanel = true }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<L.Map | null>(null);
  const circuitLayersRef = useRef<Map<string, L.Layer[]>>(new Map());
  const schoolLayersRef  = useRef<Map<string, L.Layer[]>>(new Map());
  const allLayersRef     = useRef<L.LayerGroup | null>(null);

  // Visibility state per circuit code
  const [visibleCircuits, setVisibleCircuits] = useState<Set<string>>(new Set());
  const [expandedCircuits, setExpandedCircuits] = useState<Set<string>>(new Set());

  // Grouped schools by circuit
  const schoolsByCircuit = useMemo(() => {
    if (!data) return new Map<string, NonNullable<typeof data>["schools"]>();
    const map = new Map<string, typeof data.schools>();
    for (const s of data.schools) {
      const key = s.circuitoCodigo ?? "__none__";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [data]);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    const map = L.map(containerRef.current, { zoomControl: false })
      .setView([-27.37, -55.9], 11);

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }
    ).addTo(map);

    L.control.zoom({ position: "topleft" }).addTo(map);

    allLayersRef.current = L.layerGroup().addTo(map);
    mapRef.current       = map;

    return () => {
      map.remove();
      mapRef.current        = null;
      allLayersRef.current  = null;
      circuitLayersRef.current.clear();
      schoolLayersRef.current.clear();
    };
  }, []);

  // Build layers when data changes
  useEffect(() => {
    const map    = mapRef.current;
    const layers = allLayersRef.current;
    if (!map || !layers) return;

    layers.clearLayers();
    circuitLayersRef.current.clear();
    schoolLayersRef.current.clear();

    if (!data) return;

    const bounds: L.LatLngTuple[] = [];

    // Draw circuits
    data.circuits.forEach((circuit, idx) => {
      const color  = CIRCUIT_COLORS[idx % CIRCUIT_COLORS.length];
      const coords = circuit.polygon?.coordinates?.[0];

      const cLayers: L.Layer[] = [];

      if (coords) {
        const latlngs = coords.map(([lng, lat]) => [lat, lng] as [number, number]);
        bounds.push(...latlngs);

        const poly = L.polygon(latlngs, {
          color,
          weight:      2,
          opacity:     0.8,
          fillColor:   color,
          fillOpacity: 0.1,
        }).bindPopup(buildCircuitPopup(circuit, color), { maxWidth: 260 });

        cLayers.push(poly);
      }

      circuitLayersRef.current.set(circuit.codigo, cLayers);

      // Schools for this circuit
      const schools = data.schools.filter(
        (s) => s.circuitoCodigo === circuit.codigo
      );
      const sLayers: L.Layer[] = [];

      schools.forEach((school) => {
        if (typeof school.lat !== "number" || typeof school.lng !== "number") return;
        bounds.push([school.lat, school.lng]);

        const sColor =
          COVERAGE_COLOR[school.coverage.estado as keyof typeof COVERAGE_COLOR] ?? "#94a3b8";

        const marker = L.circleMarker([school.lat, school.lng], {
          radius:      7,
          color:       "#0a0d14",
          weight:      1.5,
          fillColor:   sColor,
          fillOpacity: 0.9,
        }).bindPopup(buildSchoolPopup(school), { maxWidth: 280 });

        sLayers.push(marker);
      });

      schoolLayersRef.current.set(circuit.codigo, sLayers);
    });

    // Init all circuits visible
    const allCodes = new Set(data.circuits.map((c) => c.codigo));
    setVisibleCircuits(allCodes);

    // Add all layers
    [...circuitLayersRef.current.values(), ...schoolLayersRef.current.values()]
      .flat()
      .forEach((l) => l.addTo(layers));

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 14 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Show/hide layers when visibleCircuits changes
  useEffect(() => {
    const layers = allLayersRef.current;
    if (!layers) return;

    circuitLayersRef.current.forEach((cLayers, code) => {
      cLayers.forEach((l) => {
        if (visibleCircuits.has(code)) {
          if (!layers.hasLayer(l)) l.addTo(layers);
        } else {
          layers.removeLayer(l);
        }
      });
    });

    schoolLayersRef.current.forEach((sLayers, code) => {
      sLayers.forEach((l) => {
        if (visibleCircuits.has(code)) {
          if (!layers.hasLayer(l)) l.addTo(layers);
        } else {
          layers.removeLayer(l);
        }
      });
    });
  }, [visibleCircuits]);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => mapRef.current?.invalidateSize());
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  function toggleCircuit(code: string) {
    setVisibleCircuits((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function toggleAll(on: boolean) {
    if (!data) return;
    setVisibleCircuits(on ? new Set(data.circuits.map((c) => c.codigo)) : new Set());
  }

  function toggleExpand(code: string) {
    setExpandedCircuits((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function zoomToCircuit(code: string) {
    const map    = mapRef.current;
    const layers = allLayersRef.current;
    if (!map || !layers) return;

    const cLayers = circuitLayersRef.current.get(code) ?? [];
    const sLayers = schoolLayersRef.current.get(code) ?? [];

    const bounds: L.LatLngTuple[] = [];

    cLayers.forEach((l) => {
      if (l instanceof L.Polygon) {
        const b = (l as L.Polygon).getBounds();
        const nw = b.getNorthWest(); const se = b.getSouthEast();
        bounds.push([nw.lat, nw.lng] as L.LatLngTuple, [se.lat, se.lng] as L.LatLngTuple);
      }
    });

    sLayers.forEach((l) => {
      if (l instanceof L.CircleMarker) {
        const ll = (l as L.CircleMarker).getLatLng();
        bounds.push([ll.lat, ll.lng] as L.LatLngTuple);
      }
    });

    if (bounds.length) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
    }
  }

  const summary = data?.coverageSummary;
  const circuitCount = data?.circuits.length ?? 0;

  return (
    <div style={{ display: "flex", height, minHeight: 0, overflow: "hidden", borderRadius: "var(--radius-md)" }}>

      {/* Left panel – circuit list */}
      {showPanel && (
        <div style={{
          width: 260,
          flexShrink: 0,
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "1px 0 0 var(--border)",
        }}>
          {/* Panel header */}
          <div style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
              Circuitos
              <span style={{
                marginLeft: 7, fontSize: 11, background: "rgba(255,255,255,0.06)",
                padding: "1px 7px", borderRadius: 100, color: "var(--text-muted)",
              }}>
                {circuitCount}
              </span>
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => toggleAll(true)}
                style={{ fontSize: 11, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}
              >
                Todos
              </button>
              <span style={{ color: "var(--border)", fontSize: 11 }}>|</span>
              <button
                onClick={() => toggleAll(false)}
                style={{ fontSize: 11, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}
              >
                Ninguno
              </button>
            </div>
          </div>

          {/* Circuit list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
            {!data && (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
                Seleccioná una campaña
              </div>
            )}
            {data?.circuits.map((circuit, idx) => {
              const color     = CIRCUIT_COLORS[idx % CIRCUIT_COLORS.length];
              const isVisible = visibleCircuits.has(circuit.codigo);
              const isExpanded = expandedCircuits.has(circuit.codigo);
              const schools   = schoolsByCircuit.get(circuit.codigo) ?? [];

              return (
                <div key={circuit.codigo}>
                  {/* Circuit row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 14px",
                      cursor: "pointer",
                      background: isExpanded ? "rgba(255,255,255,0.03)" : "none",
                      transition: "background 0.15s",
                    }}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={() => toggleCircuit(circuit.codigo)}
                      style={{ accentColor: color, cursor: "pointer", flexShrink: 0 }}
                    />
                    {/* Color dot */}
                    <div style={{
                      width: 10, height: 10, borderRadius: 2,
                      background: color, flexShrink: 0, opacity: isVisible ? 1 : 0.35,
                    }} />
                    {/* Label */}
                    <span
                      onClick={() => zoomToCircuit(circuit.codigo)}
                      style={{
                        flex: 1,
                        fontSize: 12.5,
                        fontWeight: 500,
                        color: isVisible ? "var(--text-primary)" : "var(--text-muted)",
                        cursor: "pointer",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Circuito {circuit.codigo}
                      {schools.length > 0 && (
                        <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 5 }}>
                          · {schools.length} esc.
                        </span>
                      )}
                    </span>
                    {/* Expand toggle */}
                    {schools.length > 0 && (
                      <button
                        onClick={() => toggleExpand(circuit.codigo)}
                        style={{
                          background: "none", border: "none",
                          color: "var(--text-muted)", cursor: "pointer",
                          fontSize: 10, padding: 2, flexShrink: 0,
                          transform: isExpanded ? "rotate(180deg)" : "none",
                          transition: "transform 0.15s",
                        }}
                      >
                        ▾
                      </button>
                    )}
                  </div>

                  {/* Schools sub-list */}
                  {isExpanded && schools.length > 0 && (
                    <div style={{ paddingLeft: 36, paddingBottom: 4 }}>
                      {schools.map((school: NonNullable<typeof data>["schools"][number]) => {
                        const sColor =
                          COVERAGE_COLOR[school.coverage.estado as keyof typeof COVERAGE_COLOR] ?? "#94a3b8";
                        return (
                          <div
                            key={school.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 7,
                              padding: "4px 8px 4px 0",
                              borderLeft: `2px solid ${color}30`,
                              paddingLeft: 8,
                              marginBottom: 1,
                            }}
                          >
                            <div style={{
                              width: 7, height: 7,
                              borderRadius: "50%", background: sColor, flexShrink: 0,
                            }} />
                            <span style={{
                              fontSize: 11.5,
                              color: "var(--text-secondary)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}>
                              {school.nombre}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Coverage summary footer */}
          {summary && (
            <div style={{
              padding: "12px 16px",
              borderTop: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                Cobertura global
              </span>
              {/* Mini bar */}
              <div style={{ height: 6, borderRadius: 3, background: "var(--bg-input)", overflow: "hidden", display: "flex" }}>
                {summary.mesasTotales > 0 && (
                  <>
                    <div style={{ width: `${(summary.criticas  / summary.mesasTotales) * 100}%`, background: "var(--status-critical)" }} />
                    <div style={{ width: `${(summary.parciales / summary.mesasTotales) * 100}%`, background: "var(--status-partial)" }} />
                    <div style={{ width: `${(summary.optimas   / summary.mesasTotales) * 100}%`, background: "var(--status-optimal)" }} />
                  </>
                )}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-secondary)" }}>
                <span style={{ color: "var(--status-critical)" }}>● {summary.criticas}</span>
                <span style={{ color: "var(--status-partial)"  }}>● {summary.parciales}</span>
                <span style={{ color: "var(--status-optimal)"  }}>● {summary.optimas}</span>
                <span style={{ color: "var(--text-muted)" }}>{summary.mesasTotales} total</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Map */}
      <div style={{ flex: 1, position: "relative" }}>
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

        {/* Legend */}
        <div className="map-legend">
          <div className="map-legend-title">Cobertura</div>
          <div className="map-legend-item">
            <div className="map-legend-dot" style={{ background: "#ef4444" }} />
            Crítica
          </div>
          <div className="map-legend-item">
            <div className="map-legend-dot" style={{ background: "#f59e0b" }} />
            Parcial
          </div>
          <div className="map-legend-item">
            <div className="map-legend-dot" style={{ background: "#22c55e" }} />
            Óptima
          </div>
        </div>
      </div>
    </div>
  );
}
