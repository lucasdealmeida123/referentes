import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Circuit, School } from "../types";

interface Props {
  circuits: Circuit[];
  schools: School[];
  onAssign: (schoolId: string, circuitId: string) => Promise<void>;
}

function parsePolygon(raw?: string | null): L.LatLngTuple[] {
  if (!raw) return [];
  return raw
    .trim()
    .split(/\s+/)
    .map((chunk) => chunk.split(","))
    .filter((parts) => parts.length >= 2)
    .map((parts) => [Number(parts[1]), Number(parts[0])] as L.LatLngTuple)
    .filter(([lat, lng]) => !Number.isNaN(lat) && !Number.isNaN(lng));
}

export function TerritoryAssignmentMap({ circuits, schools, onAssign }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedCircuitId, setSelectedCircuitId] = useState<string>("");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [schoolQuery, setSchoolQuery] = useState("");
  const [onlyUnassigned, setOnlyUnassigned] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedCircuit = useMemo(
    () => circuits.find((c) => c.id === selectedCircuitId) ?? null,
    [circuits, selectedCircuitId]
  );
  const selectedSchool = useMemo(
    () => schools.find((s) => s.id === selectedSchoolId) ?? null,
    [schools, selectedSchoolId]
  );
  const currentSchoolCircuit = useMemo(
    () => circuits.find((c) => c.id === selectedSchool?.circuitId) ?? null,
    [circuits, selectedSchool?.circuitId]
  );
  const filteredSchools = useMemo(() => {
    const q = schoolQuery.trim().toLowerCase();
    return schools
      .filter((school) => {
        if (onlyUnassigned && school.circuitId) return false;
        if (!q) return true;
        const haystack = `${school.nombre} ${school.direccion ?? ""}`.toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .slice(0, 120);
  }, [schools, schoolQuery, onlyUnassigned]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current).setView([-27.37, -55.9], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
  }, []);

  useEffect(() => {
    if (!mapRef.current || !layerRef.current) return;
    const layer = layerRef.current;
    layer.clearLayers();
    const bounds: L.LatLngTuple[] = [];

    circuits.forEach((circuit) => {
      const coords = parsePolygon(circuit.polygonCoordinates as string | null | undefined);
      if (!coords.length) return;
      bounds.push(...coords);
      const selected = circuit.id === selectedCircuitId;
      L.polygon(coords, {
        color: selected ? "#2563eb" : "#94a3b8",
        weight: selected ? 3 : 2,
        fillOpacity: selected ? 0.24 : 0.06
      })
        .bindPopup(`<strong>${circuit.codigo}</strong> - ${circuit.nombre}`)
        .on("click", () => setSelectedCircuitId(circuit.id))
        .addTo(layer);
    });

    schools.forEach((school) => {
      if (typeof school.lat !== "number" || typeof school.lng !== "number") return;
      bounds.push([school.lat, school.lng]);
      const selected = school.id === selectedSchoolId;
      L.circleMarker([school.lat, school.lng], {
        radius: selected ? 8 : 5.5,
        color: selected ? "#0f172a" : "#334155",
        fillColor: selected ? "#f97316" : school.circuitId ? "#22c55e" : "#94a3b8",
        fillOpacity: selected ? 0.95 : 0.85
      })
        .bindPopup(`<strong>${school.nombre}</strong><br/>Circuito actual: ${school.circuitId ?? "s/d"}`)
        .on("click", () => setSelectedSchoolId(school.id))
        .addTo(layer);
    });

    if (selectedCircuit) {
      const coords = parsePolygon(selectedCircuit.polygonCoordinates as string | null | undefined);
      if (coords.length > 0) {
        mapRef.current.fitBounds(coords, { padding: [36, 36] });
        return;
      }
    }

    if (selectedSchool?.lat != null && selectedSchool?.lng != null) {
      mapRef.current.setView([selectedSchool.lat, selectedSchool.lng], 15);
      return;
    }

    if (bounds.length > 0) {
      mapRef.current.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [circuits, schools, selectedCircuitId, selectedSchoolId, selectedCircuit, selectedSchool]);

  async function handleAssign() {
    if (!selectedCircuitId || !selectedSchoolId) return;
    setSaving(true);
    try {
      await onAssign(selectedSchoolId, selectedCircuitId);
      setSelectedSchoolId("");
    } finally {
      setSaving(false);
    }
  }

  function renderStepState(isDone: boolean, text: string) {
    return (
      <span className={`territory-step ${isDone ? "done" : ""}`}>
        {isDone ? "OK" : "1"}
        {" "}
        {text}
      </span>
    );
  }

  return (
    <div className="section-card mb-4">
      <div className="section-card-header">
        <span className="section-card-title">Asignar escuelas a circuitos</span>
        <span className="section-card-count">{schools.length} escuelas</span>
      </div>
      <div className="section-card-body territory-assign-grid">
        <div className="territory-assign-panel">
          <div className="territory-assign-steps">
            {renderStepState(Boolean(selectedCircuit), "Elegir circuito")}
            {renderStepState(Boolean(selectedSchool), "Elegir escuela")}
          </div>

          <label className="text-xs text-muted">Circuito destino</label>
          <select
            className="filter-select"
            value={selectedCircuitId}
            onChange={(e) => setSelectedCircuitId(e.target.value)}
          >
            <option value="">Seleccionar circuito</option>
            {circuits.map((circuit) => (
              <option key={circuit.id} value={circuit.id}>
                {circuit.codigo} - {circuit.nombre}
              </option>
            ))}
          </select>

          <label className="text-xs text-muted">Buscar escuela</label>
          <input
            className="search-input"
            placeholder="Nombre o dirección"
            value={schoolQuery}
            onChange={(e) => setSchoolQuery(e.target.value)}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
            <input
              type="checkbox"
              checked={onlyUnassigned}
              onChange={(e) => setOnlyUnassigned(e.target.checked)}
            />
            Mostrar solo escuelas sin circuito
          </label>

          <div className="territory-school-list">
            {filteredSchools.map((school) => {
              const selected = school.id === selectedSchoolId;
              return (
                <button
                  type="button"
                  key={school.id}
                  className={`territory-school-item ${selected ? "active" : ""}`}
                  onClick={() => setSelectedSchoolId(school.id)}
                >
                  <strong>{school.nombre}</strong>
                  <span>{school.direccion ?? "Sin dirección"}</span>
                  <em>{school.circuitId ? `Asignada: ${school.circuitId}` : "Sin circuito"}</em>
                </button>
              );
            })}
            {filteredSchools.length === 0 && (
              <div className="text-sm text-muted" style={{ padding: 8 }}>No hay escuelas para ese filtro.</div>
            )}
          </div>

          <div className="territory-summary-box">
            <div><strong>Circuito destino:</strong> {selectedCircuit ? `${selectedCircuit.codigo} - ${selectedCircuit.nombre}` : "No seleccionado"}</div>
            <div><strong>Escuela:</strong> {selectedSchool ? selectedSchool.nombre : "No seleccionada"}</div>
            <div><strong>Circuito actual:</strong> {currentSchoolCircuit ? `${currentSchoolCircuit.codigo} - ${currentSchoolCircuit.nombre}` : "Sin asignar"}</div>
          </div>

          <button className="btn btn-primary" disabled={!selectedCircuitId || !selectedSchoolId || saving} onClick={handleAssign}>
            {saving ? "Guardando asignación..." : "Confirmar asignación"}
          </button>
        </div>
        <div className="map-canvas" ref={containerRef} style={{ height: 460 }} />
      </div>
    </div>
  );
}
