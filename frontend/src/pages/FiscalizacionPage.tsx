import { type FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { Modal } from "../components/Modal";
import { DataTable, type Column } from "../components/DataTable";
import { StatusBadge } from "../components/StatusBadge";
import { CoverageBar } from "../components/CoverageBar";
import { KpiCard } from "../components/KpiCard";
import type { Assignment, CoverageDashboard, CoverageItem, Person, Role } from "../types";

interface Props { campaignId: string; }
type Tab = "coverage" | "gaps" | "people" | "roles" | "assignments";

export function FiscalizacionPage({ campaignId }: Props) {
  const [tab, setTab] = useState<Tab>("coverage");
  const [people, setPeople] = useState<Person[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [coverageRows, setCoverageRows] = useState<CoverageItem[]>([]);
  const [coverage, setCoverage] = useState<CoverageDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [circuitFilter, setCircuitFilter] = useState("");
  const [editPersonId, setEditPersonId] = useState<string | null>(null);
  const [editRoleId, setEditRoleId] = useState<string | null>(null);
  const [editAssignmentId, setEditAssignmentId] = useState<string | null>(null);
  const [personModalOpen, setPersonModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);

  const [personForm, setPersonForm] = useState({ dni: "", nombre: "", apellido: "", telefono: "" });
  const [roleForm, setRoleForm] = useState({ codigo: "", nombre: "", nivel: "mesa" });
  const [assignmentForm, setAssignmentForm] = useState({
    personId: "", roleId: "", estado: "activo", circuitId: "", schoolId: "", tableId: ""
  });

  function reload() {
    if (!campaignId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      api.fiscalization.people(campaignId),
      api.fiscalization.roles(campaignId),
      api.fiscalization.assignments(campaignId),
      api.fiscalization.coverage(campaignId),
      api.fiscalization.coverageDashboard(campaignId)
    ]).then(([p, r, a, cov, dash]) => {
      setPeople(Array.isArray(p) ? p : []);
      setRoles(Array.isArray(r) ? r : []);
      setAssignments(Array.isArray(a) ? a : []);
      const normalizedCoverage = Array.isArray(cov)
        ? cov
        : Array.isArray((cov as { tables?: unknown[] })?.tables)
          ? (cov as { tables: Array<Record<string, unknown>> }).tables.map((row) => ({
            tableId: String(row.tableId ?? ""),
            tableNumero: Number(row.mesaNumero ?? 0),
            schoolId: String(row.schoolId ?? ""),
            schoolNombre: String(row.schoolNombre ?? ""),
            circuitCodigo: String(row.circuito ?? ""),
            estado: (String(row.estado ?? "critico") as "critico" | "parcial" | "optimo"),
            titular: row.titulares ? String(row.titulares) : null,
            suplente: row.suplentes ? String(row.suplentes) : null
          }))
          : [];
      setCoverageRows(normalizedCoverage);
      setCoverage(dash);
    }).catch(() => setError("No se pudo cargar fiscalización.")).finally(() => setLoading(false));
  }

  useEffect(() => { reload(); }, [campaignId]);

  useEffect(() => {
    if (!assignmentForm.personId && people[0]) setAssignmentForm((p) => ({ ...p, personId: people[0].id }));
    if (!assignmentForm.roleId && roles[0]) setAssignmentForm((p) => ({ ...p, roleId: roles[0].id }));
  }, [people, roles, assignmentForm.personId, assignmentForm.roleId]);

  const safeCoverageRows = Array.isArray(coverageRows) ? coverageRows : [];
  const summary = coverage?.resumen;
  const circuitOptions = useMemo(
    () => Array.from(new Set(safeCoverageRows.map((r) => r.circuitCodigo).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [safeCoverageRows]
  );
  const criticalQueue = useMemo(
    () => safeCoverageRows.filter((r) => r.estado !== "optimo" && (!circuitFilter || r.circuitCodigo === circuitFilter)),
    [safeCoverageRows, circuitFilter]
  );

  async function submitPerson(e: FormEvent) {
    e.preventDefault();
    if (!campaignId) return;
    setSaving(true); setError(null);
    try {
      const payload = { campaignId, ...personForm };
      if (editPersonId) await api.fiscalization.updatePerson(editPersonId, payload);
      else await api.fiscalization.createPerson(payload);
      setEditPersonId(null);
      setPersonModalOpen(false);
      setPersonForm({ dni: "", nombre: "", apellido: "", telefono: "" });
      reload();
    } catch { setError("No se pudo guardar el fiscal."); } finally { setSaving(false); }
  }

  async function submitRole(e: FormEvent) {
    e.preventDefault();
    if (!campaignId) return;
    setSaving(true); setError(null);
    try {
      const payload = { campaignId, ...roleForm };
      if (editRoleId) await api.fiscalization.updateRole(editRoleId, payload);
      else await api.fiscalization.createRole(payload);
      setEditRoleId(null);
      setRoleModalOpen(false);
      setRoleForm({ codigo: "", nombre: "", nivel: "mesa" });
      reload();
    } catch { setError("No se pudo guardar el rol."); } finally { setSaving(false); }
  }

  async function submitAssignment(e: FormEvent) {
    e.preventDefault();
    if (!campaignId) return;
    setSaving(true); setError(null);
    try {
      const payload = {
        campaignId,
        personId: assignmentForm.personId,
        roleId: assignmentForm.roleId,
        estado: assignmentForm.estado,
        circuitId: assignmentForm.circuitId || null,
        schoolId: assignmentForm.schoolId || null,
        tableId: assignmentForm.tableId || null
      };
      if (editAssignmentId) await api.fiscalization.updateAssignment(editAssignmentId, payload);
      else await api.fiscalization.createAssignment(payload);
      setEditAssignmentId(null);
      setAssignmentModalOpen(false);
      setAssignmentForm((p) => ({ ...p, estado: "activo", circuitId: "", schoolId: "", tableId: "" }));
      reload();
    } catch { setError("No se pudo guardar la asignación."); } finally { setSaving(false); }
  }

  if (!campaignId) return <div className="loading-overlay">Seleccioná una campaña.</div>;

  const personCols: Column<Person>[] = [
    { key: "apellido", label: "Apellido", sortable: true },
    { key: "nombre", label: "Nombre", sortable: true },
    { key: "dni", label: "DNI", sortable: true, width: "110px" },
    { key: "telefono", label: "Teléfono" },
    {
      key: "id", label: "Acciones", width: "170px", render: (_, row) => (
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-secondary" onClick={() => { setEditPersonId(row.id); setPersonForm({ dni: row.dni, nombre: row.nombre, apellido: row.apellido, telefono: row.telefono ?? "" }); setPersonModalOpen(true); }}>Editar</button>
          <button className="btn btn-secondary" onClick={async () => { if (!confirm("Eliminar fiscal?")) return; await api.fiscalization.deletePerson(row.id); reload(); }}>Borrar</button>
        </div>
      )
    }
  ];

  const roleCols: Column<Role>[] = [
    { key: "codigo", label: "Código", sortable: true, width: "110px" },
    { key: "nombre", label: "Nombre", sortable: true },
    { key: "nivel", label: "Nivel", sortable: true, width: "110px" },
    {
      key: "id", label: "Acciones", width: "170px", render: (_, row) => (
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-secondary" onClick={() => { setEditRoleId(row.id); setRoleForm({ codigo: row.codigo, nombre: row.nombre, nivel: row.nivel }); setRoleModalOpen(true); }}>Editar</button>
          <button className="btn btn-secondary" onClick={async () => { if (!confirm("Eliminar rol?")) return; await api.fiscalization.deleteRole(row.id); reload(); }}>Borrar</button>
        </div>
      )
    }
  ];

  const assignmentCols: Column<Assignment>[] = [
    { key: "person", label: "Fiscal", render: (_, r) => r.person ? `${r.person.apellido}, ${r.person.nombre}` : r.personId },
    { key: "role", label: "Rol", render: (_, r) => r.role ? r.role.nombre : r.roleId },
    { key: "estado", label: "Estado", width: "110px", render: (v) => <StatusBadge status={String(v) === "activo" ? "optimo" : "parcial"} label={String(v)} /> },
    {
      key: "id", label: "Acciones", width: "170px", render: (_, row) => (
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-secondary" onClick={() => { setEditAssignmentId(row.id); setAssignmentForm({ personId: row.personId, roleId: row.roleId, estado: row.estado, circuitId: row.circuitId ?? "", schoolId: row.schoolId ?? "", tableId: row.tableId ?? "" }); setAssignmentModalOpen(true); }}>Editar</button>
          <button className="btn btn-secondary" onClick={async () => { if (!confirm("Eliminar asignación?")) return; await api.fiscalization.deleteAssignment(row.id); reload(); }}>Borrar</button>
        </div>
      )
    }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div className="tab-bar">
        {([
          ["coverage", "Cobertura", ""],
          ["gaps", "Brechas", criticalQueue.length],
          ["people", "Fiscales", people.length],
          ["roles", "Roles", roles.length],
          ["assignments", "Asignaciones", assignments.length]
        ] as [Tab, string, string | number][]).map(([id, label, count]) => (
          <button key={id} className={`tab-item${tab === id ? " active" : ""}`} onClick={() => setTab(id)}>{label}{count !== "" && <span className="tab-badge">{count}</span>}</button>
        ))}
        <div className="spacer" />
        {tab === "people" && <button className="btn btn-primary" style={{ marginTop: 10, marginRight: 10 }} onClick={() => { setEditPersonId(null); setPersonForm({ dni: "", nombre: "", apellido: "", telefono: "" }); setPersonModalOpen(true); }}>Nuevo fiscal</button>}
        {tab === "roles" && <button className="btn btn-primary" style={{ marginTop: 10, marginRight: 10 }} onClick={() => { setEditRoleId(null); setRoleForm({ codigo: "", nombre: "", nivel: "mesa" }); setRoleModalOpen(true); }}>Nuevo rol</button>}
        {tab === "assignments" && <button className="btn btn-primary" style={{ marginTop: 10, marginRight: 10 }} onClick={() => { setEditAssignmentId(null); setAssignmentForm((p) => ({ ...p, estado: "activo", tableId: "", circuitId: "", schoolId: "" })); setAssignmentModalOpen(true); }}>Nueva asignación</button>}
        {loading && <div className="spinner" style={{ marginRight: 16, marginTop: 14 }} />}
      </div>

      <div className="page-body" style={{ flex: 1, overflow: "auto" }}>
        {error && <div className="error-banner mb-4">{error}</div>}

        {tab === "coverage" && (
          <div className="dashboard-grid">
            <div className="kpi-grid">
              <KpiCard label="Mesas totales" value={summary?.mesasTotales ?? 0} />
              <KpiCard label="Mesas con titular" value={summary?.mesasConTitular ?? 0} />
              <KpiCard label="Mesas con suplente" value={summary?.mesasConSuplente ?? 0} />
              <KpiCard label="Críticas" value={summary?.criticas ?? 0} />
              <KpiCard label="Parciales" value={summary?.parciales ?? 0} />
              <KpiCard label="Óptimas" value={summary?.optimas ?? 0} />
            </div>
            <div className="section-card"><div className="section-card-body"><CoverageBar criticas={summary?.criticas ?? 0} parciales={summary?.parciales ?? 0} optimas={summary?.optimas ?? 0} /></div></div>
            <div className="section-card">
              <div className="section-card-header">
                <span className="section-card-title">Reglas de estado de cobertura</span>
              </div>
              <div className="section-card-body" style={{ display: "grid", gap: 6, fontSize: 13 }}>
                <div><strong>Crítica:</strong> mesa sin fiscal titular activo asignado.</div>
                <div><strong>Parcial:</strong> mesa con titular activo, pero sin suplente activo.</div>
                <div><strong>Óptima:</strong> mesa con titular y suplente activos.</div>
                <div className="text-muted">
                  Solo cuentan asignaciones activas con `tableId` y roles cuyo código o nombre incluya Titular/Suplente.
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "gaps" && (
          <>
            <div className="section-card mb-4"><div className="section-card-body"><select className="filter-select" value={circuitFilter} onChange={(e) => setCircuitFilter(e.target.value)}><option value="">Todos los circuitos</option>{circuitOptions.map((c) => <option key={c} value={c}>Circuito {c}</option>)}</select></div></div>
            <div className="section-card"><div className="table-overflow"><table className="data-table"><thead><tr><th>Estado</th><th>Circuito</th><th>Escuela</th><th>Mesa</th></tr></thead><tbody>{criticalQueue.map((r) => <tr key={r.tableId}><td><StatusBadge status={r.estado} /></td><td>{r.circuitCodigo}</td><td>{r.schoolNombre}</td><td>{r.tableNumero}</td></tr>)}</tbody></table></div></div>
          </>
        )}

        {tab === "people" && (
          <>
            <DataTable columns={personCols} data={people} rowKey={(r) => String(r.id)} searchable searchKeys={["apellido", "nombre", "dni"]} emptyLabel="Sin fiscales" />
          </>
        )}

        {tab === "roles" && (
          <>
            <DataTable columns={roleCols} data={roles} rowKey={(r) => String(r.id)} searchable searchKeys={["codigo", "nombre", "nivel"]} emptyLabel="Sin roles" />
          </>
        )}

        {tab === "assignments" && (
          <>
            <DataTable columns={assignmentCols} data={assignments} rowKey={(r) => String(r.id)} searchable emptyLabel="Sin asignaciones" />
          </>
        )}
      </div>

      {/* ─── Fiscal Modal ─────────────────────────────────────────────── */}
      <Modal
        open={personModalOpen}
        onClose={() => setPersonModalOpen(false)}
        title={editPersonId ? "Editar fiscal" : "Nuevo fiscal"}
        subtitle="Datos del fiscal de mesa o coordinador"
        width={480}
        footer={
          <>
            <button className="btn btn-secondary" type="button" onClick={() => setPersonModalOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" form="person-form" type="submit" disabled={saving}>
              {saving ? "Guardando..." : editPersonId ? "Actualizar fiscal" : "Crear fiscal"}
            </button>
          </>
        }
      >
        <form id="person-form" onSubmit={submitPerson} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              DNI <span style={{ color: "var(--status-critical)" }}>*</span>
            </label>
            <input className="search-input" placeholder="Número de documento" value={personForm.dni}
              onChange={(e) => setPersonForm((p) => ({ ...p, dni: e.target.value }))} required />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Nombre <span style={{ color: "var(--status-critical)" }}>*</span>
            </label>
            <input className="search-input" placeholder="Nombre" value={personForm.nombre}
              onChange={(e) => setPersonForm((p) => ({ ...p, nombre: e.target.value }))} required />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Apellido <span style={{ color: "var(--status-critical)" }}>*</span>
            </label>
            <input className="search-input" placeholder="Apellido" value={personForm.apellido}
              onChange={(e) => setPersonForm((p) => ({ ...p, apellido: e.target.value }))} required />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Teléfono
            </label>
            <input className="search-input" placeholder="Ej: 3764000000" value={personForm.telefono}
              onChange={(e) => setPersonForm((p) => ({ ...p, telefono: e.target.value }))} />
          </div>
        </form>
      </Modal>

      {/* ─── Role Modal ───────────────────────────────────────────────── */}
      <Modal
        open={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title={editRoleId ? "Editar rol" : "Nuevo rol"}
        subtitle="Define los roles disponibles para asignar a fiscales"
        width={440}
        footer={
          <>
            <button className="btn btn-secondary" type="button" onClick={() => setRoleModalOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" form="role-form" type="submit" disabled={saving}>
              {saving ? "Guardando..." : editRoleId ? "Actualizar rol" : "Crear rol"}
            </button>
          </>
        }
      >
        <form id="role-form" onSubmit={submitRole} style={{ display: "grid", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Código <span style={{ color: "var(--status-critical)" }}>*</span>
            </label>
            <input className="search-input" placeholder="Ej: TITULAR, SUPLENTE" value={roleForm.codigo}
              onChange={(e) => setRoleForm((p) => ({ ...p, codigo: e.target.value.toUpperCase() }))} required />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Nombre <span style={{ color: "var(--status-critical)" }}>*</span>
            </label>
            <input className="search-input" placeholder="Nombre descriptivo del rol" value={roleForm.nombre}
              onChange={(e) => setRoleForm((p) => ({ ...p, nombre: e.target.value }))} required />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Nivel de asignación
            </label>
            <select className="filter-select" value={roleForm.nivel}
              onChange={(e) => setRoleForm((p) => ({ ...p, nivel: e.target.value }))}>
              <option value="mesa">Mesa electoral</option>
              <option value="escuela">Escuela / establecimiento</option>
              <option value="circuito">Circuito</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* ─── Assignment Modal ─────────────────────────────────────────── */}
      <Modal
        open={assignmentModalOpen}
        onClose={() => setAssignmentModalOpen(false)}
        title={editAssignmentId ? "Editar asignación" : "Nueva asignación"}
        subtitle="Asignar un fiscal a un rol en una mesa, escuela o circuito"
        width={500}
        footer={
          <>
            <button className="btn btn-secondary" type="button" onClick={() => setAssignmentModalOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" form="assignment-form" type="submit" disabled={saving}>
              {saving ? "Guardando..." : editAssignmentId ? "Actualizar asignación" : "Crear asignación"}
            </button>
          </>
        }
      >
        <form id="assignment-form" onSubmit={submitAssignment} style={{ display: "grid", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Fiscal <span style={{ color: "var(--status-critical)" }}>*</span>
            </label>
            <select className="filter-select" value={assignmentForm.personId}
              onChange={(e) => setAssignmentForm((p) => ({ ...p, personId: e.target.value }))} required>
              <option value="">Seleccionar fiscal</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.apellido}, {p.nombre} — DNI {p.dni}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Rol <span style={{ color: "var(--status-critical)" }}>*</span>
            </label>
            <select className="filter-select" value={assignmentForm.roleId}
              onChange={(e) => setAssignmentForm((p) => ({ ...p, roleId: e.target.value }))} required>
              <option value="">Seleccionar rol</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.nombre} ({r.codigo})</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Estado
            </label>
            <select className="filter-select" value={assignmentForm.estado}
              onChange={(e) => setAssignmentForm((p) => ({ ...p, estado: e.target.value }))}>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo / baja</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              ID de mesa (opcional)
            </label>
            <input className="search-input" placeholder="UUID de la mesa electoral"
              value={assignmentForm.tableId}
              onChange={(e) => setAssignmentForm((p) => ({ ...p, tableId: e.target.value }))} />
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
              Dejalo vacío para asignaciones a escuela o circuito completo.
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
