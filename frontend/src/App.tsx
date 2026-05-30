import { type FormEvent, useEffect, useState } from "react";
import { api } from "./api";
import { Sidebar } from "./components/Sidebar";
import { DashboardHomePage } from "./pages/DashboardHomePage";
import { MapPage } from "./pages/MapPage";
import { TerritoryPage } from "./pages/TerritoryPage";
import { FiscalizacionPage } from "./pages/FiscalizacionPage";
import { OperacionesPage } from "./pages/OperacionesPage";
import { ReferentesQuickPage } from "./pages/ReferentesQuickPage";
import type { Campaign, Page, UserRole } from "./types";

/* ── role config ───────────────────────────────────────────────── */

const ROLE_KEY = "sistema_electoral_role";

// Placeholder credentials — replace with real auth in production
const ROLE_PASSWORDS: Record<"carga" | "admin", string> = {
  carga: "carga",
  admin: "admin",
};

const ALLOWED_PAGES: Record<UserRole, Page[]> = {
  visualizador: ["dashboard"],
  carga:        ["actividades"],
  admin:        ["dashboard", "actividades", "referentes", "map", "territory", "fiscalization"],
};

const DEFAULT_PAGE: Record<UserRole, Page> = {
  visualizador: "dashboard",
  carga:        "actividades",
  admin:        "dashboard",
};

const PAGE_TITLES: Record<Page, { title: string; subtitle: string }> = {
  dashboard:     { title: "Referentes",           subtitle: "Mapa territorial y consulta por barrio, circuito y característica" },
  referentes:    { title: "Planilla referentes",   subtitle: "Importar Excel y consulta extendida" },
  map:           { title: "Mapa",                  subtitle: "Visualización geoespacial de circuitos y escuelas" },
  territory:     { title: "Territorio",            subtitle: "Circuitos, escuelas y mesas electorales" },
  fiscalization: { title: "Fiscalización",         subtitle: "Fiscales, roles, asignaciones y cobertura" },
  operations:    { title: "Operaciones",           subtitle: "Agenda de eventos y referentes territoriales" },
  actividades:   { title: "Actividades",           subtitle: "Reuniones barriales, de prensa y operativos" },
};

/* ── login modal ───────────────────────────────────────────────── */

function LoginModal({
  onLogin,
  onClose,
}: {
  onLogin: (role: "carga" | "admin") => void;
  onClose: () => void;
}) {
  const [selectedRole, setSelectedRole] = useState<"carga" | "admin">("carga");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (pass === ROLE_PASSWORDS[selectedRole]) {
      onLogin(selectedRole);
    } else {
      setError("Contraseña incorrecta.");
      setPass("");
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9000,
      background: "rgba(15,23,42,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }}>
      <div style={{
        background: "var(--bg-surface, #fff)",
        borderRadius: 14,
        padding: "28px 28px 24px",
        width: "100%", maxWidth: 360,
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
      }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary, #0f172a)" }}>
            Acceso al sistema
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary, #64748b)", marginTop: 4 }}>
            Ingresá con tu perfil y contraseña
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
          {/* Role selector */}
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              Perfil
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {(["carga", "admin"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => { setSelectedRole(r); setError(""); }}
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: selectedRole === r ? "2px solid var(--accent, #3b82f6)" : "2px solid var(--border, #e2e8f0)",
                    background: selectedRole === r ? "var(--accent-subtle, #eff6ff)" : "transparent",
                    color: selectedRole === r ? "var(--accent, #3b82f6)" : "var(--text-secondary, #64748b)",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    textTransform: "capitalize",
                  }}
                >
                  {r === "carga" ? "Carga" : "Admin"}
                </button>
              ))}
            </div>
          </div>

          {/* Password */}
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              Contraseña
            </div>
            <input
              type="password"
              className="search-input"
              value={pass}
              autoFocus
              autoComplete="current-password"
              placeholder="••••••"
              style={{ width: "100%" }}
              onChange={(e) => { setPass(e.target.value); setError(""); }}
            />
            {error && (
              <div style={{ fontSize: 12, color: "var(--status-critical, #ef4444)", marginTop: 6 }}>
                ⚠ {error}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={onClose}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              Ingresar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── role badge ────────────────────────────────────────────────── */

const ROLE_LABEL: Record<UserRole, string> = {
  visualizador: "Visualizador",
  carga:        "Carga",
  admin:        "Admin",
};

/* ── App ───────────────────────────────────────────────────────── */

export function App() {
  const [role, setRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem(ROLE_KEY) as UserRole | null;
    return (saved && ["visualizador", "carga", "admin"].includes(saved)) ? saved : "visualizador";
  });
  const [showLogin, setShowLogin] = useState(false);

  const [page, setPage] = useState<Page>(() => DEFAULT_PAGE[
    (localStorage.getItem(ROLE_KEY) as UserRole | null) ?? "visualizador"
  ]);
  const [campaigns, setCampaigns]   = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState("");

  /* load campaigns */
  useEffect(() => {
    api.campaigns.list().then((rows) => {
      setCampaigns(rows);
      if (rows.length > 0 && !campaignId) setCampaignId(rows[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* guard page against role */
  useEffect(() => {
    if (!ALLOWED_PAGES[role].includes(page)) {
      setPage(DEFAULT_PAGE[role]);
    }
  }, [role, page]);

  function handleLogin(r: "carga" | "admin") {
    setRole(r);
    localStorage.setItem(ROLE_KEY, r);
    setPage(DEFAULT_PAGE[r]);
    setShowLogin(false);
  }

  function handleLogout() {
    setRole("visualizador");
    localStorage.removeItem(ROLE_KEY);
    setPage("dashboard");
  }

  /* ── Visualizador layout (full-screen, no sidebar) ── */
  if (role === "visualizador") {
    return (
      <div style={{ height: "100vh", overflow: "hidden", position: "relative" }}>
        <DashboardHomePage campaignId={campaignId} />

        {showLogin && (
          <LoginModal onLogin={handleLogin} onClose={() => setShowLogin(false)} />
        )}
      </div>
    );
  }

  /* ── Carga / Admin layout (sidebar) ── */
  const { title, subtitle } = PAGE_TITLES[page];
  const isImmersive = page === "dashboard" || page === "actividades" || page === "operations";

  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        onPage={setPage}
        campaigns={campaigns}
        campaignId={campaignId}
        onCampaignChange={setCampaignId}
        role={role}
        roleLabel={ROLE_LABEL[role]}
        onLogout={handleLogout}
      />

      <div className={`main-content${isImmersive ? " main-content--immersive" : ""}`}>
        {!isImmersive && (
          <header className="page-header">
            <div className="page-header-left">
              <div>
                <div className="page-title">{title}</div>
                <div className="page-subtitle">{subtitle}</div>
              </div>
            </div>
          </header>
        )}

        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minHeight: 0,
          background: "var(--bg-base)",
        }}>
          {page === "dashboard"     && <DashboardHomePage campaignId={campaignId} />}
          {(page === "actividades" || page === "operations") && <OperacionesPage campaignId={campaignId} />}
          {page === "referentes"    && <ReferentesQuickPage campaignId={campaignId} />}
          {page === "map"           && <MapPage            campaignId={campaignId} />}
          {page === "territory"     && <TerritoryPage      campaignId={campaignId} />}
          {page === "fiscalization" && <FiscalizacionPage  campaignId={campaignId} />}
        </div>
      </div>

      {showLogin && (
        <LoginModal onLogin={handleLogin} onClose={() => setShowLogin(false)} />
      )}
    </div>
  );
}
