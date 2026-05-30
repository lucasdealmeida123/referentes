/**
 * Mapa de circuitos con polígonos.
 * Soporta dos modos de color:
 *  "circuit"  — cada circuito tiene un color fijo distinto (default)
 *  "density"  — circuitos coloreados según densidad de referentes (azul claro → oscuro)
 */
import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapDataset, Referent } from "../types";

const CIRCUIT_COLORS = [
  "#2563eb", "#7c3aed", "#059669", "#ea580c",
  "#db2777", "#0891b2", "#ca8a04", "#16a34a",
  "#9333ea", "#dc2626", "#4f46e5", "#0d9488",
  "#c2410c", "#be185d", "#1d4ed8",
];

const DENSITY_STEPS = [
  { min: 0,  max: 0,   fill: "#f1f5f9", border: "#cbd5e1", fillOpacity: 0.30, weight: 1.4, label: "0" },
  { min: 1,  max: 4,   fill: "#bfdbfe", border: "#60a5fa", fillOpacity: 0.55, weight: 1.8, label: "1–4" },
  { min: 5,  max: 9,   fill: "#60a5fa", border: "#2563eb", fillOpacity: 0.65, weight: 2.0, label: "5–9" },
  { min: 10, max: 19,  fill: "#2563eb", border: "#1d4ed8", fillOpacity: 0.75, weight: 2.4, label: "10–19" },
  { min: 20, max: Infinity, fill: "#1e3a8a", border: "#0f172a", fillOpacity: 0.85, weight: 3.0, label: "20+" },
];

function getDensityStep(count: number) {
  return DENSITY_STEPS.find((s) => count >= s.min && count <= s.max) ?? DENSITY_STEPS[0];
}

export type CircuitColorMode = "circuit" | "density";

interface Props {
  mapData: MapDataset | null;
  referents?: Referent[];
  selectedCircuit: string | null;
  onCircuitSelect: (codigo: string | null) => void;
  height?: number;
  visible?: boolean;
  colorMode?: CircuitColorMode;
  showLegend?: boolean;
}

export function CircuitPolygonsMap({
  mapData,
  referents = [],
  selectedCircuit,
  onCircuitSelect,
  height,
  visible = true,
  colorMode = "circuit",
  showLegend = false,
}: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const didFitRef = useRef(false);

  const countByCircuit = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of referents) {
      const k = r.circuitoCodigo?.trim().toUpperCase();
      if (!k) continue;
      map[k] = (map[k] ?? 0) + 1;
    }
    return map;
  }, [referents]);

  const referentsByCircuit = useMemo(() => {
    const m: Record<string, Referent[]> = {};
    for (const r of referents) {
      const k = r.circuitoCodigo?.trim().toUpperCase();
      if (!k) continue;
      if (!m[k]) m[k] = [];
      m[k].push(r);
    }
    return m;
  }, [referents]);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: false }).setView([-27.367, -55.896], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      didFitRef.current = false;
    };
  }, []);

  // Draw polygons
  useEffect(() => {
    if (!mapRef.current || !layerRef.current || !mapData) return;
    const layer = layerRef.current;
    layer.clearLayers();
    const bounds: L.LatLngTuple[] = [];

    mapData.circuits.forEach((circuit, idx) => {
      const coords = circuit.polygon?.coordinates?.[0];
      if (!coords?.length) return;

      const latlngs = coords.map(([lng, lat]) => [lat, lng] as L.LatLngTuple);
      bounds.push(...latlngs);

      const code = circuit.codigo.toUpperCase();
      const isSelected = selectedCircuit?.toUpperCase() === code;
      const refCount = countByCircuit[code] ?? 0;
      const names = (referentsByCircuit[code] ?? [])
        .slice(0, 5)
        .map((r) => r.nombreApellido)
        .join("<br/>");

      let fillColor: string;
      let borderColor: string;
      let fillOpacity: number;
      let weight: number;

      if (colorMode === "density") {
        const step = getDensityStep(refCount);
        fillColor = step.fill;
        borderColor = step.border;
        fillOpacity = isSelected ? Math.min(step.fillOpacity + 0.15, 1) : step.fillOpacity;
        weight = isSelected ? step.weight + 1 : step.weight;
      } else {
        const color = CIRCUIT_COLORS[idx % CIRCUIT_COLORS.length];
        fillColor = color;
        borderColor = isSelected ? "#0f172a" : color;
        fillOpacity = isSelected ? 0.22 : 0.12;
        weight = isSelected ? 3.2 : 2.2;
      }

      const poly = L.polygon(latlngs, {
        color: isSelected ? "#0f172a" : borderColor,
        weight,
        opacity: 0.95,
        fillColor,
        fillOpacity,
      });

      const displayColor = colorMode === "density" ? borderColor : CIRCUIT_COLORS[idx % CIRCUIT_COLORS.length];
      poly.bindPopup(
        `<div style="font-family:system-ui,sans-serif;min-width:200px">
          <div style="font-weight:700;font-size:14px;color:${displayColor}">${circuit.codigo} · ${circuit.nombre ?? ""}</div>
          ${circuit.zona ? `<div style="font-size:12px;color:#64748b">${circuit.zona}</div>` : ""}
          <div style="margin-top:8px;font-size:13px;font-weight:600">${refCount} referente${refCount !== 1 ? "s" : ""}</div>
          ${names ? `<div style="margin-top:6px;font-size:12px;line-height:1.45;color:#334155">${names}${refCount > 5 ? `<br/><span style="color:#94a3b8">+${refCount - 5} más</span>` : ""}</div>` : ""}
        </div>`,
        { maxWidth: 300 }
      );

      poly.on("click", (ev) => {
        L.DomEvent.stopPropagation(ev);
        onCircuitSelect(isSelected ? null : circuit.codigo);
      });

      poly.addTo(layer);
    });

    if (bounds.length && !didFitRef.current) {
      mapRef.current.fitBounds(bounds, { padding: [28, 28], maxZoom: 14 });
      didFitRef.current = true;
    }
    mapRef.current.invalidateSize();
  }, [mapData, selectedCircuit, countByCircuit, referentsByCircuit, onCircuitSelect, colorMode]);

  // ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => mapRef.current?.invalidateSize());
    ro.observe(containerRef.current);
    const t = setTimeout(() => mapRef.current?.invalidateSize(), 100);
    return () => { ro.disconnect(); clearTimeout(t); };
  }, [height]);

  // Visibility change (tabs)
  useEffect(() => {
    if (!visible || !mapRef.current) return;
    const t1 = setTimeout(() => mapRef.current?.invalidateSize(), 50);
    const t2 = setTimeout(() => mapRef.current?.invalidateSize(), 280);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [visible]);

  if (!mapData?.circuits?.length) {
    return (
      <div className="ref-dash-map-empty">
        <p>No hay polígonos de circuitos cargados.</p>
        <span>Verificá la campaña o importá el territorio.</span>
      </div>
    );
  }

  return (
    <div
      className={`ref-dash-map-wrap${height == null ? " ref-dash-map-wrap--fluid" : ""}`}
      style={height != null ? { height } : undefined}
    >
      <div ref={containerRef} className="ref-dash-map-canvas" />

      {/* Density legend */}
      {showLegend && colorMode === "density" && (
        <div className="ref-density-legend">
          <div className="ref-density-legend-title">Referentes</div>
          {DENSITY_STEPS.map((s) => (
            <div key={s.label} className="ref-density-legend-row">
              <span
                className="ref-density-legend-dot"
                style={{ background: s.fill, borderColor: s.border }}
              />
              <span className="ref-density-legend-label">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Selected circuit badge (circuit mode) */}
      {colorMode === "circuit" && selectedCircuit && (
        <div className="ref-dash-map-badge">
          Circuito {selectedCircuit} · {countByCircuit[selectedCircuit.toUpperCase()] ?? 0} referentes
          <button type="button" onClick={() => onCircuitSelect(null)} aria-label="Quitar filtro">
            ×
          </button>
        </div>
      )}

      {colorMode === "circuit" && (
        <div className="ref-dash-map-hint">Clic en el polígono del circuito (límites oficiales)</div>
      )}
    </div>
  );
}
