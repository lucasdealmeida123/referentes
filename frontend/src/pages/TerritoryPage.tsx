import { type FormEvent, useEffect, useRef, useState } from "react";
import { api } from "../api";
import { DataTable, type Column } from "../components/DataTable";
import type { Circuit, School, ElectionTable } from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { TerritoryAssignmentMap } from "../components/TerritoryAssignmentMap";

interface Props {
  campaignId: string;
}

type Tab = "circuits" | "schools" | "tables";

const CIRCUIT_COLS: Column<Circuit>[] = [
  { key: "codigo",              label: "Código",    sortable: true, width: "90px" },
  { key: "nombre",              label: "Nombre",    sortable: true },
  { key: "zona",                label: "Zona",      sortable: true },
  {
    key: "electoresNacionales",
    label: "Electores Nac.",
    sortable: true,
    render: (v) => v != null ? Number(v).toLocaleString("es-AR") : "–",
  },
  {
    key: "cantidadEscuelas",
    label: "Escuelas",
    sortable: true,
    width: "90px",
  },
  {
    key: "cantidadMesas",
    label: "Mesas",
    sortable: true,
    width: "80px",
  },
];

const SCHOOL_COLS: Column<School>[] = [
  { key: "nombre",    label: "Escuela",   sortable: true },
  { key: "direccion", label: "Dirección" },
  {
    key: "lat",
    label: "Coordenadas",
    render: (_, row) =>
      row.lat != null && row.lng != null
        ? `${Number(row.lat).toFixed(5)}, ${Number(row.lng).toFixed(5)}`
        : <span style={{ color: "var(--text-muted)" }}>Sin geo</span>,
  },
  {
    key: "cantMesasDeclaradas",
    label: "Mesas decl.",
    sortable: true,
    width: "100px",
  },
];

const TABLE_COLS: Column<ElectionTable>[] = [
  { key: "numero", label: "N°",    sortable: true, width: "70px" },
  { key: "tipo",   label: "Tipo",  sortable: true, width: "100px" },
  {
    key: "estadoCobertura",
    label: "Cobertura",
    sortable: true,
    render: (v) => v ? <StatusBadge status={String(v)} /> : <StatusBadge status="critico" label="Sin asignar" />,
    width: "130px",
  },
];

export function TerritoryPage({ campaignId }: Props) {
  const [tab, setTab]             = useState<Tab>("circuits");
  const [circuits, setCircuits]   = useState<Circuit[]>([]);
  const [schools, setSchools]     = useState<School[]>([]);
  const [tables, setTables]       = useState<ElectionTable[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [editCircuitId, setEditCircuitId] = useState<string | null>(null);
  const [editSchoolId, setEditSchoolId] = useState<string | null>(null);
  const [importingKmz, setImportingKmz] = useState(false);
  const [importKmzMsg, setImportKmzMsg] = useState<string | null>(null);
  const kmzRef = useRef<HTMLInputElement>(null);

  const [circuitForm, setCircuitForm] = useState({
    codigo: "",
    nombre: "",
    zona: "",
    cantidadEscuelas: "0",
    cantidadMesas: "0"
  });
  const [schoolForm, setSchoolForm] = useState({
    circuitId: "",
    nombre: "",
    direccion: "",
    lat: "",
    lng: "",
    cantMesasDeclaradas: "0"
  });

  function reload() {
    if (!campaignId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      api.territory.circuits(campaignId),
      api.territory.schools(campaignId),
      api.territory.tables(campaignId),
    ])
      .then(([c, s, t]) => {
        setCircuits(c);
        setSchools(s);
        setTables(t);
      })
      .catch(() => setError("No se pudo cargar el territorio."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  useEffect(() => {
    if (!schoolForm.circuitId && circuits.length > 0) {
      setSchoolForm((prev) => ({ ...prev, circuitId: circuits[0].id }));
    }
  }, [circuits, schoolForm.circuitId]);

  async function submitCircuit(e: FormEvent) {
    e.preventDefault();
    if (!campaignId) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        campaignId,
        codigo: circuitForm.codigo.trim(),
        nombre: circuitForm.nombre.trim(),
        zona: circuitForm.zona.trim() || null,
        cantidadEscuelas: Number(circuitForm.cantidadEscuelas || 0),
        cantidadMesas: Number(circuitForm.cantidadMesas || 0)
      };
      if (editCircuitId) await api.territory.updateCircuit(editCircuitId, payload);
      else await api.territory.createCircuit(payload);
      setEditCircuitId(null);
      setCircuitForm({ codigo: "", nombre: "", zona: "", cantidadEscuelas: "0", cantidadMesas: "0" });
      reload();
    } catch {
      setError("No se pudo guardar el circuito.");
    } finally {
      setSaving(false);
    }
  }

  async function onImportKmz(file: File) {
    if (!campaignId) return;
    setImportingKmz(true);
    setImportKmzMsg(null);
    setError(null);
    try {
      const preview = await api.territory.previewKmz(file);
      if (!preview.circuits?.length) {
        setError("El archivo no contiene polígonos de circuitos.");
        return;
      }
      const result = await api.territory.commitKmz(campaignId, file);
      const s = result.summary;
      setImportKmzMsg(
        `Circuitos: ${s.circuitsCreated} nuevos, ${s.circuitsUpdated} actualizados · Escuelas: ${s.schoolsCreated}+${s.schoolsUpdated}`
      );
      reload();
    } catch {
      setError("No se pudo importar el KMZ/KML de circuitos.");
    } finally {
      setImportingKmz(false);
      if (kmzRef.current) kmzRef.current.value = "";
    }
  }

  async function submitSchool(e: FormEvent) {
    e.preventDefault();
    if (!campaignId) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        campaignId,
        circuitId: schoolForm.circuitId,
        nombre: schoolForm.nombre.trim(),
        direccion: schoolForm.direccion.trim() || null,
        lat: schoolForm.lat ? Number(schoolForm.lat) : null,
        lng: schoolForm.lng ? Number(schoolForm.lng) : null,
        cantMesasDeclaradas: Number(schoolForm.cantMesasDeclaradas || 0)
      };
      if (editSchoolId) await api.territory.updateSchool(editSchoolId, payload);
      else await api.territory.createSchool(payload);
      setEditSchoolId(null);
      setSchoolForm((prev) => ({
        ...prev,
        nombre: "",
        direccion: "",
        lat: "",
        lng: "",
        cantMesasDeclaradas: "0"
      }));
      reload();
    } catch {
      setError("No se pudo guardar la escuela.");
    } finally {
      setSaving(false);
    }
  }

  const circuitCols: Column<Circuit>[] = [
    ...CIRCUIT_COLS,
    {
      key: "id",
      label: "Acciones",
      width: "110px",
      render: (_, row) => (
        <button
          className="btn btn-secondary"
          style={{ padding: "5px 10px", fontSize: 12 }}
          onClick={() => {
            setEditCircuitId(row.id);
            setCircuitForm({
              codigo: row.codigo,
              nombre: row.nombre,
              zona: row.zona ?? "",
              cantidadEscuelas: String(row.cantidadEscuelas ?? 0),
              cantidadMesas: String(row.cantidadMesas ?? 0)
            });
            setTab("circuits");
          }}
        >
          Editar
        </button>
      )
    }
  ];

  const schoolCols: Column<School>[] = [
    ...SCHOOL_COLS,
    {
      key: "id",
      label: "Acciones",
      width: "110px",
      render: (_, row) => (
        <button
          className="btn btn-secondary"
          style={{ padding: "5px 10px", fontSize: 12 }}
          onClick={() => {
            setEditSchoolId(row.id);
            setSchoolForm({
              circuitId: row.circuitId ?? (circuits[0]?.id ?? ""),
              nombre: row.nombre,
              direccion: row.direccion ?? "",
              lat: row.lat != null ? String(row.lat) : "",
              lng: row.lng != null ? String(row.lng) : "",
              cantMesasDeclaradas: String(row.cantMesasDeclaradas ?? 0)
            });
            setTab("schools");
          }}
        >
          Editar
        </button>
      )
    }
  ];

  if (!campaignId) {
    return <div className="loading-overlay">Seleccioná una campaña.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* Tabs */}
      <div className="tab-bar">
        {([
          ["circuits", "Circuitos",  circuits.length],
          ["schools",  "Escuelas",   schools.length],
          ["tables",   "Mesas",      tables.length],
        ] as [Tab, string, number][]).map(([id, label, count]) => (
          <button
            key={id}
            className={`tab-item${tab === id ? " active" : ""}`}
            onClick={() => setTab(id)}
          >
            {label}
            <span className="tab-badge">{count}</span>
          </button>
        ))}
        <div className="spacer" />
        {loading && <div className="spinner" style={{ marginRight: 16, marginTop: 14 }} />}
      </div>

      <div className="page-body" style={{ flex: 1, overflow: "auto" }}>
        {error && <div className="error-banner mb-4">{error}</div>}
        {importKmzMsg && <div className="success-banner mb-4">{importKmzMsg}</div>}

        <div className="section-card mb-4">
          <div className="section-card-header">
            <span className="section-card-title">Polígonos oficiales de circuitos</span>
          </div>
          <div className="section-card-body" style={{ display: "grid", gap: 10 }}>
            <p className="text-sm text-muted">
              Importá el mapa de referencia (Google My Maps o PDF electoral) exportado como{" "}
              <strong>.kmz</strong> o <strong>.kml</strong>. Esto restaura los límites detallados por circuito.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input
                ref={kmzRef}
                type="file"
                accept=".kmz,.kml"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onImportKmz(f);
                }}
              />
              <button
                type="button"
                className="btn btn-primary"
                disabled={importingKmz}
                onClick={() => kmzRef.current?.click()}
              >
                {importingKmz ? "Importando..." : "Importar KMZ de circuitos"}
              </button>
              <a
                className="btn btn-secondary"
                href="https://www.google.com/maps/d/u/0/viewer?mid=1XgwiO1bp1DtGKgmwhEiJ2ET8W_Wn3C4"
                target="_blank"
                rel="noreferrer"
              >
                Abrir mapa de referencia
              </a>
            </div>
          </div>
        </div>

        <TerritoryAssignmentMap
          circuits={circuits}
          schools={schools}
          onAssign={async (schoolId, circuitId) => {
            await api.territory.updateSchool(schoolId, { campaignId, circuitId });
            reload();
          }}
        />

        {tab === "circuits" && (
          <>
            <form className="section-card mb-4" onSubmit={submitCircuit}>
              <div className="section-card-header">
                <span className="section-card-title">{editCircuitId ? "Editar circuito" : "Nuevo circuito"}</span>
              </div>
              <div className="section-card-body" style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(120px,1fr))", gap: 10 }}>
                <input className="search-input" placeholder="Código" value={circuitForm.codigo} onChange={(e) => setCircuitForm((p) => ({ ...p, codigo: e.target.value }))} required />
                <input className="search-input" placeholder="Nombre" value={circuitForm.nombre} onChange={(e) => setCircuitForm((p) => ({ ...p, nombre: e.target.value }))} required />
                <input className="search-input" placeholder="Zona" value={circuitForm.zona} onChange={(e) => setCircuitForm((p) => ({ ...p, zona: e.target.value }))} />
                <input className="search-input" type="number" placeholder="Escuelas" value={circuitForm.cantidadEscuelas} onChange={(e) => setCircuitForm((p) => ({ ...p, cantidadEscuelas: e.target.value }))} />
                <input className="search-input" type="number" placeholder="Mesas" value={circuitForm.cantidadMesas} onChange={(e) => setCircuitForm((p) => ({ ...p, cantidadMesas: e.target.value }))} />
                <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8 }}>
                  <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? "Guardando..." : (editCircuitId ? "Actualizar circuito" : "Crear circuito")}</button>
                  {editCircuitId && <button className="btn btn-secondary" type="button" onClick={() => { setEditCircuitId(null); setCircuitForm({ codigo: "", nombre: "", zona: "", cantidadEscuelas: "0", cantidadMesas: "0" }); }}>Cancelar</button>}
                </div>
              </div>
            </form>
            <DataTable
            columns={circuitCols}
            data={circuits}
            rowKey={(r) => String(r.id)}
            searchable
            searchKeys={["codigo", "nombre", "zona"]}
          />
          </>
        )}

        {tab === "schools" && (
          <>
            <form className="section-card mb-4" onSubmit={submitSchool}>
              <div className="section-card-header">
                <span className="section-card-title">{editSchoolId ? "Editar escuela" : "Nueva escuela"}</span>
              </div>
              <div className="section-card-body" style={{ display: "grid", gridTemplateColumns: "repeat(6,minmax(120px,1fr))", gap: 10 }}>
                <select className="filter-select" value={schoolForm.circuitId} onChange={(e) => setSchoolForm((p) => ({ ...p, circuitId: e.target.value }))} required>
                  {circuits.map((c) => <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>)}
                </select>
                <input className="search-input" placeholder="Nombre" value={schoolForm.nombre} onChange={(e) => setSchoolForm((p) => ({ ...p, nombre: e.target.value }))} required />
                <input className="search-input" placeholder="Dirección" value={schoolForm.direccion} onChange={(e) => setSchoolForm((p) => ({ ...p, direccion: e.target.value }))} />
                <input className="search-input" type="number" step="0.00001" placeholder="Lat" value={schoolForm.lat} onChange={(e) => setSchoolForm((p) => ({ ...p, lat: e.target.value }))} />
                <input className="search-input" type="number" step="0.00001" placeholder="Lng" value={schoolForm.lng} onChange={(e) => setSchoolForm((p) => ({ ...p, lng: e.target.value }))} />
                <input className="search-input" type="number" placeholder="Mesas declaradas" value={schoolForm.cantMesasDeclaradas} onChange={(e) => setSchoolForm((p) => ({ ...p, cantMesasDeclaradas: e.target.value }))} />
                <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8 }}>
                  <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? "Guardando..." : (editSchoolId ? "Actualizar escuela" : "Crear escuela")}</button>
                  {editSchoolId && <button className="btn btn-secondary" type="button" onClick={() => { setEditSchoolId(null); setSchoolForm((prev) => ({ ...prev, nombre: "", direccion: "", lat: "", lng: "", cantMesasDeclaradas: "0" })); }}>Cancelar</button>}
                </div>
              </div>
            </form>
            <DataTable
            columns={schoolCols}
            data={schools}
            rowKey={(r) => String(r.id)}
            searchable
            searchKeys={["nombre", "direccion"]}
          />
          </>
        )}

        {tab === "tables" && (
          <DataTable
            columns={TABLE_COLS}
            data={tables}
            rowKey={(r) => String(r.id)}
            searchable
            searchKeys={["numero", "tipo"]}
          />
        )}
      </div>
    </div>
  );
}
