import { useEffect, useState } from "react";
import { api } from "../api";
import { MapView } from "../components/MapView";
import type { MapDataset } from "../types";

interface Props {
  campaignId: string;
}

export function MapPage({ campaignId }: Props) {
  const [data, setData]           = useState<MapDataset | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [coverageFilter, setCoverageFilter] = useState("");

  function load(covFilter?: string) {
    if (!campaignId) return;
    setLoading(true);
    setError(null);
    api.map
      .dataset({ campaignId, coverageStatus: covFilter ?? coverageFilter })
      .then(setData)
      .catch(() => setError("No se pudo cargar el dataset del mapa."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (campaignId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  function applyFilter(val: string) {
    setCoverageFilter(val);
    load(val);
  }

  if (!campaignId) {
    return (
      <div className="loading-overlay">
        Seleccioná una campaña para ver el mapa.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, overflow: "hidden" }}>

      {/* Sub-toolbar */}
      <div className="filters-bar">
        <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>
          Filtrar escuelas por cobertura:
        </span>
        {["", "critico", "parcial", "optimo"].map((val) => (
          <button
            key={val}
            className={`chip${coverageFilter === val ? " active" : ""}`}
            onClick={() => applyFilter(val)}
          >
            {val === "" ? "Todas" : val === "critico" ? "Críticas" : val === "parcial" ? "Parciales" : "Óptimas"}
          </button>
        ))}
        <div className="spacer" />
        {loading && <div className="spinner" />}
        {error && <span className="error-banner" style={{ padding: "4px 10px" }}>⚠ {error}</span>}
      </div>

      {/* Full map */}
      <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
        <MapView
          data={data}
          height="100%"
          showPanel
        />
      </div>
    </div>
  );
}
