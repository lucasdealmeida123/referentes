import type { Campaign, Page, UserRole } from "../types";

interface Props {
  page: Page;
  onPage: (p: Page) => void;
  campaigns: Campaign[];
  campaignId: string;
  onCampaignChange: (id: string) => void;
  role: UserRole;
  roleLabel: string;
  onLogout: () => void;
}

/* ── nav definition ─────────────────────────────────────────────── */

type NavItem = { id: Page; label: string; section?: string };

const ADMIN_NAV: NavItem[] = [
  { id: "dashboard",     label: "Referentes",    section: "PRINCIPAL" },
  { id: "actividades",   label: "Actividades",   section: "ACTIVIDADES" },
  { id: "referentes",    label: "Planilla",       section: "CONFIGURACIÓN" },
  { id: "map",           label: "Mapa" },
  { id: "territory",     label: "Territorio" },
  { id: "fiscalization", label: "Fiscalización" },
];

const CARGA_NAV: NavItem[] = [
  { id: "actividades", label: "Actividades", section: "ACTIVIDADES" },
];

/* ── SVG icons ─────────────────────────────────────────────────── */

function IconDashboard({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="7" cy="6" r="2.5" />
      <path d="M2 17c0-2.8 2.2-5 5-5s5 2.2 5 5" />
      <circle cx="14" cy="7" r="2" />
      <path d="M12 17c.5-2 1.8-3.5 4-3.5" strokeLinecap="round" />
    </svg>
  );
}

function IconActividades({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="2" width="14" height="16" rx="2" />
      <line x1="6" y1="7"  x2="14" y2="7" />
      <line x1="6" y1="10" x2="14" y2="10" />
      <line x1="6" y1="13" x2="11" y2="13" />
    </svg>
  );
}

function IconPlanilla({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="7" height="7" rx="1.5" />
      <rect x="11" y="2" width="7" height="7" rx="1.5" />
      <rect x="2" y="11" width="7" height="7" rx="1.5" />
      <rect x="11" y="11" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function IconMap({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="1,4 7,1 13,4 19,1 19,16 13,19 7,16 1,19" />
      <line x1="7" y1="1" x2="7" y2="16" />
      <line x1="13" y1="4" x2="13" y2="19" />
    </svg>
  );
}

function IconTerritory({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 2 L17 6 L17 14 L10 18 L3 14 L3 6 Z" />
      <circle cx="10" cy="10" r="2" />
    </svg>
  );
}

function IconFisc({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="6" r="3" />
      <path d="M2 17 C2 13.7 4.7 11 8 11 S14 13.7 14 17" />
      <path d="M14 11 C15.1 11 16 10.1 16 9 S15.1 7 14 7" strokeLinecap="round" />
      <path d="M16 14 C17.3 14.5 18 15.4 18 17" strokeLinecap="round" />
    </svg>
  );
}

function IconLogout({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M7 3H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h3" strokeLinecap="round" />
      <polyline points="13 14 17 10 13 6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="17" y1="10" x2="7" y2="10" strokeLinecap="round" />
    </svg>
  );
}

const ICONS: Partial<Record<Page, (p: { className?: string }) => JSX.Element>> = {
  dashboard:     IconDashboard,
  actividades:   IconActividades,
  referentes:    IconPlanilla,
  map:           IconMap,
  territory:     IconTerritory,
  fiscalization: IconFisc,
  operations:    IconActividades,
};

/* ── role badge colors ─────────────────────────────────────────── */

const ROLE_COLORS: Record<UserRole, { bg: string; text: string }> = {
  visualizador: { bg: "rgba(100,116,139,0.12)", text: "#64748b" },
  carga:        { bg: "rgba(59,130,246,0.12)",  text: "#3b82f6" },
  admin:        { bg: "rgba(168,85,247,0.12)",  text: "#a855f7" },
};

/* ── Sidebar ────────────────────────────────────────────────────── */

export function Sidebar({
  page, onPage, campaigns, campaignId, onCampaignChange,
  role, roleLabel, onLogout,
}: Props) {
  const nav = role === "admin" ? ADMIN_NAV : CARGA_NAV;
  let lastSection = "";

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
            <path d="M4 3h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/>
            <polyline points="7 10 9 12 13 8"/>
          </svg>
        </div>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-title">Elecciones</span>
          <span className="sidebar-logo-sub">Misiones 2025</span>
        </div>
      </div>

      {/* Role badge */}
      <div style={{
        margin: "0 12px 10px",
        padding: "5px 10px",
        borderRadius: 6,
        background: ROLE_COLORS[role].bg,
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: "50%",
          background: ROLE_COLORS[role].text,
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: 11.5, fontWeight: 600,
          color: ROLE_COLORS[role].text,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}>
          {roleLabel}
        </span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {nav.map((item) => {
          const showSection = item.section && item.section !== lastSection;
          if (item.section) lastSection = item.section;
          const Icon = ICONS[item.id] ?? IconActividades;

          return (
            <div key={item.id}>
              {showSection && (
                <div className="nav-section-label">{item.section}</div>
              )}
              <button
                className={`nav-item${page === item.id ? " active" : ""}`}
                onClick={() => onPage(item.id)}
              >
                <Icon className="nav-item-icon" />
                {item.label}
              </button>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {/* Campaign selector */}
        <div className="campaign-selector">
          <label>Campaña activa</label>
          <select
            value={campaignId}
            onChange={(e) => onCampaignChange(e.target.value)}
          >
            <option value="">Seleccionar…</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.anio} – {c.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            width: "100%",
            padding: "8px 12px",
            marginTop: 8,
            background: "transparent",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 12.5,
            fontWeight: 500,
            color: "var(--text-muted)",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover, rgba(0,0,0,0.04))";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
          }}
        >
          <IconLogout className="nav-item-icon" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
