import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { MeetingMapWidget } from "../components/MeetingMapWidget";
import {
  CalendarIcon, ClockIcon, MegaphoneIcon, HomeIcon, UsersIcon, ActivityIcon,
} from "../components/Icons";
import type { EventItem, MapDataset, Referent } from "../types";

interface Props { campaignId: string; }

/* ─── helpers ───────────────────────────────────────────────── */
function fmtDate(v: unknown) {
  if (!v) return "–";
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? "–" : d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}
function fmtTime(v: unknown) {
  if (!v) return "";
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? "" : d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}
function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function isSameDay(a: Date, b: Date) { return startOfDay(a).getTime() === startOfDay(b).getTime(); }

/* ─── KPI card v2 ────────────────────────────────────────────── */
function KpiV2({ label, value, sub, accentClass, icon, iconBg, iconColor, delay = 0 }: {
  label: string; value: number | string; sub: string;
  accentClass: string; icon: React.ReactNode;
  iconBg: string; iconColor: string; delay?: number;
}) {
  return (
    <div className={`kpi-v2 ${accentClass}`} style={{ animationDelay: `${delay}ms` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{
          fontSize: 10.5, fontWeight: 700, color: "var(--text-muted)",
          textTransform: "uppercase", letterSpacing: "0.08em",
        }}>
          {label}
        </span>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: iconBg, display: "flex",
          alignItems: "center", justifyContent: "center",
          color: iconColor, flexShrink: 0,
        }}>
          {icon}
        </div>
      </div>
      <div style={{
        fontSize: 34, fontWeight: 800, color: "var(--text-primary)",
        lineHeight: 1, letterSpacing: "-0.03em",
        fontFamily: "'Archivo', sans-serif",
      }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>
        {sub}
      </div>
    </div>
  );
}

/* ─── Day progress bar ───────────────────────────────────────── */
function DayProgressBar() {
  const now = new Date();
  const pct = Math.min(100, ((now.getHours() * 60 + now.getMinutes()) / (24 * 60)) * 100);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, alignItems: "center" }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)",
          textTransform: "uppercase", letterSpacing: "0.1em",
        }}>
          Día transcurrido
        </span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>
          {Math.round(pct)}%
        </span>
      </div>
      <div style={{ height: 4, borderRadius: 100, background: "rgba(255,255,255,0.07)", overflow: "hidden", position: "relative" }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: "linear-gradient(90deg, #60a5fa, #818cf8, #a78bfa)",
          borderRadius: 100,
          boxShadow: "0 0 10px rgba(129,140,248,0.5)",
          transition: "width 1s ease",
        }} />
      </div>
    </div>
  );
}

/* ─── Weekly mini calendar ───────────────────────────────────── */
function WeekCalendar({ events }: { events: EventItem[] }) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mon = new Date(today);
  mon.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });

  const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
      {days.map((day, i) => {
        const isToday = isSameDay(day, today);
        const dayEvents = events.filter((e) => e.fechaHora && isSameDay(new Date(e.fechaHora), day));
        const prensa = dayEvents.filter((e) => e.tipo?.toLowerCase() === "prensa");
        const barrial = dayEvents.filter((e) => e.tipo?.toLowerCase() === "barrial");

        return (
          <div key={i} style={{
            borderRadius: 12,
            padding: "10px 6px",
            textAlign: "center",
            background: isToday
              ? "linear-gradient(145deg, rgba(37,99,235,0.1), rgba(99,102,241,0.06))"
              : dayEvents.length > 0 ? "var(--bg-base)" : "transparent",
            border: isToday
              ? "1.5px solid rgba(37,99,235,0.35)"
              : dayEvents.length > 0 ? "1px solid var(--border)" : "1px solid transparent",
            boxShadow: isToday
              ? "0 0 0 3px rgba(37,99,235,0.06), 0 4px 16px rgba(37,99,235,0.08)"
              : "none",
            minHeight: 82,
            transition: "all 0.2s ease",
          }}>
            <div style={{
              fontSize: 9.5, fontWeight: 700, textTransform: "uppercase",
              color: isToday ? "var(--accent)" : "var(--text-muted)",
              letterSpacing: "0.06em",
            }}>
              {DAY_LABELS[i]}
            </div>
            <div style={{
              fontSize: 20, fontWeight: 700, lineHeight: 1.25,
              color: isToday ? "var(--accent)" : "var(--text-primary)",
              marginTop: 2,
            }}>
              {day.getDate()}
            </div>
            {dayEvents.length > 0 ? (
              <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 3 }}>
                {prensa.length > 0 && (
                  <div style={{
                    fontSize: 9.5, fontWeight: 700, color: "#7c3aed",
                    background: "rgba(124,58,237,0.1)", borderRadius: 5, padding: "2px 4px",
                  }}>{prensa.length}P</div>
                )}
                {barrial.length > 0 && (
                  <div style={{
                    fontSize: 9.5, fontWeight: 700, color: "#c2410c",
                    background: "rgba(249,115,22,0.1)", borderRadius: 5, padding: "2px 4px",
                  }}>{barrial.length}B</div>
                )}
              </div>
            ) : isToday ? (
              <div style={{ marginTop: 7, display: "flex", justifyContent: "center" }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%", background: "var(--accent)",
                  animation: "pulse-live 2.5s ease-in-out infinite",
                }} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Circuit breakdown ──────────────────────────────────────── */
function CircuitBreakdown({ events }: { events: EventItem[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 150);
    return () => clearTimeout(t);
  }, []);

  const byCircuit = useMemo(() => {
    const map: Record<string, { prensa: number; barrial: number }> = {};
    for (const e of events) {
      const k = e.circuitoCodigo ?? "Sin circuito";
      if (!map[k]) map[k] = { prensa: 0, barrial: 0 };
      if (e.tipo?.toLowerCase() === "prensa") map[k].prensa++;
      else map[k].barrial++;
    }
    return Object.entries(map)
      .map(([code, counts]) => ({ code, total: counts.prensa + counts.barrial, ...counts }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [events]);

  const maxTotal = Math.max(1, ...byCircuit.map((c) => c.total));

  if (byCircuit.length === 0) {
    return <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Sin datos</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {byCircuit.map(({ code, total, prensa, barrial }, idx) => (
        <div key={code}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, alignItems: "center" }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)" }}>
              Circ. {code}
            </span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {prensa > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: "#fff",
                  background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                  padding: "1.5px 7px", borderRadius: 100,
                  boxShadow: "0 1px 4px rgba(124,58,237,0.3)",
                }}>{prensa}P</span>
              )}
              {barrial > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: "#fff",
                  background: "linear-gradient(135deg, #ea580c, #f97316)",
                  padding: "1.5px 7px", borderRadius: 100,
                  boxShadow: "0 1px 4px rgba(234,88,12,0.3)",
                }}>{barrial}B</span>
              )}
              <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600, minWidth: 18, textAlign: "right" }}>
                {total}
              </span>
            </div>
          </div>
          <div style={{ height: 8, borderRadius: 100, background: "var(--bg-base)", overflow: "hidden", display: "flex" }}>
            <div style={{
              width: mounted ? `${(prensa / maxTotal) * 100}%` : "0%",
              background: "linear-gradient(90deg, #7c3aed, #a855f7)",
              transition: `width 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) ${idx * 70}ms`,
              borderRadius: "100px 0 0 100px",
            }} />
            <div style={{
              width: mounted ? `${(barrial / maxTotal) * 100}%` : "0%",
              background: "linear-gradient(90deg, #ea580c, #fb923c)",
              transition: `width 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) ${idx * 70 + 40}ms`,
              borderRadius: prensa === 0 ? 100 : "0 100px 100px 0",
            }} />
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 16, marginTop: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)" }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "linear-gradient(135deg, #7c3aed, #a855f7)", display: "inline-block" }} />
          Prensa
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)" }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "linear-gradient(135deg, #ea580c, #fb923c)", display: "inline-block" }} />
          Barrial
        </div>
      </div>
    </div>
  );
}

/* ─── Event row ──────────────────────────────────────────────── */
function RecentEventRow({ ev }: { ev: EventItem }) {
  const isPrensaType = ev.tipo?.toLowerCase() === "prensa";
  const isPast = ev.fechaHora ? new Date(ev.fechaHora).getTime() < Date.now() - 3_600_000 : false;
  const evDate = ev.fechaHora ? new Date(ev.fechaHora) : null;

  return (
    <div className="event-row-hover" style={{
      display: "flex", alignItems: "flex-start", gap: 14,
      padding: "12px 20px",
      borderBottom: "1px solid var(--border-light)",
      opacity: isPast ? 0.6 : 1,
    }}>
      {/* Mini date card */}
      <div style={{
        flexShrink: 0, width: 46, textAlign: "center",
        background: "var(--bg-base)",
        border: "1px solid var(--border-light)",
        borderRadius: 10, padding: "7px 4px",
      }}>
        <div style={{
          fontSize: 18, fontWeight: 800, lineHeight: 1,
          color: "var(--text-primary)", fontFamily: "'Archivo', sans-serif",
        }}>
          {evDate ? evDate.getDate() : "–"}
        </div>
        {evDate && (
          <>
            <div style={{
              fontSize: 9.5, fontWeight: 600, color: "var(--text-muted)",
              textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2,
            }}>
              {evDate.toLocaleDateString("es-AR", { month: "short" }).replace(".", "")}
            </div>
            <div style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700, marginTop: 3 }}>
              {fmtTime(ev.fechaHora)}
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
          <span style={{
            fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
          }}>
            {ev.lugar ?? "Sin lugar"}
          </span>
          <span style={{
            fontSize: 9.5, fontWeight: 700, padding: "3px 9px", borderRadius: 100, flexShrink: 0,
            background: isPrensaType ? "rgba(124,58,237,0.1)" : "rgba(234,88,12,0.1)",
            color: isPrensaType ? "#7c3aed" : "#c2410c",
            border: isPrensaType ? "1px solid rgba(124,58,237,0.2)" : "1px solid rgba(234,88,12,0.2)",
            letterSpacing: "0.04em",
          }}>
            {isPrensaType ? "PRENSA" : "BARRIAL"}
          </span>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {ev.circuitoCodigo && (
            <span style={{ fontSize: 11.5, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ display: "inline-block", width: 4, height: 4, borderRadius: "50%", background: "var(--text-muted)" }} />
              Circ. {ev.circuitoCodigo}
            </span>
          )}
          {ev.barrio && <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{ev.barrio}</span>}
          {ev.referente && <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Ref: {ev.referente}</span>}
          {ev.anfitrion && <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Anf: {ev.anfitrion}</span>}
          {ev.programa && <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{ev.programa}</span>}
          {ev.contacto && <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{ev.contacto}</span>}
        </div>
      </div>
    </div>
  );
}

/* ─── Stat pill (hero) ───────────────────────────────────────── */
function HeroPill({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 14, padding: "14px 20px",
      display: "flex", flexDirection: "column", gap: 3,
      minWidth: 90, backdropFilter: "blur(10px)",
    }}>
      <div style={{
        fontSize: 28, fontWeight: 800, lineHeight: 1,
        fontFamily: "'Archivo', sans-serif", color,
      }}>{value}</div>
      <div style={{
        fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)",
        textTransform: "uppercase", letterSpacing: "0.1em",
      }}>{label}</div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────── */
export function DashboardPage({ campaignId }: Props) {
  const [events,    setEvents]   = useState<EventItem[]>([]);
  const [referents, setRef]      = useState<Referent[]>([]);
  const [mapData,   setMapData]  = useState<MapDataset | null>(null);
  const [loading,   setLoading]  = useState(false);
  const [error,     setError]    = useState<string | null>(null);
  const [showAll,   setShowAll]  = useState(false);

  useEffect(() => {
    if (!campaignId) return;
    setLoading(true);
    setError(null);
    Promise.allSettled([
      api.operations.events(campaignId),
      api.operations.referents(campaignId),
      api.map.dataset({ campaignId }),
    ]).then(([evtsR, refsR, mapR]) => {
      if (evtsR.status === "fulfilled") setEvents(evtsR.value);
      if (refsR.status === "fulfilled") setRef(refsR.value);
      if (mapR.status  === "fulfilled") setMapData(mapR.value);
      const failed = [evtsR, refsR, mapR].filter((r) => r.status === "rejected").length;
      if (failed === 3) setError("No se pudo cargar el dashboard.");
    }).finally(() => setLoading(false));
  }, [campaignId]);

  const now   = Date.now();
  const in7d  = now + 7 * 86_400_000;

  const upcomingAll  = useMemo(() =>
    events
      .filter((e) => e.fechaHora && new Date(e.fechaHora).getTime() > now - 21_600_000)
      .sort((a, b) => new Date(a.fechaHora!).getTime() - new Date(b.fechaHora!).getTime()),
    [events, now],
  );
  const next7d       = useMemo(() =>
    events.filter((e) => { if (!e.fechaHora) return false; const t = new Date(e.fechaHora).getTime(); return t > now && t < in7d; }),
    [events, now, in7d],
  );
  const prensaCount  = useMemo(() => events.filter((e) => e.tipo?.toLowerCase() === "prensa").length,  [events]);
  const barrialCount = useMemo(() => events.filter((e) => e.tipo?.toLowerCase() === "barrial").length, [events]);
  const todayCount   = events.filter((e) => e.fechaHora && isSameDay(new Date(e.fechaHora), new Date())).length;

  const displayEvents = showAll ? events : upcomingAll.slice(0, 10);
  const nextEvent     = upcomingAll[0];

  if (!campaignId) {
    return (
      <div className="loading-overlay">
        Seleccioná una campaña en el panel izquierdo para comenzar.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
        Cargando dashboard…
      </div>
    );
  }

  return (
    <div className="page-body dashboard-grid">
      {error && (
        <div className="error-banner">
          Error al cargar algunos datos. Los datos disponibles se muestran igual.
        </div>
      )}

      {/* ─── KPI strip ────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
        <KpiV2
          label="Total agenda"
          value={events.length}
          sub={`${prensaCount} prensa · ${barrialCount} barriales`}
          accentClass="kpi-blue"
          icon={<CalendarIcon size={17} />}
          iconBg="rgba(37,99,235,0.1)"
          iconColor="#2563eb"
          delay={0}
        />
        <KpiV2
          label="Próximos 7 días"
          value={next7d.length}
          sub="reuniones confirmadas"
          accentClass="kpi-green"
          icon={<ClockIcon size={17} />}
          iconBg="rgba(16,185,129,0.1)"
          iconColor="#10b981"
          delay={60}
        />
        <KpiV2
          label="En agenda hoy"
          value={todayCount}
          sub="hoy"
          accentClass="kpi-orange"
          icon={<ActivityIcon size={17} />}
          iconBg="rgba(249,115,22,0.1)"
          iconColor="#f97316"
          delay={120}
        />
        <KpiV2
          label="Reuniones prensa"
          value={prensaCount}
          sub="medios de comunicación"
          accentClass="kpi-purple"
          icon={<MegaphoneIcon size={17} />}
          iconBg="rgba(124,58,237,0.1)"
          iconColor="#7c3aed"
          delay={180}
        />
        <KpiV2
          label="Reuniones barriales"
          value={barrialCount}
          sub="encuentros territoriales"
          accentClass="kpi-red"
          icon={<HomeIcon size={17} />}
          iconBg="rgba(234,88,12,0.1)"
          iconColor="#ea580c"
          delay={240}
        />
      </div>

      {/* ─── Hero widget ──────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, #0c1222 0%, #131840 50%, #0d1f3c 100%)",
        borderRadius: "var(--radius-lg)",
        padding: "28px 32px",
        position: "relative",
        overflow: "hidden",
        color: "#fff",
        boxShadow: "0 20px 60px rgba(15,23,42,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        {/* Dot grid texture */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "22px 22px", pointerEvents: "none",
        }} />
        {/* Glow orb — right */}
        <div style={{
          position: "absolute", right: -60, top: -60,
          width: 260, height: 260, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(37,99,235,0.22) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        {/* Glow orb — left bottom */}
        <div style={{
          position: "absolute", left: -40, bottom: -40,
          width: 200, height: 200, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 22 }}>
          {/* Top row */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24 }}>
            {/* Left: headline */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Live indicator */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                <div style={{
                  width: 7, height: 7, borderRadius: "50%", background: "#22c55e",
                  animation: "pulse-live 2.5s ease-in-out infinite",
                  boxShadow: "0 0 6px rgba(34,197,94,0.6)", flexShrink: 0,
                }} />
                <span style={{
                  fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.45)",
                  letterSpacing: "0.1em", textTransform: "uppercase",
                }}>
                  Campaña activa
                </span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)" }}>·</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                  {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
                </span>
              </div>

              {/* Headline */}
              <div style={{
                fontSize: 38, fontWeight: 800, lineHeight: 1.05,
                letterSpacing: "-0.02em", fontFamily: "'Archivo', sans-serif", marginBottom: 10,
              }}>
                {next7d.length > 0 ? (
                  <>
                    <span style={{ color: "#60a5fa" }}>{next7d.length}</span>
                    {" "}reunión{next7d.length !== 1 ? "es" : ""}
                    <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.5)", fontSize: 26 }}>
                      {" "}esta semana
                    </span>
                  </>
                ) : upcomingAll.length > 0 ? (
                  <>
                    <span style={{ color: "#60a5fa" }}>{upcomingAll.length}</span>
                    {" "}reunión{upcomingAll.length !== 1 ? "es" : ""}
                    <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.5)", fontSize: 26 }}>
                      {" "}en agenda
                    </span>
                  </>
                ) : (
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 26 }}>
                    Sin reuniones próximas
                  </span>
                )}
              </div>

              {/* Next event */}
              {nextEvent && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: "#60a5fa",
                    background: "rgba(96,165,250,0.12)", padding: "3px 9px",
                    borderRadius: 100, border: "1px solid rgba(96,165,250,0.2)",
                    letterSpacing: "0.04em", flexShrink: 0,
                  }}>PRÓXIMA</span>
                  {nextEvent.lugar && (
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>
                      {nextEvent.lugar}
                    </span>
                  )}
                  {nextEvent.fechaHora && (
                    <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.4)" }}>
                      · {fmtDate(nextEvent.fechaHora)} {fmtTime(nextEvent.fechaHora)}
                    </span>
                  )}
                  {nextEvent.circuitoCodigo && (
                    <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.35)" }}>
                      · Circ. {nextEvent.circuitoCodigo}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Right: stat pills */}
            <div style={{ display: "flex", gap: 10, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <HeroPill value={prensaCount}  label="Prensa"     color="#c4b5fd" />
              <HeroPill value={barrialCount} label="Barriales"  color="#fdba74" />
              {referents.length > 0 && (
                <HeroPill value={referents.length} label="Referentes" color="#86efac" />
              )}
            </div>
          </div>

          {/* Day progress */}
          <DayProgressBar />
        </div>
      </div>

      {/* ─── Meeting map ──────────────────────────────────────────── */}
      <div className="section-card dashboard-map-card" style={{ overflow: "hidden", padding: 0 }}>
        <div className="section-card-header" style={{ padding: "14px 20px" }}>
          <span className="section-card-title">Mapa de reuniones por circuito</span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Clickeá un circuito para filtrar sus reuniones
          </span>
        </div>
        <div className="dashboard-map-slot" style={{ height: 560 }}>
          <MeetingMapWidget events={events} mapData={mapData} compact />
        </div>
      </div>

      {/* ─── Week calendar + Circuit breakdown ────────────────────── */}
      <div className="dashboard-row dashboard-row-2">

        {/* Weekly calendar */}
        <div className="section-card">
          <div className="section-card-header">
            <span className="section-card-title">Agenda semanal</span>
            <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
              {new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
            </span>
          </div>
          <div className="section-card-body">
            <WeekCalendar events={events} />

            {/* Today detail */}
            {(() => {
              const todayEvts = events.filter((e) => e.fechaHora && isSameDay(new Date(e.fechaHora), new Date()));
              if (todayEvts.length === 0) return (
                <div style={{
                  marginTop: 14, padding: "12px 16px",
                  background: "var(--bg-base)", borderRadius: 10,
                  fontSize: 12.5, color: "var(--text-muted)", textAlign: "center",
                  border: "1px solid var(--border-light)",
                }}>
                  No hay reuniones programadas para hoy
                </div>
              );
              return (
                <div style={{ marginTop: 16 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: "var(--text-secondary)",
                    textTransform: "uppercase", letterSpacing: "0.07em",
                    marginBottom: 10, display: "flex", alignItems: "center", gap: 7,
                  }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: "50%", background: "#22c55e",
                      animation: "pulse-live 2s infinite",
                    }} />
                    Hoy · {todayEvts.length} evento{todayEvts.length !== 1 ? "s" : ""}
                  </div>
                  {todayEvts.map((ev) => {
                    const isP = ev.tipo?.toLowerCase() === "prensa";
                    return (
                      <div key={ev.id} style={{
                        display: "flex", gap: 10, alignItems: "center",
                        padding: "8px 12px", marginBottom: 6,
                        background: isP ? "rgba(124,58,237,0.05)" : "rgba(234,88,12,0.05)",
                        borderRadius: 9,
                        border: isP ? "1px solid rgba(124,58,237,0.12)" : "1px solid rgba(234,88,12,0.12)",
                      }}>
                        <div style={{
                          width: 3, height: 36, borderRadius: 2, flexShrink: 0,
                          background: isP
                            ? "linear-gradient(180deg, #7c3aed, #a855f7)"
                            : "linear-gradient(180deg, #ea580c, #f97316)",
                        }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                            {ev.lugar ?? "Sin lugar"}
                          </div>
                          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 1 }}>
                            {fmtTime(ev.fechaHora)}{ev.circuitoCodigo ? ` · Circ. ${ev.circuitoCodigo}` : ""}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Circuit breakdown */}
        <div className="section-card">
          <div className="section-card-header">
            <span className="section-card-title">Reuniones por circuito</span>
            <span style={{
              fontSize: 11, fontWeight: 700, color: "#fff",
              background: "var(--accent)", padding: "2px 9px",
              borderRadius: 100, boxShadow: "0 1px 4px rgba(37,99,235,0.25)",
            }}>{events.length}</span>
          </div>
          <div className="section-card-body">
            <CircuitBreakdown events={events} />

            {referents.length > 0 && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border-light)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <UsersIcon size={13} />
                  <span style={{
                    fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.07em", color: "var(--text-secondary)",
                  }}>
                    Referentes por circuito
                  </span>
                </div>
                {(() => {
                  const byCircuit = Object.entries(
                    referents.reduce<Record<string, number>>((acc, r) => {
                      const k = r.circuitoCodigo ?? "Sin circuito";
                      acc[k] = (acc[k] ?? 0) + 1;
                      return acc;
                    }, {})
                  ).sort((a, b) => b[1] - a[1]).slice(0, 5);
                  return byCircuit.map(([code, count]) => (
                    <div key={code} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "6px 0", fontSize: 12.5, borderBottom: "1px solid var(--border-light)",
                    }}>
                      <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>Circ. {code}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: "#fff",
                        background: "linear-gradient(135deg, var(--accent), #4f46e5)",
                        padding: "2px 9px", borderRadius: 100,
                        boxShadow: "0 1px 4px rgba(37,99,235,0.25)",
                      }}>{count} ref.</span>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Events list ──────────────────────────────────────────── */}
      <div className="section-card">
        <div className="section-card-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="section-card-title">Lista de reuniones</span>
            <span style={{
              fontSize: 11, fontWeight: 700, color: "#fff",
              background: "var(--accent)", padding: "2px 9px",
              borderRadius: 100, boxShadow: "0 1px 4px rgba(37,99,235,0.25)",
            }}>{events.length}</span>
          </div>
          <button
            className="btn btn-secondary"
            style={{ padding: "5px 12px", fontSize: 12 }}
            onClick={() => setShowAll((p) => !p)}
          >
            {showAll ? "Mostrar próximas" : "Ver todas"}
          </button>
        </div>
        <div>
          {displayEvents.length === 0 ? (
            <div className="table-empty">Sin reuniones en agenda</div>
          ) : (
            displayEvents.map((ev) => <RecentEventRow key={ev.id} ev={ev} />)
          )}
        </div>
        {!showAll && upcomingAll.length > 10 && (
          <div style={{ padding: "12px 20px", textAlign: "center", borderTop: "1px solid var(--border-light)" }}>
            <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => setShowAll(true)}>
              Ver las {events.length - 10} restantes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
