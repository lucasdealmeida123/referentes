import type { ReactNode } from "react";
import type { EventItem, Referent } from "../types";
import { formatPhone, referentCaracteristica, whatsappUrl } from "../utils/referentesLookup";

function telHref(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 8 ? `tel:+${digits.startsWith("54") ? digits : `54${digits}`}` : null;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function IconBack() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconBriefcase() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
    </svg>
  );
}

function IconPhone() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconWhatsApp() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function IconMapPin() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconNeighborhood() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCircuit() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconHome() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconNote() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" />
      <line x1="8"  y1="2" x2="8"  y2="6" strokeLinecap="round" />
      <line x1="3"  y1="10" x2="21" y2="10" strokeLinecap="round" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DetailRow({
  icon,
  label,
  value,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="ref-detail-item">
      <span className="ref-detail-item-icon">{icon}</span>
      <div className="ref-detail-item-body">
        <span className="ref-detail-item-label">{label}</span>
        {href ? (
          <a className="ref-detail-item-value ref-detail-item-link" href={href}>
            {value}
          </a>
        ) : (
          <span className="ref-detail-item-value">{value}</span>
        )}
      </div>
    </div>
  );
}

interface Props {
  r: Referent;
  onBack?: () => void;
  /** Reuniones en las que participa este referente */
  events?: EventItem[];
}

export function ReferentFicha({ r, onBack, events = [] }: Props) {
  const trait = referentCaracteristica(r);
  const wa = whatsappUrl(r.celular);
  const phone = formatPhone(r.celular);
  const tel = telHref(r.celular);
  const depende = r.referenteDe?.trim();
  const hasUbicacion = Boolean(r.barrio || r.circuitoCodigo || r.chacra || r.direccion);

  return (
    <article className="ref-detail">
      {onBack && (
        <button type="button" className="ref-detail-back" onClick={onBack}>
          <IconBack />
          <span>Lista</span>
        </button>
      )}

      <div className="ref-detail-card ref-detail-card--profile">
        <div className="ref-detail-avatar" aria-hidden>
          {initials(r.nombreApellido)}
        </div>
        <div className="ref-detail-profile-text">
          <h1>{r.nombreApellido}</h1>
          {depende && (
            <p className="ref-detail-role">
              <IconBriefcase />
              <span>{depende}</span>
            </p>
          )}
          {r.circuitoCodigo && (
            <span className="ref-detail-circuit-pill">Circuito {r.circuitoCodigo}</span>
          )}
        </div>
      </div>

      {(tel || wa || r.ubicacionUrl) && (
        <div className="ref-detail-actions">
          {tel && (
            <a className="ref-detail-action ref-detail-action--call" href={tel}>
              <IconPhone />
              <span>Llamar</span>
            </a>
          )}
          {wa && (
            <a
              className="ref-detail-action ref-detail-action--wa"
              href={wa}
              target="_blank"
              rel="noreferrer"
            >
              <IconWhatsApp />
              <span>WhatsApp</span>
            </a>
          )}
          {r.ubicacionUrl && (
            <a
              className="ref-detail-action ref-detail-action--map"
              href={r.ubicacionUrl}
              target="_blank"
              rel="noreferrer"
            >
              <IconMapPin />
              <span>Mapa</span>
            </a>
          )}
        </div>
      )}

      {hasUbicacion && (
        <section className="ref-detail-card">
          <h2 className="ref-detail-section-title">
            <IconMapPin />
            Ubicación
          </h2>
          <div className="ref-detail-items">
            {r.barrio && <DetailRow icon={<IconNeighborhood />} label="Barrio" value={r.barrio} />}
            {r.circuitoCodigo && (
              <DetailRow icon={<IconCircuit />} label="Circuito" value={r.circuitoCodigo} />
            )}
            {r.chacra && <DetailRow icon={<IconHome />} label="Chacra" value={r.chacra} />}
            {r.direccion && (
              <DetailRow icon={<IconMapPin />} label="Dirección" value={r.direccion} />
            )}
          </div>
        </section>
      )}

      <section className="ref-detail-card">
        <h2 className="ref-detail-section-title">
          <IconPhone />
          Contacto
        </h2>
        <div className="ref-detail-items">
          <DetailRow
            icon={<IconPhone />}
            label="Teléfono"
            value={phone ?? "Sin número"}
            href={tel && phone ? tel : undefined}
          />
          {trait && trait !== depende && (
            <DetailRow icon={<IconNote />} label="Notas" value={trait} />
          )}
        </div>
      </section>

      {/* ── Reuniones ─────────────────────────────────────── */}
      <section className="ref-detail-card">
        <h2 className="ref-detail-section-title">
          <IconCalendar />
          Reuniones
          {events.length > 0 && (
            <span className="ref-detail-meetings-count">{events.length}</span>
          )}
        </h2>

        {events.length === 0 ? (
          <p className="ref-detail-meetings-empty">
            Sin reuniones registradas con este referente.
          </p>
        ) : (
          <>
            {/* Resumen */}
            {(() => {
              const attended  = events.filter((e) => e.attendeeIds?.includes(r.id));
              const invited   = events.filter((e) => !e.attendeeIds?.includes(r.id));
              const next      = events
                .filter((e) => e.fechaHora && new Date(e.fechaHora) >= new Date())
                .sort((a, b) => new Date(a.fechaHora!).getTime() - new Date(b.fechaHora!).getTime())[0];
              return (
                <div className="ref-detail-meetings-summary">
                  {attended.length > 0 && (
                    <span className="ref-detail-meetings-pill ref-detail-meetings-pill--attended">
                      <IconCheck />
                      {attended.length} asistió
                    </span>
                  )}
                  {invited.length > 0 && (
                    <span className="ref-detail-meetings-pill ref-detail-meetings-pill--invited">
                      {invited.length} invitado{invited.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  {next && (
                    <span className="ref-detail-meetings-pill ref-detail-meetings-pill--next">
                      Próxima: {new Date(next.fechaHora!).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                    </span>
                  )}
                </div>
              );
            })()}

            {/* Lista de reuniones */}
            <div className="ref-detail-meetings-list">
              {events
                .slice()
                .sort((a, b) => {
                  if (!a.fechaHora) return 1;
                  if (!b.fechaHora) return -1;
                  return new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime();
                })
                .map((e) => {
                  const d = e.fechaHora ? new Date(e.fechaHora) : null;
                  const attended  = e.attendeeIds?.includes(r.id) ?? false;
                  const isPast    = d ? d < new Date() : false;
                  const isBarrial = e.tipo === "Barrial";
                  return (
                    <div
                      key={e.id}
                      className={`ref-detail-meeting${attended ? " ref-detail-meeting--attended" : ""}${isPast && !attended ? " ref-detail-meeting--past" : ""}`}
                    >
                      <div className={`ref-detail-meeting-type-dot${isBarrial ? " barrial" : " prensa"}`} />
                      <div className="ref-detail-meeting-body">
                        <div className="ref-detail-meeting-lugar">
                          {e.lugar || "Sin lugar"}
                          {e.barrio && <span className="ref-detail-meeting-barrio"> · {e.barrio}</span>}
                        </div>
                        {d && (
                          <div className="ref-detail-meeting-fecha">
                            {d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                          </div>
                        )}
                      </div>
                      {attended && (
                        <span className="ref-detail-meeting-check" title="Asistió">
                          <IconCheck />
                        </span>
                      )}
                      {isPast && !attended && (
                        <span className="ref-detail-meeting-absent" title="No asistió">—</span>
                      )}
                    </div>
                  );
                })}
            </div>
          </>
        )}
      </section>
    </article>
  );
}
